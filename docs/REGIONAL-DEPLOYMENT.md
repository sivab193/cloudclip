# Regional deployment

CloudClip runs two independent data regions behind one public gateway.

| Surface | URL | Backend | Database |
| --- | --- | --- | --- |
| Gateway | `https://cclip.cc` | Health checks only | None |
| India (coming soon) | `https://in.cclip.cc` | `https://api.in.cclip.cc` | India MongoDB cluster |
| United States | `https://us.cclip.cc` | `https://api-us.cclip.cc` | US MongoDB cluster |

The regions do not replicate. Users must select the same region on every device they want to sync. Shared links use the originating regional web hostname.

Authentication is shared through one Firebase project, so the same email and password work in both regions. Each region creates its own profile and encryption keys on first sign-in, and clips and shared links remain separate. **Current deletion limitation:** deleting an account in either region removes the shared Firebase identity and only that region's MongoDB records; the other region's records are not automatically purged. Coordinate deletion in both regions before removing the Firebase identity.

## Secrets and configuration

Store the US MongoDB URL and Firebase Admin credentials in `backend/.env` on the US Mac mini. Store the India MongoDB URL and a separately issued Firebase Admin credential in `backend/.env` on the India server. These files are ignored by Git and are consumed by Docker Compose; never put MongoDB or Firebase Admin credentials in Vercel.

Vercel receives only public `EXPO_PUBLIC_*` values. Create three projects from the `app` root:

- Gateway: `EXPO_PUBLIC_DEPLOYMENT_MODE=gateway`, `EXPO_PUBLIC_WEB_URL=https://cclip.cc`.
- India (coming soon): `EXPO_PUBLIC_DEPLOYMENT_MODE=regional`, `EXPO_PUBLIC_API_URL=https://api.in.cclip.cc`, `EXPO_PUBLIC_WEB_URL=https://in.cclip.cc`.
- US: `EXPO_PUBLIC_DEPLOYMENT_MODE=regional`, `EXPO_PUBLIC_API_URL=https://api-us.cclip.cc`, `EXPO_PUBLIC_WEB_URL=https://us.cclip.cc`.

All three projects use the same public Firebase web configuration. Add `cclip.cc`, `in.cclip.cc`, and `us.cclip.cc` to Firebase Authentication's authorized domains.

## Backend setup

Each server uses the same Compose file and a local, non-public Redis container. Set `CADDY_HOST` and `ALLOWED_ORIGINS` for its region, then run:

```sh
cd backend
docker compose up -d --build
docker compose ps
curl -fsS https://api.<region>.cclip.cc/health
```

For a home server behind NAT, create a remotely managed Cloudflare Tunnel and configure its public hostname to send traffic to `http://backend:3000`. Store its token as `CLOUDFLARE_TUNNEL_TOKEN` in that server's ignored `backend/.env`, then start with `docker compose --profile tunnel up -d --build`. This avoids router port forwarding. Do not reuse a tunnel token between regions.

Redis backs Socket.io fan-out and rate limits inside the region. MongoDB remains the authoritative data store. Ports 3000 and 6379 must not be exposed publicly.
