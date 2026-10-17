import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Header from './Header';
import AmbientBackdrop from './AmbientBackdrop';
import Reveal from './Reveal';
import Alert from './Alert';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import { createAnonymousShare, AnonymousShareResult } from '@/service/shareService';
import { setClipboard } from '@/service/clipboardService';

const MAX_LENGTH = 12_000;

export default function PublicShareComposer() {
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
  const [text, setText] = useState('');
  const [ttlDays, setTtlDays] = useState<1 | 7>(1);
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
      setResult(await createAnonymousShare(value, ttlDays));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the link. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const copy = (value: string, message: string) => void setClipboard(value, showAlert, message);
  const reset = () => { setText(''); setResult(null); setError(''); setTtlDays(1); };

  return <SafeAreaView style={styles.safeArea}>
    <AmbientBackdrop />
    <Alert message={alertMessage} visible={alertVisible} />
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Header />
      <Reveal style={styles.reveal}>
        <View style={styles.shell}>
          <View style={styles.headingIcon}><Ionicons name={result ? 'checkmark-circle-outline' : 'paper-plane-outline'} size={25} color={result ? t.accent : t.primary} /></View>
          <Text accessibilityRole="header" style={styles.title}>{result ? 'Your private link is ready.' : 'Share text. Skip the account.'}</Text>
          <Text style={styles.subtitle}>{result ? 'The decryption key lives after the # and never reaches CloudClip. Send the complete link.' : 'Type or paste text below. It is encrypted in this browser before it is uploaded, and expires automatically.'}</Text>

          {result ? <View style={styles.result}>
            <Text style={styles.label}>ENCRYPTED SHARE LINK</Text>
            <View style={styles.linkRow}><Text selectable numberOfLines={2} style={styles.linkText}>{result.url}</Text><Pressable accessibilityRole="button" accessibilityLabel="Copy shared link" onPress={() => copy(result.url, 'Shared link copied')} style={styles.iconButton}><Ionicons name="copy-outline" size={20} color={t.onPrimary} /></Pressable></View>
            <View style={styles.referenceBlock}>
              <View><Text style={styles.label}>REFERENCE</Text><Text selectable style={styles.referenceText}>{result.displayCode}</Text></View>
              <Text style={styles.referenceHint}>Identifies this share. The complete link is still required to decrypt it.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Copy share reference" onPress={() => copy(result.displayCode, 'Reference copied')} style={styles.referenceButton}><Ionicons name="copy-outline" size={17} color={t.primary} /><Text style={styles.referenceButtonText}>Copy reference</Text></Pressable>
            </View>
            <View style={styles.resultMeta}><View style={styles.metaItem}><Ionicons name="timer-outline" size={16} color={t.textMuted} /><Text style={styles.metaText}>Expires in {ttlDays === 1 ? '24 hours' : '7 days'}</Text></View><View style={styles.metaItem}><Ionicons name="lock-closed-outline" size={16} color={t.accent} /><Text style={styles.metaText}>End-to-end encrypted</Text></View></View>
            <Pressable accessibilityRole="button" onPress={reset} style={styles.secondaryButton}><Ionicons name="add" size={18} color={t.text} /><Text style={styles.secondaryButtonText}>Share another text</Text></Pressable>
          </View> : <>
            <View style={styles.editor}>
              <TextInput
                accessibilityLabel="Text to share"
                autoCapitalize="sentences"
                multiline
                onChangeText={(value) => { setText(value.slice(0, MAX_LENGTH)); if (error) setError(''); }}
                placeholder="Paste a note, command, address, or anything worth passing on…"
                placeholderTextColor={t.placeholder}
                selectionColor={t.primary}
                style={styles.input}
                textAlignVertical="top"
                value={text}
              />
              <Text style={styles.count}>{text.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}</Text>
            </View>
            <View style={styles.controls}>
              <View><Text style={styles.label}>LINK EXPIRES</Text><View accessibilityRole="radiogroup" style={styles.ttlGroup}>{([1, 7] as const).map(days => <Pressable key={days} accessibilityRole="radio" accessibilityState={{ checked: ttlDays === days }} onPress={() => setTtlDays(days)} style={[styles.ttl, ttlDays === days && styles.ttlActive]}><Text style={[styles.ttlText, ttlDays === days && styles.ttlTextActive]}>{days === 1 ? '24 hours' : '7 days'}</Text></Pressable>)}</View></View>
              <Pressable accessibilityRole="button" disabled={!text.trim() || loading} onPress={createLink} style={[styles.primaryButton, (!text.trim() || loading) && styles.primaryDisabled]}>{loading ? <ActivityIndicator color={t.onPrimary} /> : <><Text style={styles.primaryText}>Create private link</Text><Ionicons name="arrow-forward" size={19} color={t.onPrimary} /></>}</Pressable>
            </View>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <View style={styles.privacyLine}><Ionicons name="shield-checkmark-outline" size={17} color={t.accent} /><Text style={styles.privacyText}>No login · No plaintext on the server · Rate-limited to prevent abuse</Text></View>
          </>}
        </View>
      </Reveal>
    </ScrollView>
  </SafeAreaView>;
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: t.background, paddingTop: Platform.OS === 'web' ? 0 : 30 },
  scroll: { flexGrow: 1 }, reveal: { flex: 1 },
  shell: { width: '90%', maxWidth: 820, alignSelf: 'center', marginTop: 58, marginBottom: 100, padding: 30, borderRadius: 16, backgroundColor: t.surface, shadowColor: t.shadow, shadowOpacity: 0.14, shadowRadius: 36, shadowOffset: { width: 0, height: 18 }, elevation: 8 },
  headingIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: t.primarySoft, marginBottom: 20 },
  title: { color: t.text, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1.1 },
  subtitle: { color: t.textMuted, fontSize: 15, lineHeight: 24, maxWidth: 650, marginTop: 10 },
  editor: { minHeight: 280, marginTop: 28, borderRadius: 15, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  input: { flex: 1, minHeight: 240, padding: 18, paddingBottom: 44, color: t.text, fontSize: 16, lineHeight: 25 },
  count: { position: 'absolute', right: 16, bottom: 13, color: t.textMuted, fontSize: 11 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginTop: 22 },
  label: { color: t.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 9 },
  ttlGroup: { flexDirection: 'row', gap: 8 }, ttl: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 12, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.borderSubtle }, ttlActive: { backgroundColor: t.primarySoft, borderColor: t.primary }, ttlText: { color: t.textMuted, fontSize: 13, fontWeight: '700' }, ttlTextActive: { color: t.primary },
  primaryButton: { minHeight: 50, minWidth: 190, paddingHorizontal: 20, borderRadius: 14, backgroundColor: t.primaryStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: t.primaryStrong, shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 9 }, elevation: 6 }, primaryDisabled: { backgroundColor: t.surfaceDisabled, shadowOpacity: 0, opacity: 0.7 }, primaryText: { color: t.onPrimary, fontSize: 14, fontWeight: '800' },
  error: { color: t.danger, fontSize: 13, lineHeight: 20, marginTop: 14 },
  privacyLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 25, paddingTop: 20, borderTopWidth: 1, borderColor: t.borderSubtle }, privacyText: { flex: 1, color: t.textMuted, fontSize: 11, lineHeight: 18 },
  result: { marginTop: 30 }, linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border }, linkText: { flex: 1, color: t.text, fontSize: 14, lineHeight: 20 }, iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: t.primaryStrong },
  referenceBlock: { marginTop: 18, padding: 16, borderRadius: 14, backgroundColor: t.surfaceAlt }, referenceText: { color: t.text, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: 4 }, referenceHint: { color: t.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 440 }, referenceButton: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: t.border }, referenceButtonText: { color: t.primary, fontSize: 12, fontWeight: '800' },
  resultMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 18 }, metaItem: { flexDirection: 'row', alignItems: 'center', gap: 7 }, metaText: { color: t.textMuted, fontSize: 12 },
  secondaryButton: { minHeight: 46, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, paddingHorizontal: 16, borderRadius: 13, backgroundColor: t.surfaceAlt }, secondaryButtonText: { color: t.text, fontSize: 13, fontWeight: '700' },
});
