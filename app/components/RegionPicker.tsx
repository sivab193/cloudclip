import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CloudClipRegion, getRememberedRegion, openRegion, regions } from '@/config/regions';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

type RegionState = 'checking' | 'available' | 'unavailable';
type Recommendation = {
  closestRegion: CloudClipRegion['id'];
  recommendedRegion: CloudClipRegion['id'];
};

interface Props {
  visible: boolean;
  destination?: '/' | '/shared' | '/share';
  onClose: () => void;
  redirectRemembered?: boolean;
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

export default function RegionPicker({ visible, destination = '/', onClose, redirectRemembered = false }: Props) {
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  const closeRef = useRef<View>(null);
  const [states, setStates] = useState<Record<string, RegionState>>({});
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [locating, setLocating] = useState(false);

  const refresh = useCallback(() => {
    setStates(Object.fromEntries(regions.map(region => [
      region.id,
      region.availability === 'coming-soon' ? 'unavailable' : 'checking',
    ])));
    for (const region of regions.filter(item => item.availability === 'available')) {
      void checkRegion(region).then(state => setStates(current => ({ ...current, [region.id]: state })));
    }
  }, []);

  const locate = useCallback(async () => {
    setLocating(true);
    try {
      const response = await fetch('/api/region', { cache: 'no-store' });
      if (!response.ok) throw new Error('Location unavailable');
      const result = await response.json() as Recommendation;
      if (!regions.some(region => region.id === result.recommendedRegion)) throw new Error('Invalid region');
      setRecommendation(result);
    } catch {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const closestRegion = timezone === 'Asia/Calcutta' || timezone === 'Asia/Kolkata' ? 'in' : 'us';
      setRecommendation({ closestRegion, recommendedRegion: 'us' });
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      if (redirectRemembered) {
        const remembered = getRememberedRegion();
        if (remembered?.availability === 'available') {
          void openRegion(remembered, destination);
          return;
        }
      }
      refresh();
      void locate();
      setTimeout(() => (closeRef.current as unknown as { focus?: () => void })?.focus?.(), 0);
    }
  }, [destination, locate, redirectRemembered, refresh, visible]);

  const recommendationText = recommendation?.closestRegion === 'in'
    ? 'India is closest to your approximate location. It’s coming soon, so United States is selected.'
    : 'Based on your approximate location, United States is selected.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable accessibilityLabel="Close region selector" style={StyleSheet.absoluteFill} onPress={onClose} />
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View role="dialog" accessibilityLabel="Choose your CloudClip data region" accessibilityViewIsModal style={[styles.sheet, compact && styles.sheetCompact]}>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text accessibilityRole="header" style={styles.title}>Choose where your data lives</Text>
              <Text style={styles.subtitle}>Your encrypted clips stay in the region you select. We’ll remember your choice for your next visit.</Text>
            </View>
            <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={21} color={t.text} />
            </Pressable>
          </View>

          <View style={styles.recommendation} accessibilityLiveRegion="polite">
            {locating ? <ActivityIndicator size="small" color={t.primary} /> : <Ionicons name="location-outline" size={18} color={t.primary} />}
            <Text style={styles.recommendationText}>{locating ? 'Finding the nearest available region…' : recommendationText}</Text>
          </View>

          <View style={styles.regions}>
            {regions.map(region => {
              const state = states[region.id] || 'checking';
              const comingSoon = region.availability === 'coming-soon';
              const available = !comingSoon && state === 'available';
              const recommended = recommendation?.recommendedRegion === region.id;
              return (
                <Pressable
                  key={region.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${region.name}, ${comingSoon ? 'coming soon' : state}`}
                  accessibilityState={{ disabled: !available, busy: !comingSoon && state === 'checking' }}
                  disabled={!available}
                  onPress={() => void openRegion(region, destination)}
                  style={({ pressed }) => [styles.region, compact && styles.regionCompact, available && styles.regionAvailable, pressed && styles.regionPressed]}
                >
                  <View style={[styles.regionMark, compact && styles.regionMarkCompact]}>
                    <Ionicons name={region.id === 'in' ? 'sunny-outline' : 'moon-outline'} size={22} color={available ? t.primary : t.textMuted} />
                  </View>
                  <View style={styles.regionCopy}>
                    <View style={styles.regionNameRow}>
                      <Text style={styles.regionName}>{region.name}</Text>
                      {recommended ? <Text style={styles.recommendedBadge}>Recommended</Text> : null}
                    </View>
                    <Text style={styles.regionLocation}>{region.location} data region</Text>
                  </View>
                  <View style={[styles.state, compact && styles.stateCompact]}>
                    {!comingSoon && state === 'checking' ? <ActivityIndicator size="small" color={t.textMuted} /> : <View style={[styles.stateDot, !available && styles.stateDotOffline, comingSoon && styles.stateDotSoon]} />}
                    <Text style={[styles.stateText, !available && styles.stateTextOffline, comingSoon && styles.stateTextSoon]}>
                      {comingSoon ? 'Coming soon' : state === 'checking' ? 'Checking' : available ? 'Available' : 'Temporarily offline'}
                    </Text>
                    {available ? <Ionicons name="arrow-forward" size={17} color={t.primary} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Ionicons name="lock-closed-outline" size={16} color={t.textMuted} />
            <Text style={styles.footerText}>You can switch regions here, but existing clips and shared links do not move with you.</Text>
            <Pressable accessibilityRole="button" onPress={refresh}><Text style={styles.retry}>Check again</Text></Pressable>
          </View>
        </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: t.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingVertical: 8 },
  sheet: { width: '100%', maxWidth: 650, backgroundColor: t.surface, borderRadius: 16, padding: 26, shadowColor: t.shadow, shadowOpacity: 0.24, shadowRadius: 36, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
  sheetCompact: { padding: 16 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  headingCopy: { flex: 1 },
  title: { color: t.text, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: t.textMuted, fontSize: 14, lineHeight: 22, marginTop: 9, maxWidth: 520 },
  close: { width: 44, height: 44, borderRadius: 12, backgroundColor: t.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  recommendation: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginTop: 20, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: t.primarySoft },
  recommendationText: { flex: 1, color: t.text, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  regions: { marginTop: 12, gap: 10 },
  region: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 14, backgroundColor: t.surfaceDisabled },
  regionCompact: { gap: 8, paddingHorizontal: 10 },
  regionAvailable: { backgroundColor: t.surfaceAlt },
  regionPressed: { transform: [{ scale: 0.995 }] },
  regionMark: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primarySoft },
  regionMarkCompact: { width: 36, height: 36 },
  regionCopy: { flex: 1 },
  regionNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  regionName: { color: t.text, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  recommendedBadge: { color: t.primary, fontSize: 10, lineHeight: 16, fontWeight: '800', paddingHorizontal: 7, borderRadius: 8, backgroundColor: t.primarySoft },
  regionLocation: { color: t.textMuted, fontSize: 12, marginTop: 2 },
  state: { minWidth: 112, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  stateCompact: { minWidth: 85, gap: 4 },
  stateDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: t.accent },
  stateDotOffline: { backgroundColor: t.danger },
  stateDotSoon: { backgroundColor: t.primary },
  stateText: { color: t.text, fontSize: 11, fontWeight: '700' },
  stateTextOffline: { color: t.textMuted },
  stateTextSoon: { color: t.primary },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: t.borderSubtle },
  footerText: { flex: 1, minWidth: 240, color: t.textMuted, fontSize: 11, lineHeight: 17 },
  retry: { minHeight: 44, color: t.primary, fontSize: 12, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 4 },
});
