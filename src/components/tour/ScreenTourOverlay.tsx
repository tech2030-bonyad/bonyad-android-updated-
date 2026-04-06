/**
 * ScreenTourOverlay — mirrors the web tour transition exactly.
 *
 * Web pattern (Framer Motion AnimatePresence mode="wait"):
 *   1. Step changes  → tooltip EXIT  (opacity→0, y→-8,  scale→0.98 · 200 ms · ease)
 *   2. Simultaneously → hole SNAPS to new rect (no animation, instant React re-render on web)
 *   3. After exit done → tooltip ENTER (opacity→1, y→0, scale→1 · 220 ms · ease)
 *
 * Easing: web uses cubic-bezier(0.25, 0.1, 0.25, 1) = CSS "ease" = Easing.ease in RN.
 * The smoothness is entirely in the tooltip sequence — not in the hole movement.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

// ─── Timing & easing — matching web exactly ──────────────────────────────────
const WEB_EASE    = Easing.bezier(0.25, 0.1, 0.25, 1); // CSS "ease"
const EXIT_MS     = 200;    // web: 220 ms; slightly tighter for mobile feel
const ENTER_MS    = 220;    // matches web
const ENTER_Y     = 12;     // web: initial y offset on enter
const EXIT_Y      = -8;     // web: y offset on exit
const ENTER_SCALE = 0.96;   // web: initial scale on enter
const EXIT_SCALE  = 0.98;   // web: scale on exit

// ─── Blur ────────────────────────────────────────────────────────────────────
const BLUR_INTENSITY  = Platform.OS === 'ios' ? 55 : 30;
const DARK_TINT_ALPHA = Platform.OS === 'ios' ? 0.30 : 0.50;
const DARK_TINT       = `rgba(0,0,0,${DARK_TINT_ALPHA})`;

function BlurPanel({ style }: { style: object }) {
  return (
    <BlurView
      intensity={BLUR_INTENSITY}
      tint="dark"
      style={[{ position: 'absolute', overflow: 'hidden' }, style]}
      pointerEvents="none"
    >
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: DARK_TINT }]} />
    </BlurView>
  );
}

// ─── TourTooltip ─────────────────────────────────────────────────────────────
export interface TourTooltipProps {
  rect: { x: number; y: number; w: number; h: number };
  stepText: string;
  stepOrder: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  primaryColor: string;
  textColor: string;
  secondaryTextColor: string;
  bgColor: string;
  isRTL: boolean;
  fontFamily?: string;
  boldFontFamily?: string;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function TourTooltip({
  rect, stepText, stepOrder, totalSteps,
  isFirst, isLast, primaryColor, textColor, secondaryTextColor, bgColor,
  isRTL, fontFamily, boldFontFamily,
  onNext, onPrev, onSkip, onFinish, t,
}: TourTooltipProps) {
  const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
  const GAP      = 14;
  const SIDE_PAD = 16;
  const ff  = fontFamily     || undefined;
  const bff = boldFontFamily || ff;

  const highlightBottom = rect.y + rect.h;
  const spaceBelow = SCREEN_H - (highlightBottom + GAP);
  const spaceAbove = rect.y - GAP;
  const MIN_SPACE  = 240;
  let showAbove = spaceBelow < MIN_SPACE && spaceAbove > MIN_SPACE;
  if (spaceBelow < MIN_SPACE && spaceAbove < MIN_SPACE) showAbove = spaceAbove >= spaceBelow;

  const tooltipTop = showAbove ? rect.y - GAP : rect.y + rect.h + GAP;
  const safeTop    = Math.min(SCREEN_H - SIDE_PAD, Math.max(SIDE_PAD, tooltipTop));
  const safeBottom = Math.min(SCREEN_H - SIDE_PAD, Math.max(SIDE_PAD, SCREEN_H - tooltipTop));

  const centerX      = rect.x + rect.w / 2;
  const arrowMarginL = Math.max(10, Math.min(SCREEN_W - SIDE_PAD * 2 - 30, centerX - SIDE_PAD - 10));

  const Arrow = ({ down }: { down?: boolean }) => (
    <View pointerEvents="none" style={{
      width: 0, height: 0, alignSelf: 'flex-start', marginLeft: arrowMarginL,
      ...(down
        ? { borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: bgColor }
        : { borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 10,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: bgColor }),
    }} />
  );

  return (
    <View style={{
      position: 'absolute', left: SIDE_PAD, right: SIDE_PAD,
      top:    showAbove ? undefined : safeTop,
      bottom: showAbove ? safeBottom : undefined,
    }}>
      {!showAbove && <Arrow />}
      <View style={{
        backgroundColor: bgColor, borderRadius: 20, overflow: 'hidden',
        elevation: 16, shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20,
      }}>
        <View style={{ height: 3, backgroundColor: primaryColor, opacity: 0.9 }} />
        <View style={{ padding: 18 }}>
          {/* dots + skip */}
          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
          }}>
            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', flexWrap: 'wrap', maxWidth: '70%' }}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View key={i} style={{
                  width: i === stepOrder - 1 ? 16 : 6, height: 6, borderRadius: 3,
                  backgroundColor: i === stepOrder - 1 ? primaryColor : `${primaryColor}40`,
                }} />
              ))}
            </View>
            <TouchableOpacity
              onPress={onSkip}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 10, paddingVertical: 5,
                borderRadius: 20, backgroundColor: `${primaryColor}15`,
              }}
            >
              <Ionicons name="close" size={14} color={secondaryTextColor} />
              <Text style={{ fontSize: 12, color: secondaryTextColor, fontFamily: ff }}>
                {t('tutorial.skip')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={{
            fontSize: 14, lineHeight: 22, color: textColor,
            fontFamily: ff, marginBottom: 18, textAlign: isRTL ? 'right' : 'left',
          }}>
            {stepText}
          </Text>

          <View style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: isFirst ? 'flex-end' : 'space-between',
          }}>
            {!isFirst && (
              <TouchableOpacity
                onPress={onPrev}
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4,
                  paddingHorizontal: 14, paddingVertical: 9,
                  borderRadius: 10, borderWidth: 1.5, borderColor: `${primaryColor}50`,
                  minWidth: 90, justifyContent: 'center',
                }}
              >
                <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={15} color={primaryColor} />
                <Text style={{ fontSize: 13, color: primaryColor, fontFamily: bff }}>
                  {t('tutorial.previous')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={isLast ? onFinish : onNext}
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 18, paddingVertical: 9,
                borderRadius: 10, backgroundColor: primaryColor,
                minWidth: 110, justifyContent: 'center',
                elevation: 3, shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6,
              }}
            >
              <Text style={{ fontSize: 13, color: '#fff', fontFamily: bff }}>
                {isLast ? t('tutorial.finish') : t('tutorial.next')}
              </Text>
              {!isLast && (
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={15} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {showAbove && <Arrow down />}
    </View>
  );
}

