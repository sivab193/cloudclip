import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

/** A lightweight native backdrop. Web gets richer CSS-rendered light fields. */
export default function AmbientBackdrop() {
  const t = useTheme();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!mounted || reduced) return;
      animation = Animated.loop(Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, useNativeDriver: true }),
      ]));
      animation.start();
    });
    return () => { mounted = false; animation?.stop(); };
  }, [drift]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <Animated.View style={[styles.orb, styles.orbOne, { backgroundColor: t.primarySoft, transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 36] }) }] }]} />
      <Animated.View style={[styles.orb, styles.orbTwo, { backgroundColor: t.accentSoft, transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -28] }) }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', width: 360, height: 360, borderRadius: 999, opacity: 0.42 },
  orbOne: { top: -180, right: -140 },
  orbTwo: { top: 420, left: -220 },
});
