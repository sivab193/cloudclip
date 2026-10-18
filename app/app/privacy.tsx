import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, Platform, View } from 'react-native';
import Header from '@/components/Header';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import Reveal from '@/components/Reveal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import SiteFooter from '@/components/SiteFooter';

const UPDATED = 'October 17, 2026';

export default function PrivacyPolicy() {
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackdrop />
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <Reveal>
        <View style={styles.hero}><View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={25} color={t.primary} /></View><Text style={styles.kicker}>YOUR DATA, YOURS</Text><Text style={styles.title}>Privacy without{ '\n' }the fine-print fog.</Text><Text style={styles.meta}>Last updated {UPDATED}</Text></View>
        <View style={styles.document}>

        <Text style={styles.heading}>What CloudClip does</Text>
        <Text style={styles.body}>
          CloudClip lets you save text snippets and sync them between your own
          devices, and share text with others through expiring links.
        </Text>

        <Text style={styles.heading}>How encryption works</Text>
        <Text style={styles.body}>
          Your personal clipboard entries are end-to-end encrypted on your
          device with AES-256-GCM before upload. Their encryption key is
          protected by your account password and recovery code; if you lose
          both, your clipboard data cannot be recovered by anyone — including
          us. Shared texts are also encrypted in the client. To let a recipient
          open one using only its four-character code, CloudClip stores that
          share's recovery token encrypted at rest on the backend and returns
          it through a tightly rate-limited lookup. Anyone with the code or
          short link can read that shared text until it expires.
        </Text>

        <Text style={styles.heading}>Clipboard access</Text>
        <Text style={styles.body}>
          You can paste and save text manually. Automatic clipboard access is
          off by default. If you enable it in Account settings, CloudClip reads
          text while the app is open, encrypts and uploads it to your account,
          and may replace your clipboard with your latest synced text.
          CloudClip does not monitor your clipboard in the background.
        </Text>

        <Text style={styles.heading}>Data we collect</Text>
        <Text style={styles.body}>
          • Email address and display name — to create and manage your account
          (authentication is provided by Google Firebase Authentication).{'\n'}
          • App-generated device identifiers and device names — so you can see
          and manage which of your devices are connected.{'\n'}
          • End-to-end encrypted clipboard entries and client-encrypted shared
          texts — to provide sync and sharing. Share recovery tokens are
          protected with backend encryption at rest so short codes can work.{'\n'}
          • Basic technical logs (IP address, request timestamps) — kept
          briefly for security and abuse prevention.
        </Text>

        <Text style={styles.heading}>What we do NOT do</Text>
        <Text style={styles.body}>
          We do not sell your data or show ads. Service providers process data
          to run CloudClip: Firebase Authentication manages identity, MongoDB
          stores account and encrypted sync data, and hosting providers deliver
          the app and API. We use your data to provide these features and
          protect the service. Text stored before encryption was introduced
          may still be unencrypted; the app offers to delete those old entries.
        </Text>

        <Text style={styles.heading}>Data retention</Text>
        <Text style={styles.body}>
          Shared links expire automatically (up to 30 days). Clipboard entries
          remain until you delete them. Account deletion removes your shared
          sign-in and data in the active region, but does not currently remove
          data from the other region. Content already copied
          by you or a share recipient remains on those devices. Hosting-provider
          security logs and backups follow the provider's retention policies.
        </Text>

        <Text style={styles.heading}>Deleting your account</Text>
        <Text style={styles.body}>
          You can delete your account from the Account tab in the regional
          CloudClip app where your data is stored. If you used both regions,
          contact us before deleting your sign-in so we can remove data in both.
        </Text>

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.body}>
          Questions or requests: sivaganesh1903@gmail.com
        </Text>
        </View>
        </Reveal>
        <SiteFooter contained />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: t.background,
    paddingTop: Platform.OS === 'web' ? 0 : 30,
    position: 'relative',
  },
  content: {
    padding: 20,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingTop: 50,
    paddingBottom: 100,
  },
  hero: { marginBottom: 28, paddingHorizontal: 4 },
  icon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primarySoft, marginBottom: 18 },
  kicker: { color: t.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1.8, marginBottom: 8 },
  title: {
    fontSize: 44,
    lineHeight: 49,
    letterSpacing: -2,
    fontWeight: '800',
    color: t.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: t.textMuted,
    marginTop: 12,
  },
  document: { backgroundColor: t.glass, borderWidth: 1, borderColor: t.borderSubtle, borderRadius: 26, padding: 30, shadowColor: t.shadow, shadowOpacity: 0.06, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } },
  heading: {
    fontSize: 19,
    fontWeight: 'bold',
    color: t.text,
    marginTop: 24,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: t.textMuted,
    lineHeight: 24,
  },
});
