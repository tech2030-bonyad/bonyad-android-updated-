import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
  Image,
  Animated,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { SvgXml, Rect, Defs, Pattern, Circle } from 'react-native-svg';
import BonyadLogo from '../components/BonyadLogo';
import { AbsherLogoSvg } from '../assets/svg/AbsherLogo';
import { NafathLogoSvg } from '../assets/svg/NafathLogo';
import { AbsherBuiltOnTrustSvg } from '../assets/svg/AbsherBuiltOnTrust';
import { NafathBuiltOnTrustSvg } from '../assets/svg/NafathBuiltOnTrust';
import { BuiltOnTrustArrow1Svg } from '../assets/svg/BuiltOnTrustArrow1';
import { BuiltOnTrustArrow2Svg } from '../assets/svg/BuiltOnTrustArrow2';
import {
  MpCheckmarkSvg,
  MpGlobeInnerSvg,
  MpGlobeMidSvg,
  MpGlobeOuterSvg,
  MpNextArrow1Svg,
  MpNextArrow2Svg,
} from '../assets/svg/onboarding/manageProjects/svgs';
import { OnboardingMovingColorLayer } from './OnboardingMovingColorLayer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUILT_ON_TRUST_BASE = { w: 378, h: 878 };
const sx = (px: number) => (SCREEN_WIDTH * px) / BUILT_ON_TRUST_BASE.w;
const sy = (px: number) => (SCREEN_HEIGHT * px) / BUILT_ON_TRUST_BASE.h;

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** Same bottom inset as Built on Trust primary CTA (Figma 878pt artboard). */
const ONBOARDING_PRIMARY_CTA_BOTTOM = sy(878 - 764) + 6;
/** Same bottom inset as Built on Trust page dots. */
const ONBOARDING_PAGE_DOTS_BOTTOM = sy(878 - 830);

// Brand colors (from iOS OnboardingView.swift)
const COLORS = {
  blue100: '#003867',
  blue90: '#004178',
  blue80: '#004A8A',
  blue70: '#00549B',
  blue60: '#005DAC',
  blue50: '#1A6DB4',
  blue40: '#4D8EC5',
  blue30: '#80AED6',
  blue20: '#B3CEE6',
  blue10: '#E6EFF7',
  amber100: '#916801',
  amber80: '#B68202',
  amber70: '#DA9C02',
  amber60: '#FFB703',
  amber50: '#FFD683',
  amber30: '#FFE9B6',
  green100: '#006A2D',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  textBody: '#383838',
  textSecond: '#A3A3A3',
  textDividers: '#D9D9D9',
  textBg: '#F0F0F0',
};

interface OnboardingScreenProps {
  onFinish: () => void;
  variant?: 'user' | 'technician';
}

// --- Dot Pattern Background (SVG-based: 1 element instead of ~400 Views) ---
function DotPattern({ color = 'rgba(255,255,255,0.04)' }: { color?: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
        <Defs>
          <Pattern id="dotGrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <Circle cx="1" cy="1" r="1" fill={color} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#dotGrid)" />
      </Svg>
    </View>
  );
}

