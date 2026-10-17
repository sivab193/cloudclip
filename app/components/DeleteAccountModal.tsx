import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { verifyAccountPassword } from '@/service/keyService';
import { apiService } from '@/service/apiService';
import { useTheme } from '@/hooks/useTheme';
import { auth } from '@/firebaseConfig';
import PasswordField from './PasswordField';

export default function DeleteAccountModal({ visible, onClose, onDeleted }: {
  visible: boolean; onClose: () => void; onDeleted: () => void;
}) {
  const { user, logout } = useAuth();
  const t = useTheme();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setPassword(''); setError(''); }, [user]);
  const close = () => { if (!busy) { setPassword(''); setError(''); onClose(); } };
  const remove = async () => {
    if (!password || busy) return;
    const owner = auth.currentUser;
    if (!owner) return;
    setBusy(true);
    setError('');
    try {
      await verifyAccountPassword(password);
      if (auth.currentUser !== owner) return;
      await apiService.deleteAccount();
      if (auth.currentUser !== owner) return;
      await logout();
      setPassword('');
      onClose();
      onDeleted();
    } catch {
      setError('Deletion failed. Check your password and connection, then try again. For help: sivaganesh1903@gmail.com.');
    } finally { setBusy(false); }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
    <KeyboardAvoidingView style={[styles.overlay, { backgroundColor: t.overlay }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
     <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
      <View style={[styles.box, { backgroundColor: t.surface }]}>
        <Text style={[styles.title, { color: t.text }]}>Delete your account?</Text>
        <Text style={{ color: t.textMuted }}>This deletes your shared sign-in and clipboard data in this region. If you also used the other region, its data is not deleted automatically. Email sivaganesh1903@gmail.com to remove that data before deleting your sign-in. Enter your password to confirm.</Text>
        <PasswordField accessibilityLabel="Account password" placeholder="Account password"
          value={password} onChangeText={setPassword} editable={!busy} />
        {!!error && <Text accessibilityRole="alert" style={{ color: t.danger }}>{error}</Text>}
        <TouchableOpacity disabled={busy || !password} onPress={remove} style={[styles.button, { backgroundColor: t.danger }]}>
          {busy ? <ActivityIndicator color={t.onDanger} /> : <Text style={{ color: t.onDanger }}>Delete account and all data</Text>}
        </TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={close} style={styles.button}><Text style={{ color: t.text }}>Cancel</Text></TouchableOpacity>
      </View>
     </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  box: { width: '90%', maxWidth: 440, padding: 24, borderRadius: 12, gap: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
  button: { padding: 14, alignItems: 'center', borderRadius: 6 },
});
