/**
 * PulsingStatusDot — A small animated pulsing dot (like a laser indicator).
 * Used inside status pills on project/task/contract cards.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

interface PulsingStatusDotProps {
  color: string;
  size?: number;
}

export default function PulsingStatusDot({ color, size = 6 }: PulsingStatusDotProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.25,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  const glowSize = size * 2.2;

  return (
    <View style={[styles.wrap, { width: glowSize, height: glowSize }]}>
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: color,
            opacity: pulse.interpolate({
              inputRange: [0.25, 1],
              outputRange: [0.08, 0.25],
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0.25, 1],
                  outputRange: [0.8, 1.3],
                }),
              },
            ],
          },
        ]}
      />
      {/* Core dot */}
      <Animated.View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: pulse.interpolate({
              inputRange: [0.25, 1],
              outputRange: [0.6, 1],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  dot: {
    // shadow for extra glow on iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
});