// ─── ScreenTourOverlay ───────────────────────────────────────────────────────
export interface ScreenTourOverlayProps {
  visible: boolean;
  tourStep: number;
  stepRect: { x: number; y: number; w: number; h: number } | null;
  totalSteps: number;
  stepOrder: number;
  stepText: string;
  isFirst: boolean;
  isLast: boolean;
  primaryColor: string;
  textColor: string;
  secondaryTextColor: string;
  bgColor: string;
  isRTL: boolean;
  fontFamily?: string;
  boldFontFamily?: string;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export default function ScreenTourOverlay(props: ScreenTourOverlayProps) {
  const {
    visible, tourStep, stepRect, totalSteps, stepOrder, stepText,
    isFirst, isLast, primaryColor, textColor, secondaryTextColor, bgColor,
    isRTL, fontFamily, boldFontFamily, onNext, onPrev, onSkip, onFinish, t,
  } = props;

  // ── Hole — snaps instantly (Animated.Value.setValue, no timing) ───────────
  const ax = useRef(new Animated.Value(0)).current;
  const ay = useRef(new Animated.Value(0)).current;
  const aw = useRef(new Animated.Value(0)).current;
  const ah = useRef(new Animated.Value(0)).current;

  // ── Tooltip animated values ────────────────────────────────────────────────
  // useNativeDriver:false — required inside Modal with BlurView on some Android builds
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipY       = useRef(new Animated.Value(ENTER_Y)).current;
  const tooltipScale   = useRef(new Animated.Value(ENTER_SCALE)).current;

  // ── Sequencing refs ────────────────────────────────────────────────────────
  const holeReady      = useRef(false);
  const lastRectKey    = useRef('');
  const exitAnim       = useRef<Animated.CompositeAnimation | null>(null);
  const enterAnim      = useRef<Animated.CompositeAnimation | null>(null);
  const exitDone       = useRef(true);   // true = no exit running
  const pendingEnter   = useRef<(() => void) | null>(null);

  // ── Animation helpers ──────────────────────────────────────────────────────
  const runEnter = () => {
    enterAnim.current?.stop();
    tooltipY.setValue(ENTER_Y);
    tooltipScale.setValue(ENTER_SCALE);
    enterAnim.current = Animated.parallel([
      Animated.timing(tooltipOpacity, { toValue: 1,    duration: ENTER_MS, easing: WEB_EASE, useNativeDriver: false }),
      Animated.timing(tooltipY,       { toValue: 0,    duration: ENTER_MS, easing: WEB_EASE, useNativeDriver: false }),
      Animated.timing(tooltipScale,   { toValue: 1,    duration: ENTER_MS, easing: WEB_EASE, useNativeDriver: false }),
    ]);
    enterAnim.current.start();
  };

  const runExit = (onDone: () => void) => {
    exitAnim.current?.stop();
    enterAnim.current?.stop();
    exitDone.current = false;
    exitAnim.current = Animated.parallel([
      Animated.timing(tooltipOpacity, { toValue: 0,          duration: EXIT_MS, easing: WEB_EASE, useNativeDriver: false }),
      Animated.timing(tooltipY,       { toValue: EXIT_Y,     duration: EXIT_MS, easing: WEB_EASE, useNativeDriver: false }),
      Animated.timing(tooltipScale,   { toValue: EXIT_SCALE, duration: EXIT_MS, easing: WEB_EASE, useNativeDriver: false }),
    ]);
    exitAnim.current.start(() => {
      exitDone.current = true;
      onDone();
    });
  };

  // ── PHASE 1: tourStep changes → run EXIT, then fire any pending enter ─────
  useEffect(() => {
    if (!visible) return;
    pendingEnter.current = null;
    // No tooltip shown yet on very first step — skip exit
    if (!holeReady.current) return;
    runExit(() => {
      const fn = pendingEnter.current;
      if (fn) { pendingEnter.current = null; fn(); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep, visible]);

  // ── Reset everything when overlay closes ─────────────────────────────────
  useEffect(() => {
    if (!visible) {
      exitAnim.current?.stop();
      enterAnim.current?.stop();
      exitDone.current     = true;
      pendingEnter.current = null;
      holeReady.current    = false;
      lastRectKey.current  = '';
      tooltipOpacity.setValue(0);
      tooltipY.setValue(ENTER_Y);
      tooltipScale.setValue(ENTER_SCALE);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── PHASE 2 + 3: stepRect arrives → SNAP hole → ENTER tooltip ────────────
  useEffect(() => {
    if (!visible || !stepRect) return;

    // Key includes tourStep so the same rect geometry on a new step still fires
    const key = `${tourStep}|${stepRect.x}|${stepRect.y}|${stepRect.w}|${stepRect.h}`;
    if (key === lastRectKey.current) return;
    lastRectKey.current = key;

    // Snap hole instantly — exactly what the web does (React state update, no CSS transition)
    ax.setValue(stepRect.x);
    ay.setValue(stepRect.y);
    aw.setValue(stepRect.w);
    ah.setValue(stepRect.h);

    if (!holeReady.current) {
      holeReady.current = true;
      runEnter();
      return;
    }

    // Enter only after exit finishes (web's AnimatePresence mode="wait")
    if (exitDone.current) {
      runEnter();
    } else {
      pendingEnter.current = runEnter;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepRect, visible, tourStep]);

  if (!visible) return null;

  const r = stepRect;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onSkip}>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        {r ? (
          <>
            {/* Blur panels — position driven by snapping Animated.Values */}
            <Animated.View pointerEvents="none"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ay }}>
              <BlurPanel style={StyleSheet.absoluteFillObject} />
            </Animated.View>
            <Animated.View pointerEvents="none"
              style={{ position: 'absolute', top: ay, left: 0, width: ax, height: ah }}>
              <BlurPanel style={StyleSheet.absoluteFillObject} />
            </Animated.View>
            <Animated.View pointerEvents="none"
              style={{ position: 'absolute', top: ay, left: Animated.add(ax, aw), right: 0, height: ah }}>
              <BlurPanel style={StyleSheet.absoluteFillObject} />
            </Animated.View>
            <Animated.View pointerEvents="none"
              style={{ position: 'absolute', top: Animated.add(ay, ah), left: 0, right: 0, bottom: 0 }}>
              <BlurPanel style={StyleSheet.absoluteFillObject} />
            </Animated.View>

            {/* Highlight border — snaps with hole */}
            <Animated.View pointerEvents="none"
              style={[s.highlight, { top: ay, left: ax, width: aw, height: ah }]}
            />

            {/* Tooltip — EXIT then ENTER, matching web AnimatePresence mode="wait" */}
            <Animated.View
              pointerEvents="box-none"
              style={{ opacity: tooltipOpacity, transform: [{ translateY: tooltipY }, { scale: tooltipScale }] }}
            >
              <TourTooltip
                rect={r}
                stepText={stepText}
                stepOrder={stepOrder}
                totalSteps={totalSteps}
                isFirst={isFirst}
                isLast={isLast}
                primaryColor={primaryColor}
                textColor={textColor}
                secondaryTextColor={secondaryTextColor}
                bgColor={bgColor}
                isRTL={isRTL}
                fontFamily={fontFamily}
                boldFontFamily={boldFontFamily}
                onNext={onNext}
                onPrev={onPrev}
                onSkip={onSkip}
                onFinish={onFinish}
                t={t}
              />
            </Animated.View>
          </>
        ) : (
          /* Measuring: dim screen + skip so user isn't stuck */
          <Pressable
            onPress={onSkip}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onSkip}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              style={{
                position: 'absolute',
                top: Platform.OS === 'ios' ? 52 : 44,
                alignSelf: 'center',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center', gap: 6,
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: 20, backgroundColor: `${primaryColor}20`,
              }}
            >
              <Ionicons name="close" size={16} color={secondaryTextColor} />
              <Text style={{ fontSize: 13, color: secondaryTextColor, fontFamily: fontFamily || undefined }}>
                {t('tutorial.skip')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  highlight: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
  },
});
