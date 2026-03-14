/**
 * iOS-style floating chatbot button: wave rings animation + white circle + robot icon.
 * Matches ChatbotButton + ChatbotIcon in bonyad-cr-2 App/Screens/Chat/ChatbotView.swift
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  I18nManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SIZE = 67;
const WAVE_DURATION = 2000;
const WAVE_DELAYS = [0, 400, 800];
const PRIMARY = '#00A5F4';
const PRIMARY_DARK = '#0078E0';

// iOS ChatbotIcon dimensions (robot face)
const HEAD_W = 44;
const HEAD_H = 40;
const HEAD_RADIUS = 12;
const ANTENNA_W = 4;
const ANTENNA_H = 10;
const ANTENNA_TIP = 8;
const EYE_SIZE = 12;
const PUPIL_SIZE = 7;
const MOUTH_W = 16;
const MOUTH_H = 3;

const DEFAULT_BOTTOM = 100;

interface ChatbotFabProps {
  onPress: () => void;
  primaryColor?: string;
  primaryDark?: string;
  /** Distance from bottom of screen; increase to move FAB higher (default 100, above tab bar) */
  bottomOffset?: number;
}

function WaveRing({ delay, primaryColor }: { delay: number; primaryColor: string; primaryDark?: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = () =>
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 2,
              duration: WAVE_DURATION,
              useNativeDriver: true,
              easing: Easing.out(Easing.ease),
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: WAVE_DURATION,
              useNativeDriver: true,
              easing: Easing.out(Easing.ease),
            }),
          ]),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    const t = setTimeout(loop, delay);
    return () => clearTimeout(t);
  }, [delay, scale, opacity]);

  return (
    <Animated.View
      style={[
        styles.waveRing,
        {
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: 2,
          borderColor: primaryColor,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

const BLINK_INTERVAL_MS = 3000;
const BLINK_CLOSE_MS = 90;
const BLINK_OPEN_MS = 120;

/** Robot face icon: only the pupils look toward plus (center); blink every 3s */
function ChatbotIcon({
  primaryColor,
  primaryDark,
  lookRight,
  eyeScaleY,
}: {
  primaryColor: string;
  primaryDark: string;
  lookRight: boolean;
  eyeScaleY: Animated.Value;
}) {
  const pupilOffset = lookRight ? 2.5 : -2.5;

  return (
    <View style={iconStyles.robotWrap}>
      {/* Antenna tip + stem (above head) */}
      <View style={iconStyles.antennaGroup}>
        <View style={[iconStyles.antennaTip, { backgroundColor: primaryColor }]} />
        <View style={[iconStyles.antenna, { backgroundColor: primaryDark }]} />
      </View>
      {/* Head: rounded rect with gradient */}
      <LinearGradient
        colors={[primaryColor, primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={iconStyles.head}
      >
        {/* Eyes row — scaleY for blink; pupils offset to look toward plus */}
        <Animated.View style={[iconStyles.eyesRow, { transform: [{ scaleY: eyeScaleY }] }]}>
          <View style={iconStyles.eye}>
            <View style={[iconStyles.pupil, { transform: [{ translateX: pupilOffset }] }]}>
              <View style={iconStyles.pupilReflection} />
            </View>
          </View>
          <View style={iconStyles.eye}>
            <View style={[iconStyles.pupil, { transform: [{ translateX: pupilOffset }] }]}>
              <View style={iconStyles.pupilReflection} />
            </View>
          </View>
        </Animated.View>
        {/* Mouth */}
        <View style={iconStyles.mouth} />
      </LinearGradient>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  robotWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  antennaGroup: {
    alignItems: 'center',
    marginBottom: 2,
  },
  antennaTip: {
    width: ANTENNA_TIP,
    height: ANTENNA_TIP,
    borderRadius: ANTENNA_TIP / 2,
    marginBottom: 2,
  },
  antenna: {
    width: ANTENNA_W,
    height: ANTENNA_H,
    borderRadius: ANTENNA_W / 2,
  },
  head: {
    width: HEAD_W,
    height: HEAD_H,
    borderRadius: HEAD_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  eyesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  eye: {
    width: EYE_SIZE,
    height: EYE_SIZE,
    borderRadius: EYE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  pupil: {
    width: PUPIL_SIZE,
    height: PUPIL_SIZE,
    borderRadius: PUPIL_SIZE / 2,
    backgroundColor: '#1A1A2E',
    position: 'relative',
  },
  pupilReflection: {
    position: 'absolute',
    top: 1,
    left: 1,
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: '#FFFFFF',
  },
  mouth: {
    width: MOUTH_W,
    height: MOUTH_H,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});

export default function ChatbotFab({ onPress, primaryColor = PRIMARY, primaryDark = PRIMARY_DARK, bottomOffset = DEFAULT_BOTTOM }: ChatbotFabProps) {
  const isRTL = I18nManager.isRTL;
  const eyeScaleY = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = () =>
      Animated.sequence([
        Animated.timing(eyeScaleY, {
          toValue: 0.12,
          duration: BLINK_CLOSE_MS,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(eyeScaleY, {
          toValue: 1,
          duration: BLINK_OPEN_MS,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]).start();
    const interval = setInterval(blink, BLINK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [eyeScaleY]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.touchable, { bottom: bottomOffset }, isRTL ? styles.touchableRTL : styles.touchableLTR]}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <View style={styles.ringsContainer} pointerEvents="none">
        {WAVE_DELAYS.map((d) => (
          <WaveRing key={d} delay={d} primaryColor={primaryColor} primaryDark={primaryDark} />
        ))}
      </View>
      <View style={[styles.whiteCircle, Platform.select({ ios: styles.shadowIOS, android: styles.shadowAndroid })]}>
        <ChatbotIcon
          primaryColor={primaryColor}
          primaryDark={primaryDark}
          lookRight={!isRTL}
          eyeScaleY={eyeScaleY}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  touchableLTR: { left: 20 },
  touchableRTL: { right: 20 },
  ringsContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRing: {
    position: 'absolute',
  },
  whiteCircle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowIOS: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  shadowAndroid: {
    elevation: 6,
  },
});
