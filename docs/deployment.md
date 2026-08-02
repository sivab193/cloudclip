# CloudClip — Zero-to-Live Deployment Runbook

Nothing is deployed yet. Follow this top to bottom; each step lists exactly
what to click/run. Total active time ≈ 1–2 hours (plus DNS propagation).

Target architecture:

```
Phone / Web browser
   │  https / wss
   ▼
cc.siv19.dev ──────► Vercel (static Expo web export)
cc-api.siv19.dev ──► GCP VM ─ Caddy (TLS) ─► Node backend (Docker) ─► MongoDB Atlas
                                                     │
                                              Firebase Auth (token verify)
```

---

## Step 1 — MongoDB Atlas (~10 min)

1. https://cloud.mongodb.com → create a free **M0** cluster.
   **Region matters for latency:** pick the region closest to you, and use the
   *same* region for the GCP VM in Step 2 (e.g. `asia-south1` / Mumbai if you're
   in India).
2. Database Access → Add New Database User → username + strong password,
   role "Read and write to any database".
3. Network Access → Add IP Address → add the VM's static IP (you'll get it in
   Step 2 — come back and add it). Don't use 0.0.0.0/0.
4. Cluster → Connect → Drivers → copy the connection string; set the db name
   to `/cloudclip`. This becomes `MONGODB_URI`.

No schema/index setup needed — the backend runs `syncIndexes()` on boot.

## Step 2 — GCP VM (~15 min)

1. GCP Console → Compute Engine → Create instance:
   - **e2-small** (2 GB RAM; e2-micro works but is tight), Ubuntu 24.04 LTS,
     same region as Atlas, 10–20 GB standard disk.
2. Reserve a **static external IP**: VPC network → IP addresses → Reserve →
   attach to the VM. (An ephemeral IP changes on restart and breaks DNS.)
3. Firewall: allow **TCP 80 and 443** only (check "Allow HTTPS/HTTP traffic"
   on the instance, or create rules). Do **not** open 3000.
4. Go back to Atlas Step 1.3 and allowlist this static IP.

## Step 3 — DNS (~5 min + propagation)

Wherever `siv19.dev` is managed:

| Type  | Name     | Value                  |
|-------|----------|------------------------|
| A     | `cc-api` | VM static IP           |
| CNAME | `cc`     | `cname.vercel-dns.com` |

Do this **before** starting the backend — Caddy needs the A record resolving
to the VM to obtain its Let's Encrypt certificate.

## Step 4 — Firebase (~10 min)

Project already exists. Three things:

1. **Rotate the service-account key**: Project settings → Service accounts →
   Generate new private key. In GCP Console → IAM & Admin → Service Accounts →
   the `firebase-adminsdk` account → Keys → **delete the old key**. Use the new
   JSON's values in the VM `.env` (Step 5).
2. Authentication → Sign-in method → confirm **Email/Password** is enabled.
3. Authentication → Settings → **Authorized domains** → add `cc.siv19.dev`
   (login from the web app fails without this).

## Step 5 — Backend on the VM (~15 min)

SSH in (`gcloud compute ssh <vm-name>` or the console SSH button), then:

```bash
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit   # log out/in so the docker group applies
```

```bash
# Code + env
git clone https://github.com/<you>/cloudclip.git ~/cloudclip
cd ~/cloudclip/backend
cp .env.example .env
nano .env    # fill in MONGODB_URI, ALLOWED_ORIGINS, FIREBASE_* (new key)
```

```bash
# Run (Caddy fetches the TLS cert automatically on first start)
docker compose up -d --build
docker compose logs -f caddy   # watch until "certificate obtained" for cc-api.siv19.dev
```

Verify:

```bash
curl -s http://localhost:3000/health          # from the VM (via docker network: use `docker compose exec caddy wget -qO- http://backend:3000/health` if 3000 isn't published)
curl -fsS https://cc-api.siv19.dev/health     # from your laptop, after DNS propagates
```

## Step 6 — CI/CD (GitHub Actions) (~10 min)

The workflow (`.github/workflows/deploy.yml`) tests then deploys on every push
to `main` touching `backend/**`. It needs three repo secrets
(GitHub → repo → Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `GCE_HOST` | VM static IP |
| `GCE_USER` | your Linux username on the VM (`whoami`) |
| `SSH_PRIVATE_KEY` | a dedicated deploy key (below) |

Create the deploy key on your laptop:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/cloudclip_deploy -C cloudclip-deploy -N ""
# put the PUBLIC half on the VM:
cat ~/.ssh/cloudclip_deploy.pub | ssh <user>@<vm-ip> 'cat >> ~/.ssh/authorized_keys'
# paste the PRIVATE half (the file ~/.ssh/cloudclip_deploy) into SSH_PRIVATE_KEY
```

If the repo is private, the `git pull` on the VM also needs auth — simplest is
a fine-grained GitHub PAT embedded once in the remote URL on the VM:
`git remote set-url origin https://<PAT>@github.com/<you>/cloudclip.git`.

Test: push a trivial change to `backend/` on `main` → watch the Actions run →
it ends with a live health check.

## Step 7 — Web app on Vercel (~15 min)

1. https://vercel.com → Add New Project → import the `cloudclip` repo.
2. **Root Directory: `app`** (critical — `vercel.json` lives there).
   Framework preset: Other. Build command and output dir come from
   `app/vercel.json` (`expo export -p web` → `dist`). Node.js version: 22.x.
3. Environment Variables → add everything from `app/.env.example` with real
   values (`EXPO_PUBLIC_API_URL=https://cc-api.siv19.dev`,
   `EXPO_PUBLIC_WEB_URL=https://cc.siv19.dev`, all `EXPO_PUBLIC_FIREBASE_*`).
4. Deploy → then Settings → Domains → add `cc.siv19.dev` (the CNAME from
   Step 3 makes it verify automatically).

Verify: open `https://cc.siv19.dev` → sign up → save the recovery code →
save a clip → check Atlas (Collections → clipboards) shows **only ciphertext**
(`{"v":1,"alg":"A256GCM",...}`).

## Step 8 — Post-launch tie-offs

- After the first EAS Android build: `eas credentials -p android` → copy the
  SHA-256 fingerprint into `app/public/.well-known/assetlinks.json` → push
  (Vercel redeploys) → share links then open directly in the app.
- Play Console / store steps: see `docs/store-submission.md`.
- iOS later: fill the Team ID in `apple-app-site-association`.

## Routine operations

- **Deploy backend**: push to `main`. That's it.
- **Deploy web**: push to `main` (Vercel auto-builds `app/`).
- **Logs**: `ssh` → `cd ~/cloudclip/backend && docker compose logs -f backend`.
- **Restart**: `docker compose restart backend`.
- **Env change on VM**: edit `.env` → `docker compose up -d` (recreates).
