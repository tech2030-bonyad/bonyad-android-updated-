import React, { useEffect } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

/**
 * Soft moving color wash for onboarding (Reanimated + expo-linear-gradient).
 * Omitted on web (no moving layer).
 */
export function OnboardingMovingColorLayer() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  const sheetStyle = useAnimatedStyle(() => {
    const tx = interpolate(progress.value, [0, 1], [-W * 0.42, W * 0.42]);
    const ty = interpolate(progress.value, [0, 1], [H * 0.06, -H * 0.045]);
    const rotate = `${interpolate(progress.value, [0, 1], [-7, 7])}deg`;
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { rotate }],
    };
  });

  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(186,230,253,0.38)',
            'rgba(56,189,248,0.30)',
            'rgba(96,165,250,0.24)',
            'rgba(147,197,253,0.20)',
            'rgba(255,255,255,0)',
          ]}
          locations={[0, 0.18, 0.36, 0.52, 0.7, 1]}
          start={{ x: 0, y: 0.15 }}
          end={{ x: 1, y: 0.88 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    width: W * 1.4,
    height: H * 1.22,
    left: -W * 0.2,
    top: -H * 0.1,
  },
  gradient: {
    flex: 1,
  },
});
