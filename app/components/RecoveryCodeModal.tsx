import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';

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
    marginBottom: 16,
  },
  codeBox: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f7f7f7',
  },
  code: {
    fontSize: 16,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  secondaryButton: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  secondaryButtonText: {
    color: '#000',
    textDecorationLine: 'underline',
  },
});

export default RecoveryCodeModal;
