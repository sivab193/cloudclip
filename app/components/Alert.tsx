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
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 30 : 70,
    alignSelf: 'center',
    backgroundColor: t.primary,
    padding: 16,
    borderRadius: 5,
    zIndex: 9999,
    alignItems: 'center',
  },
  message: {
    color: t.onPrimary,
  },
});

export default Alert;
