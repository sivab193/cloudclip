import React, { useState, useSyncExternalStore } from 'react';
import { StyleSheet, View, Text, Pressable, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import LoginPopup from './LoginModal';
import OrbitScene from './OrbitScene';
import Reveal from './Reveal';

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
  return <Reveal><View style={styles.page}>
    <View style={[styles.hero, compact && { flexDirection: 'column', paddingTop: 30 }]}>
      <View style={styles.copy}>
        <View style={styles.badge}><View style={styles.dot} /><Text style={styles.eyebrow}>SMALL IDEAS. ZERO DISTANCE.</Text></View>
        <Text accessibilityRole="header" style={[styles.title, compact && { fontSize: 48, lineHeight: 53 }]}>Copy here.{ '\n' }<Text style={{ color: t.primary }}>Continue{ '\n' }anywhere.</Text></Text>
        <Text style={styles.body}>Your next great thought shouldn’t be stuck on one device. Give your text a place to move — privately, effortlessly, everywhere you work.</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => setLogin(true)} style={({ pressed }) => [styles.primary, { opacity: pressed ? 0.8 : 1 }]}><Text style={styles.primaryText}>Get started</Text><Ionicons name="arrow-forward" size={20} color={t.onPrimary} /></Pressable>
          <Pressable accessibilityRole="link" onPress={() => router.push('/shared')} style={styles.secondary}><Text style={styles.secondaryText}>Open a shared clip</Text><Ionicons name="arrow-up-right-box-outline" size={17} color={t.text} /></Pressable>
        </View>
        <View style={styles.note}><Ionicons name="shield-checkmark-outline" size={16} color={t.accent} /><Text style={styles.small}>Encrypted before it leaves your device</Text></View>
      </View>
      <View style={[styles.art, compact && { width: '100%', minHeight: 360 }]}>
        <View style={styles.orbit}><OrbitScene /></View>
        <View style={[styles.floating, { top: 24, left: 12 }]}><Ionicons name="laptop-outline" size={20} color={t.primary} /><Text style={styles.cardLabel}>A thought on your laptop</Text><View style={styles.dot} /></View>
        <View style={[styles.floating, { bottom: 42, right: 8 }]}><Ionicons name="phone-portrait-outline" size={20} color={t.primary} /><View><Text style={styles.cardLabel}>Ready on your phone</Text><Text style={styles.small}>Pick up where you left off</Text></View><Ionicons name="checkmark-circle" size={20} color={t.accent} /></View>
        <Text style={styles.artCaption}>YOUR IDEAS, IN ORBIT</Text>
      </View>
    </View>
    <View style={styles.strip}><Text style={styles.stripTitle}>Less friction. More flow.</Text><Text style={styles.small}>One clipboard for the way you work.</Text></View>
    <View style={[styles.features, compact && { flexDirection: 'column' }]}>
      {([
        ['copy-outline', '01', 'A little copy. A big leap.', 'Save a note, a link, or a spark of inspiration. Find your text on your other signed-in devices.'],
        ['lock-closed-outline', '02', 'Private by design.', 'Your text is encrypted before upload. Enable automatic sync only when you want it, while the app is open.'],
        ['link-outline', '03', 'Share it. Then let it go.', 'Send an expiring encrypted link. Anyone with the complete link can open it — no account needed.'],
      ] as const).map(([icon, number, title, body]) => <View key={number} style={styles.feature}><View style={styles.featureTop}><View style={styles.icon}><Ionicons name={icon} size={24} color={t.primary} /></View><Text style={styles.number}>{number}</Text></View><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureBody}>{body}</Text></View>)}
    </View>
    <View style={styles.footer}><Text style={styles.small}>A calmer home for everything you copy.</Text><Pressable accessibilityRole="link" onPress={() => router.push('/privacy')}><Text style={styles.secondaryText}>Your privacy matters ↗</Text></Pressable></View>
    <LoginPopup isVisible={login} onClose={() => setLogin(false)} onSuccess={() => setLogin(false)} />
  </View></Reveal>;
}
const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  page: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: 20 },
  hero: { flexDirection: 'row', alignItems: 'center', paddingTop: 64, paddingBottom: 60, gap: 24 },
  copy: { flex: 1, width: '100%' }, badge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: t.accent }, eyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: '700', color: t.textMuted },
  title: { fontSize: 72, lineHeight: 76, letterSpacing: -3, fontWeight: '800', color: t.text },
  body: { fontSize: 17, lineHeight: 28, color: t.textMuted, maxWidth: 430, marginTop: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18, marginTop: 30 },
  primary: { backgroundColor: t.primary, paddingVertical: 17, paddingHorizontal: 24, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 20 }, primaryText: { color: t.onPrimary, fontSize: 15, fontWeight: '700' },
  secondary: { flexDirection: 'row', gap: 7, alignItems: 'center', paddingVertical: 14 }, secondaryText: { color: t.text, fontSize: 13, fontWeight: '600' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22 }, small: { color: t.textMuted, fontSize: 12, lineHeight: 20 },
  art: { width: '48%', minHeight: 440, backgroundColor: t.surfaceAlt, borderRadius: 36, borderWidth: 1, borderColor: t.borderSubtle }, orbit: { position: 'absolute', inset: 0 },
  floating: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderSubtle, borderRadius: 16, shadowColor: t.shadow, shadowOpacity: 0.07, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  cardLabel: { color: t.text, fontSize: 12, fontWeight: '600' }, artCaption: { position: 'absolute', bottom: 13, alignSelf: 'center', color: t.textMuted, fontSize: 9, letterSpacing: 3 },
  strip: { borderTopWidth: 1, borderColor: t.borderSubtle, paddingVertical: 28, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, stripTitle: { color: t.text, fontSize: 20, fontWeight: '600', letterSpacing: -0.5 },
  features: { flexDirection: 'row', gap: 16 }, feature: { flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderSubtle, borderRadius: 22, padding: 26 }, featureTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }, icon: { backgroundColor: t.surfaceAlt, padding: 12, borderRadius: 14 }, number: { color: t.textMuted, fontSize: 12 }, featureTitle: { color: t.text, fontSize: 19, fontWeight: '600', letterSpacing: -0.4, marginBottom: 12 }, featureBody: { color: t.textMuted, fontSize: 14, lineHeight: 23 },
  footer: { paddingVertical: 35, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
});
