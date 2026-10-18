import React from 'react';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Header from '@/components/Header';
import SiteFooter from '@/components/SiteFooter';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';

export default function About() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();

  return <SafeAreaView style={styles.safeArea}>
    <AmbientBackdrop />
    <Header />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.article}>
        <Text accessibilityRole="header" style={styles.title}>About CloudClip</Text>
        <Text style={styles.lead}>A quieter way to move useful text between devices and people.</Text>

        <View style={styles.section}>
          <Text style={styles.heading}>Why it exists</Text>
          <Text style={styles.body}>A command, address, link, or thought is often too small for a document but too useful to lose. CloudClip gives that text a place to land and a simple way to pass it on.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>What works today</Text>
          <Text style={styles.body}>The web app can save encrypted text clips to a personal stream. Anyone can also create an encrypted, expiring text link without an account. The full link carries the decryption secret; its four-character reference alone cannot open the clip.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Your region, your data</Text>
          <Text style={styles.body}>CloudClip recommends the nearest available region before you sign in. The United States region is live now; India is coming soon. Your browser remembers your choice, and you can switch regions whenever you need to.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>What comes next</Text>
          <Text style={styles.body}>iOS, Android, macOS, Windows and Linux apps, encrypted file transfer, a CloudClip keyboard, and a self-hosted edition are planned—not available yet.</Text>
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="link" onPress={() => router.push('/share')} style={styles.action}><Text style={styles.actionText}>Share text now</Text></Pressable>
          <Pressable accessibilityRole="link" onPress={() => router.push('/privacy')} style={styles.secondary}><Text style={styles.secondaryText}>Read our privacy approach</Text></Pressable>
        </View>
      </View>
      <SiteFooter contained />
    </ScrollView>
  </SafeAreaView>;
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: t.background, paddingTop: Platform.OS === 'web' ? 0 : 30 },
  content: { width: '100%', maxWidth: 850, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 54, paddingBottom: 40 },
  article: { paddingBottom: 64 },
  title: { color: t.text, fontSize: 44, lineHeight: 50, fontWeight: '800', letterSpacing: -1.3 },
  lead: { color: t.textMuted, fontSize: 18, lineHeight: 29, marginTop: 16, maxWidth: 650 },
  section: { borderTopWidth: 1, borderColor: t.borderSubtle, paddingTop: 24, marginTop: 30 },
  heading: { color: t.text, fontSize: 22, lineHeight: 29, fontWeight: '700', marginBottom: 9 },
  body: { color: t.textMuted, fontSize: 16, lineHeight: 27, maxWidth: 720 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 38 },
  action: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 9, backgroundColor: t.primaryStrong },
  actionText: { color: t.onPrimary, fontSize: 14, fontWeight: '700' },
  secondary: { minHeight: 50, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 9, borderWidth: 1, borderColor: t.border },
  secondaryText: { color: t.text, fontSize: 14, fontWeight: '700' },
});
