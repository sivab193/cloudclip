# Migrating the CloudClip backend from GCP to IBM Cloud VSI

Lift-and-shift runbook. The `docker-compose.yml` + `Caddyfile` stack moves
unchanged — only the host, the DNS record and the CI secrets differ.

**Estimated downtime:** ~2–5 minutes, during the DNS cutover in step 8.

---

## Why VSI (and what it costs us)

The backend is Socket.io with **no Redis adapter** — `CLAUDE.md` documents a
`REDIS_URL`, but there is no Redis dependency in `backend/package.json` and no
adapter wired into `src/socket/handlers.ts`. Two or more instances would mean
clients connected to different instances stop seeing each other's clipboard
updates.

A single VSI satisfies that constraint for free, which is why it's the
lowest-risk target. The tradeoff is that you keep patching a VM, and you cannot
scale horizontally until the Redis adapter exists. See "Follow-up work".

---

## 1. Pre-flight (do this a day ahead)

**Lower the DNS TTL** on `cc-api.siv19.dev` to 60s. This is the single biggest
lever on cutover downtime and it needs to propagate before you start.

**Decide on secret rotation.** You are re-entering every secret on a new host.
That is the natural moment to rotate rather than copy:

- **Firebase service-account key** — `backend/.env.example` already notes the
  old local key should be treated as leaked. Firebase console → Project
  settings → Service accounts → *Generate new private key*. Revoke the old one
  after cutover, not before.
- **MongoDB Atlas user password** — Atlas → Database Access → Edit → *Edit
  password*. Update `MONGODB_URI`.

**Confirm the Atlas region.** Pick the IBM region closest to your existing
Atlas cluster; cross-region latency on every query is the one thing that will
be obviously worse if you get it wrong.

## 2. Provision the VSI

IBM Cloud console → Infrastructure → **Virtual server instances** → Create.

| Setting | Value |
|---|---|
| Image | Ubuntu 24.04 LTS (minimal) |
| Profile | `bx2-2x8` (2 vCPU / 8 GB) is ample; `cx2-2x4` if cost-sensitive |
| Region | Match the Atlas cluster region |
| SSH key | Upload the public key whose private half is in `SSH_PRIVATE_KEY` |

Then attach a **Floating IP** — this is the address DNS will point at, and it
must be reserved so it survives a VSI restart.

## 3. Security group

Inbound rules only. Everything else stays closed — in particular **3000 must
not be exposed**; `docker-compose.yml` uses `expose:` rather than `ports:`
precisely so Caddy is the only public entrypoint.

| Port | Source | Why |
|---|---|---|
| 22 | Your IP (not `0.0.0.0/0`) | SSH + CI deploys |
| 80 | `0.0.0.0/0` | Let's Encrypt HTTP-01 challenge |
| 443 | `0.0.0.0/0` | API + WebSockets |

> If CI deploys come from GitHub-hosted runners, their IPs are dynamic. Either
> allow 22 broadly *and* enforce key-only auth (`PasswordAuthentication no`),
> or use a self-hosted runner. Key-only is the pragmatic choice.

## 4. Install Docker

```bash
ssh ubuntu@<floating-ip>

sudo apt-get update && sudo apt-get upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo systemctl enable --now docker
exit   # re-login so the group membership applies
```

## 5. Deploy the stack

```bash
ssh ubuntu@<floating-ip>
git clone https://github.com/<you>/cloudclip.git ~/cloudclip
cd ~/cloudclip/backend
cp .env.example .env
nano .env     # fill in the ROTATED secrets from step 1
```

`.env` must contain `PORT`, `NODE_ENV`, `MONGODB_URI`, `ALLOWED_ORIGINS`,
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
`ALLOWED_ORIGINS` stays `https://cc.siv19.dev,http://localhost:8081` — the web
app's origin is not changing.

**Do not `docker compose up` yet.** Caddy will try to provision a certificate
immediately and fail while DNS still points at GCP, which burns Let's Encrypt
rate limit. Wait for step 8.

## 6. Allow the new IP in MongoDB Atlas

