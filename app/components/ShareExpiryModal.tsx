import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ACCOUNT_SHARE_EXPIRY_OPTIONS } from '@/service/shareService';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

interface ShareExpiryModalProps {
  visible: boolean;
  busy: boolean;
  onSelect: (minutes: number) => void;
  onClose: () => void;
}

export default function ShareExpiryModal({ visible, busy, onSelect, onClose }: ShareExpiryModalProps) {
  const t = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => !busy && onClose()}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.icon}><Ionicons name="timer-outline" size={21} color={t.primary} /></View>
          <Text style={styles.title}>How long should this link work?</Text>
          <Text style={styles.subtitle}>Choose a duration to create the encrypted link. Nothing is shared until you choose.</Text>
          <View style={styles.options}>{ACCOUNT_SHARE_EXPIRY_OPTIONS.map(option => (
            <TouchableOpacity key={option.minutes} accessibilityRole="button" disabled={busy} onPress={() => onSelect(option.minutes)} style={styles.option}>
              <Text style={styles.optionText}>{option.label}</Text>
              <Ionicons name="arrow-forward" size={17} color={t.primary} />
            </TouchableOpacity>
          ))}</View>
          {busy ? <View style={styles.progress}><ActivityIndicator color={t.primary} /><Text style={styles.progressText}>Creating encrypted link…</Text></View> : null}
          <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: t.overlay },
  dialog: { width: '100%', maxWidth: 450, padding: 26, borderRadius: 16, borderWidth: 1, borderColor: t.border, backgroundColor: t.glass, shadowColor: t.shadow, shadowOpacity: 0.18, shadowRadius: 30, shadowOffset: { width: 0, height: 15 } },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: t.primarySoft },
  title: { color: t.text, fontSize: 24, lineHeight: 31, fontWeight: '800', letterSpacing: -0.6, marginTop: 18 },
  subtitle: { color: t.textMuted, fontSize: 13, lineHeight: 21, marginTop: 7, marginBottom: 21 },
  options: { gap: 8 },
  option: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderRadius: 9, borderWidth: 1, borderColor: t.border, backgroundColor: t.surfaceAlt },
  optionText: { color: t.text, fontSize: 14, fontWeight: '700' },
  progress: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 12 },
  progressText: { color: t.textMuted, fontSize: 12 },
  cancel: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 14, borderRadius: 9 },
  cancelText: { color: t.textMuted, fontSize: 13, fontWeight: '700' },
});
