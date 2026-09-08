# CloudClip

CloudClip syncs text between Android, iOS and web, and shares text through expiring encrypted links. The release target is Android; iOS remains a secondary build target.

Clipboard content is encrypted on the client. Automatic clipboard access is opt-in and runs only while the app is visible. Images, file transfer, background clipboard monitoring and an offline write queue are not implemented.

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

The app uses Expo SDK 57 / React Native 0.86. REST owns durable writes; Socket.io delivers live notifications. One Node process runs behind Caddy, with MongoDB for persistence and Firebase Authentication for identity. There is no Redis dependency or horizontal scaling in this release.

A passing source check is not a Play approval: the signed bundle, production deployment, device tests and Play Console declarations must also be verified.
