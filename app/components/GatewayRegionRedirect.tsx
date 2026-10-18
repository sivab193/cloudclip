import { useEffect } from 'react';
import { Platform } from 'react-native';
import { deploymentMode, getRememberedRegion, openRegion } from '@/config/regions';

export default function GatewayRegionRedirect() {
  useEffect(() => {
    if (deploymentMode !== 'gateway' || Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('choose') === '1') return;

    const remembered = getRememberedRegion();
    if (remembered?.availability === 'available') void openRegion(remembered);
  }, []);

  return null;
}
