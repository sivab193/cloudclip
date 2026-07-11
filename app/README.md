# CloudClip App 📱

Cross-platform clipboard synchronization application built with Expo.

## Tech Stack
- **Framework**: Expo SDK 51
- **Navigation**: Expo Router (v3)
- **Backend Communication**: REST (Axios) + WebSockets (Socket.io-client)
- **Authentication**: Firebase Authentication
- **Storage**: SecureStore (Native) / AsyncStorage (Web)

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file in this directory with the following keys:
   ```env
   EXPO_PUBLIC_BACKEND_URL=your_backend_url
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   ```

3. **Run Development Server**:
   ```bash
   npx expo start
   ```

## Key Files
- `app/` - Application routes (Tabs, Login).
- `service/apiService.ts` - REST API client.
- `service/socketService.ts` - Real-time Socket.io service.
- `auth/AuthContext.tsx` - Authentication provider.
