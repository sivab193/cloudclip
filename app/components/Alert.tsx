import React, { useState, useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Platform } from 'react-native';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';

interface AlertProps {
  message: string;
  visible: boolean;
}

const Alert: React.FC<AlertProps> = ({ message, visible }) => {
  const styles = useThemedStyles(makeStyles);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowing(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowing(false));
    }
  }, [visible, fadeAnim]);

  if (!showing) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 30 : 70,
    alignSelf: 'center',
    backgroundColor: t.primaryStrong,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 16,
    zIndex: 9999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.primary,
    shadowColor: t.primaryStrong,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  message: {
    color: t.onPrimary,
  },
});

export default Alert;
