import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import Header from '@/components/Header';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { apiService } from '@/service/apiService';
import { lockLocal } from '@/service/keyService';
import { clearSyncState } from '@/service/syncEngine';
import Confirmation from '@/components/Confirmation';

/**
 * Web-reachable account-deletion page (required by Google Play's data
 * deletion policy). The same action is available in the app's Account tab.
 */
export default function DeleteAccount() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleDelete = async () => {
    setConfirmVisible(false);
    setBusy(true);
    try {
      await apiService.deleteAccount();
      await lockLocal();
      await clearSyncState();
      await logout();
      setDone(true);
    } catch {
      setBusy(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header navigation={navigation} />
      <Confirmation
        message="Delete your account?"
        subtitle="This permanently deletes your account, all clipboard entries, shared links and devices. This cannot be undone."
        visible={confirmVisible}
        buttons={[
          { label: 'Cancel', onPress: () => setConfirmVisible(false), style: { backgroundColor: 'black' } },
          { label: 'Delete forever', onPress: handleDelete, style: { backgroundColor: '#b00020' } },
        ]}
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
          <TouchableOpacity style={styles.deleteButton} onPress={() => setConfirmVisible(true)} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteButtonText}>Delete my account</Text>}
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
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 20,
  },
  deleteButton: {
    backgroundColor: '#b00020',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  success: {
    fontSize: 16,
    color: 'green',
    fontWeight: 'bold',
  },
});
