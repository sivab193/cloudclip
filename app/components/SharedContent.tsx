import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView, Text, StyleSheet, Platform, TextInput, TouchableOpacity, View, ScrollView, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiService } from '@/service/apiService';
import { setClipboard } from '@/service/clipboardService';
import { normalizeShareToken, shareCodeFromToken, DecryptionError, isValidShareToken } from '@/service/cryptoService';
import { decryptSharedContent, isShareCode, shareCredentialFromInput, tokenFromFragment } from '@/service/shareService';
import Alert from '@/components/Alert';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import AmbientBackdrop from './AmbientBackdrop';
import Reveal from './Reveal';
import SiteFooter from './SiteFooter';

/**
 * Renders a shared clipboard entry.
 *
 * New shares use a four-character code. `legacyToken` and URL fragments keep
 * older token-bearing links working.
 */
const SharedContent: React.FC<{ legacyToken?: string; shareCode?: string }> = ({ legacyToken, shareCode }) => {
  const t = useTheme();
  const styles = useThemedStyles(makeStyles);
  const linkedUrl = Linking.useURL();
  const params = useLocalSearchParams<{ '#': string }>();
  const [data, setData] = useState('');
  const [error, setError] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [manualCredential, setManualCredential] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [resolvedCode, setResolvedCode] = useState('');
  const [expiryAt, setExpiryAt] = useState('');

  // On web the fragment lives on window.location and is not part of the
  // expo-router params; on native it arrives with the deep link.
  const fragmentToken =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? tokenFromFragment(window.location.hash)
      : tokenFromFragment(linkedUrl);

  const rawCredential = tokenFromFragment(params['#'] ? `#${params['#']}` : '') || fragmentToken || legacyToken || shareCode || manualCredential || '';
  const needsLink = !rawCredential;

  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertVisible(true);
    setTimeout(() => setAlertVisible(false), 3000);
  };

  const handleCopy = (text: string) => {
    setClipboard(text, showAlert, 'Copied to clipboard');
  };

  const handleOpenLink = () => {
    const candidate = shareCredentialFromInput(linkInput);
    if (!candidate) {
      setInputError('Enter a four-character code or paste a CloudClip link.');
      return;
    }
    setInputError('');
    setManualCredential(candidate);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const code = isShareCode(candidate) ? candidate : shareCodeFromToken(candidate);
      window.history.replaceState(null, '', `/s/${code}`);
    }
  };

  useEffect(() => {
    let active = true;
    setData('');
    setResolvedCode('');
    setExpiryAt('');
    const fetchData = async () => {
      if (!rawCredential) {
        setError('');
        setLoading(false);
        return;
      }
      const credential = shareCredentialFromInput(rawCredential);
      if (!credential) {
        setError('Invalid share link.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const suppliedToken = isShareCode(credential) ? '' : normalizeShareToken(credential);
        const code = isShareCode(credential) ? credential : shareCodeFromToken(suppliedToken);
        const shared = await apiService.getSharedLinkByCode(code);
        const token = shared.token || suppliedToken;
        if (!isValidShareToken(token)) throw new DecryptionError('Legacy share requires its original link');
        if (active) {
          setData(decryptSharedContent(token, shared.content));
          setResolvedCode(code);
          setExpiryAt(shared.expiryAt || '');
        }
      } catch (e) {
        if (!active) return;
        if (e instanceof DecryptionError) {
          setError('This older link needs its original complete URL, or the clip is corrupted.');
        } else {
          setError(e instanceof Error ? e.message : 'Could not load this link. Check your connection and try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => { active = false; };
  }, [rawCredential]);

  const expiryLabel = expiryAt
    ? `Available until ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(expiryAt))}`
    : 'This link expires automatically';

  return (
    <SafeAreaView style={styles.safeAreaLight}>
      <AmbientBackdrop />
      <Alert message={alertMessage} visible={alertVisible} />
      <Header />
      <ScrollView contentContainerStyle={styles.pageScroll} keyboardShouldPersistTaps="handled">
      <Reveal style={styles.reveal}>
      <ThemedView style={styles.container}>
        <View style={styles.contextRow}>
          <View style={[styles.contextIcon, error && styles.contextIconError]}><Ionicons name={error ? 'alert-circle-outline' : needsLink ? 'link-outline' : 'lock-closed-outline'} size={17} color={error ? t.danger : t.primary} /></View>
          <Text style={styles.contextText}>{needsLink ? 'Open a shared clip' : error ? 'This clip could not be opened' : 'Private shared text'}</Text>
          {resolvedCode ? <View style={styles.codeBadge}><Text style={styles.codeLabel}>CODE</Text><Text style={styles.codeValue}>{resolvedCode}</Text></View> : null}
        </View>
        <ThemedText style={styles.title}>{needsLink ? 'Enter a code or paste a link.' : error ? 'This link is unavailable.' : 'Someone shared a clip with you.'}</ThemedText>
        <Text style={styles.subtitle}>{needsLink ? 'Use the four-character code or the complete CloudClip URL you received.' : error ? 'Check the address, ask the sender for a new link, or try again.' : 'Decrypted on this device. Copy what you need before the link expires.'}</Text>
        {needsLink ? (
          <View style={styles.linkForm}>
            <TextInput
              accessibilityLabel="CloudClip share code or link"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(value) => { setLinkInput(value); if (inputError) setInputError(''); }}
              onSubmitEditing={handleOpenLink}
              placeholder="A7K2 or https://us.cclip.cc/s/A7K2"
              placeholderTextColor={t.placeholder}
              selectionColor={t.primary}
              style={[styles.linkInput, inputError ? styles.linkInputError : null]}
              value={linkInput}
            />
            {inputError ? <Text accessibilityRole="alert" style={styles.inputError}>{inputError}</Text> : null}
            <TouchableOpacity accessibilityRole="button" disabled={!linkInput.trim()} style={[styles.openButton, !linkInput.trim() && styles.openButtonDisabled]} onPress={handleOpenLink}>
              <Text style={styles.openButtonText}>Open encrypted clip</Text>
              <Ionicons name="arrow-forward" size={18} color={t.onPrimary} />
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.loadingState}><ActivityIndicator size="small" color={t.primary} /><Text style={styles.loadingText}>Opening the encrypted clip…</Text></View>
        ) : error ? (
          <View style={styles.errorPanel}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text></View>
        ) : (
          <View style={styles.clipArea}>
            <View style={styles.clipToolbar}>
              <View style={styles.expiryInfo}><Ionicons name="time-outline" size={16} color={t.textMuted} /><Text style={styles.expiryText}>{expiryLabel}</Text></View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Copy shared text" style={styles.copyButton} onPress={() => handleCopy(data)}>
                <Ionicons name="copy-outline" size={18} color={t.onPrimary} />
                <Text style={styles.copyButtonText}>Copy text</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.textScroll} contentContainerStyle={styles.textBox} nestedScrollEnabled>
              <Text selectable style={styles.clipText}>{data}</Text>
            </ScrollView>
            <View style={styles.privacyNote}><Ionicons name="shield-checkmark-outline" size={16} color={t.accent} /><Text style={styles.privacyText}>The text was decrypted locally and is not included in link previews.</Text></View>
          </View>
        )}
      </ThemedView>
      </Reveal>
      <SiteFooter />
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  safeAreaLight: {
    flex: 1,
    backgroundColor: t.background,
    paddingTop: Platform.OS === 'web' ? 0 : 30,
    position: 'relative',
  },
  pageScroll: { flexGrow: 1 },
  reveal: { flexGrow: 1 },
  container: {
    backgroundColor: t.glass,
    padding: 32,
    borderRadius: 14,
    overflow: 'hidden',
    width: '90%',
    maxWidth: 780,
    alignSelf: 'center',
    marginTop: 58,
    marginBottom: 60,
    borderWidth: 1,
    borderColor: t.border,
    shadowColor: t.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  contextRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 24 },
  contextIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: t.primarySoft },
  contextIconError: { backgroundColor: t.surfaceAlt },
  contextText: { color: t.textMuted, fontSize: 13, fontWeight: '700' },
  codeBadge: { marginLeft: 'auto', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 9, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.borderSubtle },
  codeLabel: { color: t.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  codeValue: { color: t.text, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  title: { color: t.text, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -1.1, maxWidth: 620 },
  subtitle: { color: t.textMuted, fontSize: 15, lineHeight: 24, maxWidth: 610, marginTop: 10 },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 9,
    backgroundColor: t.primaryStrong,
  },
  copyButtonText: {
    fontWeight: '800',
    color: t.onPrimary,
    fontSize: 12,
  },
  errorText: {
    color: t.danger,
    fontSize: 14,
    lineHeight: 22,
  },
  errorPanel: { marginTop: 26, padding: 18, borderRadius: 10, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.borderSubtle },
  linkForm: { marginTop: 28, maxWidth: 650 },
  linkInput: { minHeight: 54, color: t.text, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border, borderRadius: 9, paddingHorizontal: 16, fontSize: 16 },
  linkInputError: { borderColor: t.danger },
  inputError: { color: t.danger, fontSize: 13, lineHeight: 19, marginTop: 8 },
  openButton: { minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, paddingHorizontal: 18, borderRadius: 9, backgroundColor: t.primaryStrong },
  openButtonDisabled: { backgroundColor: t.surfaceDisabled, opacity: 0.7 },
  openButtonText: { color: t.onPrimary, fontSize: 14, fontWeight: '800' },
  loadingState: { minHeight: 180, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: t.textMuted, fontSize: 14 },
  clipArea: { marginTop: 28 },
  clipToolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 12 },
  expiryInfo: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7 },
  expiryText: { color: t.textMuted, fontSize: 12, lineHeight: 18 },
  textScroll: { maxHeight: 440, borderWidth: 1, borderColor: t.border, borderRadius: 12, backgroundColor: t.surfaceAlt },
  textBox: { minHeight: 230, padding: 22 },
  clipText: { color: t.text, fontSize: 17, lineHeight: 28 },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 16 },
  privacyText: { flex: 1, color: t.textMuted, fontSize: 12, lineHeight: 19 },
});

export default SharedContent;
