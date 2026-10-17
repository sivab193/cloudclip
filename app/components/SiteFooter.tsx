import React from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';

const creatorLinks = [
  { label: 'siv19.dev', url: 'https://siv19.dev/' },
  { label: 'GitHub', url: 'https://github.com/sivab193' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/sivab193/' },
  { label: 'Instagram', url: 'https://www.instagram.com/siv19.dev/' },
] as const;

export default function SiteFooter({ contained = false }: { contained?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const router = useRouter();

  const openExternal = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      void Linking.openURL(url);
    }
  };

  return <View style={[styles.footer, contained && styles.contained]}>
    <View style={[styles.inner, compact && styles.innerCompact]}>
      <View style={styles.identity}>
        <View style={styles.brandRow}>
          <Image source={require('../assets/images/logo.png')} accessibilityLabel="CloudClip" style={styles.mark} />
          <Text style={styles.brand}>CloudClip</Text>
        </View>
        <Text style={styles.motto}>Build • Automate • Open Source</Text>
      </View>
      <View style={styles.links}>
        <Pressable accessibilityRole="link" onPress={() => router.push('/about')} style={styles.linkHit}><Text style={styles.link}>About</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} style={styles.linkHit}><Text style={styles.link}>Privacy</Text></Pressable>
        {creatorLinks.map(({ label, url }) =>
          <Pressable key={label} accessibilityRole="link" accessibilityLabel={`${label} (opens in a new tab)`} onPress={() => openExternal(url)} style={styles.linkHit}>
            <Text style={styles.link}>{label}</Text>
          </Pressable>
        )}
      </View>
    </View>
    <Text style={styles.copyright}>© {new Date().getFullYear()} CloudClip</Text>
  </View>;
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  footer: { width: '100%', borderTopWidth: 1, borderTopColor: t.borderSubtle, backgroundColor: t.background, paddingHorizontal: 22, paddingTop: 30, paddingBottom: 28 },
  contained: { paddingHorizontal: 0 },
  inner: { width: '100%', maxWidth: 1240, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 28 },
  innerCompact: { flexDirection: 'column', gap: 15 },
  identity: { gap: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: { width: 28, height: 28, borderRadius: 7 },
  brand: { color: t.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
  motto: { color: t.textMuted, fontSize: 12, lineHeight: 18 },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, maxWidth: 650 },
  linkHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  link: { color: t.textMuted, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  copyright: { width: '100%', maxWidth: 1240, alignSelf: 'center', color: t.textMuted, fontSize: 11, marginTop: 15 },
});
