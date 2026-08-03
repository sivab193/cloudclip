# CloudClip 📋

A modern, cross-platform clipboard manager with real-time synchronization across all your devices. Built with **Expo (React Native)** for the mobile app and a **high-performance Node.js + Socket.io backend** for <50ms sync latency.

Instantly sync text, images, and files across iOS, Android, and web—all secured with Firebase Authentication and end-to-end encryption.

## ✨ Features

- ⚡ **Real-time Sync**: <50ms latency between devices using WebSocket (Socket.io)
- 🔐 **Secure Auth**: Firebase Authentication with email/password sign-up
- 📱 **Cross-Platform**: Native support for iOS, Android, and web (Expo)
- 🗂️ **Rich Content**: Copy text, images, files, and links
- 🌙 **Dark Mode**: Full dark mode support
- 📲 **Progressive Web App**: Install as a PWA for quick access
- 🔄 **Multi-Device**: Sync between unlimited devices
- 🏠 **Self-Hosted**: Full control over your data with your own server

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

## 📖 Documentation

- [Architecture Deep Dive](./docs/ARCHITECTURE.md) — System design and technology choices
- [API Reference](./docs/API.md) — REST and WebSocket API documentation
- [Development Guide](./docs/DEVELOPMENT.md) — Setting up your development environment

## 🤝 Contributing

We welcome contributions! Whether it's bug reports, feature requests, or pull requests—help us make CloudClip better.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

### Development Workflow

```bash
# Backend development
cd backend
npm install
npm run dev

# App development (in a new terminal)
cd app
npm install
npx expo start
```

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## 💬 Support & Feedback

- **Found a bug?** [Open an issue](https://github.com/siv19/cloudclip/issues)
- **Have a feature request?** [Discuss it](https://github.com/siv19/cloudclip/discussions)
- **Questions?** Feel free to start a discussion or reach out

---

Built with ❤️ by [Sivaganesh](https://github.com/siv19)
