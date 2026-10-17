import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CloudClipRegion, openRegion, regions } from '@/config/regions';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

type RegionState = 'checking' | 'available' | 'unavailable';

interface Props {
  visible: boolean;
  destination?: '/' | '/shared';
  onClose: () => void;
}

async function checkRegion(region: CloudClipRegion): Promise<RegionState> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`${region.apiUrl}/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    return response.ok ? 'available' : 'unavailable';
  } catch {
    return 'unavailable';
  } finally {
    clearTimeout(timeout);
  }
}

export default function RegionPicker({ visible, destination = '/', onClose }: Props) {
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
  const closeRef = useRef<View>(null);
  const [states, setStates] = useState<Record<string, RegionState>>({});

  const refresh = useCallback(() => {
    setStates(Object.fromEntries(regions.map(region => [region.id, 'checking'])));
    for (const region of regions) {
      void checkRegion(region).then(state => setStates(current => ({ ...current, [region.id]: state })));
    }
  }, []);

  useEffect(() => {
    if (visible) {
      refresh();
      setTimeout(() => (closeRef.current as unknown as { focus?: () => void })?.focus?.(), 0);
    }
  }, [visible, refresh]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable accessibilityLabel="Close region selector" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View role="dialog" accessibilityLabel="Choose your CloudClip data region" accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text accessibilityRole="header" style={styles.title}>Choose where your data lives</Text>
              <Text style={styles.subtitle}>Your encrypted clipboard stays in the region you select. Use the same region on every device you want to sync.</Text>
            </View>
            <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={21} color={t.text} />
            </Pressable>
          </View>

          <View style={styles.regions}>
            {regions.map(region => {
              const state = states[region.id] || 'checking';
              const available = state === 'available';
              return (
                <Pressable
                  key={region.id}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !available, busy: state === 'checking' }}
                  disabled={!available}
                  onPress={() => void openRegion(region, destination)}
                  style={({ pressed }) => [styles.region, available && styles.regionAvailable, pressed && styles.regionPressed]}
                >
                  <View style={styles.regionMark}>
                    <Ionicons name={region.id === 'in' ? 'sunny-outline' : 'moon-outline'} size={22} color={available ? t.primary : t.textMuted} />
                  </View>
                  <View style={styles.regionCopy}>
                    <Text style={styles.regionName}>{region.name}</Text>
                    <Text style={styles.regionLocation}>{region.location} data region</Text>
                  </View>
                  <View style={styles.state}>
                    {state === 'checking' ? <ActivityIndicator size="small" color={t.textMuted} /> : <View style={[styles.stateDot, !available && styles.stateDotOffline]} />}
                    <Text style={[styles.stateText, !available && styles.stateTextOffline]}>
                      {state === 'checking' ? 'Checking' : available ? 'Available' : 'Unavailable'}
                    </Text>
                    {available ? <Ionicons name="arrow-forward" size={17} color={t.primary} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Ionicons name="lock-closed-outline" size={16} color={t.textMuted} />
            <Text style={styles.footerText}>Regions are independent. Switching later does not move your existing account data.</Text>
            <Pressable accessibilityRole="button" onPress={refresh}><Text style={styles.retry}>Check again</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: t.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 650, backgroundColor: t.surface, borderRadius: 16, padding: 26, shadowColor: t.shadow, shadowOpacity: 0.24, shadowRadius: 36, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  headingCopy: { flex: 1 },
  title: { color: t.text, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: t.textMuted, fontSize: 14, lineHeight: 22, marginTop: 9, maxWidth: 520 },
  close: { width: 44, height: 44, borderRadius: 12, backgroundColor: t.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  regions: { marginTop: 25, gap: 10 },
  region: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 14, backgroundColor: t.surfaceDisabled },
  regionAvailable: { backgroundColor: t.surfaceAlt },
  regionPressed: { transform: [{ scale: 0.995 }] },
  regionMark: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primarySoft },
  regionCopy: { flex: 1 },
  regionName: { color: t.text, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  regionLocation: { color: t.textMuted, fontSize: 12, marginTop: 2 },
  state: { minWidth: 112, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  stateDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: t.accent },
  stateDotOffline: { backgroundColor: t.danger },
  stateText: { color: t.text, fontSize: 11, fontWeight: '700' },
  stateTextOffline: { color: t.textMuted },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: t.borderSubtle },
  footerText: { flex: 1, minWidth: 240, color: t.textMuted, fontSize: 11, lineHeight: 17 },
  retry: { minHeight: 44, color: t.primary, fontSize: 12, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 4 },
});
