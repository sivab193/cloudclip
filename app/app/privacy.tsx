import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, Platform } from 'react-native';
import Header from '@/components/Header';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';

const UPDATED = 'September 7, 2026';

export default function PrivacyPolicy() {
  const styles = useThemedStyles(makeStyles);
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>CloudClip Privacy Policy</Text>
        <Text style={styles.meta}>Last updated: {UPDATED}</Text>

        <Text style={styles.heading}>What CloudClip does</Text>
        <Text style={styles.body}>
          CloudClip lets you save text snippets and sync them between your own
          devices, and share text with others through expiring links.
        </Text>

        <Text style={styles.heading}>End-to-end encryption</Text>
        <Text style={styles.body}>
          Your clipboard entries and shared texts are encrypted on your device
          with AES-256-GCM before upload. The sync server stores encrypted
          content without its decryption key. Anyone you give a full share link
          or code can read its text. Your encryption key is
          protected by your account password and a recovery code; if you lose
          both, your data cannot be recovered by anyone — including us.
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
          • Encrypted clipboard entries and encrypted shared texts — to provide
          the sync and sharing features. These are unreadable to us.{'\n'}
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
          remain until you delete them. Account deletion removes your account
          and associated data from the active service. Content already copied
          by you or a share recipient remains on those devices. Hosting-provider
          security logs and backups follow the provider's retention policies.
        </Text>

        <Text style={styles.heading}>Deleting your account</Text>
        <Text style={styles.body}>
          You can delete your account and all associated data at any time from
          the Account tab in the app, or at https://cc.siv19.dev/delete-account.
        </Text>

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.body}>
          Questions or requests: sivaganesh1903@gmail.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: t.background,
    paddingTop: Platform.OS === 'web' ? 0 : 30,
  },
  content: {
    padding: 20,
    maxWidth: 720,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: t.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: t.textMuted,
    marginBottom: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: t.text,
    marginTop: 18,
    marginBottom: 6,
  },
  body: {
    fontSize: 15,
    color: t.textMuted,
    lineHeight: 22,
  },
});
