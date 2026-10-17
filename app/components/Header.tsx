import LoginPopup from '@/components/LoginModal';
import React, { useState, useSyncExternalStore } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, useWindowDimensions, Platform } from 'react-native';
import { useAuth } from '@/auth/AuthContext'; // Import AuthContext
import { useRouter } from 'expo-router';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
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
  const [isModalVisible, setModalVisible] = useState(false);
  const [isRegionVisible, setRegionVisible] = useState(false);
  const styles = useThemedStyles(makeStyles);
  const t = useTheme();
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
    <View style={[styles.header, compact && { paddingHorizontal: 14, gap: 8 }]}>
      <TouchableOpacity style={styles.logoContainer} onPress={navigateToHome} activeOpacity={0.7}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="CloudClip"
        />
        <Text style={styles.headerTitle}>CloudClip</Text>
      </TouchableOpacity>
      {user && hydrated && width >= 640 ? (
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Encrypted sync active</Text>
        </View>
      ) : null}
      <View style={styles.navActions}>
        {!compact ? <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/privacy')}>
          <Text style={styles.privacyLink}>Privacy</Text>
        </TouchableOpacity> : null}
      {!user ? (
        <TouchableOpacity style={styles.loginButton} onPress={openModal}>
          <Text style={styles.loginButtonText}>{compact ? 'Enter' : 'Get started'}</Text>
          <Ionicons name="arrow-forward" size={16} color={t.onPrimary} />
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
    paddingHorizontal: Platform.OS === 'web' ? 18 : 10,
    paddingTop: Platform.OS === 'web' ? 14 : 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    width: '100%', maxWidth: 1240, alignSelf: 'center',
    borderWidth: 1, borderColor: t.borderSubtle,
    borderRadius: 20,
    backgroundColor: t.glass,
    shadowColor: t.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    // Square now that the logo is the app mark rather than a wide cloud —
    // the old 65x40 box would squash it.
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    letterSpacing: -0.7,
    fontWeight: 'bold',
    color: t.text,
  },
  loginButton: {
    minHeight: 42,
    paddingVertical: 11, paddingHorizontal: 17,
    backgroundColor: t.primaryStrong,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
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
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 99, backgroundColor: t.accentSoft, borderWidth: 1, borderColor: t.borderSubtle },
  statusDot: { width: 7, height: 7, borderRadius: 9, backgroundColor: t.accent },
  statusText: { fontSize: 11, fontWeight: '600', color: t.textMuted, letterSpacing: 0.2 },
});

export default Header;
