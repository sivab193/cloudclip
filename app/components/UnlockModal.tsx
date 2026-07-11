import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import {
  unlockWithPassword,
  recoverWithCode,
  resetEncryptedData,
  WrongPasswordError,
} from '@/service/keyService';
import RecoveryCodeModal from './RecoveryCodeModal';

type Mode = 'password' | 'recovery' | 'reset';

/**
 * Shown when signed in but the E2E master key is missing on this device
 * (fresh install, web reload, or a password reset elsewhere). Offers:
 * password unlock → recovery code → destructive reset.
 */
const UnlockModal: React.FC = () => {
  const { user, encryptionReady, refreshEncryptionReady, logout } = useAuth();
  const [mode, setMode] = useState<Mode>('password');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState<string | null>(null);

  const visible = !!user && !encryptionReady;
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
      await recoverWithCode(recoveryCode, password);
      await refreshEncryptionReady();
      reset();
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
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Unlock your data</Text>

          {mode === 'password' && (
            <>
              <Text style={styles.body}>
                Your clipboard data is end-to-end encrypted. Enter your account
                password to unlock it on this device.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Account password"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity style={styles.button} onPress={handleUnlock} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Unlock</Text>}
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
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Recovery code (XXXX-XXXX-...)"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                value={recoveryCode}
                onChangeText={setRecoveryCode}
              />
              <TextInput
                style={styles.input}
                placeholder="Current account password"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity style={styles.button} onPress={handleRecover} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Recover</Text>}
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
              <TextInput
                style={styles.input}
                placeholder="Current account password"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              {!!error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleReset} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Delete data & start fresh</Text>}
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  box: {
    width: '85%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  body: {
    fontSize: 14,
    color: '#333',
    marginBottom: 14,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 12,
    paddingHorizontal: 8,
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButton: {
    backgroundColor: '#b00020',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  link: {
    color: '#000',
    textDecorationLine: 'underline',
    textAlign: 'center',
    paddingVertical: 6,
  },
  danger: {
    color: '#b00020',
  },
  error: {
    color: '#b00020',
    marginBottom: 10,
  },
});

export default UnlockModal;
