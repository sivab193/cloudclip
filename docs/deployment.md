# Deployment and rollback

The release architecture is one independent Node + Redis + MongoDB stack per data region, with the gateway and regional web exports on Vercel. See [regional deployment](REGIONAL-DEPLOYMENT.md) for the active hostnames and environment split.

## Current verification

The Vercel gateway and US build are live. The India deployment is prepared but remains a coming-soon region and is not selectable. Public custom domains and API health checks must succeed before treating any region as live. This repository cannot prove that production credentials have been rotated.

## Configure

1. Restrict MongoDB network access to the backend host. Use a database user scoped to the CloudClip database.
2. Configure a separate `backend/.env` on each server. Supply only that region's `MONGODB_URI`, Firebase service-account fields, regional `CADDY_HOST`, and allowed gateway/regional origins. Rotate any previously exposed service-account key.
3. Route `api.in.cclip.cc` and `api-us.cclip.cc` to their respective backends using Cloudflare Tunnel or HTTPS ingress. Keep Node, Redis, and MongoDB private.
4. Add `cclip.cc`, `in.cclip.cc`, and `us.cclip.cc` to Firebase authorized domains and enable Email/Password authentication.
5. Configure the three Vercel projects with the public values described in [regional deployment](REGIONAL-DEPLOYMENT.md).
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

GitHub Actions runs backend CI automatically when backend code changes. The old SSH deployment job for the former `cc-api.siv19.dev` host has been retired; it must not be used to deploy the current regional servers. Deploy each regional Docker stack from its host using the commands above and the [regional deployment guide](REGIONAL-DEPLOYMENT.md), then verify that region's public API health endpoint. Old images are retained for rollback; prune them deliberately after validating the release.

## Operations

Keep one backend replica. Set a provider-appropriate Docker log rotation/retention policy, database backup schedule and uptime alert. Do not log clipboard bodies, authorization headers or full share tokens.

For rollback, retain the previously deployed container image and release SHA. Re-deploy that known-good image with the existing environment. Do not run `docker compose down` or drop data as a routine rollout step. New optional key/request-ID fields are additive; confirm an older server can handle them before any rollback while new clients are distributed.

Update the public privacy/deletion pages and Android App Links file with the web deployment. Use the Play **app-signing** certificate fingerprint, which may differ from the EAS upload certificate.
