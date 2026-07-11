import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';

interface AlertProps {
  message: string;
  visible: boolean;
}

const Alert: React.FC<AlertProps> = ({ message, visible }) => {
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 30 : 70,
    alignSelf: 'center',
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 5,
    zIndex: 9999,
    alignItems: 'center',
  },
  message: {
    color: '#fff',
  },
});

export default Alert;
