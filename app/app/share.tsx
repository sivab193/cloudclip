import React from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import PublicShareComposer from '@/components/PublicShareComposer';
import RegionPicker from '@/components/RegionPicker';
import { deploymentMode } from '@/config/regions';

export default function SharePage() {
  const router = useRouter();
  if (deploymentMode === 'gateway') {
    const close = () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign('/');
      else router.replace('/');
    };
    return <View style={{ flex: 1 }}><RegionPicker visible destination="/share" redirectRemembered onClose={close} /></View>;
  }
  return <PublicShareComposer />;
}
