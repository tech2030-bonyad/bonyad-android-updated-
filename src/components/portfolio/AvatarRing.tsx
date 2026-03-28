import React, { useEffect, useId, useRef } from 'react';
import { Animated, View, StyleSheet, Easing } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

export const AvatarRing = ({ children }: { children: React.ReactNode }) => {
  const { colors } = useTheme();
  const gradId = `ringGrad_${useId().replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ringWrapper, { transform: [{ rotate }] }]}>
        <Svg width={96} height={96} viewBox="0 0 96 96" style={StyleSheet.absoluteFillObject}>
          <Defs>
            <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#00549B" />
              <Stop offset="33%" stopColor="#0099ff" />
              <Stop offset="66%" stopColor="#00c8ff" />
              <Stop offset="100%" stopColor="#00549B" />
            </LinearGradient>
          </Defs>
          <Circle cx="48" cy="48" r="46" stroke={`url(#${gradId})`} strokeWidth="3" fill="none" />
        </Svg>
        <View style={[styles.innerAvatar, { backgroundColor: colors.primaryDark, borderColor: colors.background }]}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