Atlas → Network Access → Add IP Address → the VSI's floating IP.

Leave the GCP VM's IP in the list until decommissioning — you need both live
for the rollback path to work.

## 7. Verify before cutover

Temporarily prove the container runs, without involving Caddy or DNS:

```bash
cd ~/cloudclip/backend
docker compose up -d --build backend    # backend only, no caddy
docker compose exec backend wget -qO- http://localhost:3000/health
docker compose logs backend --tail 50   # confirm Mongo + Firebase connected
docker compose down
```

A healthy `/health` here means the image, the secrets and the Atlas allowlist
are all correct. Everything after this point is networking.

## 8. Cutover

```bash
# On the VSI — bring up the full stack including Caddy
cd ~/cloudclip/backend
docker compose up -d --build
```

Now repoint DNS: `cc-api.siv19.dev` **A record → VSI floating IP**.

Caddy provisions the TLS certificate automatically once DNS resolves to it,
usually within 30–60 seconds of the first inbound request on port 80. Watch it:

```bash
docker compose logs -f caddy    # look for "certificate obtained successfully"
```

The `Caddyfile` needs **no changes** — the domain is identical, only the
machine behind it moved. (Its comment mentions the GCP firewall; that's stale
after this migration, worth a follow-up edit.)

Verify from your laptop:

```bash
curl -fsS https://cc-api.siv19.dev/health
curl -sI https://cc-api.siv19.dev/health | grep -i strict-transport
```

Then verify WebSockets specifically — this is the part a plain health check
will not catch. Open the web app, sign in on two browsers, and confirm a clip
copied in one appears in the other without a refresh.

## 9. Repoint CI

`.github/workflows/deploy.yml` is already host-agnostic — it SSHes to
`secrets.GCE_HOST` and runs `docker compose up -d --build`. Only the secret
values change:

| Secret | New value |
|---|---|
| `GCE_HOST` | VSI floating IP |
| `GCE_USER` | `ubuntu` |
| `SSH_PRIVATE_KEY` | unchanged, if you reused the key in step 2 |

The names are now misleading. Renaming them to `DEPLOY_HOST` / `DEPLOY_USER`
means a matching edit to `deploy.yml` lines 38–40 — worth doing, but do it as
a separate commit *after* the migration is confirmed stable, so a failed
deploy has only one possible cause.

Confirm by pushing a trivial change under `backend/` and watching the run: the
post-deploy step already curls `/health`, so a green run is real evidence.

## 10. Rollback

Valid until you decommission GCP. Point the `cc-api.siv19.dev` A record back
at the GCP VM's IP. With a 60s TTL you are recovered in about a minute — the
GCP box is still running, still in the Atlas allowlist, and still holds a valid
certificate.

This is why the Firebase key rotation in step 1 says *revoke after cutover*:
revoking early breaks the rollback target.

## 11. Decommission

Only after ~48h of clean operation:

1. Stop the GCP VM (stop, don't delete — a few more days of cheap insurance).
2. Remove the GCP IP from the Atlas Network Access list.
3. Revoke the old Firebase service-account key.
4. Raise the DNS TTL back to 3600.
5. Delete the GCP VM and release its static IP.

---

## Follow-up work

- **Socket.io Redis adapter.** Until `@socket.io/redis-adapter` is wired into
  `src/socket/handlers.ts`, this deployment is permanently single-instance.
  That also means every deploy is a hard restart with dropped WebSocket
  connections. This is the prerequisite for any future horizontal scaling —
  and the reason Code Engine was not the recommendation.
- **`CLAUDE.md` mentions `REDIS_URL`** as a backend env var that nothing reads.
  Either implement it or drop it from the docs; right now it implies a
  capability that does not exist.
- **Automated backups.** Atlas handles the database, but the VSI holds the
  `caddy_data` volume (certificates) and `.env`. Losing them is recoverable but
  annoying — snapshot the VSI on a schedule.
- **Unattended security upgrades:**
  `sudo apt-get install -y unattended-upgrades` — the standing cost of choosing
  a VM over serverless.
