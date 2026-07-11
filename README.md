# CloudClip 📋

Modern, cross-platform clipboard manager built with Expo (React Native) and a high-performance Node.js real-time backend. 

## 🏗 Architecture Overview

CloudClip uses a hybrid architecture: **Firebase** for secure identity (Auth) and a **Self-Hosted Node.js Server** for high-speed, low-latency data sync.

```mermaid
graph TD
    subgraph "Client (app/)"
        A[Expo App] --> B[Firebase Auth]
        A --> C[Socket.io Client]
        A --> D[REST API]
    end

    subgraph "Infrastructure (backend/)"
        C <-----> E[Node.js + Socket.io Server]
        D --> E
        E --> F[MongoDB Atlas]
        E --> G[Redis Adapter]
        E --> H[Firebase Admin SDK]
    end

    H -.->|Verify JWT| B
```

### Key Components

- **`app/`**: Expo SDK 51 application using Expo Router.
- **`backend/`**: Node.js server using Express, Socket.io, and Mongoose.
- **Real-time Sync**: Socket.io provides <50ms sync latency between devices.
- **Database**: MongoDB for persistent storage of clips and devices.
- **Auth**: Firebase Auth for secure login/signup.

## 📁 Project Structure

```text
cloudclip/
├── app/                  # Expo mobile/web application
│   ├── app/              # Expo Router routes
│   ├── service/          # API & Socket client services
│   └── components/       # Shared UI components
├── backend/              # Node.js + Socket.io backend
│   ├── src/models/       # Mongoose schemas
│   ├── src/routes/       # REST API endpoints
│   └── src/socket/       # WebSocket handlers
└── .github/workflows/    # CI/CD (GCP VM Deploy via Docker)
```

## 🚀 Getting Started

### 1. Backend Setup
1. Navigate to `backend/`.
2. `npm install`
3. Create a `.env` file from the variables below.
4. `npm run dev` or `docker-compose up`.

### 2. App Setup
1. Navigate to `app/`.
2. `npm install`
3. Create a `.env` file from the variables below.
4. `npx expo start`

## 🔑 Environment Variables

### Backend (`backend/.env`)
These are required for the server to connect to the database and verify user authentication.

| Variable | Source | Example |
| :--- | :--- | :--- |
| `PORT` | Local config | `3000` |
| `MONGODB_URI` | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | `mongodb+srv://...` |
| `REDIS_URL` | Local or Managed Redis | `redis://localhost:6379` |
| `FIREBASE_PROJECT_ID` | [Firebase Service Account](https://console.firebase.google.com/) | `cloud-clip-1234` |
| `FIREBASE_CLIENT_EMAIL` | [Firebase Service Account](https://console.firebase.google.com/) | `firebase-adminsdk-xxx@...` |
| `FIREBASE_PRIVATE_KEY` | [Firebase Service Account](https://console.firebase.google.com/) | `"-----BEGIN PRIVATE KEY-----\n..."` |

> [!TIP]
> To get the **Firebase Admin** keys: Go to **Firebase Console** → **Project Settings** → **Service Accounts** → **Generate new private key**. Open the JSON file and copy the respective fields.

---

### App (`app/.env`)
These are used by the Expo app to communicate with the backend and Firebase Auth.

| Variable | Source | Description |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_BACKEND_URL` | Your Server IP/Domain | URL of the deployed backend (e.g. `http://1.2.3.4:3000`) |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | [Firebase Web App](https://console.firebase.google.com/) | Your Firebase Web Config API Key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | [Firebase Web App](https://console.firebase.google.com/) | Your Firebase Auth Domain |
| ... and other Firebase keys | [Firebase Web App](https://console.firebase.google.com/) | All standard Firebase web config fields |

> [!NOTE]
> For local development, `EXPO_PUBLIC_BACKEND_URL` should be your local machine's IP (e.g., `http://192.168.x.x:3000`) if testing on a physical device.

## 🛠 Build & Deploy

### Backend (GCP VM)
Pushes to `main` automatically deploy the backend to your GCP VM via GitHub Actions.
Required GitHub Secrets: `GCE_HOST`, `GCE_USER`, `SSH_PRIVATE_KEY`, `MONGODB_URI`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

### App (EAS)
```bash
# Android
eas build --platform android --profile production
# iOS
eas build --platform ios --profile production
```

