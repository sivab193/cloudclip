import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, Platform } from 'react-native';
import Header from '@/components/Header';
import { useNavigation } from 'expo-router';

const UPDATED = 'July 11, 2026';

export default function PrivacyPolicy() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header navigation={navigation} />
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
          with keys only you hold (AES-256-GCM). Our servers store only
          ciphertext and can never read your content. Your encryption key is
          protected by your account password and a recovery code; if you lose
          both, your data cannot be recovered by anyone — including us.
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
          We do not sell or share your data with third parties, do not show
          ads, and do not use your content for any purpose. We cannot read your
          clipboard content even if we wanted to.
        </Text>

        <Text style={styles.heading}>Data retention</Text>
        <Text style={styles.body}>
          Shared links expire automatically (up to 30 days). Clipboard entries
          remain until you delete them. Deleting your account immediately and
          permanently removes all your data from our servers.
        </Text>

        <Text style={styles.heading}>Deleting your account</Text>
        <Text style={styles.body}>
          You can delete your account and all associated data at any time from
          the Account tab in the app, or at https://cc.siv19.dev/delete-account.
        </Text>

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.body}>
          Questions or requests: weebsgpt@gmail.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#000',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 18,
    marginBottom: 6,
  },
  body: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});
