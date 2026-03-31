import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

type AnimatedLoadingScreenProps = {
  message?: string;
  size?: 'small' | 'large';
  showMessage?: boolean;
  icon?: React.ReactNode;
  style?: any;
};

export default function AnimatedLoadingScreen({
  message,
  size = 'large',
  showMessage = true,
  icon,
  style,
}: AnimatedLoadingScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotate.start();
    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, [pulseAnim, rotateAnim]);

  const spin = useMemo(
    () =>
      rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    [rotateAnim]
  );

  const iconSize = size === 'large' ? 64 : 32;
  const loadingMessage = message || t('Loading...');

  // Keep layout identical across platforms; avoid web motion deps in android project.
  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [
                { scale: pulseAnim },
                { rotate: spin },
              ],
            },
          ]}
        >
          {icon ?? (
            <Ionicons
              name="cube-outline"
              size={iconSize}
              color={colors.primary}
            />
          )}
        </Animated.View>

        {showMessage && (
          <Text
            style={[
              styles.message,
              {
                color: colors.textSecondary,
                fontSize: scaledSize(14),
              },
            ]}
          >
            {loadingMessage}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Platform.OS === 'web' ? 18 : 16,
    paddingHorizontal: 24,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    fontWeight: '400',
  },
});

