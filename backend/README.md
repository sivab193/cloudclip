# CloudClip API

Node 22, Express 5, Socket.io, Mongoose and Firebase Admin's modular API.

```sh
npm ci
cp .env.example .env
npm run dev
```

Set MongoDB and Firebase credentials before starting. Production exposes only Caddy on ports 80/443; the Node process listens on the private Docker network.

```sh
npm run build
npm test -- --runInBand
docker compose up -d --build
```

Run exactly one Node process. HTTP and legacy socket mutations serialize per Firebase UID. Every mutation checks revocation after acquiring the lock, so queued writes cannot recreate data after account deletion.

Startup adds missing indexes without dropping existing ones. Remove the old global `devices.deviceId_1` unique index as an explicit migration if that legacy index exists. The replacement unique index is `{ userId: 1, deviceId: 1 }`.

See the [API contract](../docs/API.md), [architecture](../docs/ARCHITECTURE.md) and [deployment runbook](../docs/deployment.md).
