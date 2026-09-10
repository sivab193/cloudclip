import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, ViewStyle } from 'react-native';

export default function Reveal({ children, delay = 0, style }: PropsWithChildren<{ delay?: number; style?: ViewStyle }>) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => {
      if (reduced) { progress.stopAnimation(); progress.setValue(1); }
    });
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!mounted || reduced) return;
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, delay, damping: 18, stiffness: 100, mass: 0.8, useNativeDriver: true }).start();
    });
    return () => { mounted = false; progress.stopAnimation(); subscription.remove(); };
  }, [delay, progress]);
  return <Animated.View style={[style, { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1] }) }] }]}>{children}</Animated.View>;
}
