import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';

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
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
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
    width: '85%',
    maxWidth: 420,
    backgroundColor: t.surface,
    borderRadius: 10,
    padding: 20,
  },
  title: {
    fontSize: 18,
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
    borderRadius: 6,
    padding: 12,
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
    backgroundColor: t.primary,
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: t.onPrimary,
    fontWeight: 'bold',
  },
  secondaryButton: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  secondaryButtonText: {
    color: t.text,
    textDecorationLine: 'underline',
  },
});

export default RecoveryCodeModal;
