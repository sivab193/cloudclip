import LoginPopup from '@/app/Login';
import React, { useState, useContext } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '@/auth/AuthContext'; // Import AuthContext
import { useRouter } from 'expo-router';

const Header = ({ navigation }: { navigation: any }) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const { user, logout } = useAuth()

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  const handleSuccess = () => {
    closeModal();
  };

  const handleLogout = async () => {
    try {
      await logout(); // Call logout from AuthContext
    } catch (error) {
      console.error('Error logging out: ', error);
    }
  };
  const router = useRouter();

  const navigateToHome = () => {
    router.push('/'); // Redirect to the homepage
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.logoContainer} onPress={navigateToHome} activeOpacity={0.7}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.headerTitle}>Cloud-Clip</Text>
      </TouchableOpacity>
      {!user ? (
        <TouchableOpacity style={styles.loginButton} onPress={openModal}>
          <Text style={styles.loginButtonText}>Log In</Text>
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 65,
    height: 40,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loginButton: {
    padding: 10,
    backgroundColor: '#000',
    borderRadius: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default Header;
