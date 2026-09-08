# Repository guide

CloudClip is an Expo SDK 57 app (`app/`) and Express 5 / Socket.io / MongoDB API (`backend/`). Firebase Authentication supplies user identity.

Use [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) as the architecture authority. The release supports text only, with opt-in foreground clipboard access. REST performs durable writes; Socket.io sends notifications and retains compatibility handlers for older apps.

Run the commands in [README.md](README.md) before a release. Both package lockfiles are committed. Never commit environment files, signing keys or Play service-account credentials.

The deployment uses one Node process. User mutation serialization and socket rooms are process-local; adding another replica requires distributed coordination. Do not add Redis, a second database or background clipboard permissions without a product requirement.
