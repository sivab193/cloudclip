# CloudClip app

Expo SDK 57, React Native 0.86, React 19, Expo Router and Firebase Authentication.

```sh
npm ci
cp .env.example .env
npm start
```

Configure `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL` and the Firebase web-app values in `.env.example`. Public Expo variables are included in the client bundle; never put server credentials there.

Use Expo Go for local development, the EAS `preview` profile for an installable test APK, and `production` for a signed Play AAB. A custom development-client profile is intentionally absent because this app does not install `expo-dev-client`.

`hooks/useClipboardSync.ts` coordinates foreground sync. `service/apiService.ts` owns REST requests and timeouts. `service/socketService.ts` owns notifications. `service/keyService.ts` owns account-scoped encryption keys. Native keys use SecureStore; web keys use sessionStorage.

```sh
npm run typecheck
npm test -- --runInBand
npx expo-doctor
npm run check:release
npm run build:web
eas build --platform android --profile production
```

See [architecture](../docs/ARCHITECTURE.md) and [Play submission](../docs/store-submission.md).
