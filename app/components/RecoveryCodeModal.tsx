import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

interface RecoveryCodeModalProps {
  visible: boolean;
  code: string;
  onDone: () => void;
}

/**
 * Shows the E2E recovery code exactly once. Without it, a forgotten password
 * means the encrypted clipboard history is unrecoverable.
 */
const RecoveryCodeModal: React.FC<RecoveryCodeModalProps> = ({ visible, code, onDone }) => {
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState(false);

  const handleCopy = async () => {
    try { await Clipboard.setStringAsync(code); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={25} color={t.primary} /></View>
          <Text style={styles.title}>Save your recovery code</Text>
          <Text style={styles.body}>
            Your clipboard data is end-to-end encrypted. If you ever reset your
            password, this code is the ONLY way to keep access to your data.
            Store it somewhere safe — it will not be shown again.
          </Text>
          <View style={styles.codeBox}>
            <Text style={styles.code} selectable>{code}</Text>
          </View>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCopy}>
            <Text style={styles.secondaryButtonText}>{copied ? 'Copied!' : 'Copy code'}</Text>
          </TouchableOpacity>
          {copyError && <Text style={styles.body}>Clipboard access was blocked. Select the code above and save it manually.</Text>}
          <TouchableOpacity style={styles.button} onPress={onDone}>
            <Text style={styles.buttonText}>I saved my recovery code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.overlay,
  },
  box: {
    width: '90%',
    maxWidth: 460,
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
    fontSize: 25,
    lineHeight: 31,
    fontWeight: 'bold',
    marginBottom: 10,
    color: t.text,
  },
  body: {
    fontSize: 14,
    color: t.textMuted,
    marginBottom: 16,
  },
  codeBox: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    backgroundColor: t.surfaceAlt,
  },
  code: {
    fontSize: 16,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    color: t.text,
  },
  button: {
    backgroundColor: t.primaryStrong,
    borderRadius: 14,
    minHeight: 50,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: t.onPrimary,
    fontWeight: 'bold',
  },
  secondaryButton: {
    minHeight: 46,
    padding: 12,
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: t.surfaceAlt,
  },
  secondaryButtonText: {
    color: t.text,
    textDecorationLine: 'underline',
  },
});

export default RecoveryCodeModal;
