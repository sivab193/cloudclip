import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import {
  unlockWithPassword,
  recoverWithCode,
  resetEncryptedData,
  WrongPasswordError,
} from '@/service/keyService';
import RecoveryCodeModal from './RecoveryCodeModal';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import { usePathname } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import PasswordField from './PasswordField';
import { isVaultFreeRoute } from '@/utils/publicRoutes';

type Mode = 'password' | 'recovery' | 'reset';

/**
 * Shown when signed in but the E2E master key is missing on this device
 * (fresh install, web reload, or a password reset elsewhere). Offers:
 * password unlock → recovery code → destructive reset.
 */
const UnlockModal: React.FC = () => {
  const { user, encryptionReady, authenticating, refreshEncryptionReady, logout } = useAuth();
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>('password');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState<string | null>(null);
  // Must stay above the early return — hooks cannot be conditional.
  const t = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Public links, privacy and account deletion never require decryption keys.
  const publicPage = isVaultFreeRoute(pathname);
  const visible = !!user && !encryptionReady && !authenticating && !publicPage;
  if (!visible && !newRecoveryCode) return null;

  const reset = () => {
    setPassword('');
    setRecoveryCode('');
    setError('');
    setMode('password');
  };

  const handleUnlock = async () => {
    if (!password) {
      setError('Enter your account password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { recoveryCode: fresh } = await unlockWithPassword(password);
      if (fresh) setNewRecoveryCode(fresh);
      await refreshEncryptionReady();
      reset();
    } catch (e) {
      if (e instanceof WrongPasswordError) {
        setError('That password can’t unlock your data. If you recently reset your password, use your recovery code.');
      } else {
        setError('Something went wrong. Check your connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRecover = async () => {
    if (!recoveryCode || !password) {
      setError('Enter your recovery code and your current account password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Redeeming a code burns it; surface the replacement immediately.
      const fresh = await recoverWithCode(recoveryCode, password);
      await refreshEncryptionReady();
      reset();
      setNewRecoveryCode(fresh);
    } catch (e) {
      if (e instanceof WrongPasswordError) {
        setError('Invalid recovery code.');
      } else {
        setError(e instanceof Error ? e.message : 'Recovery failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!password) {
      setError('Enter your account password to set up new encryption keys.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const fresh = await resetEncryptedData(password);
      setNewRecoveryCode(fresh);
      await refreshEncryptionReady();
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

  if (newRecoveryCode) {
    return (
      <RecoveryCodeModal
        visible={true}
        code={newRecoveryCode}
        onDone={() => setNewRecoveryCode(null)}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
       <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <View style={styles.box}>
          <View style={styles.icon}><Ionicons name="lock-open-outline" size={24} color={t.primary} /></View>
          <Text style={styles.title}>Unlock your data</Text>

          {mode === 'password' && (
            <>
              <Text style={styles.body}>
                Your clipboard data is end-to-end encrypted. Enter your account
                password to unlock it on this device.
              </Text>
              <PasswordField
                containerStyle={styles.passwordInput}
                placeholder="Account password"
                value={password}
                onChangeText={setPassword}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity style={styles.button} onPress={handleUnlock} disabled={busy}>
                {busy ? <ActivityIndicator color={t.onPrimary} /> : <Text style={styles.buttonText}>Unlock</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setError(''); setMode('recovery'); }}>
                <Text style={styles.link}>Use recovery code instead</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'recovery' && (
            <>
              <Text style={styles.body}>
                Enter the recovery code you saved at signup, plus your current
                account password. Your data will be re-linked to that password.
                This code is single-use — we’ll give you a new one to save.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Recovery code (XXXX-XXXX-...)"
                placeholderTextColor={t.placeholder}
                autoCapitalize="characters"
                value={recoveryCode}
                onChangeText={setRecoveryCode}
              />
              <PasswordField
                containerStyle={styles.passwordInput}
                placeholder="Current account password"
                value={password}
                onChangeText={setPassword}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity style={styles.button} onPress={handleRecover} disabled={busy}>
                {busy ? <ActivityIndicator color={t.onPrimary} /> : <Text style={styles.buttonText}>Recover</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setError(''); setMode('password'); }}>
                <Text style={styles.link}>Back to password unlock</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setError(''); setMode('reset'); }}>
                <Text style={[styles.link, styles.danger]}>I lost my recovery code</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'reset' && (
            <>
              <Text style={styles.body}>
                Without your password or recovery code, your encrypted data
                cannot be read by anyone — including us. Resetting will
                PERMANENTLY DELETE all your synced clipboard entries and shared
                links, and set up fresh encryption with your current password.
              </Text>
              <PasswordField
                containerStyle={styles.passwordInput}
                placeholder="Current account password"
                value={password}
                onChangeText={setPassword}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleReset} disabled={busy}>
                {busy ? <ActivityIndicator color={t.onPrimary} /> : <Text style={styles.buttonText}>Delete data & start fresh</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setError(''); setMode('recovery'); }}>
                <Text style={styles.link}>Back</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={logout}>
            <Text style={styles.link}>Log out</Text>
          </TouchableOpacity>
        </View>
       </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: t.overlay,
  },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  box: {
    width: '90%',
    maxWidth: 450,
    backgroundColor: t.glass,
    borderRadius: 28,
    padding: 30,
    borderWidth: 1,
    borderColor: t.border,
    shadowColor: t.primaryStrong,
    shadowOpacity: 0.18,
    shadowRadius: 42,
  },
  icon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: t.primarySoft, marginBottom: 18 },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: t.text,
  },
  body: {
    fontSize: 14,
    color: t.textMuted,
    marginBottom: 14,
  },
  input: {
    height: 54,
    borderColor: t.border,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    color: t.text,
    backgroundColor: t.surfaceAlt,
    fontSize: 16,
  },
  passwordInput: { marginBottom: 12 },
  button: {
    backgroundColor: t.primaryStrong,
    borderRadius: 14,
    minHeight: 50,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButton: {
    backgroundColor: t.danger,
  },
  buttonText: {
    color: t.onPrimary,
    fontWeight: 'bold',
  },
  link: {
    color: t.text,
    textDecorationLine: 'underline',
    textAlign: 'center',
    paddingVertical: 6,
  },
  danger: {
    color: t.danger,
  },
  error: {
    color: t.danger,
    marginBottom: 10,
  },
});

export default UnlockModal;
