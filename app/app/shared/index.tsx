import React from 'react';
import SharedContent from '@/components/SharedContent';
import { deploymentMode } from '@/config/regions';
import RegionPicker from '@/components/RegionPicker';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Current share-link route: `/shared#<token>`. The token rides in the URL
 * fragment so it never reaches the web host's access logs.
 */
export default function Page() {
  const router = useRouter();
  const returnToGateway = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.assign('/');
      return;
    }
    router.replace('/');
  };
  if (deploymentMode === 'gateway') {
    return <View style={{ flex: 1 }}><RegionPicker visible destination="/shared" onClose={returnToGateway} /></View>;
  }
  return <SharedContent />;
}