// --- Page dots: scroll-linked capsule + gradient (same position on every onboarding page) ---
function OnboardingPagerDots({
  scrollX,
  total,
}: {
  scrollX: Animated.Value;
  total: number;
}) {
  const pageW = SCREEN_WIDTH;
  const inactiveW = sx(8);
  const activeW = sx(22);
  const h = sy(6);
  const gap = sx(8);

  return (
    <View style={[styles.onboardingPagerDotsRow, { gap }]}>
      {Array.from({ length: total }).map((_, i) => {
        const dotW = scrollX.interpolate({
          inputRange: [(i - 1) * pageW, i * pageW, (i + 1) * pageW],
          outputRange: [inactiveW, activeW, inactiveW],
          extrapolate: 'clamp',
        });
        const gradOp = scrollX.interpolate({
          inputRange: [(i - 1) * pageW, i * pageW, (i + 1) * pageW],
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={{
              width: dotW,
              height: h,
              borderRadius: 999,
              overflow: 'hidden',
              backgroundColor: '#CBD5E1',
            }}
          >
            <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: gradOp }]} pointerEvents="none">
              <LinearGradient
                colors={[COLORS.blue70, '#637CCF']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Fallback when scroll position is not available (unused in main 3-page flow). */
function PageIndicator({
  total,
  current,
  activeColor = COLORS.amber60,
  inactiveColor = 'rgba(255,255,255,0.25)',
}: {
  total: number;
  current: number;
  activeColor?: string;
  inactiveColor?: string;
}) {
  return (
    <View style={styles.indicatorRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.indicatorDot,
            {
              width: i === current ? 22 : 7,
              backgroundColor: i === current ? activeColor : inactiveColor,
            },
          ]}
        />
      ))}
    </View>
  );
}

// --- Task Row (checkmark + label, matches iOS TaskRow) ---
function TaskRow({ isDone, label }: { isDone: boolean; label: string }) {
  return (
    <View style={styles.taskRow}>
      <View
        style={[
          styles.taskCheck,
          { backgroundColor: isDone ? COLORS.blue60 : COLORS.blue10, borderColor: isDone ? 'transparent' : COLORS.blue20 },
        ]}
      >
        {isDone && <Text style={styles.taskCheckmark}>✓</Text>}
      </View>
      <Text
        style={[
          styles.taskLabel,
          isDone && { color: COLORS.textSecond, textDecorationLine: 'line-through' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// --- Pro Card (matches iOS ProCard) ---
function ProCard({
  initials,
  name,
  role,
  score,
  reviews,
  gradientColors,
  accentColor,
}: {
  initials: string;
  name: string;
  role: string;
  score: string;
  reviews: string;
  gradientColors: [string, string];
  accentColor: string;
}) {
  return (
    <View style={styles.proCard}>
      <View style={[styles.proAccent, { backgroundColor: accentColor }]} />
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.proAvatar}>
        <Text style={styles.proInitials}>{initials}</Text>
      </LinearGradient>
      <View style={styles.proInfo}>
        <Text style={styles.proName} numberOfLines={1}>{name}</Text>
        <Text style={styles.proRole} numberOfLines={1}>{role}</Text>
      </View>
      <View style={styles.proScore}>
        <Text style={styles.proScoreText}>{score}</Text>
        <Text style={styles.proReviews}>{reviews}</Text>
      </View>
    </View>
  );
}

// ================== SCREEN 1: WELCOME ==================
function BuiltOnTrustScreen({ onContinue }: { onContinue: () => void }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar-');

  // === Background orbs (aurora effect) ===
  // Orb 1 – large deep-blue, bottom-left → sweep across
  const orb1X = useRef(new Animated.Value(-120)).current;
  const orb1Y = useRef(new Animated.Value(SCREEN_HEIGHT * 0.65)).current;
  const orb1Scale = useRef(new Animated.Value(1)).current;
  // Orb 2 – medium cyan, top-right → counter sweep
  const orb2X = useRef(new Animated.Value(SCREEN_WIDTH * 0.55)).current;
  const orb2Y = useRef(new Animated.Value(-80)).current;
  // Orb 3 – small accent, center, drifts slowly
  const orb3X = useRef(new Animated.Value(SCREEN_WIDTH * 0.5)).current;
  const orb3Y = useRef(new Animated.Value(SCREEN_HEIGHT * 0.32)).current;

  // === Logo entrance (spring scale + fade) ===
  const absherScale = useRef(new Animated.Value(0.55)).current;
  const absherOpacity = useRef(new Animated.Value(0)).current;
  const nafathScale = useRef(new Animated.Value(0.55)).current;
  const nafathOpacity = useRef(new Animated.Value(0)).current;

  // === Logo float (gentle bob) ===
  const absherFloat = useRef(new Animated.Value(0)).current;
  const nafathFloat = useRef(new Animated.Value(0)).current;

  // Continue Securely — iOS-style gloss sweep (JS driver: reliable with LinearGradient on Android)
  const buttonShimmerWidth = Math.min(sx(160), SCREEN_WIDTH * 0.45);
  const shimmerX = useRef(new Animated.Value(-buttonShimmerWidth)).current;

  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);

    // Orb 1: bottom-left → mid → top-center → right → back
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb1X, { toValue: sx(20), duration: 4200, easing: ease, useNativeDriver: true }),
          Animated.timing(orb1Y, { toValue: SCREEN_HEIGHT * 0.38, duration: 4200, easing: ease, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(orb1X, { toValue: SCREEN_WIDTH * 0.3, duration: 3800, easing: ease, useNativeDriver: true }),
          Animated.timing(orb1Y, { toValue: SCREEN_HEIGHT * 0.04, duration: 3800, easing: ease, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(orb1X, { toValue: SCREEN_WIDTH * 0.55, duration: 3200, easing: ease, useNativeDriver: true }),
          Animated.timing(orb1Y, { toValue: SCREEN_HEIGHT * 0.5, duration: 3200, easing: ease, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(orb1X, { toValue: -120, duration: 4000, easing: ease, useNativeDriver: true }),
          Animated.timing(orb1Y, { toValue: SCREEN_HEIGHT * 0.65, duration: 4000, easing: ease, useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Orb 1 breathe – smooth in/out
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Scale, { toValue: 1.2, duration: 3000, easing: ease, useNativeDriver: true }),
        Animated.timing(orb1Scale, { toValue: 0.85, duration: 3000, easing: ease, useNativeDriver: true }),
      ])
    ).start();

    // Orb 2: top-right → mid-left → bottom-center → back
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb2X, { toValue: sx(10), duration: 4500, easing: ease, useNativeDriver: true }),
          Animated.timing(orb2Y, { toValue: SCREEN_HEIGHT * 0.44, duration: 4500, easing: ease, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(orb2X, { toValue: SCREEN_WIDTH * 0.35, duration: 3600, easing: ease, useNativeDriver: true }),
          Animated.timing(orb2Y, { toValue: SCREEN_HEIGHT * 0.72, duration: 3600, easing: ease, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(orb2X, { toValue: SCREEN_WIDTH * 0.55, duration: 4000, easing: ease, useNativeDriver: true }),
          Animated.timing(orb2Y, { toValue: -80, duration: 4000, easing: ease, useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Orb 3: slow drift in a small ellipse
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb3X, { toValue: SCREEN_WIDTH * 0.15, duration: 5500, easing: ease, useNativeDriver: true }),
          Animated.timing(orb3Y, { toValue: SCREEN_HEIGHT * 0.55, duration: 5500, easing: ease, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(orb3X, { toValue: SCREEN_WIDTH * 0.6, duration: 5500, easing: ease, useNativeDriver: true }),
          Animated.timing(orb3Y, { toValue: SCREEN_HEIGHT * 0.2, duration: 5500, easing: ease, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(orb3X, { toValue: SCREEN_WIDTH * 0.5, duration: 5000, easing: ease, useNativeDriver: true }),
          Animated.timing(orb3Y, { toValue: SCREEN_HEIGHT * 0.32, duration: 5000, easing: ease, useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Logo spring entrance with stagger
    Animated.stagger(280, [
      Animated.parallel([
        Animated.timing(absherOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.spring(absherScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(nafathOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.spring(nafathScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]),
    ]).start();

    // Logo float bob (offset so they move out of phase)
    Animated.loop(
      Animated.sequence([
        Animated.timing(absherFloat, { toValue: -7, duration: 2000, easing: ease, useNativeDriver: true }),
        Animated.timing(absherFloat, { toValue: 0, duration: 2000, easing: ease, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(nafathFloat, { toValue: -7, duration: 2000, easing: ease, useNativeDriver: true }),
        Animated.timing(nafathFloat, { toValue: 0, duration: 2000, easing: ease, useNativeDriver: true }),
      ])
    ).start();

    // Gloss sweep across primary button (like iOS prominent button highlight)
    let shimmerStopped = false;
    const btnW = SCREEN_WIDTH - sx(42) * 2;
    const runGloss = () => {
      if (shimmerStopped) return;
      shimmerX.setValue(-buttonShimmerWidth);
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: btnW,
          duration: 2000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(1100),
      ]).start(() => runGloss());
    };
    const glossDelay = setTimeout(runGloss, 700);
    return () => {
      shimmerStopped = true;
      clearTimeout(glossDelay);
    };
  }, []);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: '#fff', overflow: 'hidden' }]}>
      <LinearGradient
        colors={['#FFFFFF', '#FFFFFF', '#B1CEE6', '#84B1D7', '#4D8EC5']}
        locations={[0, 0.60, 0.85, 0.95, 1]}
        start={{ x: 0.12, y: 0.1 }}
        end={{ x: 0.95, y: 0.95 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Orb 1 – large deep-blue aurora blob */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: sx(360),
          height: sx(360),
          borderRadius: sx(180),
          backgroundColor: '#003867',
          opacity: 0.13,
          transform: [{ translateX: orb1X }, { translateY: orb1Y }, { scale: orb1Scale }],
        }}
      />

      {/* Orb 2 – medium cyan blob, counter-sweeps */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: sx(220),
          height: sx(220),
          borderRadius: sx(110),
          backgroundColor: '#1A6DB4',
          opacity: 0.14,
          transform: [{ translateX: orb2X }, { translateY: orb2Y }],
        }}
      />

      {/* Orb 3 – small light-blue accent glow */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: sx(140),
          height: sx(140),
          borderRadius: sx(70),
          backgroundColor: '#80AED6',
          opacity: 0.22,
          transform: [{ translateX: orb3X }, { translateY: orb3Y }],
        }}
      />

      <View style={[styles.builtRoot, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.builtLogoWrap}>
          <BonyadLogo size="medium" variant="dark" responsive={false} marginLeft={0} spacing={6} />
        </View>

        <Text style={styles.builtTitle}>
          {t('onboarding_built_on_trust', { defaultValue: 'Built on Trust' })}
        </Text>

        <Text style={styles.builtParagraph}>
          <Text style={styles.builtParagraphRegular}>
            {t('onboarding_secure_access_prefix', { defaultValue: 'Secure access powered by ' })}
          </Text>
          <Text style={styles.builtParagraphBold}>
            {t('onboarding_absher', { defaultValue: 'Absher' })}
          </Text>
          <Text style={styles.builtParagraphRegular}>
            {t('onboarding_secure_access_mid', { defaultValue: ' & ' })}
          </Text>
          <Text style={styles.builtParagraphBold}>
            {t('onboarding_nafath', { defaultValue: 'Nafath' })}
          </Text>
          <Text style={styles.builtParagraphRegular}>
            {t('onboarding_secure_access_suffix', { defaultValue: ' integration.\nYour identity. Fully verified.' })}
          </Text>
        </Text>

        <Text style={styles.builtIntegratedWith}>
          {t('onboarding_integrated_with', { defaultValue: 'Integrated with' })}
        </Text>

        {/* Logos: spring-scale entrance + continuous float bob */}
        <View style={styles.builtLogosRow}>
          <Animated.View style={{
            opacity: absherOpacity,
            transform: [{ scale: absherScale }, { translateY: absherFloat }],
          }}>
            <SvgXml xml={AbsherBuiltOnTrustSvg} width={sx(53.47)} height={sy(79.692)} />
          </Animated.View>
          <Animated.View style={{
            opacity: nafathOpacity,
            transform: [{ scale: nafathScale }, { translateY: nafathFloat }],
          }}>
            <SvgXml xml={NafathBuiltOnTrustSvg} width={sx(107.112)} height={sy(46.065)} />
          </Animated.View>
        </View>

        <TouchableOpacity activeOpacity={0.88} onPress={onContinue} style={styles.builtButtonOuter}>
          <View style={[styles.builtButton, { overflow: 'hidden' }]}>
            <LinearGradient
              colors={['#F8FAFC', '#E0EEF9', '#C5DDF0', '#9EC5E5']}
              locations={[0.2, 0.45, 0.72, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View
              pointerEvents="none"
              collapsable={false}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: buttonShimmerWidth,
                zIndex: 1,
                transform: [{ translateX: shimmerX }],
              }}
            >
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0)',
                  'rgba(255,255,255,0.45)',
                  'rgba(255,255,255,0.85)',
                  'rgba(186,230,253,0.55)',
                  'rgba(255,255,255,0)',
                ]}
                locations={[0, 0.32, 0.5, 0.68, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Text style={[styles.builtButtonLabel, { zIndex: 2 }]}>
              {t('onboarding_continue_securely', { defaultValue: 'Continue Securely' })}
            </Text>
            <View style={[styles.builtArrowWrap, { zIndex: 2, transform: [{ scaleX: isRTL ? -1 : 1 }] }]} pointerEvents="none">
              <View style={styles.builtArrow1}>
                <SvgXml xml={BuiltOnTrustArrow1Svg} width="100%" height="100%" />
              </View>
              <View style={styles.builtArrow2}>
                <SvgXml xml={BuiltOnTrustArrow2Svg} width="100%" height="100%" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ================== SCREEN 2: FIND PROFESSIONALS (Figma 233:2452) ==================
/** Light ring draws around the feature icons grid (stroke animates on like iOS highlight). */
function FpFeaturesRingSection({ children }: { children: React.ReactNode }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const dash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (size.w < 12 || size.h < 12) return;
    dash.setValue(0);
    const timer = setTimeout(() => {
      Animated.timing(dash, {
        toValue: 1,
        duration: 2400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, 400);
    return () => clearTimeout(timer);
  }, [size.w, size.h]);

  const strokeW = 2;
  const w = size.w;
  const h = size.h;
  const rx = Math.min(sx(12), Math.max(4, (w - strokeW) / 2 - 1), Math.max(4, (h - strokeW) / 2 - 1));
  const straightW = Math.max(0, w - strokeW - 2 * rx);
  const straightH = Math.max(0, h - strokeW - 2 * rx);
  const perimeter = 2 * straightW + 2 * straightH + 2 * Math.PI * rx;

  const strokeDashoffset = dash.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(perimeter + 2, 8), 0],
  });

  return (
    <View
      style={styles.fpFeaturesRingOuter}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0 && (width !== size.w || height !== size.h)) {
          setSize({ w: width, h: height });
        }
      }}
    >
      {w > 2 && h > 2 && perimeter > 4 && (
        <Svg pointerEvents="none" width={w} height={h} style={[StyleSheet.absoluteFillObject, { zIndex: 3 }]}>
          <AnimatedRect
            x={strokeW / 2}
            y={strokeW / 2}
            width={Math.max(0.5, w - strokeW)}
            height={Math.max(0.5, h - strokeW)}
            rx={rx}
            ry={rx}
            fill="none"
            stroke="rgba(219, 234, 254, 0.98)"
            strokeWidth={strokeW}
            strokeDasharray={`${perimeter}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
      )}
      <View style={{ zIndex: 1 }}>{children}</View>
    </View>
  );
}

function FindProfessionalsOnboardingScreen({ onGetStarted }: { onGetStarted: () => void }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar-');

  const fpGlossW = Math.min(sx(160), SCREEN_WIDTH * 0.45);
  const fpShimmerX = useRef(new Animated.Value(-fpGlossW)).current;

  // Large circling orb — integer size so borderRadius tracks a true circle on Android.
  const FP_ORBIT_DIAMETER = Math.round(Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.48);
  const FP_ORBIT_R = FP_ORBIT_DIAMETER / 2;
  // Center path ~2px inside edges so the disc grazes the border (reads as “on” the frame).
  const FP_ORBIT_PAD = FP_ORBIT_R + 2;
  const fpBorderOrbitW = SCREEN_WIDTH - 2 * FP_ORBIT_PAD;
  const fpBorderOrbitH = SCREEN_HEIGHT - 2 * FP_ORBIT_PAD;
  const fpBorderPerim = 2 * fpBorderOrbitW + 2 * fpBorderOrbitH;
  const fpBorderOrbitDuration = 26000;

  const fpOrbitCx = useRef(new Animated.Value(SCREEN_WIDTH - FP_ORBIT_PAD)).current;
  const fpOrbitCy = useRef(new Animated.Value(SCREEN_HEIGHT - FP_ORBIT_PAD)).current;

  useEffect(() => {
    const lin = Easing.linear;
    const dBottom = (fpBorderOrbitW / fpBorderPerim) * fpBorderOrbitDuration;
    const dLeft = (fpBorderOrbitH / fpBorderPerim) * fpBorderOrbitDuration;
    const dTop = (fpBorderOrbitW / fpBorderPerim) * fpBorderOrbitDuration;
    const dRight = (fpBorderOrbitH / fpBorderPerim) * fpBorderOrbitDuration;

    const lap = Animated.sequence([
      Animated.timing(fpOrbitCx, { toValue: FP_ORBIT_PAD, duration: dBottom, easing: lin, useNativeDriver: true }),
      Animated.timing(fpOrbitCy, { toValue: FP_ORBIT_PAD, duration: dLeft, easing: lin, useNativeDriver: true }),
      Animated.timing(fpOrbitCx, { toValue: SCREEN_WIDTH - FP_ORBIT_PAD, duration: dTop, easing: lin, useNativeDriver: true }),
      Animated.timing(fpOrbitCy, { toValue: SCREEN_HEIGHT - FP_ORBIT_PAD, duration: dRight, easing: lin, useNativeDriver: true }),
    ]);
    const orbitLoop = Animated.loop(lap);
    orbitLoop.start();
    return () => orbitLoop.stop();
  }, [fpOrbitCx, fpOrbitCy]);

  useEffect(() => {
    let stop = false;
    const btnInnerW = SCREEN_WIDTH - sx(42) * 2;
    const runGloss = () => {
      if (stop) return;
      fpShimmerX.setValue(-fpGlossW);
      Animated.sequence([
        Animated.timing(fpShimmerX, {
          toValue: btnInnerW,
          duration: 2000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(1100),
      ]).start(() => runGloss());
    };
    const glossDelay = setTimeout(runGloss, 700);
    return () => {
      stop = true;
      clearTimeout(glossDelay);
    };
  }, []);

  const featureCard = (icon: React.ReactNode, label: string) => (
    <View style={styles.fpFeatureCard}>
      <View style={styles.fpFeatureIconWrap}>{icon}</View>
      <Text style={styles.fpFeatureLabel}>{label}</Text>
    </View>
  );

  const workerCard = (accent: string, initials: string, name: string, meta: string, rating: string, jobs: string) => (
    <View style={styles.fpWorkerCard}>
      <View style={[styles.fpWorkerAccent, { backgroundColor: accent }]} />
      <View style={[styles.fpWorkerAvatar, { shadowColor: accent }]}>
        <LinearGradient colors={[accent, accent]} style={StyleSheet.absoluteFill} />
        <Text style={styles.fpWorkerInitials}>{initials}</Text>
        <View style={styles.fpWorkerOnlineDot} />
      </View>

      <View style={styles.fpWorkerBody}>
        <Text style={styles.fpWorkerName}>{name}</Text>
        <Text style={styles.fpWorkerMeta}>{meta}</Text>
        <View style={styles.fpWorkerStatsRow}>
          <View style={styles.fpWorkerPill}>
            <Text style={styles.fpWorkerStar}>★</Text>
            <Text style={styles.fpWorkerRating}>{rating}</Text>
          </View>
          <View style={styles.fpWorkerJobsRow}>
            <Ionicons name="briefcase-outline" size={11} color="#64748B" />
            <Text style={styles.fpWorkerJobs}>{jobs}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.fpWorkerChevronBtn, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]}>
        <Ionicons name="chevron-forward" size={14} color="#00549B" />
      </View>
    </View>
  );

  const fpContentBottomPad =
    ONBOARDING_PRIMARY_CTA_BOTTOM + Math.max(sy(54), 50) + sy(10) + sy(8) + sy(6);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: '#F0F4FA' }]}>
      <View pointerEvents="none" style={styles.fpBorderOrbitLayer}>
        <Animated.View
          style={[
            styles.fpBorderOrbitOuter,
            {
              width: FP_ORBIT_DIAMETER,
              height: FP_ORBIT_DIAMETER,
              borderRadius: FP_ORBIT_R,
              transform: [
                { translateX: Animated.add(fpOrbitCx, -FP_ORBIT_R) },
                { translateY: Animated.add(fpOrbitCy, -FP_ORBIT_R) },
              ],
            },
            Platform.select({
              ios: {
                shadowColor: '#e0f2fe',
                shadowOpacity: 0.42,
                shadowRadius: 36,
                shadowOffset: { width: 0, height: 0 },
              },
              // Android elevation shadows ignore overflow:hidden and bleed into
              // adjacent pages — remove it; the gradient disc provides the glow.
              android: {},
              default: {
                shadowColor: '#e0f2fe',
                shadowOpacity: 0.38,
                shadowRadius: 32,
                shadowOffset: { width: 0, height: 0 },
              },
            }),
          ]}
        >
          <View
            collapsable={false}
            style={[
              styles.fpBorderOrbitInner,
              {
                width: FP_ORBIT_DIAMETER,
                height: FP_ORBIT_DIAMETER,
                borderRadius: FP_ORBIT_R,
              },
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(255,255,255,0.98)',
                'rgba(248,250,252,0.92)',
                'rgba(224,242,254,0.45)',
                'rgba(186,230,253,0.18)',
              ]}
              locations={[0, 0.35, 0.65, 1]}
              start={{ x: 0.25, y: 0.25 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: FP_ORBIT_R }]}
            />
          </View>
        </Animated.View>
      </View>

      <View
        style={[
          styles.fpRoot,
          {
            paddingTop: Math.max(insets.top, 18),
            paddingBottom: fpContentBottomPad,
          },
        ]}
      >
        <View style={styles.fpHeaderRow}>
          <View style={styles.fpHeaderLeft}>
            <View style={styles.fpHeaderDot} />
            <Text style={styles.fpHeaderKicker}>
              {t('onboarding_find_professionals_kicker', { defaultValue: 'Find Professionals' }).toUpperCase()}
            </Text>
          </View>
          <View style={styles.fpLangPill}>
            <Ionicons name="globe-outline" size={12} color="#00549B" />
            <Text style={styles.fpLangText}>AR</Text>
          </View>
        </View>

        <View style={styles.fpTitleBlock}>
          <Text style={styles.fpTitle}>
            {t('onboarding_fp_title_line1', { defaultValue: 'Build Something' })}
            {'\n'}
            {t('onboarding_fp_title_line2', { defaultValue: 'Great Today.' })}
          </Text>
          <Text style={styles.fpSubtitle}>
            {t('onboarding_fp_subtitle_1', { defaultValue: 'Thousands of verified professionals are waiting.' })}
            {'\n'}
            {t('onboarding_fp_subtitle_2', { defaultValue: 'Your first project is one tap away.' })}
          </Text>
        </View>

        <FpFeaturesRingSection>
          <View style={styles.fpFeaturesGrid}>
            {featureCard(<Ionicons name="shield-checkmark-outline" size={14} color="#00549B" />, t('onboarding_fp_verified_ids', { defaultValue: 'Verified IDs' }))}
            {featureCard(<Ionicons name="card-outline" size={14} color="#00549B" />, t('onboarding_fp_secure_payments', { defaultValue: 'Secure Payments' }))}
            {featureCard(<Ionicons name="location-outline" size={14} color="#00549B" />, t('onboarding_fp_live_tracking', { defaultValue: 'Live Tracking' }))}
            {featureCard(<Ionicons name="time-outline" size={14} color="#00549B" />, t('onboarding_fp_support', { defaultValue: '24/7 Support' }))}
          </View>
        </FpFeaturesRingSection>

        <View style={styles.fpTopRow}>
          <View style={styles.fpTopLeft}>
            <Text style={styles.fpTrophy}>🏆</Text>
            <Text style={styles.fpTopWorkers}>{t('onboarding_fp_top_workers', { defaultValue: 'Top Workers' })}</Text>
          </View>
        </View>

        <View style={styles.fpWorkersList}>
          {workerCard('#2563EB', 'AR', t('onboarding_pro_1_name', { defaultValue: 'Ahmed Al-Rashidi' }), t('onboarding_pro_1_role', { defaultValue: 'Structural Engineer · Riyadh' }), '4.9', t('onboarding_fp_jobs', { defaultValue: '32 jobs', count: 32 }))}
          {workerCard('#F59E0B', 'KO', t('onboarding_pro_2_name', { defaultValue: 'Khalid Al-Otaibi' }), t('onboarding_pro_2_role', { defaultValue: 'General Contractor · Jeddah' }), '4.8', t('onboarding_fp_jobs', { defaultValue: '18 jobs', count: 18 }))}
          {workerCard('#22C55E', 'OG', t('onboarding_pro_3_name', { defaultValue: 'Omar Al-Ghamdi' }), t('onboarding_pro_3_role', { defaultValue: 'Electrical Specialist · Dammam' }), '4.7', t('onboarding_fp_jobs', { defaultValue: '25 jobs', count: 25 }))}
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.88} onPress={onGetStarted} style={[styles.fpCtaWrap, isRTL && { bottom: 55 }]}>
        <View style={[styles.fpCtaBtn, { overflow: 'hidden', width: '100%' }]}>
          <LinearGradient
            colors={[COLORS.blue100, COLORS.blue60]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View
            pointerEvents="none"
            collapsable={false}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: fpGlossW,
              zIndex: 1,
              transform: [{ translateX: fpShimmerX }],
            }}
          >
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.35)',
                'rgba(255,255,255,0.78)',
                'rgba(186,230,253,0.45)',
                'rgba(255,255,255,0)',
              ]}
              locations={[0, 0.32, 0.5, 0.68, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Text style={[styles.fpCtaText, { zIndex: 2 }]}>
            {t('onboarding_fp_get_started', { defaultValue: 'Get Started' })}
          </Text>
          <View style={[styles.fpCtaChevron, { zIndex: 2, transform: [{ scaleX: isRTL ? -1 : 1 }] }]} pointerEvents="none">
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ================== SCREEN 3: MANAGE PROJECTS (Figma 186:2274) ==================
function ManageProjectsOnboardingScreen({
  onSkip,
  onNext,
}: {
  onSkip: () => void;
  onNext: () => void;
}) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar-');
  const MP_BASE = { w: 390, h: 880 };
  const ms = SCREEN_WIDTH / MP_BASE.w; // uniform scale (prevents layout drift on tall Android screens)
  const mx = (px: number) => px * ms;
  const my = (px: number) => px * ms;
  useEffect(() => {
    // Non-visual marker to confirm correct Screen 3 is running
  }, []);

  const mapPulse = useRef(new Animated.Value(0)).current;
  const outerRingScale = mapPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.22],
  });
  const innerRingScale = mapPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mapPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(mapPulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [mapPulse]);

  const mpNextGlossW = Math.min(ms * 72, SCREEN_WIDTH * 0.22);
  const mpNextShimmerX = useRef(new Animated.Value(0)).current;
  const [mpNextShineTrackW, setMpNextShineTrackW] = useState(160);

  useEffect(() => {
    let stop = false;
    const run = () => {
      if (stop) return;
      mpNextShimmerX.setValue(-mpNextGlossW);
      Animated.sequence([
        Animated.timing(mpNextShimmerX, {
          toValue: mpNextShineTrackW,
          duration: 2200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ]).start(({ finished }) => {
        if (finished && !stop) run();
      });
    };
    const tid = setTimeout(run, 400);
    return () => {
      stop = true;
      clearTimeout(tid);
    };
  }, [mpNextShimmerX, mpNextGlossW, mpNextShineTrackW]);

  // Figma 186:2329 — Top Workers card dimensions (uniform ms scale)
  const CARD_SW = ms * 104.86; // side card width
  const CARD_SH = ms * 170.38; // side card height
  const CARD_CW = ms * 115.28; // winner card width
  const CARD_CH = ms * 180.78; // winner card height
  const CARD_R = ms * 18;

  // Map location pin (Figma 186:2358) — pulse rings: same scale as pin, center nudged to sit on icon
  const MP_PIN_SIZE = ms * 30;
  const MP_RING_CENTER_DX = ms * 12; // right (Figma px)
  const MP_RING_CENTER_DY = ms * 22; // down (Figma px) — aligns pulse with pin tip
  const MP_PIN_CX = ms * 159 + MP_PIN_SIZE / 2 + MP_RING_CENTER_DX;
  const MP_PIN_CY = ms * 64 + MP_PIN_SIZE / 2 + MP_RING_CENTER_DY;
  const MP_RING_OUTER = MP_PIN_SIZE * 2.5;
  const MP_RING_INNER = MP_PIN_SIZE * 1.75;

  const renderSideWorkerCard = (cfg: {
    rank: string; rankBg: string; rankColor: string;
    avatarFrom: string; avatarTo: string; initial: string; showDot: boolean;
    nameLine1: string; nameLine2: string; role: string;
    barFrom: string; barTo: string; barWidth: string; pts: string;
    jobsLabel: string; jobsBg: string; jobsBorder: string; jobsColor: string;
  }) => (
    <View style={{
      width: CARD_SW, height: CARD_SH,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderWidth: 1, borderColor: 'rgba(226,232,240,0.9)',
      borderRadius: CARD_R, overflow: 'hidden',
      elevation: 3,
      shadowColor: '#000', shadowOpacity: 0.06,
      shadowRadius: ms * 8, shadowOffset: { width: 0, height: ms * 4 },
    }}>
      {/* Rank badge — top:8, right:8, size:18, radius:9 */}
      <View style={{
        position: 'absolute', top: ms * 8, right: ms * 8,
        width: ms * 18, height: ms * 18, borderRadius: ms * 9,
        backgroundColor: cfg.rankBg, alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: ms * 9, fontWeight: '800', color: cfg.rankColor }}>{cfg.rank}</Text>
      </View>

      {/* Avatar — center-x, top:12, size:46, radius:15 */}
      <View style={{ position: 'absolute', top: ms * 12, left: (CARD_SW - ms * 46) / 2, width: ms * 46, height: ms * 46 }}>
        <LinearGradient
          colors={[cfg.avatarFrom, cfg.avatarTo]}
          start={{ x: 0.15, y: 0.15 }} end={{ x: 1, y: 1 }}
          style={{ width: ms * 46, height: ms * 46, borderRadius: ms * 15, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: ms * 18, fontWeight: '800', color: '#fff' }}>{cfg.initial}</Text>
        </LinearGradient>
        {cfg.showDot && (
          <View style={{
            position: 'absolute', right: -ms * 2, bottom: -ms * 2,
            width: ms * 12, height: ms * 12, borderRadius: ms * 6,
            backgroundColor: '#22C55E', borderWidth: ms * 2, borderColor: '#fff',
          }} />
        )}
      </View>

      {/* Name — top:63.1, lineHeight:13.2 */}
      <View style={{ position: 'absolute', top: ms * 63.1, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: ms * 11, fontWeight: '700', color: '#0F172A', textAlign: 'center', lineHeight: ms * 13.2 }}>
          {cfg.nameLine1}{'\n'}{cfg.nameLine2}
        </Text>
      </View>

      {/* Role — center at top:102.38 → top edge ~95.48 */}
      <View style={{ position: 'absolute', top: ms * 95.48, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: ms * 9.5, color: '#64748B', textAlign: 'center' }}>{cfg.role}</Text>
      </View>

      {/* Progress bar — top:114.38, left:10, right:10 */}
      <View style={{ position: 'absolute', top: ms * 114.38, left: ms * 10, right: ms * 10 }}>
        <View style={{ height: ms * 3, borderRadius: ms * 2, backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
          <LinearGradient
            colors={[cfg.barFrom, cfg.barTo]}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: cfg.barWidth as any, borderRadius: ms * 2 }}
          />
        </View>
        <View style={{ marginTop: ms * 3, alignItems: 'center' }}>
          <Text style={{ fontSize: ms * 9, fontWeight: '700', color: '#64748B' }}>{cfg.pts}</Text>
        </View>
      </View>

      {/* Jobs badge — top:138.38, centered */}
      <View style={{ position: 'absolute', top: ms * 138.38, left: 0, right: 0, alignItems: 'center' }}>
        <View style={{
          backgroundColor: cfg.jobsBg, borderWidth: 1, borderColor: cfg.jobsBorder,
          paddingHorizontal: ms * 9, paddingVertical: ms * 4, borderRadius: ms * 20,
        }}>
          <Text style={{ fontSize: ms * 9, fontWeight: '700', color: cfg.jobsColor }}>{cfg.jobsLabel}</Text>
        </View>
      </View>
    </View>
  );

  const renderWinnerCard = () => (
    <View style={{
      width: CARD_CW, height: CARD_CH,
      borderRadius: CARD_R, overflow: 'hidden',
      elevation: 8,
      shadowColor: '#2563EB', shadowOpacity: 0.4,
      shadowRadius: ms * 16, shadowOffset: { width: 0, height: ms * 10 },
    }}>
      {/* Blue gradient background — #00549b 54.95% → #637ccf 99.76% */}
      <LinearGradient
        colors={['#00549B', '#637CCF']}
        locations={[0.5495, 0.9976]}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Radial glow decoration top-left (top:-30, left:-30, size:100) */}
      <View style={{
        position: 'absolute', top: -ms * 30, left: -ms * 30,
        width: ms * 100, height: ms * 100, borderRadius: ms * 50,
        backgroundColor: 'rgba(255,255,255,0.12)',
      }} />
      {/* Inset top-edge highlight */}
      <View style={{
        ...StyleSheet.absoluteFillObject, borderRadius: CARD_R,
        borderWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent',
      }} />

      {/* Rank badge — top:8, right:8, bg:rgba(255,255,255,0.25) */}
      <View style={{
        position: 'absolute', top: ms * 8, right: ms * 8,
        width: ms * 18, height: ms * 18, borderRadius: ms * 9,
        backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: ms * 9, fontWeight: '800', color: '#fff' }}>#1</Text>
      </View>

      {/* Crown emoji — top:8 (sits above avatar at top:18) */}
      <View style={{ position: 'absolute', top: ms * 8, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: ms * 16 }}>👑</Text>
      </View>

      {/* Avatar — center-x, top:18, size:52, radius:17, glass border */}
      <View style={{ position: 'absolute', top: ms * 18, left: (CARD_CW - ms * 52) / 2, width: ms * 52, height: ms * 52 }}>
        <View style={{
          width: ms * 52, height: ms * 52, borderRadius: ms * 17,
          backgroundColor: 'rgba(255,255,255,0.22)',
          borderWidth: ms * 2, borderColor: 'rgba(255,255,255,0.35)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: ms * 18, fontWeight: '800', color: '#fff' }}>A</Text>
        </View>
        <View style={{
          position: 'absolute', right: -ms * 2, bottom: -ms * 2,
          width: ms * 12, height: ms * 12, borderRadius: ms * 6,
          backgroundColor: '#22C55E', borderWidth: ms * 2, borderColor: '#fff',
        }} />
      </View>

      {/* Name — top:75.19, lineHeight:14.4 */}
      <View style={{ position: 'absolute', top: ms * 75.19, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: ms * 12, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: ms * 14.4 }}>
          Ahmed{'\n'}Al-Zahrani
        </Text>
      </View>

      {/* Role — center at top:116.78, h≈13.6 → top edge ~110 */}
      <View style={{ position: 'absolute', top: ms * 110, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: ms * 9.5, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Site Manager</Text>
      </View>

      {/* Progress bar — top:128.78, fill 98.01% */}
      <View style={{ position: 'absolute', top: ms * 128.78, left: ms * 10, right: ms * 10 }}>
        <View style={{ height: ms * 3, borderRadius: ms * 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          <View style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: '98.01%', borderRadius: ms * 2, backgroundColor: 'rgba(255,255,255,0.8)',
          }} />
        </View>
        <View style={{ marginTop: ms * 3, alignItems: 'center' }}>
          <Text style={{ fontSize: ms * 9, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>98 pts</Text>
        </View>
      </View>

      {/* Jobs badge — top:152.78, semi-transparent */}
      <View style={{ position: 'absolute', top: ms * 152.78, left: 0, right: 0, alignItems: 'center' }}>
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.18)',
          paddingHorizontal: ms * 8, paddingVertical: ms * 3, borderRadius: ms * 20,
        }}>
          <Text style={{ fontSize: ms * 9, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>🔨 18 jobs</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: '#EEF4FF' }]}>
      <LinearGradient
        colors={['#EEF4FF', '#E4EEFA', '#E2E8F0']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.mpRoot, { paddingTop: 0 }]}>
        {/* Top kicker + language */}
        <View style={[styles.mpTopRow, { position: 'absolute', left: mx(22), right: mx(22), top: my(14) + insets.top }]}>
          <Text style={styles.mpKicker}>
            {t('onboarding_manage_projects_kicker', { defaultValue: 'MANAGE PROJECTS' })}
          </Text>
          <View style={styles.mpLangPill}>
            <View style={{ width: 12, height: 12, position: 'relative' }}>
              <SvgXml xml={MpGlobeOuterSvg} width={12} height={12} />
              <View style={{ position: 'absolute', left: 1, top: 5.5 }}>
                <SvgXml xml={MpGlobeMidSvg} width={10} height={1} />
              </View>
              <View style={{ position: 'absolute', left: 3.3, top: 0.2 }}>
                <SvgXml xml={MpGlobeInnerSvg} width={5} height={12} />
              </View>
            </View>
            <Text style={styles.mpLangText}>AR</Text>
          </View>
        </View>

        <View style={{ position: 'absolute', left: mx(22), right: mx(22), top: my(60) + insets.top }}>
          <Text style={[styles.mpTitle, { lineHeight: 32 }]}>
            {t('onboarding_manage_projects_title', { defaultValue: 'Track every detail\nwith ease' })}
          </Text>
        </View>
        <View style={{ position: 'absolute', left: mx(22), right: mx(22), top: my(130) + insets.top }}>
          <Text style={[styles.mpSubtitle, { lineHeight: 22 }]}>
            {t('onboarding_manage_projects_subtitle', {
              defaultValue: 'Monitor timelines, assign tasks, and keep projects on\nschedule.',
            })}
          </Text>
        </View>

        {/* Project card */}
        <View style={[styles.mpProjectCard, { position: 'absolute', left: mx(22), right: mx(22), top: my(175) + insets.top }]}>
          <View style={styles.mpProjectHeader}>
            <Text style={styles.mpProjectName} numberOfLines={1}>
              {t('onboarding_project_name', { defaultValue: 'Al-Nakheel Villa — Phase 2' })}
            </Text>
            <LinearGradient
              colors={['#DBEAFE', '#BFDBFE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mpStatusPill}
            >
              <Text style={styles.mpStatusText}>{t('onboarding_in_progress', { defaultValue: 'IN PROGRESS' })}</Text>
            </LinearGradient>
          </View>

          <View style={styles.mpProgressTrack}>
            <LinearGradient
              colors={[COLORS.blue70, '#637CCF']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.mpProgressFill}
            />
            <View style={styles.mpProgressKnob} />
          </View>

          <View style={styles.mpProgressMetaRow}>
            <Text style={styles.mpProgressLeft}>
              <Text style={styles.mpProgressStrong}>68%</Text>
              <Text style={styles.mpProgressLight}> {t('complete', { defaultValue: 'complete' })}</Text>
            </Text>
            <Text style={styles.mpProgressRight}>
              <Text style={styles.mpProgressStrong}>12</Text>
              <Text style={styles.mpProgressLight}> {t('days_left', { defaultValue: 'days left' })}</Text>
            </Text>
          </View>

          <View style={styles.mpTasks}>
            <View style={styles.mpTaskRow}>
              <LinearGradient colors={[COLORS.blue70, '#637CCF']} style={styles.mpTaskCheck}>
                <SvgXml xml={MpCheckmarkSvg} width={9} height={8} />
              </LinearGradient>
              <Text style={styles.mpTaskDone}>{t('onboarding_task_1', { defaultValue: 'Foundation inspection' })}</Text>
            </View>
            <View style={styles.mpTaskRow}>
              <LinearGradient colors={[COLORS.blue70, '#637CCF']} style={styles.mpTaskCheck}>
                <SvgXml xml={MpCheckmarkSvg} width={9} height={8} />
              </LinearGradient>
              <Text style={styles.mpTaskDone}>{t('onboarding_task_2', { defaultValue: 'Electrical rough-in' })}</Text>
            </View>
            <View style={styles.mpTaskRow}>
              <View style={styles.mpTaskEmpty} />
              <Text style={styles.mpTaskTodo}>{t('onboarding_task_3', { defaultValue: 'Plumbing installation' })}</Text>
            </View>
          </View>
        </View>

        {/* Top workers */}
        <View style={[styles.mpTopWorkersHeader, { position: 'absolute', left: mx(22), right: mx(22), top: my(330) + insets.top }]}>
          <View style={styles.mpTopWorkersLeft}>
            <Text style={styles.mpTrophy}>🏆</Text>
            <Text style={styles.mpTopWorkersTitle}>
              {t('onboarding_top_workers_week', { defaultValue: 'Top Workers — This Week' })}
            </Text>
          </View>
        </View>

        <View style={[styles.mpWorkersRow, { position: 'absolute', left: mx(22), right: mx(22), top: my(370) + insets.top }]}>
          {/* Card #2 — Mohammed, orange (Figma 186:2340) */}
          {renderSideWorkerCard({
            rank: '#2', rankBg: '#FEF3C7', rankColor: '#B45309',
            avatarFrom: '#F97316', avatarTo: '#EA580C', initial: 'M', showDot: true,
            nameLine1: 'Mohammed', nameLine2: 'Al-Rashid', role: 'Electrician',
            barFrom: '#F97316', barTo: '#CC936B', barWidth: '90.98%', pts: '91 pts',
            jobsLabel: '⚡ 14 jobs', jobsBg: '#ECF3FF', jobsBorder: '#F6D1B2', jobsColor: '#C2410C',
          })}
          {/* Card #1 — Ahmed, blue gradient, winner (Figma 186:2341) */}
          {renderWinnerCard()}
          {/* Card #3 — Khalid, purple (Figma 186:2342) */}
          {renderSideWorkerCard({
            rank: '#3', rankBg: '#ECF3FF', rankColor: '#64748B',
            avatarFrom: '#8B5CF6', avatarTo: '#6D28D9', initial: 'K', showDot: false,
            nameLine1: 'Khalid', nameLine2: 'Mansour', role: 'Plumber',
            barFrom: '#8B5CF6', barTo: '#A78BFA', barWidth: '83.99%', pts: '84 pts',
            jobsLabel: '🔧 11 jobs', jobsBg: '#F5F3FF', jobsBorder: '#DDD6FE', jobsColor: '#6D28D9',
          })}
        </View>

        {/* Map card — Figma 186:2344 */}
        <View style={{
          position: 'absolute', left: mx(22), right: mx(22), top: my(560) + insets.top,
          height: ms * 185,
          borderRadius: ms * 20, overflow: 'hidden',
          backgroundColor: 'rgba(255,255,255,0)',
          elevation: 4,
          shadowColor: 'rgba(0,0,0,0.12)', shadowOpacity: 1,
          shadowRadius: ms * 12, shadowOffset: { width: 0, height: ms * 4 },
        }}>
          {/* ── Static map grid (Figma 186:2345) ─────────────────────── */}
          {/* 3×3 blocks with road lines. Colors from Figma palette:     */}
          {/* Jungle Mist #B8CCD8 · Casper #C0CCDC · Botticelli #A3BFFF  */}
          {/* Prelude #D8CCEC (lavender centre) · roads #EAF0F8           */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#C8D5E0' }}>
            {/* ── Rows ──────────────────────── */}
            {/* Row 1 */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: '67.5%', height: '32%', backgroundColor: '#C0CCDC' }} />
            <View style={{ position: 'absolute', top: 0, left: '33.5%', right: '33.5%', height: '32%', backgroundColor: '#B8CCD8' }} />
            <View style={{ position: 'absolute', top: 0, left: '67.5%', right: 0, height: '32%', backgroundColor: '#C0CCDC' }} />
            {/* Row 2 */}
            <View style={{ position: 'absolute', top: '34%', left: 0, right: '67.5%', bottom: '34%', backgroundColor: '#B8CCD8' }} />
            <View style={{ position: 'absolute', top: '34%', left: '33.5%', right: '33.5%', bottom: '34%', backgroundColor: '#D8CCEC', opacity: 0.85 }} />
            <View style={{ position: 'absolute', top: '34%', left: '67.5%', right: 0, bottom: '34%', backgroundColor: '#A3BFFF', opacity: 0.7 }} />
            {/* Row 3 */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: '67.5%', height: '32%', backgroundColor: '#C0CCDC' }} />
            <View style={{ position: 'absolute', bottom: 0, left: '33.5%', right: '33.5%', height: '32%', backgroundColor: '#B8CCD8' }} />
            <View style={{ position: 'absolute', bottom: 0, left: '67.5%', right: 0, height: '32%', backgroundColor: '#C0CCDC' }} />
            {/* ── Road lines ────────────────── */}
            {/* Horizontal roads */}
            <View style={{ position: 'absolute', top: '32%', left: 0, right: 0, height: '2%', backgroundColor: '#EAF0F8' }} />
            <View style={{ position: 'absolute', top: '66%', left: 0, right: 0, height: '2%', backgroundColor: '#EAF0F8' }} />
            {/* Vertical roads */}
            <View style={{ position: 'absolute', left: '33%', top: 0, bottom: 0, width: '1.5%', backgroundColor: '#EAF0F8' }} />
            <View style={{ position: 'absolute', left: '66%', top: 0, bottom: 0, width: '1.5%', backgroundColor: '#EAF0F8' }} />
          </View>

          {/* "Live" pill — Figma 186:2347 */}
          {/* left:10, top:10, bg rgba(255,255,255,0.92), border rgba(226,232,240,0.7), radius:20, px:11, py:6 */}
          <View style={{
            position: 'absolute', left: ms * 10, top: ms * 10,
            flexDirection: 'row', alignItems: 'center', gap: ms * 5,
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderWidth: 1, borderColor: 'rgba(226,232,240,0.7)',
            borderRadius: ms * 20,
            paddingHorizontal: ms * 11, paddingVertical: ms * 6,
            elevation: 2, shadowColor: '#000', shadowOpacity: 0.08,
            shadowRadius: ms * 4, shadowOffset: { width: 0, height: ms * 2 },
          }}>
            {/* Green glow dot — size:6, shadow:#22c55e */}
            <View style={{
              width: ms * 6, height: ms * 6, borderRadius: ms * 3,
              backgroundColor: '#22C55E',
              shadowColor: '#22C55E', shadowOpacity: 1,
              shadowRadius: ms * 3, shadowOffset: { width: 0, height: 0 },
            }} />
            <Text style={{ fontSize: ms * 10, fontWeight: '700', color: '#0F172A' }}>Live</Text>
          </View>

          {/* Compass — Figma 186:2351 */}
          {/* right:10, top:10, size:28, radius:14, bg rgba(255,255,255,0.9) */}
          <View style={{
            position: 'absolute', right: ms * 10, top: ms * 10,
            width: ms * 28, height: ms * 28, borderRadius: ms * 14,
            backgroundColor: 'rgba(255,255,255,0.9)',
            elevation: 3, shadowColor: '#000', shadowOpacity: 0.15,
            shadowRadius: ms * 4, shadowOffset: { width: 0, height: ms * 2 },
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: ms * 8, fontWeight: '800', color: '#EF4444', lineHeight: ms * 8 }}>N</Text>
            <Text style={{ fontSize: ms * 7, fontWeight: '800', color: '#94A3B8', lineHeight: ms * 7 }}>S</Text>
          </View>

          {/* Pulse rings — centered on location pin; diameters derived from pin size */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: MP_PIN_CX,
              top: MP_PIN_CY,
              width: 1,
              height: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View
              style={{
                position: 'absolute',
                width: MP_RING_OUTER,
                height: MP_RING_OUTER,
                borderRadius: MP_RING_OUTER / 2,
                marginLeft: -MP_RING_OUTER / 2,
                marginTop: -MP_RING_OUTER / 2,
                borderWidth: 1,
                borderColor: 'rgba(37,99,235,0.15)',
                transform: [{ scale: outerRingScale }],
              }}
            />
            <Animated.View
              style={{
                position: 'absolute',
                width: MP_RING_INNER,
                height: MP_RING_INNER,
                borderRadius: MP_RING_INNER / 2,
                marginLeft: -MP_RING_INNER / 2,
                marginTop: -MP_RING_INNER / 2,
                borderWidth: 2,
                borderColor: 'rgba(37,99,235,0.3)',
                transform: [{ scale: innerRingScale }],
              }}
            />
          </View>

          {/* Location pin — Figma 186:2358: left:161.27, top:69.9, w:30, h:36 */}
          {/* Pin head is a rotated square (3 rounded corners) with blue gradient */}
          <View style={{ position: 'absolute', left: ms * 159, top: ms * 64, alignItems: 'center' }}>
            <LinearGradient
              colors={['#00549B', '#637CCF']}
              start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
              style={{
                width: ms * 30, height: ms * 30,
                borderTopLeftRadius: ms * 15, borderTopRightRadius: ms * 15,
                borderBottomRightRadius: ms * 15, borderBottomLeftRadius: 2,
                transform: [{ rotate: '-45deg' }],
                alignItems: 'center', justifyContent: 'center',
                elevation: 6,
                shadowColor: 'rgba(37,99,235,0.5)', shadowOpacity: 1,
                shadowRadius: ms * 7, shadowOffset: { width: 0, height: ms * 4 },
              }}
            >
              {/* White dot inside — counter-rotate to stay upright */}
              <View style={{
                transform: [{ rotate: '45deg' }],
                width: ms * 11, height: ms * 11, borderRadius: ms * 5.5,
                backgroundColor: '#fff',
              }} />
            </LinearGradient>
            {/* Shadow ellipse below pin — Figma 186:2362 */}
            <View style={{
              width: ms * 13, height: ms * 4, borderRadius: ms * 4.25,
              backgroundColor: 'rgba(37,99,235,0.25)', marginTop: ms * 2,
            }} />
          </View>

          {/* Location label card — Figma 186:2363 */}
          {/* left:114.16, top:43.9, w:124.22, h:33, radius:10, px:10, py:5 */}
          {/* bg rgba(255,255,255,0.95), border rgba(226,232,240,0.8), shadow blur:16 */}
          <View style={{
            position: 'absolute', left: ms * 114.16, top: ms * 43.9,
            width: ms * 124.22, height: ms * 33,
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderWidth: 1, borderColor: 'rgba(226,232,240,0.8)',
            borderRadius: ms * 10,
            paddingHorizontal: ms * 10, paddingVertical: ms * 5,
            elevation: 4, shadowColor: '#000', shadowOpacity: 0.1,
            shadowRadius: ms * 8, shadowOffset: { width: 0, height: ms * 4 },
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: ms * 10, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>Al-Nakheel Villa</Text>
            <Text style={{ fontSize: ms * 8.5, fontWeight: '400', color: '#64748B' }} numberOfLines={1}>Active construction site</Text>
          </View>

          {/* Scale bar — Figma 186:2368: bottom:11, left:12, gap:5 */}
          <View style={{
            position: 'absolute', bottom: ms * 11, left: ms * 12,
            flexDirection: 'row', alignItems: 'center', gap: ms * 5,
          }}>
            {/* Bar with end ticks */}
            <View style={{ width: ms * 36, height: ms * 8, position: 'relative' }}>
              {/* Horizontal line */}
              <View style={{
                position: 'absolute', left: 0, right: 0,
                top: (ms * 8 - ms * 2) / 2, height: ms * 2,
                backgroundColor: '#64748B', borderRadius: ms * 1,
              }} />
              {/* Left tick */}
              <View style={{
                position: 'absolute', left: 0, top: 0,
                width: ms * 2, height: ms * 8,
                backgroundColor: '#64748B', borderRadius: ms * 1,
              }} />
              {/* Right tick */}
              <View style={{
                position: 'absolute', right: 0, top: 0,
                width: ms * 2, height: ms * 8,
                backgroundColor: '#64748B', borderRadius: ms * 1,
              }} />
            </View>
            <Text style={{ fontSize: ms * 9, fontWeight: '600', color: '#475569' }}>500m</Text>
          </View>
        </View>

        {/* Bottom bar — anchored to bottom so it never gets clipped on short screens */}
        <View
          style={[
            styles.mpBottomBar,
            {
              position: 'absolute',
              left: mx(22),
              right: mx(22),
              bottom: isRTL ? 0 : Math.max(insets.bottom, ms * 16),
            },
          ]}
        >
          <TouchableOpacity onPress={onSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.mpSkipText}>{t('Skip', { defaultValue: 'Skip' })}</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity onPress={onNext} activeOpacity={0.86}>
            <View
              style={{ borderRadius: 28, overflow: 'hidden' }}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && Math.abs(w - mpNextShineTrackW) > 0.5) {
                  setMpNextShineTrackW(w);
                }
              }}
            >
              <LinearGradient
                colors={[COLORS.blue70, '#637CCF']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Animated.View
                pointerEvents="none"
                collapsable={false}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: mpNextGlossW,
                  zIndex: 1,
                  transform: [{ translateX: mpNextShimmerX }],
                }}
              >
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0)',
                    'rgba(255,255,255,0.35)',
                    'rgba(186,230,253,0.75)',
                    'rgba(255,255,255,0.5)',
                    'rgba(255,255,255,0)',
                  ]}
                  locations={[0, 0.28, 0.5, 0.72, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
              <View style={[styles.mpNextBtn, { backgroundColor: 'transparent', zIndex: 2 }]} collapsable={false}>
                <Text style={styles.mpNextText}>{t('Next', { defaultValue: 'Next' })}</Text>
                <View style={{ width: 14, height: 14, position: 'relative', transform: [{ scaleX: isRTL ? -1 : 1 }] }}>
                  <View style={{ position: 'absolute', left: 0, top: 6.5 }}>
                    <SvgXml xml={MpNextArrow1Svg} width={10} height={2} />
                  </View>
                  <View style={{ position: 'absolute', left: 7.2, top: 2.2 }}>
                    <SvgXml xml={MpNextArrow2Svg} width={6} height={10} />
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ================== SCREEN 2: PROJECT TRACKING ==================
function ProjectTrackingScreen() {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: COLORS.blue10 }]}>
      {/* Subtle decorative circle */}
      <View style={styles.decorativeCircle} />

      <Animated.View style={[styles.trackingContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.sectionBadge}>
          {t('onboarding_manage_projects', { defaultValue: 'MANAGE PROJECTS' })}
        </Text>
        <Text style={styles.trackingTitle}>
          {t('onboarding_track_detail_title', { defaultValue: 'Track every detail with ease' })}
        </Text>
        <Text style={styles.trackingSubtitle}>
          {t('onboarding_track_subtitle', { defaultValue: 'Monitor timelines, assign tasks, and keep projects perfectly on schedule.' })}
        </Text>

        {/* Project Card */}
        <View style={styles.projectCard}>
          <LinearGradient colors={[COLORS.blue60, COLORS.blue40]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.projectCardStripe} />
          <View style={styles.projectCardBody}>
            <View style={styles.projectCardHeader}>
              <Text style={styles.projectName} numberOfLines={1}>
                {t('onboarding_project_name', { defaultValue: 'Al-Nakheel Villa — Phase 2' })}
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {t('onboarding_project_status', { defaultValue: 'IN PROGRESS' })}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarTrack}>
              <LinearGradient
                colors={[COLORS.blue70, COLORS.blue40]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: '68%' }]}
              />
            </View>

            <View style={styles.progressStats}>
              <Text style={styles.progressStatText}>68% {t('complete', { defaultValue: 'complete' })}</Text>
              <Text style={styles.progressStatBold}>12 {t('days_left', { defaultValue: 'days left' })}</Text>
            </View>

            <View style={styles.tasksList}>
              <TaskRow isDone label={t('onboarding_task_1', { defaultValue: 'Foundation inspection' })} />
              <TaskRow isDone label={t('onboarding_task_2', { defaultValue: 'Electrical rough-in' })} />
              <TaskRow isDone={false} label={t('onboarding_task_3', { defaultValue: 'Plumbing installation' })} />
            </View>
          </View>
        </View>

        {/* Map preview */}
        <View style={styles.mapPreview}>
          <View style={styles.mapGrid}>
            {/* Roads */}
            <View style={[styles.mapRoadH, { top: '50%' }]} />
            <View style={[styles.mapRoadV, { left: '32%' }]} />
            <View style={[styles.mapRoadH, { top: '27%', height: 3 }]} />
            <View style={[styles.mapRoadH, { top: '75%', height: 3 }]} />
            <View style={[styles.mapRoadV, { left: '67%', width: 3 }]} />
            {/* Blocks */}
            <View style={[styles.mapBlock, { top: '1%', left: '1%', width: '12%', height: '23%' }]} />
            <View style={[styles.mapBlock, { top: '1%', left: '17%', width: '12%', height: '23%' }]} />
            <View style={[styles.mapBlock, { top: '1%', left: '34%', width: '30%', height: '23%' }]} />
            <View style={[styles.mapBlock, { top: '1%', left: '69%', width: '30%', height: '23%' }]} />
            <View style={[styles.mapBlockAlt, { top: '29%', left: '1%', width: '12%', height: '18%' }]} />
            <View style={[styles.mapBlockAlt, { top: '29%', left: '69%', width: '30%', height: '18%' }]} />
            {/* Highlighted area */}
            <View style={styles.mapHighlight} />
            {/* Pin */}
            <View style={styles.mapPin}>
              <Ionicons name="location" size={22} color={COLORS.blue60} />
            </View>
            {/* Location label */}
            <View style={styles.mapLabel}>
              <Text style={styles.mapLabelText}>
                {t('onboarding_map_label', { defaultValue: 'Al-Nakheel Villa' })}
              </Text>
            </View>
            {/* Compass */}
            <View style={styles.mapCompass}>
              <Text style={styles.mapCompassN}>N</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ================== SCREEN 3: FIND PROFESSIONALS ==================
function FindProfessionalsScreen() {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: COLORS.blue90 }]}>
      <LinearGradient
        colors={[`${COLORS.blue60}4D`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.85, y: 0 }}
        end={{ x: 0.15, y: 0.55 }}
      />
      <LinearGradient
        colors={[`${COLORS.amber60}1A`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0.6 }}
      />

      <Animated.View style={[styles.prosContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={[styles.sectionBadge, { color: COLORS.amber60 }]}>
          {t('onboarding_find_professionals', { defaultValue: 'FIND PROFESSIONALS' })}
        </Text>
        <Text style={styles.prosTitle}>
          {t('onboarding_hire_best_title', { defaultValue: 'Hire the best, build the rest' })}
        </Text>
        <Text style={styles.prosSubtitle}>
          {t('onboarding_connect_professionals', { defaultValue: 'Connect with verified contractors, engineers, and specialists across the Gulf.' })}
        </Text>

        <View style={styles.proCards}>
          <ProCard
            initials="AR"
            name={t('onboarding_pro_1_name', { defaultValue: 'Ahmed Al-Rashidi' })}
            role={t('onboarding_pro_1_role', { defaultValue: 'Structural Engineer · Riyadh' })}
            score="4.9"
            reviews={t('onboarding_reviews', { defaultValue: '32 reviews', count: 32 })}
            gradientColors={[COLORS.blue80, COLORS.blue50]}
            accentColor={COLORS.blue40}
          />
          <ProCard
            initials="KO"
            name={t('onboarding_pro_2_name', { defaultValue: 'Khalid Al-Otaibi' })}
            role={t('onboarding_pro_2_role', { defaultValue: 'General Contractor · Jeddah' })}
            score="4.8"
            reviews={t('onboarding_reviews', { defaultValue: '18 reviews', count: 18 })}
            gradientColors={[COLORS.amber100, COLORS.amber70]}
            accentColor={COLORS.amber60}
          />
          <ProCard
            initials="OG"
            name={t('onboarding_pro_3_name', { defaultValue: 'Omar Al-Ghamdi' })}
            role={t('onboarding_pro_3_role', { defaultValue: 'Electrical Specialist · Dammam' })}
            score="4.7"
            reviews={t('onboarding_reviews', { defaultValue: '25 reviews', count: 25 })}
            gradientColors={[COLORS.green100, COLORS.green60]}
            accentColor={COLORS.green60}
          />
        </View>

        {/* Trusted Integration Card */}
        <View style={styles.trustedCard}>
          <Text style={styles.trustedLabel}>
            {t('onboarding_verified_with', { defaultValue: 'DOCUMENTS SIGNED & VERIFIED WITH' })}
          </Text>
          <View style={styles.trustedLogos}>
            <View style={styles.trustedLogoBox}>
              <SvgXml xml={AbsherLogoSvg} width={28} height={42} />
            </View>
            <View style={styles.trustedLogoDivider} />
            <View style={styles.trustedLogoBox}>
              <SvgXml xml={NafathLogoSvg} width={65} height={28} />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ================== TECHNICIAN SCREEN 1: WIN PROJECTS ==================
function TechWinProjectsScreen() {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: COLORS.blue100 }]}>
      <DotPattern />
      <LinearGradient
        colors={[`${COLORS.green60}33`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.2, y: 0.6 }}
      />
      <LinearGradient
        colors={[`${COLORS.blue60}4D`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.8 }}
        end={{ x: 1, y: 0.3 }}
      />

      <Animated.View style={[techStyles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={[styles.sectionBadge, { color: COLORS.green60 }]}>
          {t('tech_onboarding_win_projects', { defaultValue: 'WIN PROJECTS' })}
        </Text>
        <Text style={techStyles.title}>
          {t('tech_onboarding_win_title', { defaultValue: 'Win the right projects faster' })}
        </Text>
        <Text style={techStyles.subtitle}>
          {t('tech_onboarding_win_subtitle', { defaultValue: 'Showcase your expertise and receive qualified leads as soon as they go live.' })}
        </Text>

        <View style={techStyles.projectCards}>
          <TechProjectCard
            category={t('tech_onboarding_cat_electrical', { defaultValue: 'Electrical' })}
            title={t('tech_onboarding_proj_1_title', { defaultValue: 'Office Rewiring — Al Olaya' })}
            budget={t('tech_onboarding_proj_1_budget', { defaultValue: 'SAR 45,000' })}
            location={t('tech_onboarding_proj_1_location', { defaultValue: 'Riyadh' })}
            urgency={t('tech_onboarding_proj_urgent', { defaultValue: 'Urgent' })}
            accentColor={COLORS.amber60}
            iconName="flash"
          />
          <TechProjectCard
            category={t('tech_onboarding_cat_plumbing', { defaultValue: 'Plumbing' })}
            title={t('tech_onboarding_proj_2_title', { defaultValue: 'Villa Water System — Al Hamra' })}
            budget={t('tech_onboarding_proj_2_budget', { defaultValue: 'SAR 28,000' })}
            location={t('tech_onboarding_proj_2_location', { defaultValue: 'Jeddah' })}
            urgency={null}
            accentColor={COLORS.blue40}
            iconName="water"
          />
          <TechProjectCard
            category={t('tech_onboarding_cat_construction', { defaultValue: 'General Construction' })}
            title={t('tech_onboarding_proj_3_title', { defaultValue: 'Warehouse Extension — Phase 1' })}
            budget={t('tech_onboarding_proj_3_budget', { defaultValue: 'SAR 120,000' })}
            location={t('tech_onboarding_proj_3_location', { defaultValue: 'Dammam' })}
            urgency={null}
            accentColor={COLORS.green60}
            iconName="construct"
          />
        </View>

        <View style={techStyles.statRow}>
          <View style={techStyles.statItem}>
            <Text style={techStyles.statNumber}>150+</Text>
            <Text style={techStyles.statLabel}>
              {t('tech_onboarding_active_projects', { defaultValue: 'Active Projects' })}
            </Text>
          </View>
          <View style={techStyles.statDivider} />
          <View style={techStyles.statItem}>
            <Text style={techStyles.statNumber}>24h</Text>
            <Text style={techStyles.statLabel}>
              {t('tech_onboarding_avg_response', { defaultValue: 'Avg. Response' })}
            </Text>
          </View>
          <View style={techStyles.statDivider} />
          <View style={techStyles.statItem}>
            <Text style={techStyles.statNumber}>98%</Text>
            <Text style={techStyles.statLabel}>
              {t('tech_onboarding_satisfaction', { defaultValue: 'Satisfaction' })}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function TechProjectCard({
  category,
  title,
  budget,
  location,
  urgency,
  accentColor,
  iconName,
}: {
  category: string;
  title: string;
  budget: string;
  location: string;
  urgency: string | null;
  accentColor: string;
  iconName: string;
}) {
  return (
    <View style={techStyles.projectCard}>
      <View style={[techStyles.projectCardAccent, { backgroundColor: accentColor }]} />
      <View style={techStyles.projectCardIcon}>
        <Ionicons name={iconName as any} size={18} color={accentColor} />
      </View>
      <View style={techStyles.projectCardInfo}>
        <Text style={techStyles.projectCardCategory}>{category}</Text>
        <Text style={techStyles.projectCardTitle} numberOfLines={1}>{title}</Text>
        <View style={techStyles.projectCardMeta}>
          <Text style={techStyles.projectCardBudget}>{budget}</Text>
          <View style={techStyles.projectCardDot} />
          <Ionicons name="location-outline" size={10} color={COLORS.blue30} />
          <Text style={techStyles.projectCardLocation}>{location}</Text>
        </View>
      </View>
      {urgency && (
        <View style={techStyles.urgencyBadge}>
          <Ionicons name="time-outline" size={9} color={COLORS.amber60} />
          <Text style={techStyles.urgencyText}>{urgency}</Text>
        </View>
      )}
    </View>
  );
}

// ================== TECHNICIAN SCREEN 2: MANAGE BIDS ==================
function TechManageBidsScreen() {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: COLORS.blue10 }]}>
      <View style={styles.decorativeCircle} />

      <Animated.View style={[techStyles.lightContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.sectionBadge}>
          {t('tech_onboarding_manage_bids', { defaultValue: 'MANAGE BIDS' })}
        </Text>
        <Text style={styles.trackingTitle}>
          {t('tech_onboarding_manage_title', { defaultValue: 'Manage bids and phases with ease' })}
        </Text>
        <Text style={styles.trackingSubtitle}>
          {t('tech_onboarding_manage_subtitle', { defaultValue: 'Submit professional offers, negotiate milestones, and keep every phase on track.' })}
        </Text>

        {/* Bid Card */}
        <View style={techStyles.bidCard}>
          <View style={techStyles.bidCardHeader}>
            <View>
              <Text style={techStyles.bidCardLabel}>
                {t('tech_onboarding_your_bid', { defaultValue: 'Your Bid' })}
              </Text>
              <Text style={techStyles.bidCardProject}>
                {t('tech_onboarding_bid_project', { defaultValue: 'Al-Nakheel Villa — Electrical' })}
              </Text>
            </View>
            <View style={techStyles.bidStatusBadge}>
              <Text style={techStyles.bidStatusText}>
                {t('tech_onboarding_bid_status', { defaultValue: 'SUBMITTED' })}
              </Text>
            </View>
          </View>

          <View style={techStyles.bidAmountRow}>
            <Text style={techStyles.bidAmountLabel}>
              {t('tech_onboarding_bid_amount', { defaultValue: 'Bid Amount' })}
            </Text>
            <Text style={techStyles.bidAmountValue}>SAR 42,500</Text>
          </View>

          {/* Phases timeline */}
          <View style={techStyles.phasesContainer}>
            <Text style={techStyles.phasesTitle}>
              {t('tech_onboarding_milestones', { defaultValue: 'Milestones' })}
            </Text>
            <TechPhaseRow
              number="1"
              label={t('tech_onboarding_phase_1', { defaultValue: 'Rough-in wiring' })}
              amount="SAR 15,000"
              status="done"
            />
            <TechPhaseRow
              number="2"
              label={t('tech_onboarding_phase_2', { defaultValue: 'Panel installation' })}
              amount="SAR 12,500"
              status="active"
            />
            <TechPhaseRow
              number="3"
              label={t('tech_onboarding_phase_3', { defaultValue: 'Final fixtures & testing' })}
              amount="SAR 15,000"
              status="pending"
            />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={techStyles.lightStatRow}>
          <View style={techStyles.lightStatCard}>
            <Ionicons name="document-text-outline" size={18} color={COLORS.blue60} />
            <Text style={techStyles.lightStatNumber}>12</Text>
            <Text style={techStyles.lightStatLabel}>
              {t('tech_onboarding_total_bids', { defaultValue: 'Bids Sent' })}
            </Text>
          </View>
          <View style={techStyles.lightStatCard}>
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.green60} />
            <Text style={techStyles.lightStatNumber}>8</Text>
            <Text style={techStyles.lightStatLabel}>
              {t('tech_onboarding_won_bids', { defaultValue: 'Won' })}
            </Text>
          </View>
          <View style={techStyles.lightStatCard}>
            <Ionicons name="trending-up-outline" size={18} color={COLORS.amber60} />
            <Text style={techStyles.lightStatNumber}>67%</Text>
            <Text style={techStyles.lightStatLabel}>
              {t('tech_onboarding_win_rate', { defaultValue: 'Win Rate' })}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function TechPhaseRow({
  number,
  label,
  amount,
  status,
}: {
  number: string;
  label: string;
  amount: string;
  status: 'done' | 'active' | 'pending';
}) {
  const bgColor = status === 'done' ? COLORS.green60 : status === 'active' ? COLORS.blue60 : COLORS.textBg;
  const textColor = status === 'pending' ? COLORS.textSecond : '#fff';
  const labelColor = status === 'pending' ? COLORS.textSecond : COLORS.textBody;
  const amountColor = status === 'done' ? COLORS.green60 : status === 'active' ? COLORS.blue60 : COLORS.textSecond;

  return (
    <View style={techStyles.phaseRow}>
      <View style={[techStyles.phaseCircle, { backgroundColor: bgColor }]}>
        {status === 'done' ? (
          <Ionicons name="checkmark" size={10} color="#fff" />
        ) : (
          <Text style={[techStyles.phaseNumber, { color: textColor }]}>{number}</Text>
        )}
      </View>
      <View style={[techStyles.phaseLine, status === 'pending' ? { backgroundColor: COLORS.textBg } : { backgroundColor: COLORS.blue20 }]} />
      <View style={techStyles.phaseInfo}>
        <Text style={[techStyles.phaseLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[techStyles.phaseAmount, { color: amountColor }]}>{amount}</Text>
      </View>
    </View>
  );
}

// ================== TECHNICIAN SCREEN 3: SECURE PAYMENTS ==================
function TechSecurePaymentsScreen() {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH, backgroundColor: COLORS.blue90 }]}>
      <LinearGradient
        colors={[`${COLORS.amber60}26`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.8, y: 0 }}
        end={{ x: 0.2, y: 0.55 }}
      />
      <LinearGradient
        colors={[`${COLORS.green60}1A`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0.6 }}
      />

      <Animated.View style={[techStyles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={[styles.sectionBadge, { color: COLORS.amber60 }]}>
          {t('tech_onboarding_secure_payments', { defaultValue: 'SECURE PAYMENTS' })}
        </Text>
        <Text style={techStyles.title}>
          {t('tech_onboarding_secure_title', { defaultValue: 'Secure payments and continuous support' })}
        </Text>
        <Text style={techStyles.subtitle}>
          {t('tech_onboarding_secure_subtitle', { defaultValue: 'Protect your work with milestone payouts and dedicated support on every project.' })}
        </Text>

        {/* Payment Flow */}
        <View style={techStyles.paymentFlow}>
          <TechPaymentStep
            icon="shield-checkmark"
            iconColor={COLORS.green60}
            title={t('tech_onboarding_escrow_title', { defaultValue: 'Escrow Protection' })}
            description={t('tech_onboarding_escrow_desc', { defaultValue: 'Funds held securely until milestones are verified and approved.' })}
          />
          <View style={techStyles.paymentFlowLine} />
          <TechPaymentStep
            icon="wallet"
            iconColor={COLORS.blue40}
            title={t('tech_onboarding_milestone_pay_title', { defaultValue: 'Milestone Payouts' })}
            description={t('tech_onboarding_milestone_pay_desc', { defaultValue: 'Get paid as you complete each phase — no waiting until the end.' })}
          />
          <View style={techStyles.paymentFlowLine} />
          <TechPaymentStep
            icon="headset"
            iconColor={COLORS.amber60}
            title={t('tech_onboarding_support_title', { defaultValue: 'Dedicated Support' })}
            description={t('tech_onboarding_support_desc', { defaultValue: 'Resolve disputes quickly with our mediation and support team.' })}
          />
        </View>

        {/* Trusted Card */}
        <View style={styles.trustedCard}>
          <Text style={styles.trustedLabel}>
            {t('onboarding_verified_with', { defaultValue: 'DOCUMENTS SIGNED & VERIFIED WITH' })}
          </Text>
          <View style={styles.trustedLogos}>
            <View style={styles.trustedLogoBox}>
              <SvgXml xml={AbsherLogoSvg} width={28} height={42} />
            </View>
            <View style={styles.trustedLogoDivider} />
            <View style={styles.trustedLogoBox}>
              <SvgXml xml={NafathLogoSvg} width={65} height={28} />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function TechPaymentStep({
  icon,
  iconColor,
  title,
  description,
}: {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <View style={techStyles.paymentStep}>
      <View style={[techStyles.paymentStepIcon, { borderColor: `${iconColor}40` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={techStyles.paymentStepInfo}>
        <Text style={techStyles.paymentStepTitle}>{title}</Text>
        <Text style={techStyles.paymentStepDesc}>{description}</Text>
      </View>
    </View>
  );
}

// ================== TECHNICIAN STYLES ==================
const techStyles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.085,
    paddingTop: SCREEN_HEIGHT * 0.1,
  },
  lightContent: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.08,
    paddingTop: SCREEN_HEIGHT * 0.1,
  },
  title: {
    fontSize: Math.min(SCREEN_WIDTH * 0.075, 32),
    fontWeight: '700',
    color: '#fff',
    lineHeight: Math.min(SCREEN_WIDTH * 0.095, 40),
    marginBottom: SCREEN_HEIGHT * 0.008,
  },
  subtitle: {
    fontSize: Math.max(SCREEN_WIDTH * 0.032, 12),
    color: COLORS.blue20,
    lineHeight: 19,
    marginBottom: SCREEN_HEIGHT * 0.025,
  },

  // Project cards (Tech Screen 1)
  projectCards: {
    gap: 8,
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 11,
    paddingRight: 12,
    overflow: 'hidden',
  },
  projectCardAccent: {
    width: 3,
    height: '100%',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  projectCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 10,
  },
  projectCardInfo: {
    flex: 1,
  },
  projectCardCategory: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.blue30,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  projectCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
  },
  projectCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projectCardBudget: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.amber60,
  },
  projectCardDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.blue30,
  },
  projectCardLocation: {
    fontSize: 10,
    color: COLORS.blue30,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${COLORS.amber60}1A`,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.amber60,
  },

  // Stats row (Tech Screen 1)
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.blue20,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Bid card (Tech Screen 2)
  bidCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: COLORS.blue100,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    padding: 16,
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  bidCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bidCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.textSecond,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  bidCardProject: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blue100,
  },
  bidStatusBadge: {
    backgroundColor: `${COLORS.green60}1A`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bidStatusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.green60,
  },
  bidAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textBg,
    marginBottom: 12,
  },
  bidAmountLabel: {
    fontSize: 11,
    color: COLORS.textSecond,
  },
  bidAmountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.blue100,
  },

  // Phases (Tech Screen 2)
  phasesContainer: {
    gap: 0,
  },
  phasesTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.textSecond,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  phaseCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseNumber: {
    fontSize: 10,
    fontWeight: '700',
  },
  phaseLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 6,
  },
  phaseInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  phaseAmount: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Light stat row (Tech Screen 2)
  lightStatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lightStatCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    shadowColor: COLORS.blue100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  lightStatNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.blue100,
    marginTop: 4,
  },
  lightStatLabel: {
    fontSize: 9,
    color: COLORS.textSecond,
    marginTop: 2,
  },

  // Payment flow (Tech Screen 3)
  paymentFlow: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  paymentStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentStepIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentStepInfo: {
    flex: 1,
  },
  paymentStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  paymentStepDesc: {
    fontSize: 11,
    color: COLORS.blue20,
    lineHeight: 15,
  },
  paymentFlowLine: {
    width: 2,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginLeft: 20,
    marginVertical: 4,
  },
});

/** Scroll-linked crossfade + parallax between horizontal onboarding pages */
function OnboardingPagerPage({
  index,
  scrollX,
  children,
}: {
  index: number;
  scrollX: Animated.Value;
  children: React.ReactNode;
}) {
  const w = SCREEN_WIDTH;
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar-');
  // In RTL on Android the scroll view lays pages right-to-left so scrollX=0
  // corresponds to the LAST page. Remap index so interpolations stay correct.
  const TOTAL = 3;
  const effIdx = isRTL ? (TOTAL - 1 - index) : index;
  const inputRange = [(effIdx - 1) * w, effIdx * w, (effIdx + 1) * w];
  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.5, 1, 0.5],
    extrapolate: 'clamp',
  });
  const translateX = scrollX.interpolate({
    inputRange,
    // Same direction for both LTR and RTL — the effIdx remap already handles
    // the reversed scroll axis, so the parallax offset direction stays the same.
    outputRange: [w * 0.07, 0, -w * 0.07],
    extrapolate: 'clamp',
  });
  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.97, 1, 0.97],
    extrapolate: 'clamp',
  });
  return (
    // overflow:hidden ensures no off-screen content (e.g. the orbiting blue
    // disc on page 2) bleeds visually into adjacent pages.
    <Animated.View style={{ width: w, overflow: 'hidden', opacity, transform: [{ translateX }, { scale }] }}>
      {children}
    </Animated.View>
  );
}

// ================== MAIN ONBOARDING VIEW ==================
export default function OnboardingScreen({ onFinish, variant = 'user' }: OnboardingScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar' || i18n.language?.startsWith('ar-');
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const totalPages = 3;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const rawPage = Math.round(offsetX / SCREEN_WIDTH);
      // In RTL on Android the scroll view starts at the last page (x=0) and
      // increases toward the first page, so we invert the raw page index.
      const page = isRTL ? (totalPages - 1 - rawPage) : rawPage;
      if (page !== currentPage && page >= 0 && page < totalPages) {
        setCurrentPage(page);
      }
    },
    [currentPage, isRTL],
  );

  const goToPage = useCallback(
    (page: number) => {
      // In RTL the scroll target x for a logical page is mirrored
      const xPos = isRTL
        ? SCREEN_WIDTH * (totalPages - 1 - page)
        : SCREEN_WIDTH * page;
      scrollViewRef.current?.scrollTo({ x: xPos, animated: true });
      setCurrentPage(page);
    },
    [isRTL],
  );

  const handleNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1);
    } else {
      onFinish();
    }
  }, [currentPage, goToPage, onFinish]);

  const handleSkip = useCallback(() => {
    onFinish();
  }, [onFinish]);

  // In RTL mode the scroll view starts at the last page; scroll to the first page on mount
  const [rtlReady, setRtlReady] = useState(!isRTL);

  const isTech = variant === 'technician';
  const bgColor = isTech
    ? (currentPage === 0 ? '#FFFFFF' : currentPage === 1 ? COLORS.blue10 : '#EEF4FF')
    : (currentPage === 0 ? '#FFFFFF' : currentPage === 1 ? COLORS.blue10 : '#EEF4FF');
  const isDarkBg = false;
  const isBuiltOnTrust = currentPage === 0;
  const isFindProfessionals = currentPage === 1;
  const isManageProjects = currentPage === 2;
  const usesCustomBottomUi = isBuiltOnTrust || isFindProfessionals || isManageProjects;

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      <OnboardingMovingColorLayer />
      <StatusBar barStyle={isDarkBg ? 'light-content' : 'dark-content'} backgroundColor={bgColor} translucent />

      {/* Pages — scroll-driven crossfade + parallax; programmatic scroll animates the same */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false /* scroll offset drives interpolations */,
        })}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={StyleSheet.absoluteFill}
        onLayout={() => {
          // In RTL Android the scroll view starts at the last page (x=0 = last).
          // Jump instantly to page 0's position so the user sees the first page.
          if (isRTL && !rtlReady) {
            scrollViewRef.current?.scrollTo({ x: SCREEN_WIDTH * (totalPages - 1), animated: false });
            setRtlReady(true);
          }
        }}
      >
        <OnboardingPagerPage index={0} scrollX={scrollX}>
          <BuiltOnTrustScreen onContinue={handleNext} />
        </OnboardingPagerPage>
        <OnboardingPagerPage index={1} scrollX={scrollX}>
          <FindProfessionalsOnboardingScreen onGetStarted={handleNext} />
        </OnboardingPagerPage>
        <OnboardingPagerPage index={2} scrollX={scrollX}>
          <ManageProjectsOnboardingScreen onSkip={handleSkip} onNext={handleNext} />
        </OnboardingPagerPage>
      </Animated.ScrollView>

      {/* Page dots — fixed Y on all screens when each page has its own bottom bar */}
      {usesCustomBottomUi && (
        <View pointerEvents="none" style={[styles.onboardingDotsOverlay, { bottom: ONBOARDING_PAGE_DOTS_BOTTOM }]}>
          <OnboardingPagerDots scrollX={scrollX} total={totalPages} />
        </View>
      )}

      {/* Bottom gradient fade */}
      {!usesCustomBottomUi && (
        <View style={[styles.bottomGradientWrap, { height: 80 + 56 + insets.bottom + 16 }]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', `${bgColor}CC`, bgColor]}
            style={{ flex: 1 }}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>
      )}

      {/* Bottom Navigation Bar */}
      {!usesCustomBottomUi && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          {/* Skip */}
          {currentPage < totalPages - 1 ? (
            <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.skipText, { color: isDarkBg ? COLORS.blue30 : COLORS.textSecond }]}>
                {t('Skip', { defaultValue: 'Skip' })}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}

          {/* Page dots (scroll-linked, same as overlay when custom UI is off) */}
          <OnboardingPagerDots scrollX={scrollX} total={totalPages} />

          {/* Next / Get Started */}
          {currentPage === totalPages - 1 ? (
            <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.amber70, COLORS.amber60]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.getStartedBtn}
              >
                <Text style={[styles.btnLabel, { color: COLORS.blue100 }]}>
                  {t('Get Started', { defaultValue: "Let's Start" })}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.blue100} style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.nextBtn}>
              <Text style={styles.btnLabel}>{t('Next', { defaultValue: 'Next' })}</Text>
              <View style={styles.nextChevronCircle}>
                <Ionicons name="chevron-forward" size={11} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ================== STYLES ==================
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // --- Pages ---
  page: {
    flex: 1,
    height: SCREEN_HEIGHT,
  },

  // --- Built on Trust (Figma: 233:2121) ---
  builtRoot: {
    flex: 1,
    alignItems: 'center',
  },
  builtLogoWrap: {
    position: 'absolute',
    top: sy(110),
    left: 0,
    right: 0,
    width: sx(153),
    height: sy(66.56),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  builtTitle: {
    position: 'absolute',
    top: sy(244),
    left: 0,
    right: 0,
    fontSize: 30,
    lineHeight: 32.4,
    letterSpacing: -0.6,
    fontWeight: '700',
    color: COLORS.blue70,
    textAlign: 'center',
  },
  builtParagraph: {
    position: 'absolute',
    top: sy(297),
    left: 0,
    right: 0,
    width: sx(378 - 22.8 * 2),
    alignSelf: 'center',
    textAlign: 'center',
  },
  builtParagraphRegular: {
    fontSize: 15.5,
    lineHeight: 22.48,
    color: COLORS.blue70,
    fontWeight: '400',
  },
  builtParagraphBold: {
    fontSize: 15.5,
    lineHeight: 22.48,
    color: COLORS.blue70,
    fontWeight: '700',
  },
  builtIntegratedWith: {
    position: 'absolute',
    top: sy(365),
    left: 0,
    right: 0,
    fontSize: 12.5,
    letterSpacing: 0.2,
    color: COLORS.blue70,
    fontWeight: '400',
    textAlign: 'center',
  },
  builtLogosRow: {
    position: 'absolute',
    top: sy(472),
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sx(39.417),
  },
  builtAbsher: {
    width: sx(53.47),
    height: sy(79.692),
  },
  builtNafath: {
    width: sx(107.112),
    height: sy(46.065),
  },
  builtButtonOuter: {
    position: 'absolute',
    left: sx(42),
    right: sx(42),
    bottom: ONBOARDING_PRIMARY_CTA_BOTTOM,
  },
  builtButton: {
    height: Math.max(sy(54), 50),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: sx(20),
    ...Platform.select({
      ios: {
        shadowColor: '#1e3a5f',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 8,
        shadowColor: 'rgba(0,0,0,0.18)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      },
    }),
  },
  builtButtonLabel: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
    color: 'rgba(10,15,24,0.88)',
  },
  builtArrowWrap: {
    width: sx(18),
    height: sx(18),
    marginLeft: sx(10),
    position: 'relative',
  },
  builtArrow1: {
    position: 'absolute',
    left: '20.83%',
    top: '45%',
    width: '50%',
    height: '20%',
  },
  builtArrow2: {
    position: 'absolute',
    left: '54.17%',
    top: '25%',
    width: '25%',
    height: '50%',
  },
  onboardingDotsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: 'center',
  },
  onboardingPagerDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  builtIndicatorRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: ONBOARDING_PAGE_DOTS_BOTTOM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sx(8),
  },
  builtIndicatorActive: {
    width: sx(26),
    height: sy(6),
    borderRadius: 999,
  },
  builtIndicatorDot: {
    width: sx(8),
    height: sy(6),
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    opacity: 1,
  },

  // --- Find Professionals (Screen 2) ---
  fpBorderOrbitLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  fpBorderOrbitOuter: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: 'transparent',
  },
  fpBorderOrbitInner: {
    overflow: 'hidden',
  },
  fpRoot: {
    flex: 1,
    paddingHorizontal: sx(20.86),
    zIndex: 1,
  },
  fpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(8),
    marginTop: sy(6),
  },
  fpHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(5.215),
  },
  fpHeaderDot: {
    width: sx(4.345),
    height: sx(4.345),
    borderRadius: sx(2.173),
    backgroundColor: COLORS.blue70,
  },
  fpHeaderKicker: {
    fontSize: sx(8.691),
    letterSpacing: sx(1.39),
    fontWeight: '700',
    color: COLORS.blue70,
  },
  fpLangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(4.345),
    paddingHorizontal: sx(11.298),
    paddingVertical: sy(5.214),
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(27,43,75,0.12)',
  },
  fpLangText: {
    fontSize: sx(9.56),
    fontWeight: '700',
    color: COLORS.blue70,
  },
  fpTitleBlock: {
    marginTop: sy(26),
  },
  fpTitle: {
    fontSize: sx(29.462),
    lineHeight: sx(32.504),
    letterSpacing: -0.87,
    fontWeight: '800',
    color: COLORS.blue70,
  },
  fpSubtitle: {
    marginTop: sy(10),
    fontSize: sx(11.733),
    lineHeight: sx(19.364),
    fontWeight: '400',
    color: COLORS.blue70,
  },
  fpFeaturesRingOuter: {
    position: 'relative',
    marginTop: sy(18),
    overflow: 'visible',
  },
  fpFeaturesGrid: {
    marginTop: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: sy(10),
  },
  fpFeatureCard: {
    width: (SCREEN_WIDTH - sx(20.86) * 2 - sx(12)) / 2,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4EAF4',
    borderRadius: sx(10.429),
    paddingHorizontal: sx(11.298),
    paddingVertical: sy(9.56),
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(6.084),
    shadowColor: 'rgba(27,43,75,0.06)',
    shadowOpacity: 1,
    shadowRadius: 3.476,
    shadowOffset: { width: 0, height: 0.869 },
    elevation: 1,
  },
  fpFeatureIconWrap: {
    width: sx(24.335),
    height: sx(24.335),
    borderRadius: sx(6.953),
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fpFeatureLabel: {
    fontSize: sx(9.995),
    fontWeight: '700',
    color: '#1B2B4B',
  },
  fpTopRow: {
    marginTop: sy(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: sy(10),
    paddingBottom: sy(10),
  },
  fpTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(6.084),
  },
  fpTrophy: {
    fontSize: sx(13.036),
  },
  fpTopWorkers: {
    fontSize: sx(12.167),
    fontWeight: '800',
    color: '#1B2B4B',
  },
  fpSeeAll: {
    fontSize: sx(10.429),
    fontWeight: '700',
    color: COLORS.blue70,
  },
  fpWorkersList: {
    gap: sy(8.691),
  },
  fpWorkerCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4EAF4',
    borderRadius: sx(15.644),
    paddingHorizontal: sx(14.775),
    paddingVertical: sy(13.036),
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(11.298),
    overflow: 'hidden',
    shadowColor: 'rgba(27,43,75,0.06)',
    shadowOpacity: 1,
    shadowRadius: 6.953,
    shadowOffset: { width: 0, height: 1.738 },
    elevation: 2,
  },
  fpWorkerAccent: {
    position: 'absolute',
    left: 0,
    top: '18.5%',
    bottom: '19.4%',
    width: sx(2.607),
    borderTopRightRadius: sx(2.607),
    borderBottomRightRadius: sx(2.607),
  },
  fpWorkerAvatar: {
    width: sx(45.193),
    height: sx(45.193),
    borderRadius: sx(12.167),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    shadowOpacity: 0.3,
    shadowRadius: 12.167,
    shadowOffset: { width: 0, height: 3.476 },
    elevation: 3,
  },
  fpWorkerInitials: {
    fontSize: sx(14.514),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.43,
  },
  fpWorkerOnlineDot: {
    position: 'absolute',
    right: -sx(0.87),
    bottom: -sy(0.87),
    width: sx(9.56),
    height: sx(9.56),
    borderRadius: sx(4.78),
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
  fpWorkerBody: {
    flex: 1,
  },
  fpWorkerName: {
    fontSize: sx(12.167),
    fontWeight: '800',
    color: '#1B2B4B',
  },
  fpWorkerMeta: {
    marginTop: sy(1.738),
    fontSize: sx(9.995),
    fontWeight: '500',
    color: '#64748B',
  },
  fpWorkerStatsRow: {
    marginTop: sy(5.215),
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(6.953),
  },
  fpWorkerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(2.607),
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E4EAF4',
    paddingHorizontal: sx(7.822),
    paddingVertical: sy(3.476),
    borderRadius: sx(6.953),
  },
  fpWorkerStar: {
    fontSize: sx(9.56),
    color: '#F59E0B',
  },
  fpWorkerRating: {
    fontSize: sx(9.995),
    fontWeight: '800',
    color: '#1B2B4B',
  },
  fpWorkerJobsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(3.476),
  },
  fpWorkerJobs: {
    fontSize: sx(9.56),
    fontWeight: '600',
    color: '#64748B',
  },
  fpWorkerChevronBtn: {
    width: sx(29.549),
    height: sx(29.549),
    borderRadius: sx(8.691),
    backgroundColor: '#F0F4FA',
    borderWidth: 1,
    borderColor: '#E4EAF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fpCtaWrap: {
    position: 'absolute',
    left: sx(42),
    right: sx(42),
    bottom: ONBOARDING_PRIMARY_CTA_BOTTOM,
    zIndex: 2,
  },
  fpCtaBtn: {
    height: Math.max(sy(54), 50),
    borderRadius: 999,
    paddingHorizontal: sx(26),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: sx(10),
    shadowColor: COLORS.blue100,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fpCtaText: {
    fontSize: sx(14),
    fontWeight: '800',
    color: '#fff',
  },
  fpCtaChevron: {
    width: sx(24),
    height: sx(24),
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fpIndicatorRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: ONBOARDING_PAGE_DOTS_BOTTOM,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sx(8),
  },
  fpPageDotInactive: {
    width: sx(8),
    height: sy(6),
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },

  // --- Manage Projects (Screen 3) ---
  mpRoot: {
    flex: 1,
    paddingHorizontal: 22,
  },
  mpTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 0,
  },
  mpKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: COLORS.blue70,
  },
  mpLangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  mpLangText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
  },
  mpTitle: {
    marginTop: 12,
    fontSize: 26,
    lineHeight: 29.9,
    letterSpacing: -1,
    fontWeight: '800',
    color: COLORS.blue70,
  },
  mpSubtitle: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 19.2,
    color: '#64748B',
  },
  mpProjectCard: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.8)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 14,
    shadowColor: 'rgba(59,130,246,0.08)',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  mpProjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mpProjectName: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.blue70,
  },
  mpStatusPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  mpStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.blue70,
  },
  mpProgressTrack: {
    marginTop: 10,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  mpProgressFill: {
    width: '68%',
    height: '100%',
    borderRadius: 3,
  },
  mpProgressKnob: {
    position: 'absolute',
    right: '32%',
    top: -2.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#637CCF',
    shadowColor: '#2563EB',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  mpProgressMetaRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mpProgressLeft: { fontSize: 10 },
  mpProgressRight: { fontSize: 10 },
  mpProgressStrong: { fontWeight: '700', color: '#475569' },
  mpProgressLight: { fontWeight: '400', color: '#94A3B8' },
  mpTasks: {
    marginTop: 8,
    gap: 5,
  },
  mpTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  mpTaskCheck: {
    width: 15,
    height: 15,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mpTaskEmpty: {
    width: 15,
    height: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mpTaskDone: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  mpTaskTodo: {
    fontSize: 11,
    color: '#334155',
  },
  mpTopWorkersHeader: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mpTopWorkersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mpTrophy: { fontSize: 14 },
  mpTopWorkersTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  mpSeeAll: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.blue70,
  },
  mpWorkersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
  },
  mpBottomBar: {
    marginTop: 10,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mpSkipText: { fontSize: 14, fontWeight: '500', color: '#0F172A' },
  mpIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mpIndicatorDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#CBD5E1' },
  mpIndicatorActive: { width: 22, height: 6, borderRadius: 999, backgroundColor: COLORS.blue70 },
  mpNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 28,
  },
  mpNextText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // --- Indicator ---
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  indicatorDot: {
    height: 7,
    borderRadius: 3.5,
  },

  // --- Bottom ---
  bottomGradientWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 56,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blue60,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 28,
    shadowColor: COLORS.blue60,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 28,
    shadowColor: COLORS.amber60,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  nextChevronCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // ============ WELCOME SCREEN ============
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.06,
    paddingTop: SCREEN_HEIGHT * 0.12,
  },
  welcomeArabicTitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.09, 36),
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  welcomeEnglishTitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.06, 28),
    fontWeight: '900',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: SCREEN_HEIGHT * 0.03,
  },
  welcomeLogoWrap: {
    backgroundColor: COLORS.blue80,
    borderRadius: SCREEN_WIDTH * 0.07,
    padding: SCREEN_WIDTH * 0.05,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
    marginBottom: SCREEN_HEIGHT * 0.03,
  },
  welcomeTagline: {
    fontSize: Math.max(SCREEN_WIDTH * 0.035, 13),
    color: COLORS.blue20,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: Math.min(SCREEN_WIDTH * 0.85, 300),
    marginBottom: SCREEN_HEIGHT * 0.04,
  },
  welcomeTrustLabel: {
    fontSize: Math.max(SCREEN_WIDTH * 0.025, 9),
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.blue30,
    textTransform: 'uppercase',
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  trustLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  trustLogoCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  trustLogoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  trustDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // ============ PROJECT TRACKING SCREEN ============
  decorativeCircle: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.25,
    right: -SCREEN_WIDTH * 0.2,
    width: Math.min(400, SCREEN_WIDTH * 1.1),
    height: Math.min(400, SCREEN_WIDTH * 1.1),
    borderRadius: 200,
    borderWidth: 70,
    borderColor: `${COLORS.blue100}0D`,
  },
  trackingContent: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.08,
    paddingTop: SCREEN_HEIGHT * 0.1,
  },
  sectionBadge: {
    fontSize: Math.max(SCREEN_WIDTH * 0.027, 10),
    fontWeight: '700',
    letterSpacing: 3,
    color: COLORS.blue60,
    textTransform: 'uppercase',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  trackingTitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.075, 32),
    fontWeight: '700',
    color: COLORS.blue100,
    lineHeight: Math.min(SCREEN_WIDTH * 0.095, 40),
    marginBottom: SCREEN_HEIGHT * 0.008,
  },
  trackingSubtitle: {
    fontSize: Math.max(SCREEN_WIDTH * 0.033, 13),
    color: COLORS.textBody,
    lineHeight: 20,
    marginBottom: SCREEN_HEIGHT * 0.018,
  },

  // Project Card
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: COLORS.blue100,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: SCREEN_HEIGHT * 0.018,
  },
  projectCardStripe: {
    height: 3,
  },
  projectCardBody: {
    padding: 14,
  },
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  projectName: {
    fontSize: Math.max(SCREEN_WIDTH * 0.033, 13),
    fontWeight: '700',
    color: COLORS.blue100,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: `${COLORS.blue60}1A`,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: Math.max(SCREEN_WIDTH * 0.024, 9),
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.blue60,
  },

  // Progress bar
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.textBg,
    marginBottom: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 5,
    borderRadius: 3,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SCREEN_HEIGHT * 0.012,
  },
  progressStatText: {
    fontSize: Math.max(SCREEN_WIDTH * 0.028, 11),
    color: COLORS.textSecond,
  },
  progressStatBold: {
    fontSize: Math.max(SCREEN_WIDTH * 0.028, 11),
    fontWeight: '600',
    color: COLORS.textBody,
  },

  // Tasks
  tasksList: {
    gap: 7,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  taskCheck: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckmark: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
  taskLabel: {
    fontSize: 11,
    color: COLORS.textBody,
  },

  // Map
  mapPreview: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.blue20,
    backgroundColor: '#E8F0F8',
    height: Math.max(SCREEN_HEIGHT * 0.22, 140),
    shadowColor: COLORS.blue100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  mapGrid: {
    flex: 1,
    position: 'relative',
  },
  mapRoadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#fff',
  },
  mapRoadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#fff',
  },
  mapBlock: {
    position: 'absolute',
    backgroundColor: '#D0DDE8',
    borderRadius: 4,
  },
  mapBlockAlt: {
    position: 'absolute',
    backgroundColor: '#D8D4EE',
    borderRadius: 4,
  },
  mapHighlight: {
    position: 'absolute',
    top: '30%',
    left: '34%',
    width: '31%',
    height: '17%',
    backgroundColor: COLORS.blue20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.blue60,
  },
  mapPin: {
    position: 'absolute',
    top: '22%',
    left: '46%',
  },
  mapLabel: {
    position: 'absolute',
    top: '10%',
    left: '35%',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.blue100,
  },
  mapCompass: {
    position: 'absolute',
    top: '5%',
    right: '5%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCompassN: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.blue100,
  },

  // ============ FIND PROFESSIONALS SCREEN ============
  prosContent: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.085,
    paddingTop: SCREEN_HEIGHT * 0.1,
  },
  prosTitle: {
    fontSize: Math.min(SCREEN_WIDTH * 0.08, 32),
    fontWeight: '700',
    color: '#fff',
    lineHeight: Math.min(SCREEN_WIDTH * 0.1, 40),
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  prosSubtitle: {
    fontSize: Math.max(SCREEN_WIDTH * 0.032, 12),
    color: COLORS.blue20,
    lineHeight: 19,
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  proCards: {
    gap: 8,
    marginBottom: SCREEN_HEIGHT * 0.02,
  },

  // Pro Card
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingRight: 12,
    overflow: 'hidden',
  },
  proAccent: {
    width: 3,
    height: '100%',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  proAvatar: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 10,
  },
  proInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  proInfo: {
    flex: 1,
  },
  proName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  proRole: {
    fontSize: 10,
    color: COLORS.blue20,
    marginTop: 1,
  },
  proScore: {
    alignItems: 'flex-end',
  },
  proScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.amber60,
  },
  proReviews: {
    fontSize: 9,
    color: COLORS.blue20,
    marginTop: 1,
  },

  // Trusted Integration Card
  trustedCard: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trustedLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.blue20,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  trustedLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trustedLogoBox: {
    flex: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustedLogoIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  trustedLogoDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
