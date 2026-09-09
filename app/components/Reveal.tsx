import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

export default function Reveal({ children }: PropsWithChildren) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let mounted = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => {
      if (reduced) { progress.stopAnimation(); progress.setValue(1); }
    });
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!mounted || reduced) return;
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 650, useNativeDriver: true }).start();
    });
    return () => { mounted = false; progress.stopAnimation(); subscription.remove(); };
  }, [progress]);
  return <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>{children}</Animated.View>;
}
