import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { verifyAccountPassword } from '@/service/keyService';
import { apiService } from '@/service/apiService';
import { useTheme } from '@/hooks/useTheme';
import { auth } from '@/firebaseConfig';

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
    <View style={[styles.overlay, { backgroundColor: t.overlay }]}>
      <View style={[styles.box, { backgroundColor: t.surface }]}>
        <Text style={[styles.title, { color: t.text }]}>Delete your account?</Text>
        <Text style={{ color: t.textMuted }}>This permanently deletes your account, clipboard history, shared links and device records. Enter your account password to confirm.</Text>
        <TextInput accessibilityLabel="Account password" placeholder="Account password" placeholderTextColor={t.placeholder}
          secureTextEntry value={password} onChangeText={setPassword} editable={!busy}
          style={[styles.input, { color: t.text, borderColor: t.border }]} />
        {!!error && <Text accessibilityRole="alert" style={{ color: t.danger }}>{error}</Text>}
        <TouchableOpacity disabled={busy || !password} onPress={remove} style={[styles.button, { backgroundColor: t.danger }]}>
          {busy ? <ActivityIndicator color={t.onDanger} /> : <Text style={{ color: t.onDanger }}>Delete account and all data</Text>}
        </TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={close} style={styles.button}><Text style={{ color: t.text }}>Cancel</Text></TouchableOpacity>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  box: { width: '90%', maxWidth: 440, padding: 24, borderRadius: 12, gap: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
  input: { borderWidth: 1, borderRadius: 6, padding: 12 },
  button: { padding: 14, alignItems: 'center', borderRadius: 6 },
});
