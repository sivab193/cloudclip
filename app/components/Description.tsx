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
import RegionPicker from './RegionPicker';
import { deploymentMode } from '@/config/regions';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

const platforms = [
  { name: 'Web', icon: 'globe-outline', status: 'Live', live: true },
  { name: 'iOS', icon: 'logo-apple', status: 'Soon', live: false },
  { name: 'Android', icon: 'logo-android', status: 'Soon', live: false },
  { name: 'macOS', icon: 'desktop-outline', status: 'Soon', live: false },
  { name: 'Windows', icon: 'logo-windows', status: 'Soon', live: false },
  { name: 'Linux', icon: 'terminal-outline', status: 'Soon', live: false },
] as const;

export default function Description() {
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [login, setLogin] = useState(false);
  const [regionDestination, setRegionDestination] = useState<'/' | '/shared' | null>(null);
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const compact = !hydrated || width < 820;
  const chooseRegionOr = (destination: '/' | '/shared', action: () => void) => {
    if (deploymentMode === 'gateway') setRegionDestination(destination);
    else action();
  };

  return <Reveal><View style={styles.stage}>
    <AmbientBackdrop />
    <View style={styles.page}>
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={styles.copy}>
          <View style={styles.badge}><View style={styles.dot} /><Text style={styles.eyebrow}>YOUR PRIVATE CLIPBOARD CLOUD</Text></View>
          <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>Ideas move.{ '\n' }<Text style={{ color: t.primary }}>You stay in flow.</Text></Text>
          <Text style={styles.body}>A beautifully simple home for the text that matters now. Capture it once, find it in your private encrypted stream, and share expiring fragments without friction.</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => chooseRegionOr('/', () => setLogin(true))} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>Launch clipboard stream</Text><Ionicons name="sparkles-outline" size={19} color={t.onPrimary} /></Pressable>
            <Pressable accessibilityRole="link" onPress={() => chooseRegionOr('/shared', () => router.push('/shared'))} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Ionicons name="link-outline" size={17} color={t.primary} /><Text style={styles.secondaryText}>Open a shared clip</Text><Ionicons name="arrow-up-right-box-outline" size={16} color={t.textMuted} /></Pressable>
          </View>
          <View style={styles.trustRow}><View style={styles.trustItem}><Ionicons name="shield-checkmark-outline" size={16} color={t.accent} /><Text style={styles.small}>End-to-end encrypted</Text></View><View style={styles.trustItem}><Ionicons name="eye-off-outline" size={16} color={t.primary} /><Text style={styles.small}>Private by design</Text></View></View>
        </View>
        <View style={[styles.art, compact && styles.artCompact]}>
          <View style={styles.artHeader}><View style={styles.artLabel}><Ionicons name="planet-outline" size={17} color={t.primary} /><Text style={styles.artTitle}>CONTINUITY VAULT</Text></View><View style={styles.livePill}><View style={styles.pulseDot} /><Text style={styles.liveText}>LIVE SYNC</Text></View></View>
          <View style={styles.orbit}><OrbitScene /></View>
          <View style={styles.shard}><View style={styles.shardDot} /><Text style={styles.shardText}>Encrypted clip · in orbit</Text></View>
          <View style={styles.artFooter}><Text style={styles.artCaption}>ONE THOUGHT · INSTANT CONTINUITY</Text><Text style={styles.artHint}>Move your pointer to inspect</Text></View>
        </View>
      </View>

      <View style={styles.sectionLead}><Text style={styles.sectionTitle}>One small action. Instant momentum.</Text><Text style={styles.sectionBody}>CloudClip disappears into your workflow instead of becoming another workspace to manage.</Text></View>
      <View style={[styles.features, compact && styles.stack]}>
        {([
          ['copy-outline', 'A little copy. A big leap.', 'Save a note, terminal command, link, or spark of inspiration. Your active stream stays lightweight and close.'],
          ['lock-closed-outline', 'Private by design.', 'Your text is encrypted locally before upload. CloudClip cannot read the contents of your encrypted stream.'],
          ['flame-outline', 'Share it. Then let it go.', 'Send an expiring encrypted link. Anyone with the complete link can open it—no account required.'],
        ] as const).map(([icon, title, body]) => <View key={title} style={styles.feature}><View style={styles.icon}><Ionicons name={icon} size={23} color={t.primary} /></View><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureBody}>{body}</Text></View>)}
      </View>

      <View style={[styles.roadmap, compact && styles.stack]}>
        <View style={styles.roadmapCopy}><Text style={styles.roadmapTitle}>The clipboard, everywhere.</Text><Text style={styles.roadmapBody}>The web app is ready today. Native CloudClip apps are next, bringing the same private stream to every screen you use.</Text><View style={styles.fileNotice}><View style={styles.fileIcon}><Ionicons name="document-attach-outline" size={22} color={t.primary} /></View><View style={styles.fileCopy}><View style={styles.soonRow}><Text style={styles.fileTitle}>Encrypted file transfer</Text><Text style={styles.soonBadge}>COMING SOON</Text></View><Text style={styles.featureBody}>Move files with the same simple, expiring, encrypted flow.</Text></View></View></View>
        <View style={styles.platformList}>{platforms.map((platform) => <View key={platform.name} style={[styles.platform, !platform.live && styles.platformMuted]}><View style={styles.platformName}><Ionicons name={platform.icon} size={20} color={platform.live ? t.accent : t.textDisabled} /><Text style={[styles.platformText, !platform.live && styles.mutedText]}>{platform.name}</Text></View><View style={[styles.status, platform.live ? styles.statusLive : styles.statusSoon]}><Text style={[styles.statusText, { color: platform.live ? t.accent : t.textDisabled }]}>{platform.status}</Text></View></View>)}</View>
      </View>

      <View style={[styles.future, compact && styles.stack]}>
        <View style={styles.futureIntro}><Text style={styles.futureTitle}>Your cloud. Or yours alone.</Text><Text style={styles.futureBody}>CloudClip will soon be self-hostable for people and teams who want the highest level of clipboard privacy and complete control over where encrypted data lives.</Text></View>
        <View style={styles.keyboard}><View style={styles.keyboardTop}><Ionicons name="keypad-outline" size={24} color={t.primary} /><Text style={styles.soonBadge}>COMING SOON</Text></View><Text style={styles.keyboardTitle}>A keyboard with CloudClip built in.</Text><Text style={styles.featureBody}>Open your encrypted stream from a custom keyboard and paste the right clip without leaving the app you are using.</Text><View style={styles.keyRow}>{['⌘', 'CloudClip', 'Paste'].map(label => <View key={label} style={[styles.key, label === 'CloudClip' && styles.keyActive]}><Text style={[styles.keyText, label === 'CloudClip' && { color: t.onPrimary }]}>{label}</Text></View>)}</View></View>
      </View>

      <View style={[styles.finalCta, compact && styles.finalCtaCompact]}><View><Text style={styles.finalTitle}>Keep the thought. Lose the friction.</Text><Text style={styles.finalBody}>Start on the web today. Choose the region closest to you.</Text></View><Pressable accessibilityRole="button" onPress={() => chooseRegionOr('/', () => setLogin(true))} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>Enter CloudClip</Text><Ionicons name="arrow-forward" size={19} color={t.onPrimary} /></Pressable></View>
      <View style={styles.footer}><Text style={styles.small}>© CloudClip · Built for private continuity.</Text><Pressable accessibilityRole="link" onPress={() => router.push('/privacy')}><Text style={styles.footerLink}>Privacy ↗</Text></Pressable></View>
    </View>
    <LoginPopup isVisible={login} onClose={() => setLogin(false)} onSuccess={() => setLogin(false)} />
    <RegionPicker visible={regionDestination !== null} destination={regionDestination ?? '/'} onClose={() => setRegionDestination(null)} />
  </View></Reveal>;
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  stage: { width: '100%', position: 'relative', overflow: 'hidden' },
  page: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 22 },
  hero: { flexDirection: 'row', alignItems: 'center', paddingTop: 66, paddingBottom: 92, gap: 42, minHeight: 660 },
  heroCompact: { flexDirection: 'column', alignItems: 'stretch', paddingTop: 42, paddingBottom: 70 }, copy: { flex: 1, width: '100%' },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 24, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 99, backgroundColor: t.primarySoft, borderWidth: 1, borderColor: t.borderSubtle }, dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: t.accent }, eyebrow: { fontSize: 10, letterSpacing: 1.7, fontWeight: '800', color: t.primary },
  title: { fontSize: 76, lineHeight: 78, letterSpacing: -3, fontWeight: '800', color: t.text, maxWidth: 610 }, titleCompact: { fontSize: 48, lineHeight: 52, letterSpacing: -1.8 }, body: { fontSize: 17, lineHeight: 28, color: t.textMuted, maxWidth: 530, marginTop: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 32 }, primary: { minHeight: 52, backgroundColor: t.primaryStrong, paddingVertical: 15, paddingHorizontal: 22, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: t.primaryStrong, shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 7 }, primaryText: { color: t.onPrimary, fontSize: 14, fontWeight: '800' }, secondary: { minHeight: 52, flexDirection: 'row', gap: 9, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 15, backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderSubtle }, secondaryText: { color: t.text, fontSize: 13, fontWeight: '700' }, pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 23 }, trustItem: { flexDirection: 'row', alignItems: 'center', gap: 7 }, small: { color: t.textMuted, fontSize: 12, lineHeight: 20 },
  art: { width: '51%', minHeight: 500, backgroundColor: t.glass, borderRadius: 28, overflow: 'hidden', shadowColor: t.primaryStrong, shadowOpacity: 0.16, shadowRadius: 60, shadowOffset: { width: 0, height: 30 }, elevation: 10 }, artCompact: { width: '100%', minHeight: 430 }, orbit: { position: 'absolute', inset: 0 }, artHeader: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderColor: t.borderSubtle }, artLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 }, artTitle: { color: t.text, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }, livePill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: t.accentSoft }, pulseDot: { width: 6, height: 6, borderRadius: 6, backgroundColor: t.accent }, liveText: { color: t.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 }, shard: { zIndex: 2, position: 'absolute', left: 18, top: 82, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderSubtle }, shardDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: t.primary }, shardText: { color: t.textMuted, fontSize: 10, fontWeight: '600' }, artFooter: { zIndex: 2, position: 'absolute', left: 18, right: 18, bottom: 0, paddingVertical: 16, borderTopWidth: 1, borderColor: t.borderSubtle, flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, artCaption: { color: t.text, fontSize: 9, fontWeight: '700', letterSpacing: 1.8 }, artHint: { color: t.textMuted, fontSize: 9 },
  sectionLead: { borderTopWidth: 1, borderColor: t.borderSubtle, paddingTop: 58, paddingBottom: 30 }, sectionTitle: { color: t.text, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1.1 }, sectionBody: { color: t.textMuted, fontSize: 15, lineHeight: 24, maxWidth: 560, marginTop: 12 }, features: { flexDirection: 'row', gap: 18 }, stack: { flexDirection: 'column' }, feature: { flex: 1, paddingVertical: 28, paddingRight: 24, borderTopWidth: 1, borderColor: t.border }, icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primarySoft, borderRadius: 14, marginBottom: 25 }, featureTitle: { color: t.text, fontSize: 19, fontWeight: '700', letterSpacing: -0.3, marginBottom: 11 }, featureBody: { color: t.textMuted, fontSize: 14, lineHeight: 23 },
  roadmap: { marginTop: 92, paddingVertical: 44, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.borderSubtle, flexDirection: 'row', gap: 60 }, roadmapCopy: { flex: 1 }, roadmapTitle: { color: t.text, fontSize: 38, lineHeight: 43, fontWeight: '800', letterSpacing: -1.2 }, roadmapBody: { color: t.textMuted, fontSize: 15, lineHeight: 25, marginTop: 15, maxWidth: 520 }, fileNotice: { flexDirection: 'row', gap: 15, alignItems: 'flex-start', marginTop: 30, paddingTop: 26, borderTopWidth: 1, borderColor: t.borderSubtle }, fileIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: t.primarySoft }, fileCopy: { flex: 1 }, fileTitle: { color: t.text, fontSize: 15, fontWeight: '700' }, soonRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 6 }, soonBadge: { color: t.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 99, backgroundColor: t.primarySoft, overflow: 'hidden' },
  platformList: { flex: 1, gap: 1, backgroundColor: t.borderSubtle, borderRadius: 16, overflow: 'hidden' }, platform: { minHeight: 58, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, backgroundColor: t.surface }, platformMuted: { backgroundColor: t.surfaceDisabled, opacity: 0.72 }, platformName: { flexDirection: 'row', alignItems: 'center', gap: 12 }, platformText: { color: t.text, fontSize: 14, fontWeight: '700' }, mutedText: { color: t.textDisabled }, status: { minWidth: 48, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 9, borderRadius: 99 }, statusLive: { backgroundColor: t.accentSoft }, statusSoon: { backgroundColor: t.background }, statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  future: { marginTop: 22, flexDirection: 'row', gap: 22 }, futureIntro: { flex: 1, minHeight: 330, justifyContent: 'flex-end', padding: 34, borderRadius: 16, backgroundColor: t.primaryStrong }, futureTitle: { color: t.onPrimary, fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -1 }, futureBody: { color: t.onPrimary, opacity: 0.82, fontSize: 15, lineHeight: 24, marginTop: 14, maxWidth: 480 }, keyboard: { flex: 1, minHeight: 330, padding: 30, borderRadius: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderSubtle }, keyboardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }, keyboardTitle: { color: t.text, fontSize: 25, lineHeight: 31, fontWeight: '800', letterSpacing: -0.7, marginBottom: 10 }, keyRow: { flexDirection: 'row', gap: 8, marginTop: 28 }, key: { flex: 1, minHeight: 47, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.borderSubtle }, keyActive: { flex: 1.8, backgroundColor: t.primaryStrong, borderColor: t.primaryStrong }, keyText: { color: t.textMuted, fontSize: 11, fontWeight: '700' },
  finalCta: { marginTop: 92, paddingVertical: 42, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.borderSubtle, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 26 }, finalCtaCompact: { flexDirection: 'column', alignItems: 'stretch' }, finalTitle: { color: t.text, fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.9 }, finalBody: { color: t.textMuted, fontSize: 14, marginTop: 8 }, footer: { paddingVertical: 34, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }, footerLink: { color: t.text, fontSize: 12, fontWeight: '700', paddingVertical: 4 },
});
