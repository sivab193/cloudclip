import React, { useState, useSyncExternalStore } from 'react';
import { StyleSheet, View, Text, Pressable, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import LoginPopup from './LoginModal';
import OrbitScene from './OrbitScene';
import Reveal from './Reveal';
import AmbientBackdrop from './AmbientBackdrop';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export default function Description() {
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [login, setLogin] = useState(false);
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const compact = !hydrated || width < 800;
  return <Reveal><View style={styles.stage}>
    <AmbientBackdrop />
    <View style={styles.page}>
    <View style={[styles.hero, compact && { flexDirection: 'column', paddingTop: 30 }]}>
      <View style={styles.copy}>
        <View style={styles.badge}><View style={styles.dot} /><Text style={styles.eyebrow}>YOUR PRIVATE CLIPBOARD CLOUD</Text></View>
        <Text accessibilityRole="header" style={[styles.title, compact && { fontSize: 49, lineHeight: 52 }]}>Ideas move.{ '\n' }<Text style={{ color: t.primary }}>You stay{ '\n' }in flow.</Text></Text>
        <Text style={styles.body}>A beautifully simple space for the text that matters now. Capture it once, find it everywhere, and share it securely.</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => setLogin(true)} style={({ pressed }) => [styles.primary, { opacity: pressed ? 0.8 : 1 }]}><Text style={styles.primaryText}>Get started</Text><Ionicons name="arrow-forward" size={20} color={t.onPrimary} /></Pressable>
          <Pressable accessibilityRole="link" onPress={() => router.push('/shared')} style={styles.secondary}><Text style={styles.secondaryText}>Open a shared clip</Text><Ionicons name="arrow-up-right-box-outline" size={17} color={t.text} /></Pressable>
        </View>
        <View style={styles.note}><Ionicons name="shield-checkmark-outline" size={16} color={t.accent} /><Text style={styles.small}>End-to-end encrypted · Built for focus</Text></View>
      </View>
      <View style={[styles.art, compact && { width: '100%', minHeight: 360 }]}>
        <View style={styles.orbit}><OrbitScene /></View>
        <View style={[styles.floating, { top: 24, left: 12 }]}><Ionicons name="laptop-outline" size={20} color={t.primary} /><Text style={styles.cardLabel}>A thought on your laptop</Text><View style={styles.dot} /></View>
        <View style={[styles.floating, { bottom: 42, right: 8 }]}><Ionicons name="phone-portrait-outline" size={20} color={t.primary} /><View><Text style={styles.cardLabel}>Ready on your phone</Text><Text style={styles.small}>Pick up where you left off</Text></View><Ionicons name="checkmark-circle" size={20} color={t.accent} /></View>
        <View style={styles.livePill}><View style={styles.pulseDot} /><Text style={styles.liveText}>LIVE SYNC</Text></View>
        <Text style={styles.artCaption}>ONE THOUGHT · EVERY SCREEN</Text>
      </View>
    </View>
    <View style={styles.strip}><Text style={styles.stripTitle}>One small action. Instant momentum.</Text><Text style={styles.small}>Designed to disappear into your workflow.</Text></View>
    <View style={[styles.features, compact && { flexDirection: 'column' }]}>
      {([
        ['copy-outline', '01', 'A little copy. A big leap.', 'Save a note, a link, or a spark of inspiration. Find your text on your other signed-in devices.'],
        ['lock-closed-outline', '02', 'Private by design.', 'Your text is encrypted before upload. Enable automatic sync only when you want it, while the app is open.'],
        ['link-outline', '03', 'Share it. Then let it go.', 'Send an expiring encrypted link. Anyone with the complete link can open it — no account needed.'],
      ] as const).map(([icon, number, title, body]) => <View key={number} style={styles.feature}><View style={styles.featureTop}><View style={styles.icon}><Ionicons name={icon} size={24} color={t.primary} /></View><Text style={styles.number}>{number}</Text></View><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureBody}>{body}</Text></View>)}
    </View>
    <View style={[styles.flowPanel, compact && { flexDirection: 'column' }]}>
      <View style={styles.flowCopy}><Text style={styles.kicker}>EFFORTLESS BY DESIGN</Text><Text style={styles.flowTitle}>From spark to screen in a single beat.</Text><Text style={styles.featureBody}>CloudClip keeps the useful fragments of your day close—commands, links, notes, and ideas—without turning them into another system to manage.</Text></View>
      <View style={[styles.flowVisual, compact && styles.flowVisualCompact]}>
        {['MacBook', 'CloudClip', 'iPhone'].map((label, index) => <React.Fragment key={label}><View style={[styles.flowNode, index === 1 && styles.flowNodeActive]}><Ionicons name={index === 0 ? 'laptop-outline' : index === 1 ? 'sparkles-outline' : 'phone-portrait-outline'} size={20} color={index === 1 ? t.onPrimary : t.primary} /><Text style={[styles.flowLabel, index === 1 && { color: t.onPrimary }]}>{label}</Text></View>{index < 2 && <View style={styles.flowLine}><Ionicons name="arrow-forward" size={14} color={t.textMuted} /></View>}</React.Fragment>)}
      </View>
    </View>
    <View style={styles.footer}><Text style={styles.small}>A calmer home for everything you copy.</Text><Pressable accessibilityRole="link" onPress={() => router.push('/privacy')}><Text style={styles.secondaryText}>Your privacy matters ↗</Text></Pressable></View>
    <LoginPopup isVisible={login} onClose={() => setLogin(false)} onSuccess={() => setLogin(false)} />
  </View></View></Reveal>;
}
const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  stage: { width: '100%', position: 'relative', overflow: 'hidden' },
  page: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 22 },
  hero: { flexDirection: 'row', alignItems: 'center', paddingTop: 74, paddingBottom: 76, gap: 42, minHeight: 650 },
  copy: { flex: 1, width: '100%' }, badge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: t.accent }, eyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: '700', color: t.textMuted },
  title: { fontSize: 78, lineHeight: 79, letterSpacing: -4.4, fontWeight: '800', color: t.text },
  body: { fontSize: 17, lineHeight: 28, color: t.textMuted, maxWidth: 430, marginTop: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18, marginTop: 30 },
  primary: { backgroundColor: t.primaryStrong, paddingVertical: 18, paddingHorizontal: 25, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 24, shadowColor: t.primaryStrong, shadowOpacity: 0.34, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 7 }, primaryText: { color: t.onPrimary, fontSize: 15, fontWeight: '700' },
  secondary: { flexDirection: 'row', gap: 7, alignItems: 'center', paddingVertical: 14 }, secondaryText: { color: t.text, fontSize: 13, fontWeight: '600' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22 }, small: { color: t.textMuted, fontSize: 12, lineHeight: 20 },
  art: { width: '51%', minHeight: 500, backgroundColor: t.glass, borderRadius: 40, borderWidth: 1, borderColor: t.border, overflow: 'hidden', shadowColor: t.primaryStrong, shadowOpacity: 0.13, shadowRadius: 60, shadowOffset: { width: 0, height: 30 }, elevation: 10 }, orbit: { position: 'absolute', inset: 0 },
  floating: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: t.glass, borderWidth: 1, borderColor: t.border, borderRadius: 16, shadowColor: t.shadow, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  cardLabel: { color: t.text, fontSize: 12, fontWeight: '600' }, artCaption: { position: 'absolute', bottom: 13, alignSelf: 'center', color: t.textMuted, fontSize: 9, letterSpacing: 3 },
  livePill: { position: 'absolute', top: 18, right: 18, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99, backgroundColor: t.accentSoft },
  pulseDot: { width: 6, height: 6, borderRadius: 6, backgroundColor: t.accent }, liveText: { color: t.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  strip: { borderTopWidth: 1, borderColor: t.borderSubtle, paddingVertical: 32, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, stripTitle: { color: t.text, fontSize: 21, fontWeight: '600', letterSpacing: -0.7 },
  features: { flexDirection: 'row', gap: 16 }, feature: { flex: 1, backgroundColor: t.glass, borderWidth: 1, borderColor: t.borderSubtle, borderRadius: 24, padding: 28, shadowColor: t.shadow, shadowOpacity: 0.055, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } }, featureTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }, icon: { backgroundColor: t.primarySoft, padding: 12, borderRadius: 14 }, number: { color: t.textMuted, fontSize: 12 }, featureTitle: { color: t.text, fontSize: 19, fontWeight: '600', letterSpacing: -0.4, marginBottom: 12 }, featureBody: { color: t.textMuted, fontSize: 14, lineHeight: 23 },
  flowPanel: { marginTop: 18, borderRadius: 28, padding: 34, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.borderSubtle, flexDirection: 'row', alignItems: 'center', gap: 36, overflow: 'hidden' },
  flowCopy: { flex: 1 }, kicker: { color: t.primary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 13 }, flowTitle: { color: t.text, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -1.2, marginBottom: 12 },
  flowVisual: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, flowNode: { minWidth: 92, alignItems: 'center', gap: 9, padding: 16, borderRadius: 18, backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderSubtle }, flowNodeActive: { backgroundColor: t.primaryStrong, transform: [{ scale: 1.08 }], shadowColor: t.primaryStrong, shadowOpacity: 0.3, shadowRadius: 18 }, flowLabel: { color: t.text, fontSize: 11, fontWeight: '600' }, flowLine: { flex: 1, height: 1, backgroundColor: t.border, alignItems: 'center', justifyContent: 'center', maxWidth: 54 },
  flowVisualCompact: { width: '100%', transform: [{ scale: 0.82 }] },
  footer: { paddingVertical: 35, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
});
