import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface ScreenTransitionProps {
  children: React.ReactNode;
  style?: object;
}

/**
 * Wraps a conditionally-rendered screen with a fade + slide-up entrance animation.
 * Use this for screens that mount/unmount based on active tab state.
 */
export default function ScreenTransition({ children, style }: ScreenTransitionProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        { flex: 1 },
        style,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}
