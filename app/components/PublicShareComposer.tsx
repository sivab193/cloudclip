import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Header from './Header';
import AmbientBackdrop from './AmbientBackdrop';
import Reveal from './Reveal';
import Alert from './Alert';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import { createAnonymousShare, AnonymousShareResult, expiryLabel, SHARE_EXPIRY_OPTIONS } from '@/service/shareService';
import { setClipboard } from '@/service/clipboardService';
import SiteFooter from './SiteFooter';
import ShareQrCode from './ShareQrCode';

const MAX_LENGTH = 12_000;

export default function PublicShareComposer() {
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const [text, setText] = useState('');
  const [ttlMinutes, setTtlMinutes] = useState(24 * 60);
  const [result, setResult] = useState<AnonymousShareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);

  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertVisible(true);
    setTimeout(() => setAlertVisible(false), 2600);
  };

  const createLink = async () => {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    setError('');
    try {
      setResult(await createAnonymousShare(value, ttlMinutes));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the link. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const copy = (value: string, message: string) => void setClipboard(value, showAlert, message);
  const reset = () => { setText(''); setResult(null); setError(''); setTtlMinutes(24 * 60); };

  return <SafeAreaView style={styles.safeArea}>
    <AmbientBackdrop />
    <Alert message={alertMessage} visible={alertVisible} />
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Header />
      <Reveal style={styles.reveal}>
        <View style={[styles.shell, compact && styles.shellCompact]}>
          <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>{result ? 'Your private link is ready.' : 'Share text. Skip the account.'}</Text>
          <Text style={styles.subtitle}>{result ? 'Send the short link or just the four-character code. Both open the same expiring clip.' : 'Type or paste text below. It is encrypted in this browser before it is uploaded, and expires automatically.'}</Text>

          {result ? <View style={styles.result}>
            <View style={[styles.resultGrid, compact && styles.resultGridCompact]}>
              <ShareQrCode url={result.url} />
              <View style={styles.resultDetails}>
                <Text style={styles.label}>SHORT LINK</Text>
                <View style={styles.linkRow}><Text selectable numberOfLines={2} style={styles.linkText}>{result.url}</Text><Pressable accessibilityRole="button" accessibilityLabel="Copy shared link" onPress={() => copy(result.url, 'Shared link copied')} style={styles.iconButton}><Ionicons name="copy-outline" size={20} color={t.onPrimary} /></Pressable></View>
                <View style={styles.referenceBlock}>
                  <View><Text style={styles.label}>SHARE CODE</Text><Text selectable style={styles.referenceText}>{result.displayCode}</Text></View>
                  <Text style={styles.referenceHint}>The recipient can enter this code instead of the link.</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Copy share code" onPress={() => copy(result.displayCode, 'Share code copied')} style={styles.referenceButton}><Ionicons name="copy-outline" size={17} color={t.primary} /><Text style={styles.referenceButtonText}>Copy code</Text></Pressable>
                </View>
                <View style={styles.resultMeta}><View style={styles.metaItem}><Ionicons name="timer-outline" size={16} color={t.textMuted} /><Text style={styles.metaText}>Expires in {expiryLabel(ttlMinutes)}</Text></View><View style={styles.metaItem}><Ionicons name="lock-closed-outline" size={16} color={t.accent} /><Text style={styles.metaText}>Encrypted before upload</Text></View></View>
              </View>
            </View>
            <Pressable accessibilityRole="button" onPress={reset} style={styles.secondaryButton}><Ionicons name="add" size={18} color={t.text} /><Text style={styles.secondaryButtonText}>Share another text</Text></Pressable>
          </View> : <>
            <View style={[styles.editor, compact && styles.editorCompact]}>
              <TextInput
                accessibilityLabel="Text to share"
                autoCapitalize="sentences"
                multiline
                onChangeText={(value) => { setText(value.slice(0, MAX_LENGTH)); if (error) setError(''); }}
                placeholder="Paste a note, command, address, or anything worth passing on…"
                placeholderTextColor={t.placeholder}
                selectionColor={t.primary}
                style={[styles.input, compact && styles.inputCompact]}
                textAlignVertical="top"
                value={text}
              />
              <Text style={styles.count}>{text.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}</Text>
            </View>
            <View style={styles.controls}>
              <View><Text style={styles.label}>LINK EXPIRES</Text><View accessibilityRole="radiogroup" style={styles.ttlGroup}>{SHARE_EXPIRY_OPTIONS.map(option => <Pressable key={option.minutes} accessibilityRole="radio" accessibilityState={{ checked: ttlMinutes === option.minutes }} onPress={() => setTtlMinutes(option.minutes)} style={[styles.ttl, ttlMinutes === option.minutes && styles.ttlActive]}><Text style={[styles.ttlText, ttlMinutes === option.minutes && styles.ttlTextActive]}>{option.label}</Text></Pressable>)}</View></View>
              <Pressable accessibilityRole="button" disabled={!text.trim() || loading} onPress={createLink} style={[styles.primaryButton, compact && styles.primaryButtonCompact, (!text.trim() || loading) && styles.primaryDisabled]}>{loading ? <ActivityIndicator color={t.onPrimary} /> : <><Text style={[styles.primaryText, !text.trim() && styles.primaryTextDisabled]}>Create private link</Text><Ionicons name="arrow-forward" size={19} color={!text.trim() ? t.textMuted : t.onPrimary} /></>}</Pressable>
            </View>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <View style={styles.privacyLine}><Ionicons name="shield-checkmark-outline" size={17} color={t.accent} /><Text style={styles.privacyText}>No login · Content is encrypted before upload · Code lookup is rate-limited</Text></View>
          </>}
        </View>
      </Reveal>
      <SiteFooter />
    </ScrollView>
  </SafeAreaView>;
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: t.background, paddingTop: Platform.OS === 'web' ? 0 : 30 },
  scroll: { flexGrow: 1 }, reveal: { flex: 1 },
  shell: { width: '90%', maxWidth: 820, alignSelf: 'center', marginTop: 72, marginBottom: 100, padding: 0 },
  shellCompact: { width: '100%', paddingHorizontal: 18, marginTop: 42, marginBottom: 60 },
  title: { color: t.text, fontSize: 42, lineHeight: 49, fontWeight: '800', letterSpacing: -1.3 },
  titleCompact: { fontSize: 32, lineHeight: 38 },
  subtitle: { color: t.textMuted, fontSize: 15, lineHeight: 24, maxWidth: 650, marginTop: 10 },
  editor: { minHeight: 280, marginTop: 36, borderRadius: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  editorCompact: { minHeight: 220, marginTop: 26 },
  input: { flex: 1, minHeight: 240, padding: 18, paddingBottom: 44, color: t.text, fontSize: 16, lineHeight: 25 },
  inputCompact: { minHeight: 180, padding: 15, paddingBottom: 42 },
  count: { position: 'absolute', right: 16, bottom: 13, color: t.textMuted, fontSize: 11 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginTop: 22 },
  label: { color: t.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: .8, marginBottom: 9 },
  ttlGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, ttl: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 8, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }, ttlActive: { backgroundColor: t.primarySoft, borderColor: t.primary }, ttlText: { color: t.textMuted, fontSize: 13, fontWeight: '700' }, ttlTextActive: { color: t.primary },
  primaryButton: { minHeight: 50, minWidth: 190, paddingHorizontal: 20, borderRadius: 9, backgroundColor: t.primaryStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, primaryDisabled: { backgroundColor: t.surfaceDisabled }, primaryText: { color: t.onPrimary, fontSize: 14, fontWeight: '700' }, primaryTextDisabled: { color: t.textMuted },
  primaryButtonCompact: { width: '100%' },
  error: { color: t.danger, fontSize: 13, lineHeight: 20, marginTop: 14 },
  privacyLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 25, paddingTop: 20, borderTopWidth: 1, borderColor: t.borderSubtle }, privacyText: { flex: 1, color: t.textMuted, fontSize: 11, lineHeight: 18 },
  result: { marginTop: 36 },
  resultGrid: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  resultGridCompact: { flexDirection: 'column', alignItems: 'stretch' },
  resultDetails: { flex: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 9, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }, linkText: { flex: 1, color: t.text, fontSize: 14, lineHeight: 20 }, iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: t.primaryStrong },
  referenceBlock: { marginTop: 18, padding: 18, borderRadius: 9, backgroundColor: t.surfaceAlt }, referenceText: { color: t.text, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: 4 }, referenceHint: { color: t.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 440 }, referenceButton: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingHorizontal: 13, borderRadius: 8, borderWidth: 1, borderColor: t.border }, referenceButtonText: { color: t.primary, fontSize: 12, fontWeight: '700' },
  resultMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 18 }, metaItem: { flexDirection: 'row', alignItems: 'center', gap: 7 }, metaText: { color: t.textMuted, fontSize: 12 },
  secondaryButton: { minHeight: 46, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, paddingHorizontal: 16, borderRadius: 8, backgroundColor: t.surfaceAlt }, secondaryButtonText: { color: t.text, fontSize: 13, fontWeight: '700' },
});
