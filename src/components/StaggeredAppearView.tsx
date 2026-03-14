import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

// Match iOS StaggeredAppearModifier: spring(response: 0.5, dampingFraction: 0.8)
const SPRING_CONFIG = { tension: 60, friction: 14 };
const DELAY_PER_INDEX_MS = 80;
const INITIAL_OFFSET_Y = 24;

interface StaggeredAppearViewProps {
  children: React.ReactNode;
  index?: number;
  style?: ViewStyle;
}

/**
 * iOS-style staggered appear: opacity 0→1 and translateY 24→0 with spring + delay.
 * Matches DesignSystem.StaggeredAppearModifier from the iOS app.
 */
export default function StaggeredAppearView({
  children,
  index = 0,
  style,
}: StaggeredAppearViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(INITIAL_OFFSET_Y)).current;

  useEffect(() => {
    const delay = index * DELAY_PER_INDEX_MS;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(opacity, {
          toValue: 1,
          useNativeDriver: true,
          ...SPRING_CONFIG,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          ...SPRING_CONFIG,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [index, opacity, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
