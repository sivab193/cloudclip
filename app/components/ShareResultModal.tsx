import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { setClipboard } from '@/service/clipboardService';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import ShareQrCode from './ShareQrCode';

interface ShareResultModalProps {
  visible: boolean;
  url: string;
  code: string;
  expiryText: string;
  onClose: () => void;
  onNotify: (message: string) => void;
}

export default function ShareResultModal({ visible, url, code, expiryText, onClose, onNotify }: ShareResultModalProps) {
  const t = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const compact = width < 560;
  const copy = (value: string, message: string) => void setClipboard(value, onNotify, message);

  // Avoid asking the QR renderer to encode an empty value while this reusable
  // modal is mounted but no share has been created yet.
  if (!visible || !url || !code) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.headingRow}>
              <View style={styles.icon}><Ionicons name="checkmark" size={21} color={t.accent} /></View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close share result" onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={22} color={t.textMuted} /></TouchableOpacity>
            </View>
            <Text style={styles.title}>Your private link is ready.</Text>
            <Text style={styles.subtitle}>Share the short link, four-character code, or let someone scan the QR.</Text>

            <View style={[styles.content, compact && styles.contentCompact]}>
              <ShareQrCode url={url} maxSize={172} />
              <View style={styles.details}>
                <Text style={styles.label}>SHORT LINK</Text>
                <View style={styles.valueRow}><Text selectable numberOfLines={2} style={styles.link}>{url}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Copy shared link" onPress={() => copy(url, 'Shared link copied')} style={styles.copyIcon}><Ionicons name="copy-outline" size={18} color={t.onPrimary} /></TouchableOpacity></View>
                <Text style={[styles.label, styles.codeLabel]}>SHARE CODE</Text>
                <View style={styles.codeRow}><Text selectable style={styles.code}>{code}</Text><TouchableOpacity accessibilityRole="button" onPress={() => copy(code, 'Share code copied')} style={styles.copyCode}><Ionicons name="copy-outline" size={16} color={t.primary} /><Text style={styles.copyCodeText}>Copy code</Text></TouchableOpacity></View>
                <View style={styles.expiry}><Ionicons name="timer-outline" size={16} color={t.textMuted} /><Text style={styles.expiryText}>{expiryText}</Text></View>
              </View>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.doneButton}><Text style={styles.doneText}>Done</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: t.overlay },
  dialog: { width: '100%', maxWidth: 720, maxHeight: '92%', borderRadius: 16, backgroundColor: t.glass, borderWidth: 1, borderColor: t.border, shadowColor: t.shadow, shadowOpacity: 0.18, shadowRadius: 30, shadowOffset: { width: 0, height: 15 } },
  scroll: { padding: 26 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: t.accentSoft },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  title: { color: t.text, fontSize: 27, lineHeight: 34, fontWeight: '800', letterSpacing: -0.7, marginTop: 18 },
  subtitle: { color: t.textMuted, fontSize: 14, lineHeight: 22, marginTop: 7, maxWidth: 560 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 26, marginTop: 26 },
  contentCompact: { flexDirection: 'column', alignItems: 'stretch' },
  details: { flex: 1 },
  label: { color: t.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 9, borderWidth: 1, borderColor: t.border, backgroundColor: t.surfaceAlt },
  link: { flex: 1, color: t.text, fontSize: 12, lineHeight: 18 },
  copyIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: t.primaryStrong },
  codeLabel: { marginTop: 18 },
  codeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  code: { color: t.text, fontSize: 27, lineHeight: 34, fontWeight: '800', letterSpacing: 4, fontVariant: ['tabular-nums'] },
  copyCode: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: t.border },
  copyCodeText: { color: t.primary, fontSize: 12, fontWeight: '700' },
  expiry: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 },
  expiryText: { color: t.textMuted, fontSize: 12 },
  doneButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 26, borderRadius: 9, backgroundColor: t.primaryStrong },
  doneText: { color: t.onPrimary, fontSize: 14, fontWeight: '800' },
});
