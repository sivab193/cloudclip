import React, { useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import LoginPopup from './LoginModal';
import RegionPicker from './RegionPicker';
import { deploymentMode } from '@/config/regions';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

const platforms = [
  { name: 'Web', icon: 'globe-outline', live: true },
  { name: 'iOS', icon: 'logo-apple', live: false },
  { name: 'Android', icon: 'logo-android', live: false },
  { name: 'macOS', icon: 'desktop-outline', live: false },
  { name: 'Windows', icon: 'logo-windows', live: false },
  { name: 'Linux', icon: 'terminal-outline', live: false },
] as const;

export default function Description() {
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const compact = !hydrated || width < 860;
  const [login, setLogin] = useState(false);
  const [regionDestination, setRegionDestination] = useState<'/' | '/shared' | '/share' | null>(null);

  const go = (destination: '/' | '/shared' | '/share') => {
    if (deploymentMode === 'gateway') setRegionDestination(destination);
    else if (destination === '/') setLogin(true);
    else router.push(destination);
  };

  return <View style={styles.page}>
    <View style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.heroCopy}>
        <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>A quieter way to move text.</Text>
        <Text style={styles.intro}>Keep useful snippets close, then send one as a private, expiring link when someone else needs it.</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="link" onPress={() => go('/share')} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>Share text without an account</Text>
            <Ionicons name="arrow-forward" size={18} color={t.onPrimary} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => go('/')} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>Open my clipboard</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="link" onPress={() => go('/shared')} style={styles.existingLink}>
          <Text style={styles.existingText}>Have a shared link? Open it</Text>
          <Ionicons name="arrow-forward" size={15} color={t.primary} />
        </Pressable>
      </View>

      <View accessibilityLabel="Example of a text clip becoming a private share link" style={[styles.demo, compact && styles.demoCompact]}>
        <View style={styles.demoTop}><Text style={styles.demoLabel}>A CLIP, FROM THOUGHT TO LINK</Text><Text style={styles.exampleLabel}>EXAMPLE</Text></View>
        <View style={styles.note}>
          <View style={styles.noteMeta}><View style={styles.noteDot} /><Text style={styles.noteMetaText}>A quick note</Text><Text style={styles.noteTime}>10:42</Text></View>
          <Text style={styles.noteText}>The little things you need later should be easy to find now.</Text>
          <View style={styles.noteFooter}><Ionicons name="lock-closed-outline" size={15} color={t.accent} /><Text style={styles.noteFooterText}>Encrypted before it leaves your browser</Text></View>
        </View>
        <View style={styles.transfer}><View style={styles.transferLine} /><View style={styles.transferIcon}><Ionicons name="arrow-down" size={17} color={t.primary} /></View><View style={styles.transferLine} /></View>
        <View style={styles.linkPreview}><View style={styles.linkSymbol}><Ionicons name="link-outline" size={19} color={t.primary} /></View><View style={styles.linkCopy}><Text style={styles.linkTitle}>Private link ready</Text><Text style={styles.linkDetail}>Only the complete link opens the clip</Text></View><Ionicons name="arrow-forward" size={18} color={t.textMuted} /></View>
        <View style={styles.demoBottom}><Text style={styles.demoBottomText}>Nothing to install. No account needed to share.</Text></View>
      </View>
    </View>

    <View style={styles.hairline} />
    <View style={[styles.story, compact && styles.storyCompact]}>
      <View style={styles.storyIntro}><Text style={styles.sectionTitle}>A clipboard that stays out of your way.</Text><Text style={styles.sectionIntro}>Save the text you use across contexts. Your personal stream stays available when you sign in to the same region.</Text></View>
      <View style={styles.storyPoints}>
        <View style={styles.storyPoint}><Text style={styles.pointNumber}>01</Text><View style={styles.pointBody}><Text style={styles.pointTitle}>Capture what matters</Text><Text style={styles.pointText}>A link, command, note, or idea. Add it to your encrypted stream.</Text></View></View>
        <View style={styles.storyPoint}><Text style={styles.pointNumber}>02</Text><View style={styles.pointBody}><Text style={styles.pointTitle}>Pick up where you left off</Text><Text style={styles.pointText}>Find and copy your text from the web on another device.</Text></View></View>
        <View style={styles.storyPoint}><Text style={styles.pointNumber}>03</Text><View style={styles.pointBody}><Text style={styles.pointTitle}>Share, then let go</Text><Text style={styles.pointText}>Send an encrypted text link that expires after a day or a week.</Text></View></View>
      </View>
    </View>

    <View style={styles.platformSection}>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Available today. More on the way.</Text><Text style={styles.sectionIntro}>CloudClip works on the web now. Native apps and file transfer are planned.</Text></View>
      <View style={styles.platforms}>{platforms.map(platform => <View key={platform.name} style={[styles.platform, !platform.live && styles.platformSoon]}><Ionicons name={platform.icon} size={21} color={platform.live ? t.primary : t.textDisabled} /><Text style={[styles.platformName, !platform.live && styles.platformNameSoon]}>{platform.name}</Text><Text style={[styles.platformState, platform.live ? styles.platformLive : styles.platformStateSoon]}>{platform.live ? 'Live' : 'Coming soon'}</Text></View>)}</View>
      <View style={[styles.upNext, compact && styles.upNextCompact]}><View style={styles.nextItem}><Ionicons name="document-attach-outline" size={21} color={t.primary} /><Text style={styles.nextText}>Encrypted file transfer <Text style={styles.nextSoon}>— coming soon</Text></Text></View><View style={styles.nextItem}><Ionicons name="keypad-outline" size={21} color={t.primary} /><Text style={styles.nextText}>CloudClip keyboard <Text style={styles.nextSoon}>— coming soon</Text></Text></View></View>
    </View>

    <View style={[styles.close, compact && styles.closeCompact]}><View><Text style={styles.closeTitle}>Your words. Your control.</Text><Text style={styles.closeText}>Self-hosting is on the roadmap for people who want to run CloudClip on their own infrastructure.</Text></View><Pressable accessibilityRole="link" onPress={() => go('/share')} style={styles.closeAction}><Text style={styles.closeActionText}>Create a private link</Text><Ionicons name="arrow-forward" size={17} color="#283449" /></Pressable></View>
    <LoginPopup isVisible={login} onClose={() => setLogin(false)} onSuccess={() => setLogin(false)} />
    <RegionPicker visible={regionDestination !== null} destination={regionDestination ?? '/'} onClose={() => setRegionDestination(null)} />
  </View>;
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  page: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 22 },
  hero: { minHeight: 620, flexDirection: 'row', alignItems: 'center', gap: 70, paddingVertical: 86 },
  heroCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 44, minHeight: 0, paddingTop: 58, paddingBottom: 70 },
  heroCopy: { flex: 1 },
  title: { color: t.text, fontSize: 68, lineHeight: 72, letterSpacing: -2.2, fontWeight: '800', maxWidth: 600 },
  titleCompact: { fontSize: 44, lineHeight: 49, letterSpacing: -1.4 },
  intro: { color: t.textMuted, fontSize: 18, lineHeight: 29, maxWidth: 490, marginTop: 25 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginTop: 32 },
  primary: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20, borderRadius: 9, backgroundColor: t.primaryStrong },
  primaryText: { color: t.onPrimary, fontSize: 14, fontWeight: '700' },
  secondary: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 19, borderRadius: 9, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  secondaryText: { color: t.text, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: .76 },
  existingLink: { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 },
  existingText: { color: t.primary, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  demo: { width: '46%', maxWidth: 500, padding: 20, borderRadius: 13, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  demoCompact: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  demoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingBottom: 20 },
  demoLabel: { color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: .7 },
  exampleLabel: { color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: .7 },
  note: { padding: 25, borderRadius: 9, backgroundColor: t.surfaceAlt },
  noteMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.accent },
  noteMetaText: { color: t.textMuted, fontSize: 12, fontWeight: '700' },
  noteTime: { color: t.textMuted, fontSize: 12, marginLeft: 'auto' },
  noteText: { color: t.text, fontSize: 22, lineHeight: 31, fontWeight: '600', letterSpacing: -.4, marginTop: 28, marginBottom: 35 },
  noteFooter: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  noteFooterText: { color: t.textMuted, fontSize: 12 },
  transfer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  transferLine: { flex: 1, height: 1, backgroundColor: t.borderSubtle },
  transferIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  linkPreview: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 17, borderRadius: 9, borderWidth: 1, borderColor: t.border },
  linkSymbol: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primarySoft },
  linkCopy: { flex: 1 },
  linkTitle: { color: t.text, fontSize: 14, fontWeight: '700' },
  linkDetail: { color: t.textMuted, fontSize: 12, marginTop: 4 },
  demoBottom: { paddingTop: 18 }, demoBottomText: { color: t.textMuted, fontSize: 12 },
  hairline: { height: 1, backgroundColor: t.borderSubtle },
  story: { flexDirection: 'row', gap: 85, paddingVertical: 95 }, storyCompact: { flexDirection: 'column', gap: 38, paddingVertical: 70 },
  storyIntro: { flex: 1 }, sectionTitle: { color: t.text, fontSize: 36, lineHeight: 43, fontWeight: '800', letterSpacing: -.9, maxWidth: 500 },
  sectionIntro: { color: t.textMuted, fontSize: 15, lineHeight: 25, maxWidth: 510, marginTop: 16 },
  storyPoints: { flex: 1.1 }, storyPoint: { flexDirection: 'row', gap: 25, paddingVertical: 22, borderTopWidth: 1, borderColor: t.borderSubtle },
  pointNumber: { color: t.primary, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'], paddingTop: 2 }, pointBody: { flex: 1 },
  pointTitle: { color: t.text, fontSize: 17, fontWeight: '700' }, pointText: { color: t.textMuted, fontSize: 14, lineHeight: 22, marginTop: 7 },
  platformSection: { paddingTop: 75, paddingBottom: 85, borderTopWidth: 1, borderColor: t.borderSubtle }, sectionHeading: { marginBottom: 35 },
  platforms: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  platform: { minWidth: 160, flexGrow: 1, flexBasis: 165, minHeight: 105, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface },
  platformSoon: { backgroundColor: t.surfaceAlt, borderColor: t.borderSubtle },
  platformName: { color: t.text, fontSize: 14, fontWeight: '700', marginTop: 12 }, platformNameSoon: { color: t.textMuted },
  platformState: { position: 'absolute', top: 16, right: 16, fontSize: 10, fontWeight: '700' }, platformLive: { color: t.accent }, platformStateSoon: { color: t.textMuted },
  upNext: { flexDirection: 'row', gap: 45, paddingTop: 32 }, upNextCompact: { flexDirection: 'column', gap: 18 },
  nextItem: { flexDirection: 'row', alignItems: 'center', gap: 10 }, nextText: { color: t.text, fontSize: 14, fontWeight: '600' }, nextSoon: { color: t.textMuted, fontWeight: '400' },
  close: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 35, padding: 44, borderRadius: 12, backgroundColor: '#283449' },
  closeCompact: { flexDirection: 'column', alignItems: 'stretch', padding: 28 }, closeTitle: { color: '#f6f5f1', fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -.7 },
  closeText: { color: '#dce3e6', fontSize: 14, lineHeight: 23, maxWidth: 590, marginTop: 10 },
  closeAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f6f5f1' },
  closeActionText: { color: '#283449', fontSize: 13, fontWeight: '700' },
});
