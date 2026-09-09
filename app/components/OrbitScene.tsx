import React from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

export default function OrbitScene() {
  const t = useTheme();
  return <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="cloud-outline" size={180} color={t.primary} /></View>;
}
