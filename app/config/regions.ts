import { Linking, Platform } from 'react-native';

export type RegionId = 'in' | 'us';

export interface CloudClipRegion {
  id: RegionId;
  name: string;
  location: string;
  webUrl: string;
  apiUrl: string;
}

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
  },
  {
    id: 'us',
    name: 'United States',
    location: 'N. Virginia',
    webUrl: (process.env.EXPO_PUBLIC_US_WEB_URL || 'https://us.cclip.cc').replace(/\/+$/, ''),
    apiUrl: (process.env.EXPO_PUBLIC_US_API_URL || 'https://api-us.cclip.cc').replace(/\/+$/, ''),
  },
];

export async function openRegion(region: CloudClipRegion, path: '/' | '/shared' | '/share' = '/'): Promise<void> {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const fragment = Platform.OS === 'web' && typeof window !== 'undefined' && suffix === '/shared'
    ? window.location.hash
    : '';
  const url = `${region.webUrl}${suffix}${fragment}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url);
    return;
  }
  await Linking.openURL(url);
}
