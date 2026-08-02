import '@/service/cryptoPolyfill';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AuthProvider } from '@/auth/AuthContext';
import UnlockModal from '@/components/UnlockModal';
import React from 'react';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Also set as <title> in +html.tsx; keep the two in sync. Setting it here as
// well is what stops expo-router's static render from emitting an EMPTY
// <title> ahead of ours — the first <title> in the document is the one the
// browser and most crawlers use.
const SITE_TITLE = 'CloudClip — Your clipboard, on every device';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <Head>
        <title>{SITE_TITLE}</title>
      </Head>
      <Stack screenOptions={{ title: SITE_TITLE }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="shared/index" options={{ headerShown: false }} />
        <Stack.Screen name="shared/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="delete-account" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <UnlockModal />
    </AuthProvider>
  );
}
