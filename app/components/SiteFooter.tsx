import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

const creatorLinks = [
  { label: 'GitHub', url: 'https://github.com/sivab193', icon: 'logo-github' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/sivab193/', icon: 'logo-linkedin' },
  { label: 'Instagram', url: 'https://www.instagram.com/siv19.dev/', icon: 'logo-instagram' },
] as const;

export default function SiteFooter({ contained = false }: { contained?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
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
      <Text style={styles.motto}>Build • Automate • Open Source</Text>
      <View style={[styles.links, compact && styles.linksCompact]}>
        <Pressable accessibilityRole="link" onPress={() => router.push('/about')} style={styles.linkHit}><Text style={styles.link}>About</Text></Pressable>
        <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} style={styles.linkHit}><Text style={styles.link}>Privacy</Text></Pressable>
        <Pressable accessibilityRole="link" accessibilityLabel="siv19.dev (opens in a new tab)" onPress={() => openExternal('https://siv19.dev/')} style={styles.linkHit}>
          <Text style={styles.link}>siv19.dev</Text>
        </Pressable>
        <View style={styles.socials}>
        {creatorLinks.map(({ label, url, icon }) =>
          <Pressable key={label} accessibilityRole="link" accessibilityLabel={`${label} (opens in a new tab)`} onPress={() => openExternal(url)} style={styles.iconHit}>
            <Ionicons name={icon} size={17} color={t.textMuted} />
          </Pressable>
        )}
        </View>
      </View>
    </View>
  </View>;
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  footer: { width: '100%', borderTopWidth: 1, borderTopColor: t.borderSubtle, backgroundColor: t.surface, paddingHorizontal: 22, paddingVertical: 14 },
  contained: { paddingHorizontal: 0 },
  inner: { width: '100%', maxWidth: 1240, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  innerCompact: { flexDirection: 'column', gap: 2 },
  motto: { color: t.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 2 },
  linksCompact: { maxWidth: 340 },
  linkHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  link: { color: t.textMuted, fontSize: 12, fontWeight: '600' },
  socials: { flexDirection: 'row', alignItems: 'center' },
  iconHit: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
});
