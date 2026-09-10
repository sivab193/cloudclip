import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Alert, TouchableOpacity, Text, Modal, TouchableWithoutFeedback, ActivityIndicator, Platform } from 'react-native';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/auth/AuthContext';
import { apiService } from '@/service/apiService';
import { unlockWithPassword, WrongPasswordError } from '@/service/keyService';
import RecoveryCodeModal from './RecoveryCodeModal';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

// Web `alert` fallback since RN Alert.alert is a no-op on react-native-web.
const showMessage = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const LoginModal = ({ isVisible, onClose, onSuccess }: { isVisible: boolean; onClose: () => void; onSuccess: () => void; }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const t = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { setAuthenticating, refreshEncryptionReady } = useAuth();

  const resetFields = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setIsSignUpMode(false);
    setIsForgotPasswordMode(false);
  };

  const finishAuth = async (pw: string): Promise<string | null> => {
    // Set up or unlock E2E encryption with the password we just verified.
    try {
      const { recoveryCode: fresh } = await unlockWithPassword(pw);
      await refreshEncryptionReady();
      return fresh ?? null;
    } catch (error) {
      if (error instanceof WrongPasswordError) {
        // Password was reset elsewhere — the unlock screen will take over.
        await refreshEncryptionReady();
        return null;
      }
      throw error;
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showMessage('Input Error', 'Please enter both email and password.');
      return;
    }
    setBusy(true);
    setAuthenticating(true);
    try {
      await signInWithEmailAndPassword(auth, username.trim(), password);
      await apiService.syncUser();
      const fresh = await finishAuth(password);
      if (fresh) {
        setRecoveryCode(fresh);
        return;
      }

      onSuccess();
      onClose();
      resetFields();
    } catch (error: any) {
      if (auth.currentUser) {
        onClose();
        resetFields();
        showMessage('Signed in — data is still locked', 'Could not connect or unlock your data. Check your connection and use the unlock screen to retry.');
        return;
      }
      let message = 'An error occurred';
      if (error.code === 'auth/user-not-found') {
        message = 'No user found with this email.';
      } else if (error.code === 'auth/invalid-credential') {
        message = 'Incorrect email or password.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Try again later.';
      }
      showMessage('Login Error', message);
    } finally {
      setBusy(false);
      setAuthenticating(false);
    }
  };

  const handleSignUp = async () => {
    if (!username || !password || !confirmPassword || !name) {
      showMessage('Input Error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      showMessage('Password Error', 'Passwords do not match.');
      return;
    }
    setBusy(true);
    setAuthenticating(true);
    try {
      await createUserWithEmailAndPassword(auth, username.trim(), password);
      await apiService.syncUser(name);

      const fresh = await finishAuth(password);
      if (fresh) {
        // Keep the modal open until the user confirms they saved the code.
        setRecoveryCode(fresh);
      } else {
        onSuccess();
        onClose();
        resetFields();
      }
    } catch (error: any) {
      if (auth.currentUser) {
        onClose();
        resetFields();
        showMessage('Account created — setup is incomplete', 'Your account exists, but encryption setup could not finish. Check your connection and use the unlock screen to retry.');
        return;
      }
      let message = 'An error occurred';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Email is already in use.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak.';
      }
      showMessage('Sign Up Error', message);
    } finally {
      setBusy(false);
      setAuthenticating(false);
    }
  };

  const handleRecoveryDone = () => {
    setRecoveryCode(null);
    onSuccess();
    onClose();
    resetFields();
  };

  const handleForgotPassword = async () => {
    if (!username) {
      showMessage('Input Error', 'Please enter your email address.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, username.trim());
      showMessage(
        'Reset email sent',
        'Heads up: after resetting your password you will need your recovery code to keep your encrypted clipboard data.'
      );
      setIsForgotPasswordMode(false);
    } catch (error: any) {
      let message = 'An error occurred';
      if (error.code === 'auth/user-not-found') {
        message = 'No user found with this email.';
      }
      showMessage('Forgot Password Error', message);
    }
  };

  const handleModalContentPress = (e: any) => {
    e.stopPropagation();
  };

  if (recoveryCode) {
    return <RecoveryCodeModal visible={true} code={recoveryCode} onDone={handleRecoveryDone} />;
  }

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={() => { if (!busy) { onClose(); resetFields(); } }}>
      <TouchableWithoutFeedback onPress={() => {
        if (busy) return;
        onClose();
        resetFields();
      }}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={handleModalContentPress}>
            <View style={styles.modalBox}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close sign-in dialog"
                disabled={busy} style={styles.closeButton}
                onPress={() => { onClose(); resetFields(); }}>
                <Ionicons name="close" size={20} color={t.textMuted} />
              </TouchableOpacity>
              <View style={styles.brandMark}><Ionicons name="cloud-done-outline" size={25} color={t.onPrimary} /></View>
              {isForgotPasswordMode ? (
                <>
                  <Text style={styles.titleText}>Reset your password</Text>
                  <Text style={styles.subtitleText}>We’ll send a secure reset link to your inbox.</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={t.placeholder}
                    value={username}
                    onChangeText={setUsername}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.button} onPress={handleForgotPassword}>
                    <Text style={styles.buttonText}>Send Reset Email</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsForgotPasswordMode(false)} style={styles.button}>
                    <Text style={styles.buttonText}>Back to Login</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.titleText}>{isSignUpMode ? 'Create your space' : 'Welcome back'}</Text>
                  <Text style={styles.subtitleText}>{isSignUpMode ? 'Your encrypted clipboard starts here.' : 'Step back into your private clipboard.'}</Text>
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.toggleButton, !isSignUpMode && styles.activeButton]}
                      onPress={() => setIsSignUpMode(false)}
                    >
                      <Text style={styles.secondarybuttonText}>Login</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleButton, isSignUpMode && styles.activeButton]}
                      onPress={() => setIsSignUpMode(true)}
                    >
                      <Text style={styles.secondarybuttonText}>Sign Up</Text>
                    </TouchableOpacity>
                  </View>

                  {isSignUpMode ? (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Name"
                        placeholderTextColor={t.placeholder}
                        value={name}
                        onChangeText={setName}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor={t.placeholder}
                        value={username}
                        onChangeText={setUsername}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={t.placeholder}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm Password"
                        placeholderTextColor={t.placeholder}
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                      />
                      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={busy}>
                        {busy ? <ActivityIndicator color={t.onPrimary} /> : <Text style={styles.buttonText}>Sign Up</Text>}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor={t.placeholder}
                        value={username}
                        onChangeText={setUsername}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={t.placeholder}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                      />

                      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={busy}>
                        {busy ? <ActivityIndicator color={t.onPrimary} /> : <Text style={styles.buttonText}>Login</Text>}
                      </TouchableOpacity>
                    </>
                  )}

                  {busy && <Text style={styles.busyText}>Securing your data…</Text>}

                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.forgotPasswordButton} onPress={() => setIsForgotPasswordMode(true)}>
                      <Ionicons name="help-circle-outline" size={24} color={t.icon} style={styles.forgotPasswordIcon} />
                      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.overlay,
    padding: 18,
  },
  modalBox: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: t.glass,
    borderRadius: 28,
    padding: 30,
    borderWidth: 1,
    borderColor: t.border,
    shadowColor: t.primaryStrong,
    shadowOpacity: 0.2,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 22 },
  },
  closeButton: { position: 'absolute', top: 16, right: 16, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: t.surfaceAlt, zIndex: 2 },
  brandMark: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primaryStrong, marginBottom: 20, shadowColor: t.primaryStrong, shadowOpacity: 0.3, shadowRadius: 18 },
  input: {
    height: 54,
    borderColor: t.border,
    borderWidth: 1,
    marginBottom: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    color: t.text,
    backgroundColor: t.surfaceAlt,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 4,
    borderRadius: 14,
    backgroundColor: t.surfaceAlt,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    padding: 11,
    borderRadius: 11,
    marginHorizontal: 2,
  },
  activeButton: {
    borderRadius: 11,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.borderSubtle,
  },
  secondarybuttonText: {
    color: t.text,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  buttonText: {
    color: t.onPrimary,
    textAlign: 'center'
  },
  button: {
    marginBottom: 12,
    backgroundColor: t.primaryStrong,
    borderRadius: 14,
    minHeight: 52,
    padding: 14,
    justifyContent: 'center',
    shadowColor: t.primaryStrong,
    shadowOpacity: 0.26,
    shadowRadius: 16,
  },
  busyText: {
    textAlign: 'center',
    color: t.textMuted,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10
  },
  forgotPasswordButton: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginRight: 8,
    flexDirection: 'row'
  },
  forgotPasswordIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  forgotPasswordText: {
    color: t.text,
  },
  titleText: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -1.2,
    color: t.text,
    marginBottom: 6
  },
  subtitleText: { color: t.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 24 },
});

export default LoginModal;
