import LoginPopup from '@/components/LoginModal';
import React, { useState, useSyncExternalStore } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, useWindowDimensions, Platform } from 'react-native';
import { useAuth } from '@/auth/AuthContext'; // Import AuthContext
import { useRouter } from 'expo-router';
import { ThemeTokens } from '@/constants/Colors';
import { setThemePreference, useTheme, useThemeName, useThemedStyles } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import RegionPicker from './RegionPicker';
import { deploymentMode } from '@/config/regions';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const Header = () => {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const { width } = useWindowDimensions();
  const compact = !hydrated || width < 500;
  const tiny = width < 360;
  const [isModalVisible, setModalVisible] = useState(false);
  const [isRegionVisible, setRegionVisible] = useState(false);
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
  const themeName = useThemeName();
  const { user } = useAuth()

  const openModal = () => deploymentMode === 'gateway' ? setRegionVisible(true) : setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  const handleSuccess = () => {
    closeModal();
  };

  const router = useRouter();

  const navigateToHome = () => {
    router.push('/'); // Redirect to the homepage
  };

  return (
    <View style={styles.headerWrap}>
    <View style={[styles.header, compact && { gap: 4 }]}>
      <TouchableOpacity accessibilityRole="link" accessibilityLabel="CloudClip home" style={styles.logoContainer} onPress={navigateToHome} activeOpacity={0.7}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="CloudClip"
        />
        <Text style={[styles.headerTitle, tiny && styles.headerTitleTiny]}>CloudClip</Text>
      </TouchableOpacity>
      {user && hydrated && width >= 640 ? (
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Encrypted sync active</Text>
        </View>
      ) : null}
      <View style={[styles.navActions, compact && styles.navActionsCompact]}>
        {!compact ? <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/about')}>
          <Text style={styles.privacyLink}>About</Text>
        </TouchableOpacity> : null}
        {!compact ? <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/privacy')}>
          <Text style={styles.privacyLink}>Privacy</Text>
        </TouchableOpacity> : null}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Switch to ${themeName === 'dark' ? 'light' : 'dark'} mode`} onPress={() => setThemePreference(themeName === 'dark' ? 'light' : 'dark')} style={styles.themeButton}>
          <Ionicons name={themeName === 'dark' ? 'sunny-outline' : 'moon-outline'} size={19} color={t.text} />
          {!compact ? <Text style={styles.themeLabel}>{themeName === 'dark' ? 'Light' : 'Dark'}</Text> : null}
        </TouchableOpacity>
      {!user ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Get started" style={[styles.loginButton, compact && styles.loginButtonCompact]} onPress={openModal}>
          <Text style={styles.loginButtonText}>{compact ? 'Enter' : 'Get started'}</Text>
          {!tiny && <Ionicons name="arrow-forward" size={16} color={t.onPrimary} />}
        </TouchableOpacity>
      ) : null}
      </View>
      <LoginPopup
        isVisible={isModalVisible}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />
      <RegionPicker visible={isRegionVisible} onClose={() => setRegionVisible(false)} />
    </View>
    </View>
  );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  headerWrap: {
    width: '100%',
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    borderBottomWidth: 1,
    borderColor: t.borderSubtle,
    backgroundColor: t.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: 16,
    width: '100%', maxWidth: 1240, alignSelf: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    // Square now that the logo is the app mark rather than a wide cloud —
    // the old 65x40 box would squash it.
    width: 34,
    height: 34,
    borderRadius: 8,
    marginRight: 9,
  },
  headerTitle: {
    fontSize: 19,
    letterSpacing: -0.5,
    fontWeight: '800',
    color: t.text,
  },
  headerTitleTiny: { fontSize: 17 },
  loginButton: {
    minHeight: 42,
    paddingVertical: 11, paddingHorizontal: 17,
    backgroundColor: t.primaryStrong,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  loginButtonCompact: { paddingHorizontal: 11, gap: 6 },
  privacyLink: {
    fontSize: 14,
    color: t.textMuted,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  loginButtonText: {
    color: t.onPrimary,
    fontWeight: 'bold',
  },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  navActionsCompact: { gap: 4 },
  themeButton: { minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8, borderRadius: 8 },
  themeLabel: { color: t.text, fontSize: 13, fontWeight: '600' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 99, backgroundColor: t.accentSoft, borderWidth: 1, borderColor: t.borderSubtle },
  statusDot: { width: 7, height: 7, borderRadius: 9, backgroundColor: t.accent },
  statusText: { fontSize: 11, fontWeight: '600', color: t.textMuted, letterSpacing: 0.2 },
});

export default Header;
