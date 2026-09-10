import React from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

export default function OrbitScene() {
  const t = useTheme();
  return <View style={styles.scene}>
    <View style={[styles.glow, { backgroundColor: t.primarySoft }]} />
    <View style={[styles.orbit, styles.orbitWide, { borderColor: t.primary }]} />
    <View style={[styles.orbit, styles.orbitTall, { borderColor: t.primary }]} />
    <View style={[styles.core, { backgroundColor: t.primaryStrong, shadowColor: t.primaryStrong }]}><Ionicons name="sparkles" size={48} color={t.onPrimary} /></View>
    <View style={[styles.satellite, styles.satelliteOne, { backgroundColor: t.accent }]} />
    <View style={[styles.satellite, styles.satelliteTwo, { backgroundColor: t.primary }]} />
  </View>;
}

const styles = StyleSheet.create({
  scene: { height: 340, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', width: 240, height: 240, borderRadius: 999 },
  core: { width: 128, height: 128, borderRadius: 42, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '18deg' }], shadowOpacity: 0.4, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  orbit: { position: 'absolute', width: 245, height: 110, borderRadius: 999, borderWidth: 2, opacity: 0.38 },
  orbitWide: { transform: [{ rotate: '-14deg' }] },
  orbitTall: { transform: [{ rotate: '72deg' }] },
  satellite: { position: 'absolute', width: 18, height: 18, borderRadius: 6, transform: [{ rotate: '30deg' }] },
  satelliteOne: { top: 84, right: 68 }, satelliteTwo: { bottom: 82, left: 60 },
});
