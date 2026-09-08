# Deployment and rollback

The release architecture is one Node process + Caddy + MongoDB + Firebase Authentication, with the web export on Vercel. The VM can be on GCP or IBM; no provider migration is required by this code change.

## Current verification

The web privacy URL returned HTTP 200 on 2026-09-07, but `cc-api.siv19.dev` still did not resolve on 2026-09-08. Restore or supply the production API before treating the app as live. This repository cannot prove that production credentials have been rotated.

## Configure

1. Restrict MongoDB network access to the backend host. Use a database user scoped to the CloudClip database.
2. Configure `backend/.env` from its example. Supply `MONGODB_URI`, Firebase service-account fields and `ALLOWED_ORIGINS=https://cc.siv19.dev`. Rotate any previously exposed service-account key and remove it from old deployment images through your normal retention process.
3. Point `cc-api.siv19.dev` at the backend host. Expose only 80/443 publicly; keep port 3000 and MongoDB private. Limit SSH to trusted sources.
4. Add `cc.siv19.dev` to Firebase authorized domains and enable Email/Password authentication.
5. Configure Vercel with root directory `app`, Node 22 and values from `app/.env.example`. The repository defines its static export command.
6. Configure the EAS production environment with the Firebase public-app values. Production API/web origins are also set explicitly in `app/eas.json`; review them if hosting changes.

## Backend release

Run checks first. Back up the database and verify that a restore is possible before a schema/index migration. Startup now creates indexes without dropping unrelated indexes.

If migrating an older deployment, inspect `db.devices.getIndexes()`. Only if `deviceId_1` is the old global unique index, remove that index after confirming the replacement unique `{userId:1,deviceId:1}` index exists. Never drop the collection.

Deploy the backend before distributing new clients, because clients use REST notifications, request IDs and key IDs introduced in this release.

```sh
cd backend
docker compose up -d --build
docker compose exec backend wget -qO- http://localhost:3000/health
```

Then check the public HTTPS health URL and exercise save/delete between two test devices. A health response only checks database connectivity; it does not test the full auth/sync path.

The GitHub workflow runs CI automatically on code pushes. Backend deployment is a separate **Run workflow** action on `main`, after production hosting has been verified. It uses the `production` GitHub environment; configure required reviewers there for an approval gate. The `GCE_HOST`, `GCE_USER` and `SSH_PRIVATE_KEY` secrets retain their names for compatibility even if the actual host is IBM. Deployment runs only after backend CI, uses fast-forward-only checkout, verifies the tested commit, and performs a public health check. Old images are retained for rollback; prune them deliberately after validating the release.

## Operations

Keep one backend replica. Set a provider-appropriate Docker log rotation/retention policy, database backup schedule and uptime alert. Do not log clipboard bodies, authorization headers or full share tokens.

For rollback, retain the previously deployed container image and release SHA. Re-deploy that known-good image with the existing environment. Do not run `docker compose down` or drop data as a routine rollout step. New optional key/request-ID fields are additive; confirm an older server can handle them before any rollback while new clients are distributed.

Update the public privacy/deletion pages and Android App Links file with the web deployment. Use the Play **app-signing** certificate fingerprint, which may differ from the EAS upload certificate.
