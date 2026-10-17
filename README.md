# CloudClip

CloudClip is a quiet place to keep useful text and share it through private, expiring links. The [web app](https://cclip.cc) is available now. iOS, Android, macOS, Windows and Linux apps are on the roadmap.

The website has an [About page](https://cclip.cc/about), a [privacy policy](https://cclip.cc/privacy), and an account-free sharing flow. CloudClip is built in the open by [siv19.dev](https://siv19.dev/); the site footer also links to [GitHub](https://github.com/sivab193), [LinkedIn](https://www.linkedin.com/in/sivab193/), and [Instagram](https://www.instagram.com/siv19.dev/). The source repository is [sivab193/cloudclip](https://github.com/sivab193/cloudclip).

Anyone can create a client-side encrypted, expiring text link without registering. Anonymous shares are rate-limited, expire after one or seven days, and are not attached to an account history.

Every new share also has a four-character uppercase alphanumeric reference (for example, `A7K2`). The reference is only used to locate encrypted data; the complete link remains required because its URL fragment contains the high-entropy decryption secret that is never sent to CloudClip.

Clipboard content is encrypted on the client. Automatic clipboard access is opt-in and runs only while the app is visible. Encrypted file transfer, a custom CloudClip keyboard, native apps and a user-friendly self-hosted edition are coming soon. Images, background clipboard monitoring and an offline write queue are not implemented today.

The web interface supports light and dark appearance. It follows the device theme until a visitor uses the header toggle, then remembers that choice. The current logo, colors, and component guidance are documented in [DESIGN.md](DESIGN.md).

## How the regional deployment works

`cclip.cc` is the public gateway. Before signing in or opening a shared clip, a visitor chooses an available region. The gateway then redirects to the matching regional web app:

- India: `in.cclip.cc` → `api.in.cclip.cc` → India backend → Mumbai MongoDB cluster
- United States: `us.cclip.cc` → `api-us.cclip.cc` → US backend → N. Virginia MongoDB cluster

Each backend runs as a Docker container beside Redis. Redis backs distributed rate limiting and Socket.IO event delivery. Regional data stays in that region's MongoDB cluster; the clusters are intentionally independent rather than cross-region replicas.

The same Firebase sign-in works in both regions, but regional profiles, encryption keys, clips and shared links are separate. Deleting an account in one region currently removes the shared sign-in and only that region’s database records; contact support before deletion if you used both regions so the other records can also be removed. Cross-region deletion coordination is still pending.

The public API hostnames are connected with Cloudflare Tunnel. A `cloudflared` container creates an outbound encrypted connection to Cloudflare, so the home server does not need an inbound port exposed on the router. Cloudflare terminates HTTPS for `api.<region>.cclip.cc` and forwards requests through that tunnel to `http://backend:3000` on the private Docker network.

MongoDB URLs and tunnel tokens belong only in the ignored `backend/.env` file on the corresponding server. They must never be committed, embedded into an image, or added to the frontend/Vercel environment.

## Run locally

Use Node 22.13 or newer (the repository and CI use Node 22).

```sh
cd backend
npm ci
cp .env.example .env
npm run dev
```

In another terminal:

```sh
cd app
npm ci
cp .env.example .env
npm start
```

Fill in the environment files before starting. A phone needs a reachable LAN API address during development; a release needs a public HTTPS origin.

## Verify

```sh
cd backend
npm run build
npm test -- --runInBand
```

```sh
cd app
npm run typecheck
npm test -- --runInBand
npx expo-doctor
npm run check:release
npm run build:web
```

## Architecture and release

- [Verified release status and remaining blockers](docs/RELEASE-READINESS.md)
- [Architecture decisions and boundaries](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Deployment and rollback](docs/deployment.md)
- [Google Play submission and device checklist](docs/store-submission.md)

The app uses Expo SDK 57 / React Native 0.86. REST owns durable writes; Socket.IO delivers live notifications. Each regional Node backend runs behind Caddy, with MongoDB for persistence, Firebase Authentication for identity, Redis for shared rate limits and events, and an optional Cloudflare Tunnel sidecar for private ingress.

A passing source check is not a Play approval: the signed bundle, production deployment, device tests and Play Console declarations must also be verified.
