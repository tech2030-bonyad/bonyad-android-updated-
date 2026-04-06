import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import BonyadLogo from './BonyadLogo';
import { useTheme } from '../context/ThemeContext';

/**
 * Animated splash shown while fonts/assets are loading.
 * Fades in + scales up the Bonyad logo on a white background,
 * then gently pulses until the parent removes it.
 */
export default function SplashScreenOverlay() {
  const { colors, theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.72)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance: fade in + spring scale up
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 140,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Gentle pulse loop after entrance
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.06,
            duration: 950,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 950,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={{
          opacity,
          transform: [
            { scale: Animated.multiply(scale, pulse) as any },
          ],
        }}
      >
        <BonyadLogo size="large" variant={theme === 'dark' ? 'light' : 'dark'} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
