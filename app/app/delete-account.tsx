import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import Header from '@/components/Header';
import { useAuth } from '@/auth/AuthContext';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';

/**
 * Web-reachable account-deletion page (required by Google Play's data
 * deletion policy). The same action is available in the app's Account tab.
 */
export default function DeleteAccount() {
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header />
      <DeleteAccountModal
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        onDeleted={() => setDone(true)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Delete your CloudClip account</Text>
        <Text style={styles.body}>
          Deleting your account permanently removes:
          {'\n'}• Your account and profile
          {'\n'}• All synced clipboard entries
          {'\n'}• All shared links
          {'\n'}• All registered devices
          {'\n\n'}This takes effect immediately and cannot be undone.
        </Text>
        {done ? (
          <Text style={styles.success}>Your account and all data have been deleted.</Text>
        ) : user ? (
          <TouchableOpacity style={styles.deleteButton} onPress={() => setConfirmVisible(true)}>
            <Text style={styles.deleteButtonText}>Delete my account</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.body}>
            To delete your account, log in first using the button in the top
            right corner, then return to this page. You can also delete your
            account from the Account tab inside the app.
          </Text>
        )}
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
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: t.textMuted,
    lineHeight: 22,
    marginBottom: 20,
  },
  deleteButton: {
    backgroundColor: t.danger,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: t.onDanger,
    fontWeight: 'bold',
    fontSize: 16,
  },
  success: {
    fontSize: 16,
    color: t.accent,
    fontWeight: 'bold',
  },
});
