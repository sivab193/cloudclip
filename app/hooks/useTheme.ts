import { useMemo, useSyncExternalStore } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeTokens, ColorSchemeName } from '@/constants/Colors';

type ThemePreference = ColorSchemeName | 'system';
const STORAGE_KEY = 'cloudclip-theme';
const listeners = new Set<() => void>();
let nativePreference: ThemePreference = 'system';
let webPreferenceFallback: ThemePreference = 'system';

const storedPreference = (): ThemePreference => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return nativePreference;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch { return webPreferenceFallback; }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) listener();
    };
    window.addEventListener('storage', onStorage);
    return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
  }
  return () => { listeners.delete(listener); };
};

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, storedPreference, () => 'system');
}

export function setThemePreference(preference: ThemePreference) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    webPreferenceFallback = preference;
    try {
      if (preference === 'system') window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, preference);
    } catch { /* The current tab still switches if storage is unavailable. */ }
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  } else {
    nativePreference = preference;
    if (preference !== 'system') Appearance.setColorScheme(preference);
    void AsyncStorage.setItem(STORAGE_KEY, preference);
  }
  listeners.forEach(listener => listener());
}

export async function restoreThemePreference() {
  if (Platform.OS === 'web') return;
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') setThemePreference(saved);
}

export function useThemeName(): ColorSchemeName {
  const scheme = useColorScheme();
  const preference = useThemePreference();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (!hydrated) return 'light';
  return preference === 'system' ? (scheme === 'dark' ? 'dark' : 'light') : preference;
}

/**
 * The active theme's tokens. Use this instead of hardcoding colours.
 *
 * Styles that depend on the theme can't live in a module-level
 * `StyleSheet.create`, so pair this with `useThemedStyles`:
 *
 *   const styles = useThemedStyles(makeStyles);
 *   const t = useTheme();   // for props like `color=` on icons
 */
export function useTheme(): ThemeTokens {
  return Colors[useThemeName()];
}

/**
 * Builds a StyleSheet from the active tokens, rebuilding only when the theme
 * flips. `factory` must be a stable module-level function.
 */
export function useThemedStyles<T>(factory: (t: ThemeTokens) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
