import React, { useRef } from 'react';
import { TouchableOpacity, Animated, StyleProp, ViewStyle } from 'react-native';

// iOS PressableCardStyle: scale 0.97, spring(response: 0.3, dampingFraction: 0.7)
const SPRING_CONFIG = { tension: 200, friction: 15 };

interface PressableScaleViewProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps content in a touchable that scales to 0.97 on press.
 * Matches iOS DesignSystem.PressableCardStyle for consistent feel across platforms.
 */
export default function PressableScaleView({ children, onPress, style }: PressableScaleViewProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      ...SPRING_CONFIG,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      ...SPRING_CONFIG,
    }).start();
  return (
    <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1} style={style}>
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </TouchableOpacity>
  );
}
