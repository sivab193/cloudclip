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
import { decryptSharedContent, tokenFromFragment } from '@/service/shareService';
import Alert from '@/components/Alert';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import AmbientBackdrop from './AmbientBackdrop';
import Reveal from './Reveal';

/**
 * Renders a shared clipboard entry.
 *
 * The token is read from the URL fragment, which never reaches the server.
 * `legacyToken` carries the old path-based form (`/shared/<token>`) so links
 * already in circulation keep working; the fragment wins when both are present.
 */
const SharedContent: React.FC<{ legacyToken?: string }> = ({ legacyToken }) => {
  const t = useTheme();
  const styles = useThemedStyles(makeStyles);
  const linkedUrl = Linking.useURL();
  const params = useLocalSearchParams<{ '#': string }>();
  const [data, setData] = useState('');
  const [error, setError] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // On web the fragment lives on window.location and is not part of the
  // expo-router params; on native it arrives with the deep link.
  const fragmentToken =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? tokenFromFragment(window.location.hash)
      : tokenFromFragment(linkedUrl);

  const rawToken = tokenFromFragment(params['#'] ? `#${params['#']}` : '') || fragmentToken || legacyToken || '';

  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertVisible(true);
    setTimeout(() => setAlertVisible(false), 3000);
  };

  const handleCopy = (text: string) => {
    setClipboard(text, showAlert, 'Copied to clipboard');
  };

  useEffect(() => {
    let active = true;
    setData('');
    const fetchData = async () => {
      const token = normalizeShareToken(rawToken);
      if (!isValidShareToken(token)) {
        setError('Invalid share link.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        // The server only ever sees the 8-char lookup prefix; the decryption
        // key is derived from the full token client-side.
        const shared = await apiService.getSharedLinkByCode(shareCodeFromToken(token));
        if (active) setData(decryptSharedContent(token, shared.content));
      } catch (e) {
        if (!active) return;
        if (e instanceof DecryptionError) {
          setError('This link is incomplete or corrupted — make sure you copied the whole link or code.');
        } else {
          setError(e instanceof Error ? e.message : 'Could not load this link. Check your connection and try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => { active = false; };
  }, [rawToken]);

  return (
    <SafeAreaView style={styles.safeAreaLight}>
      <AmbientBackdrop />
      <Alert message={alertMessage} visible={alertVisible} />
      <Header />
      <Reveal style={styles.reveal}>
      <ThemedView style={styles.container}>
        <View style={styles.icon}><Ionicons name={error ? 'alert-circle-outline' : 'mail-open-outline'} size={24} color={error ? t.danger : t.primary} /></View>
        <View style={styles.headerWithButton}>
          <View><Text style={styles.eyebrow}>SHARED WITH YOU</Text><ThemedText style={styles.title}>A private clip</ThemedText></View>
          {!error && !loading && (
            <TouchableOpacity style={[styles.copyButton, { marginLeft: 10 }]} onPress={() => handleCopy(data || '')}>
              <Ionicons name="copy-outline" size={18} color={t.onPrimary} />
              {Platform.OS === 'web' && (
                <Text style={styles.copyButtonText}>Copy clip</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        {loading ? (
          <ActivityIndicator size="large" color={t.icon} style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.textBox}>
              <TextInput
                style={[styles.text, styles.textInput]}
                value={data}
                multiline={true}
                editable={false}
              />
            </View>
          </ScrollView>
        )}
      </ThemedView>
      </Reveal>
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
  reveal: { flex: 1 },
  scrollContainer: {},
  container: {
    backgroundColor: t.glass,
    padding: 28,
    borderRadius: 26,
    overflow: 'hidden',
    width: '90%',
    maxWidth: 820,
    alignSelf: 'center',
    marginTop: 58,
    marginBottom: 110,
    borderWidth: 1,
    borderColor: t.border,
    shadowColor: t.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 16 },
  },
  icon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: t.primarySoft, marginBottom: 20 },
  eyebrow: { color: t.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1.8, marginBottom: 4 },
  title: { color: t.text, fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -1.1 },
  headerWithButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: t.primaryStrong,
  },
  copyButtonText: {
    marginLeft: 7,
    fontWeight: 'bold',
    color: t.onPrimary,
    fontSize: 12,
  },
  text: {
    color: t.text,
  },
  errorText: {
    color: t.danger,
    fontSize: 16,
    marginTop: 20,
  },
  textBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 18,
    backgroundColor: t.surfaceAlt,
    marginTop: 24,
  },
  textInput: {
    minHeight: 260,
    flex: 1,
    textAlignVertical: 'top',
    padding: 18,
    fontSize: 16,
    lineHeight: 26,
  },
  loader: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SharedContent;
