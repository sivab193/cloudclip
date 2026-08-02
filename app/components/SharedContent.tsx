import { useNavigation } from 'expo-router';
import * as Linking from 'expo-linking';
import { SafeAreaView, Text, StyleSheet, Platform, TextInput, TouchableOpacity, View, ScrollView, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '@/service/apiService';
import { setClipboard } from '@/service/clipboardService';
import { normalizeShareToken, shareCodeFromToken, DecryptionError } from '@/service/cryptoService';
import { decryptSharedContent, tokenFromFragment } from '@/service/shareService';
import Alert from '@/components/Alert';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

/**
 * Renders a shared clipboard entry.
 *
 * The token is read from the URL fragment, which never reaches the server.
 * `legacyToken` carries the old path-based form (`/shared/<token>`) so links
 * already in circulation keep working; the fragment wins when both are present.
 */
const SharedContent: React.FC<{ legacyToken?: string }> = ({ legacyToken }) => {
  const navigation = useNavigation();
  const t = useTheme();
  const styles = useThemedStyles(makeStyles);
  const linkedUrl = Linking.useURL();
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

  const rawToken = fragmentToken || legacyToken || '';

  const showAlert = (message: string) => {
    setAlertMessage(message);
    setAlertVisible(true);
    setTimeout(() => setAlertVisible(false), 3000);
  };

  const handleCopy = (text: string) => {
    setClipboard(text, showAlert, 'Copied to clipboard');
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = normalizeShareToken(rawToken);
      if (!token) {
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
        setData(decryptSharedContent(token, shared.content));
      } catch (e) {
        if (e instanceof DecryptionError) {
          setError('This link is incomplete or corrupted — make sure you copied the whole link or code.');
        } else {
          setError('This link has expired or does not exist.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [rawToken]);

  return (
    <SafeAreaView style={styles.safeAreaLight}>
      <Alert message={alertMessage} visible={alertVisible} />
      <Header navigation={navigation} />
      <ThemedView style={styles.container}>
        <View style={styles.headerWithButton}>
          <ThemedText type="subtitle" style={styles.text}>Your Text</ThemedText>
          {!error && !loading && (
            <TouchableOpacity style={[styles.copyButton, { marginLeft: 10 }]} onPress={() => handleCopy(data || '')}>
              <Ionicons name="clipboard-outline" size={24} color={t.icon} />
              {Platform.OS === 'web' && (
                <Text style={[styles.copyButtonText, { color: t.text }]}> Copy Text</Text>
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
    </SafeAreaView>
  );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  safeAreaLight: {
    flex: 1,
    backgroundColor: t.background,
    paddingTop: Platform.OS === 'web' ? 0 : 30,
  },
  scrollContainer: {},
  container: {
    backgroundColor: t.background,
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
  },
  headerWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 5,
  },
  copyButtonText: {
    marginLeft: 5,
    fontWeight: 'bold',
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
    borderRadius: 0,
  },
  textInput: {
    minHeight: 180,
    flex: 1,
    textAlignVertical: 'top',
    padding: 10,
  },
  loader: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SharedContent;
