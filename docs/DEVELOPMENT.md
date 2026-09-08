# Development

Use Node 22.13+ and install each package with `npm ci`. There is no root npm workspace: keeping app and API lockfiles separate keeps deployment dependencies independent.

Copy each `.env.example` to an ignored `.env` and supply your own Firebase/MongoDB configuration. The API origin must be reachable from the physical phone. Release origins must use HTTPS.

App: `npm start`, `npm run typecheck`, `npm test -- --runInBand`, `npm run build:web`.
Backend: `npm run dev`, `npm run build`, `npm test -- --runInBand`.

Backend tests run an ephemeral MongoDB and mock Firebase Authentication; they never access production data. The first run may download MongoDB binaries and requires permission to listen on local ports. App tests cover crypto, key lifecycle and sync decisions. Browser and Android device verification are separate from these unit/integration suites.

Expo generates native projects from app.json during EAS Build. Do not commit generated android/ios directories. App version strings are kept aligned; EAS manages Android versionCode remotely.

The two narrowly scoped app dependency overrides patch transitive URL-decoding and Xcode UUID libraries. The backend UUID override patches transitive Google libraries. Remove overrides once upstream dependencies require patched versions, then rerun audits, Expo Doctor and both exports.

Never test destructive operations with a real account unless its owner explicitly designated it for testing.
