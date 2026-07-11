# CloudClip 📋

Modern, cross-platform clipboard manager with real-time sync.

## Architecture
- **Monorepo**:
  - `app/`: Expo (React Native) app. SDK 51.
  - `backend/`: Node.js + Socket.io + MongoDB backend.
- **Sync**: Socket.io for real-time clipboard updates.
- **Database**: MongoDB Atlas.
- **Auth**: Firebase Authentication (Email/Password).

## Development Commands

### Backend
- `cd backend`
- `npm install`
- `npm run dev` (dev mode with nodemon)
- `npm run build` (compile TS)
- `npm start` (run compiled JS)
- `docker-compose up` (run via Docker)

### App
- `cd app`
- `npm install`
- `npx expo start` (Expo dev server)
- `npx expo start --web` (Web dev)

## Deployment
- **Backend**: Automatic via GitHub Actions to GCP VM on push to `main`.
- **App**: via EAS Build (`eas build --platform [ios|android]`).

## Environment Variables
- **Backend**: `PORT`, `MONGODB_URI`, `REDIS_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
- **App**: `EXPO_PUBLIC_BACKEND_URL`, `EXPO_PUBLIC_FIREBASE_*` (standard Firebase config).

## Components & Services
- `app/service/apiService.ts`: REST API client.
- `app/service/socketService.ts`: Socket.io client for real-time sync.
- `app/service/models.ts`: Shared TS interfaces.
