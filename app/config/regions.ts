import { Linking, Platform } from 'react-native';

export type RegionId = 'in' | 'us';

export interface CloudClipRegion {
  id: RegionId;
  name: string;
  location: string;
  webUrl: string;
  apiUrl: string;
  availability: 'available' | 'coming-soon';
}

const REGION_PREFERENCE_KEY = 'cloudclip-region';

export const deploymentMode = process.env.EXPO_PUBLIC_DEPLOYMENT_MODE === 'gateway'
  ? 'gateway'
  : 'regional';

export const regions: CloudClipRegion[] = [
  {
    id: 'in',
    name: 'India',
    location: 'Mumbai',
    webUrl: (process.env.EXPO_PUBLIC_INDIA_WEB_URL || 'https://in.cclip.cc').replace(/\/+$/, ''),
    apiUrl: (process.env.EXPO_PUBLIC_INDIA_API_URL || 'https://api.in.cclip.cc').replace(/\/+$/, ''),
    availability: 'coming-soon',
  },
  {
    id: 'us',
    name: 'United States',
    location: 'N. Virginia',
    webUrl: (process.env.EXPO_PUBLIC_US_WEB_URL || 'https://us.cclip.cc').replace(/\/+$/, ''),
    apiUrl: (process.env.EXPO_PUBLIC_US_API_URL || 'https://api-us.cclip.cc').replace(/\/+$/, ''),
    availability: 'available',
  },
];

export function getRegion(id: string | null | undefined): CloudClipRegion | undefined {
  return regions.find(region => region.id === id);
}

export function getRememberedRegion(): CloudClipRegion | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  try {
    const stored = window.localStorage.getItem(REGION_PREFERENCE_KEY);
    const fromStorage = getRegion(stored);
    if (fromStorage) return fromStorage;
  } catch { /* Cookies remain available when local storage is blocked. */ }

  const cookie = document.cookie
    .split('; ')
    .find(item => item.startsWith(`${REGION_PREFERENCE_KEY}=`))
    ?.split('=')[1];
  return getRegion(cookie);
}

export function rememberRegion(region: CloudClipRegion): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try { window.localStorage.setItem(REGION_PREFERENCE_KEY, region.id); } catch { /* Cookie fallback below. */ }

  const onCloudClipDomain = /(^|\.)cclip\.cc$/i.test(window.location.hostname);
  const domain = onCloudClipDomain ? '; Domain=.cclip.cc' : '';
  document.cookie = `${REGION_PREFERENCE_KEY}=${region.id}; Max-Age=31536000; Path=/; SameSite=Lax; Secure${domain}`;
}

export function rememberCurrentRegion(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const current = regions.find(region => {
    try { return new URL(region.webUrl).hostname === window.location.hostname; }
    catch { return false; }
  });
  if (current?.availability === 'available') rememberRegion(current);
}

export async function openRegion(region: CloudClipRegion, path: '/' | '/shared' | '/share' = '/'): Promise<void> {
  if (region.availability !== 'available') return;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const fragment = Platform.OS === 'web' && typeof window !== 'undefined' && suffix === '/shared'
    ? window.location.hash
    : '';
  const url = `${region.webUrl}${suffix}${fragment}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    rememberRegion(region);
    window.location.assign(url);
    return;
  }
  await Linking.openURL(url);
}
