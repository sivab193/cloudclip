import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, Platform, View } from 'react-native';
import Header from '@/components/Header';
import { useAuth } from '@/auth/AuthContext';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';
import { useTheme } from '@/hooks/useTheme';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import Reveal from '@/components/Reveal';
import Ionicons from '@expo/vector-icons/Ionicons';

/**
 * Web-reachable account-deletion page (required by Google Play's data
 * deletion policy). The same action is available in the app's Account tab.
 */
export default function DeleteAccount() {
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
  const { user } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackdrop />
      <Header />
      <DeleteAccountModal
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        onDeleted={() => setDone(true)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Reveal>
        <View style={styles.card}>
        <View style={styles.icon}><Ionicons name="person-remove-outline" size={25} color={t.danger} /></View>
        <Text style={styles.kicker}>ACCOUNT CONTROL</Text>
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
        </View>
        </Reveal>
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
    maxWidth: 680,
    alignSelf: 'center',
    paddingTop: 60,
    paddingBottom: 100,
  },
  card: { backgroundColor: t.glass, borderWidth: 1, borderColor: t.borderSubtle, borderRadius: 28, padding: 32, shadowColor: t.shadow, shadowOpacity: 0.07, shadowRadius: 30, shadowOffset: { width: 0, height: 14 } },
  icon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(176, 0, 32, 0.09)', marginBottom: 18 },
  kicker: { color: t.danger, fontSize: 9, fontWeight: '800', letterSpacing: 1.8, marginBottom: 8 },
  title: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1.4,
    fontWeight: '800',
    color: t.text,
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: t.textMuted,
    lineHeight: 25,
    marginBottom: 20,
  },
  deleteButton: {
    backgroundColor: t.danger,
    borderRadius: 14,
    minHeight: 50,
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
