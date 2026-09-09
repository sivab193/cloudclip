import LoginPopup from '@/components/LoginModal';
import React, { useState, useSyncExternalStore } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { useAuth } from '@/auth/AuthContext'; // Import AuthContext
import { useRouter } from 'expo-router';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const Header = () => {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const { width } = useWindowDimensions();
  const [isModalVisible, setModalVisible] = useState(false);
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth()

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  const handleSuccess = () => {
    closeModal();
  };

  const router = useRouter();

  const navigateToHome = () => {
    router.push('/'); // Redirect to the homepage
  };

  return (
    <View style={[styles.header, (!hydrated || width < 500) && { paddingHorizontal: 16, flexWrap: 'wrap', gap: 12 }]}>
      <TouchableOpacity style={styles.logoContainer} onPress={navigateToHome} activeOpacity={0.7}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="CloudClip"
        />
        <Text style={styles.headerTitle}>CloudClip</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/privacy')}>
        <Text style={styles.privacyLink}>Privacy</Text>
      </TouchableOpacity>
      {!user ? (
        <TouchableOpacity style={styles.loginButton} onPress={openModal}>
          <Text style={styles.loginButtonText}>Get started ↗</Text>
        </TouchableOpacity>
      ) : (
        <></>
      )}
      <LoginPopup
        isVisible={isModalVisible}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />

    </View>
  );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 20,
    width: '100%', maxWidth: 1240, alignSelf: 'center',
    borderBottomWidth: 1, borderBottomColor: t.borderSubtle,
    backgroundColor: t.background,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    // Square now that the logo is the app mark rather than a wide cloud —
    // the old 65x40 box would squash it.
    width: 40,
    height: 48,
    borderRadius: 9,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    letterSpacing: -0.7,
    fontWeight: 'bold',
    color: t.text,
  },
  loginButton: {
    paddingVertical: 12, paddingHorizontal: 20,
    backgroundColor: t.surfaceAlt,
    borderRadius: 12,
  },
  privacyLink: {
    fontSize: 14,
    color: t.textMuted,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  loginButtonText: {
    color: t.primary,
    fontWeight: 'bold',
  },
});

export default Header;
