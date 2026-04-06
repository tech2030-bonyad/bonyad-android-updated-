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
import { useTheme } from '../context/ThemeContext';

const SIZE = 67;
const WAVE_DURATION = 2000;
const WAVE_DELAYS = [0, 400, 800];
const PRIMARY = '#00A5F4';
const PRIMARY_DARK = '#0078E0';

// iOS ChatbotIcon dimensions (robot face)
const HEAD_W = 44;
const HEAD_H = 40;
const HEAD_RADIUS = 12;
const EYE_SIZE = 12;
const PUPIL_SIZE = 7;
const MOUTH_W = 16;
const MOUTH_H = 3;

/** Fallback when bottomInset is unknown; keeps FAB above floating GlassTabBar + wave rings */
const DEFAULT_BOTTOM = 120;

/**
 * Positions the FAB above the glass bottom tab bar (see GlassTabBar: inset padding + pill ~74px)
 * plus a little margin so pulse rings are not clipped by the tab bar.
 */
export function chatbotFabBottomOffset(bottomInset: number): number {
  return Math.max(bottomInset, 10) + 94;
}

interface ChatbotFabProps {
  onPress: () => void;
  primaryColor?: string;
  primaryDark?: string;
  /** Distance from bottom of screen; prefer `chatbotFabBottomOffset(insets.bottom)` on mobile */
  bottomOffset?: number;
  /**
   * When true, fills the parent instead of screen-absolute positioning (e.g. copilot highlight wrapper).
   * Parent should set size and position (typically 67×67 at bottom corner).
   */
  embedInParent?: boolean;
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
export function ChatbotIcon({
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

/**
 * Same robot face as the home FAB (ChatbotFab), scaled for header avatars and inline use.
 * Uses the shared ChatbotIcon visuals with primary / primaryDark from the app theme.
 */
export function ChatbotRobotFace({
  primaryColor = PRIMARY,
  primaryDark = PRIMARY_DARK,
  diameter = 40,
  enableBlink = true,
}: {
  primaryColor?: string;
  primaryDark?: string;
  /** Outer size of the avatar (matches Figma ~46px header circle). */
  diameter?: number;
  enableBlink?: boolean;
}) {
  const eyeScaleY = useRef(new Animated.Value(1)).current;
  const isRTL = I18nManager.isRTL;

  useEffect(() => {
    if (!enableBlink) return;
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
  }, [enableBlink, eyeScaleY]);

  const scale = diameter / SIZE;

  return (
    <View
      style={{
        width: diameter,
        height: diameter,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <View style={{ transform: [{ scale }], alignItems: 'center', justifyContent: 'center' }}>
        <ChatbotIcon
          primaryColor={primaryColor}
          primaryDark={primaryDark}
          lookRight={!isRTL}
          eyeScaleY={eyeScaleY}
        />
      </View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  robotWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
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

export default function ChatbotFab({
  onPress,
  primaryColor = PRIMARY,
  primaryDark = PRIMARY_DARK,
  bottomOffset = DEFAULT_BOTTOM,
  embedInParent = false,
}: ChatbotFabProps) {
  const isRTL = I18nManager.isRTL;
  const { colors } = useTheme();
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

  const touchableStyle = embedInParent
    ? [styles.touchable, styles.touchableEmbedded]
    : [styles.touchable, { bottom: bottomOffset }, isRTL ? styles.touchableRTL : styles.touchableLTR];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={touchableStyle}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <View style={styles.ringsContainer} pointerEvents="none">
        {WAVE_DELAYS.map((d) => (
          <WaveRing key={d} delay={d} primaryColor={primaryColor} primaryDark={primaryDark} />
        ))}
      </View>
      <View
        style={[styles.whiteCircle, { backgroundColor: colors.cardBackground }, Platform.OS === 'ios' ? styles.shadowIOS : styles.shadowAndroid]}
      >
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
  touchableEmbedded: {
    position: 'relative',
    width: '100%',
    height: '100%',
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
