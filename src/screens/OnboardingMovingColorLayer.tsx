import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

export function OnboardingMovingColorLayer() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 14000,
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 14000,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [progress]);

  if (Platform.OS === 'web') {
    return null;
  }

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-W * 0.42, W * 0.42],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [H * 0.06, -H * 0.045],
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-7deg', '7deg'],
  });

  return (
    <View pointerEvents="none" style={{ position: 'absolute', zIndex: -1, elevation: -1 }}>
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateX }, { translateY }, { rotate }] },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(186,230,253,0.15)',
            'rgba(56,189,248,0.10)',
            'rgba(96,165,250,0.08)',
            'rgba(147,197,253,0.06)',
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
