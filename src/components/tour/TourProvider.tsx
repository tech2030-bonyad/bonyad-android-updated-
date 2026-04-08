/**
 * TourProvider v10 — Smooth hole transitions + safe-area-aware.
 *
 * Key changes from v9:
 * - Hole slides smoothly between steps (300ms ease-out cubic)
 * - React state updates deferred until AFTER hole animation → zero jank
 * - Hole clamped to safe area so it never hides behind status bar
 * - Pre-measure upcoming step in background for instant transitions
 */

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  Platform,
  ScrollView,
  BackHandler,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useFontFamily } from '../../context/FontContext';
import { useTranslation } from 'react-i18next';
import type { TutorialScreenKey } from '../../utils/coachMarks';
import { coachMarksStorage } from '../../utils/coachMarks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Constants                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */
const OVERLAY_FILL = 'rgba(0,0,0,0.62)';
const GAP = 14;
const SIDE_PAD = 16;
const CORNER_R = 12;
const FADE_IN_MS = 180;
const TOOLTIP_MIN_H = 160;
const SPOT_PAD = 6;

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Types                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */
export type TourStepDef = { spotId: string; text: string };
type SpotRect = { x: number; y: number; w: number; h: number };

interface TourConfig {
  steps: TourStepDef[];
  screenKey: TutorialScreenKey;
  onScrollToStep?: (stepIndex: number, spotId: string, scrollDelta?: number) => boolean | void;
}

interface TourContextValue {
  isActive: boolean;
  tourRef: (id: string) => (el: View | null) => void;
  startTour: (config: TourConfig) => void;
}

const TourContext = createContext<TourContextValue>({
  isActive: false,
  tourRef: () => () => {},
  startTour: () => {},
});

export const useTour = () => useContext(TourContext);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SVG path                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */
function buildPath(sw: number, sh: number, hole: SpotRect | null): string {
  let d = `M0,0 H${sw} V${sh} H0 Z`;
  if (hole && hole.w > 0 && hole.h > 0) {
    // Round to integers — avoids sub-pixel anti-aliasing work every frame
    const x = Math.round(hole.x);
    const y = Math.round(hole.y);
    const w = Math.round(hole.w);
    const h = Math.round(hole.h);
    const r = Math.min(CORNER_R, w / 2, h / 2);
    d += ` M${x + r},${y}`;
    d += ` H${x + w - r} Q${x + w},${y} ${x + w},${y + r}`;
    d += ` V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h}`;
    d += ` H${x + r} Q${x},${y + h} ${x},${y + h - r}`;
    d += ` V${y + r} Q${x},${y} ${x + r},${y} Z`;
  }
  return d;
}

const doubleRAF = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

const MOVE_MS = 300;

// Ease-out cubic: fast start, smooth deceleration — natural feel at 300ms
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  AnimatedHoleOverlay — fully imperative, zero React-render lag              */
/*                                                                             */
/*  Root cause of previous lag: useEffect fires AFTER React paints (≥16ms).   */
/*  With 80ms total, losing 1-2 frames at the start made the slide look like  */
/*  a jump. Fix: expose animateTo() via controlRef so the caller triggers the  */
/*  animation directly — no React cycle in the hot path.                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface HoleOverlayControl {
  animateTo: (rect: SpotRect, onComplete?: () => void) => void;
  snapTo:    (rect: SpotRect) => void;
  clear:     () => void;
}

function AnimatedHoleOverlay({
  overlayW,
  overlayH,
  onPress,
  controlRef,
  borderRef,
}: {
  overlayW: number;
  overlayH: number;
  onPress: () => void;
  controlRef: React.MutableRefObject<HoleOverlayControl | null>;
  borderRef?: React.MutableRefObject<{ update: (r: SpotRect) => void } | null>;
}) {
  const pathRef = useRef<any>(null);
  const curRef  = useRef<SpotRect | null>(null);
  const rafRef  = useRef<number | null>(null);

  // Keep layout dimensions available to the imperative callbacks without stale closure
  const dimRef = useRef({ w: overlayW, h: overlayH });
  useEffect(() => { dimRef.current = { w: overlayW, h: overlayH }; }, [overlayW, overlayH]);

  const writePx = useCallback((r: SpotRect) => {
    const { w, h } = dimRef.current;
    pathRef.current?.setNativeProps({ d: buildPath(w, h, r) });
    borderRef?.current?.update(r);
  }, [borderRef]);

  // Register the imperative API once — useLayoutEffect so it's ready before any rAF
  useLayoutEffect(() => {
    controlRef.current = {

      // Smooth slide — starts immediately (no React render delay)
      animateTo: (rect: SpotRect, onComplete?: () => void) => {
        if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

        // First appearance → snap, no animation
        if (!curRef.current || curRef.current.w === 0) {
          curRef.current = { ...rect };
          writePx(rect);
          onComplete?.();
          return;
        }

        const from   = { ...curRef.current };
        const to     = { ...rect };
        const startT = performance.now(); // captured NOW, before any rAF delay

        const tick = (now: number) => {
          const t = Math.min((now - startT) / MOVE_MS, 1);
          const e = easeOutCubic(t);
          const next: SpotRect = {
            x: from.x + (to.x - from.x) * e,
            y: from.y + (to.y - from.y) * e,
            w: from.w + (to.w - from.w) * e,
            h: from.h + (to.h - from.h) * e,
          };
          curRef.current = next;
          writePx(next);
          if (t < 1) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            curRef.current = { ...to };
            writePx(to);
            rafRef.current = null;
            onComplete?.();
          }
        };

        rafRef.current = requestAnimationFrame(tick);
      },

      // Instant jump — used for first step appearance
      snapTo: (rect: SpotRect) => {
        if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        curRef.current = { ...rect };
        writePx(rect);
      },

      // Hide — clear hole on tour end
      clear: () => {
        if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        curRef.current = null;
        const { w, h } = dimRef.current;
        pathRef.current?.setNativeProps({ d: buildPath(w, h, null) });
        borderRef?.current?.update({ x: -9999, y: -9999, w: 0, h: 0 });
      },
    };

    return () => { controlRef.current = null; };
  }, [controlRef, writePx, borderRef]);

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View style={StyleSheet.absoluteFillObject}>
        <Svg width={overlayW} height={overlayH} style={StyleSheet.absoluteFill}>
          <Path
            ref={pathRef}
            d={buildPath(overlayW, overlayH, null)}
            fill={OVERLAY_FILL}
            fillRule="evenodd"
          />
        </Svg>
      </View>
    </TouchableWithoutFeedback>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  AnimatedBorder — setNativeProps, zero React re-renders per frame          */
/* ═══════════════════════════════════════════════════════════════════════════ */
function AnimatedBorder({
  controlRef,
}: {
  controlRef: React.MutableRefObject<{ update: (r: SpotRect) => void } | null>;
}) {
  const viewRef = useRef<View>(null);

  useLayoutEffect(() => {
    controlRef.current = {
      update: (r: SpotRect) => {
        if (!viewRef.current) return;
        viewRef.current.setNativeProps({
          style: {
            left: r.x - 2,
            top: r.y - 2,
            width: r.w + 4,
            height: r.h + 4,
          },
        });
      },
    };
    return () => { controlRef.current = null; };
  }, [controlRef]);

  return (
    <View
      ref={viewRef}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -9999,
        top: -9999,
        width: 0,
        height: 0,
        borderRadius: CORNER_R + 2,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.55)',
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TourProvider                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const { fontFamily, boldFontFamily } = useFontFamily();
  const { t } = useTranslation();
  const ff = fontFamily || undefined;
  const bff = boldFontFamily || ff;
  const primaryColor = colors.primary;
  const insets = useSafeAreaInsets();
  const insetsTopRef = useRef(0);
  const insetsBottomRef = useRef(0);
  insetsTopRef.current = insets.top;
  insetsBottomRef.current = insets.bottom;

  // ── Global safe-zone thresholds ─────────────────────────────────────────
  // Derived from safe-area insets + fixed buffers that cover typical bars.
  // No per-screen configuration needed.
  const TOP_BAR_BUFFER = 100;   // covers typical AppTopBar / inline header
  const BOTTOM_BAR_BUFFER = 80; // covers typical GlassTabBar content

  /* ── state ─────────────────────────────────────────────────────────────── */
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [holeRect, setHoleRect] = useState<SpotRect | null>(null);

  /* ── refs ──────────────────────────────────────────────────────────────── */
  const stepsRef = useRef<TourStepDef[]>([]);
  const screenKeyRef = useRef<TutorialScreenKey>('userHome');
  const onScrollRef = useRef<((i: number, id: string) => boolean | void) | null>(null);
  const spotsRef = useRef<Map<string, View>>(new Map());
  const refFnsRef = useRef<Record<string, (el: View | null) => void>>({});
  const isActiveRef = useRef(false);
  const currentStepRef = useRef(0);
  const transitioningRef = useRef(false);
  const borderControlRef = useRef<{ update: (r: SpotRect) => void } | null>(null);
  const holeControlRef   = useRef<HoleOverlayControl | null>(null);

  /* ── wrapper ref (measurement anchor) ──────────────────────────────────── */
  const wrapperRef = useRef<View>(null);
  const wrapperLayoutRef = useRef({ w: 400, h: 800 });

  const handleWrapperLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout;
    wrapperLayoutRef.current = { w: width, h: height };
  }, []);

  /* ── BackHandler ───────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isActive) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      endTourRef.current();
      return true;
    });
    return () => sub.remove();
  }, [isActive]);

  /* ── animations ────────────────────────────────────────────────────────── */
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  /* ── spot registration ─────────────────────────────────────────────────── */
  const tourRef = useCallback((id: string) => {
    if (!refFnsRef.current[id]) {
      refFnsRef.current[id] = (el: View | null) => {
        if (el) spotsRef.current.set(id, el);
        else spotsRef.current.delete(id);
      };
    }
    return refFnsRef.current[id];
  }, []);

  /* ── measurement — measure spot + wrapper simultaneously ─────────────── */

  const measureSpot = useCallback(
    (spotId: string): Promise<SpotRect | null> =>
      new Promise((resolve) => {
        const view = spotsRef.current.get(spotId);
        if (!view || !wrapperRef.current) { resolve(null); return; }
        try {
          let spotResult: { x: number; y: number; w: number; h: number } | null = null;
          let wrapperResult: { x: number; y: number } | null = null;
          let count = 0;

          const tryResolve = () => {
            count++;
            if (count < 2) return;
            if (!spotResult || !wrapperResult) { resolve(null); return; }
            const { x, y, w, h } = spotResult;
            const ox = wrapperResult.x;
            const oy = wrapperResult.y;
            // Clamp hole so it never hides behind the status bar
            const rawY = y - oy - SPOT_PAD;
            const rawH = h + SPOT_PAD * 2;
            const minY = Math.max(0, insetsTopRef.current - oy);
            const clampedY = Math.max(minY, rawY);
            const adjustedH = rawH - (clampedY - rawY);
            resolve({
              x: x - ox - SPOT_PAD,
              y: clampedY,
              w: w + SPOT_PAD * 2,
              h: Math.max(adjustedH, h),
            });
          };

          view.measureInWindow((x, y, w, h) => {
            if (w > 0 && h > 0) {
              spotResult = { x, y, w, h };
            }
            tryResolve();
          });

          wrapperRef.current!.measureInWindow((x, y) => {
            wrapperResult = { x: x || 0, y: y || 0 };
            tryResolve();
          });
        } catch {
          resolve(null);
        }
      }),
    [],
  );

  /* ── tooltip fade — pure opacity, setTimeout avoids bridge roundtrip ── */
  const fadeTooltipIn = useCallback(
    (): Promise<void> => {
      tooltipOpacity.setValue(0);
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      // setTimeout resolves ~10-20ms faster than Animated callback (avoids bridge roundtrip)
      return new Promise((r) => setTimeout(r, FADE_IN_MS));
    },
    [tooltipOpacity],
  );

  // Instant hide — no animation, no wait. Just setValue(0).
  const hideTooltip = useCallback(() => {
    tooltipOpacity.setValue(0);
  }, [tooltipOpacity]);

  /* ── measureForStep — zero-delay for visible elements ─────────────────── */
  const measureForStepRef = useRef(async (_idx: number): Promise<SpotRect | null> => null);
  measureForStepRef.current = async (stepIndex: number): Promise<SpotRect | null> => {
    const step = stepsRef.current[stepIndex];
    if (!step) return null;

    // FAST PATH: Measure immediately — no doubleRAF. Layout hasn't changed
    // since last render unless we scroll, so this is accurate.
    let rect = await measureSpot(step.spotId);

    if (rect) {
      const viewH = wrapperLayoutRef.current.h;
      // Global safe zones: status-bar + top-bar buffer, bottom-bar + home-indicator buffer
      const safeTop = insetsTopRef.current + TOP_BAR_BUFFER;
      const safeBottom = Math.max(insetsBottomRef.current, 20) + BOTTOM_BAR_BUFFER;
      const inView = rect.y >= safeTop - SPOT_PAD
        && (rect.y + rect.h) <= viewH - safeBottom + SPOT_PAD;

      if (inView) return rect;

      // Element measured but behind a bar or off-screen → scroll into view
      if (onScrollRef.current) {
        const targetScreenY = safeTop + GAP;
        const delta = rect.y - targetScreenY;
        onScrollRef.current(stepIndex, step.spotId, delta);
        // Only doubleRAF AFTER scroll — layout needs to settle
        await doubleRAF();
        if (!isActiveRef.current) return null;
        rect = await measureSpot(step.spotId);
        if (rect) return rect;
      }
    } else if (onScrollRef.current) {
      // Measurement returned null → fall back to hardcoded scroll positions
      onScrollRef.current(stepIndex, step.spotId);
      await doubleRAF();
      if (!isActiveRef.current) return null;
      rect = await measureSpot(step.spotId);
      if (rect) return rect;
    }

    // Final retry
    await new Promise<void>((r) => requestAnimationFrame(r));
    return measureSpot(step.spotId);
  };

  /* ── pre-measure cache — measure next/prev while tooltip is showing ──── */
  const preMeasuredRef = useRef<Map<number, SpotRect>>(new Map());

  const preMeasureAdjacent = useCallback(async (currentIdx: number) => {
    const total = stepsRef.current.length;
    for (const delta of [1, -1]) {
      const nextIdx = currentIdx + delta;
      if (nextIdx < 0 || nextIdx >= total) continue;
      const step = stepsRef.current[nextIdx];
      if (!step || !isActiveRef.current) continue;
      const rect = await measureSpot(step.spotId);
      if (rect && isActiveRef.current) {
        const viewH = wrapperLayoutRef.current.h;
        const safeTop = insetsTopRef.current + TOP_BAR_BUFFER;
        const safeBottom = Math.max(insetsBottomRef.current, 20) + BOTTOM_BAR_BUFFER;
        const inView = rect.y >= safeTop - SPOT_PAD
          && (rect.y + rect.h) <= viewH - safeBottom + SPOT_PAD;
        if (inView) {
          preMeasuredRef.current.set(nextIdx, rect);
        }
      }
    }
  }, [measureSpot]);

  /* ── goToStep ──────────────────────────────────────────────────────────── */
  const goToStepRef = useRef(async (_idx: number) => {});
  goToStepRef.current = async (stepIndex: number) => {
    if (!isActiveRef.current) return;
    const rect = await measureForStepRef.current(stepIndex);
    if (!isActiveRef.current) return;
    if (rect) holeControlRef.current?.animateTo(rect);
    else      holeControlRef.current?.clear();
    currentStepRef.current = stepIndex;
    setCurrentStep(stepIndex);
    setHoleRect(rect);
    await fadeTooltipIn();
    // Pre-measure adjacent steps in background
    preMeasureAdjacent(stepIndex);
  };

  /* ── startTour ─────────────────────────────────────────────────────────── */
  const startTourImpl = useRef((_config: TourConfig) => {});
  startTourImpl.current = (config: TourConfig) => {
    stepsRef.current = config.steps;
    screenKeyRef.current = config.screenKey;
    onScrollRef.current = config.onScrollToStep ?? null;
    currentStepRef.current = 0;
    isActiveRef.current = true;
    transitioningRef.current = false;
    preMeasuredRef.current.clear();

    tooltipOpacity.setValue(0);
    overlayOpacity.setValue(0);

    setHoleRect(null);
    setCurrentStep(0);
    setIsActive(true);

    // Start on next frame
    requestAnimationFrame(async () => {
      if (!isActiveRef.current) return;
      // Overlay fade-in + first step measurement in parallel
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start();

      const rect = await measureForStepRef.current(0);
      if (!isActiveRef.current) return;
      if (rect) holeControlRef.current?.snapTo(rect);
      else      holeControlRef.current?.clear();
      currentStepRef.current = 0;
      setCurrentStep(0);
      setHoleRect(rect);
      // Wait for React to commit the new tooltip position before fading in
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (!isActiveRef.current) return;
      await fadeTooltipIn();

      // Pre-measure step 1 in background
      preMeasureAdjacent(0);
    });
  };

  const startTour = useCallback((config: TourConfig) => {
    startTourImpl.current(config);
  }, []);

  /* ── endTour ───────────────────────────────────────────────────────────── */
  const endTourRef = useRef(() => {});
  const endTour = useCallback(async () => {
    isActiveRef.current = false;
    transitioningRef.current = false;
    preMeasuredRef.current.clear();
    holeControlRef.current?.clear();
    setIsActive(false);
    setHoleRect(null);
    setCurrentStep(0);
    tooltipOpacity.setValue(0);
    overlayOpacity.setValue(0);
    await coachMarksStorage.markTutorialComplete(screenKeyRef.current);
  }, [tooltipOpacity, overlayOpacity]);
  endTourRef.current = endTour;

  /* ── navigation — near-instant: hide tooltip → measure/cache → slide → show ── */
  const goNext = useCallback(async (direction: 1 | -1) => {
    if (transitioningRef.current) return;
    const idx = currentStepRef.current + direction;
    if (idx < 0 || idx >= stepsRef.current.length) return;
    transitioningRef.current = true;

    // 1. Instantly hide tooltip — no animation, zero ms wait
    hideTooltip();

    // 2. Use pre-measured cache if available, else measure now
    let rect = preMeasuredRef.current.get(idx) ?? null;
    if (!rect) {
      rect = await measureForStepRef.current(idx);
    }
    preMeasuredRef.current.clear(); // invalidate cache after use
    if (!isActiveRef.current) { transitioningRef.current = false; return; }

    // 3. Animate hole smoothly — NO React re-renders during animation
    if (rect) {
      await new Promise<void>((resolve) => {
        holeControlRef.current?.animateTo(rect!, () => resolve());
      });
    } else {
      holeControlRef.current?.clear();
    }
    if (!isActiveRef.current) { transitioningRef.current = false; return; }

    // 4. Update React state AFTER animation completes → zero jank
    currentStepRef.current = idx;
    setCurrentStep(idx);
    setHoleRect(rect);
    // Wait for React to commit the new tooltip position before fading in
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (!isActiveRef.current) { transitioningRef.current = false; return; }
    await fadeTooltipIn();
    transitioningRef.current = false;

    // 5. Pre-measure adjacent steps in background for next tap
    preMeasureAdjacent(idx);
  }, [hideTooltip, fadeTooltipIn, preMeasureAdjacent]);

  const handleNext = useCallback(() => goNext(1),  [goNext]);
  const handlePrev = useCallback(() => goNext(-1), [goNext]);

  const handleSkip = useCallback(() => endTour(), [endTour]);
  const handleFinish = useCallback(() => endTour(), [endTour]);

  /* ── tooltip position ──────────────────────────────────────────────────── */
  const layout = wrapperLayoutRef.current;
  const totalSteps = stepsRef.current.length;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const stepDef = stepsRef.current[currentStep];

  let tooltipTop: number | undefined;
  let tooltipBottom: number | undefined;
  let tooltipMaxH: number | undefined;
  let showAbove = false;
  let arrowX = layout.w / 2 - SIDE_PAD;

  if (holeRect) {
    const { x, y, w, h } = holeRect;
    const bottom = y + h;
    const spaceBelow = layout.h - bottom - GAP - SIDE_PAD;
    const spaceAbove = y - GAP - SIDE_PAD;
    arrowX = Math.max(10, Math.min(layout.w - SIDE_PAD * 2 - 30, x + w / 2 - SIDE_PAD - 10));

    if (spaceBelow >= 220) {
      tooltipTop = bottom + GAP;
      showAbove = false;
    } else if (spaceAbove >= 220) {
      tooltipBottom = layout.h - y + GAP;
      showAbove = true;
    } else if (spaceBelow >= spaceAbove) {
      tooltipTop = bottom + GAP;
      tooltipMaxH = Math.max(spaceBelow, TOOLTIP_MIN_H);
      showAbove = false;
    } else {
      tooltipBottom = layout.h - y + GAP;
      tooltipMaxH = Math.max(spaceAbove, TOOLTIP_MIN_H);
      showAbove = true;
    }

    if (tooltipTop !== undefined) {
      tooltipTop = Math.max(SIDE_PAD, Math.min(layout.h - SIDE_PAD - TOOLTIP_MIN_H, tooltipTop));
    }
    if (tooltipBottom !== undefined) {
      tooltipBottom = Math.max(SIDE_PAD, tooltipBottom);
    }
  } else {
    tooltipTop = layout.h / 3;
    showAbove = false;
  }

  /* ── arrow ─────────────────────────────────────────────────────────────── */
  const Arrow = ({ down }: { down?: boolean }) => (
    <View
      pointerEvents="none"
      style={{
        width: 0,
        height: 0,
        alignSelf: 'flex-start',
        marginLeft: arrowX,
        ...(down
          ? {
              borderLeftWidth: 10,
              borderRightWidth: 10,
              borderTopWidth: 10,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: colors.cardBackground,
            }
          : {
              borderLeftWidth: 10,
              borderRightWidth: 10,
              borderBottomWidth: 10,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: colors.cardBackground,
            }),
      }}
    />
  );

  /* ── render ────────────────────────────────────────────────────────────── */
  const contextValue: TourContextValue = { isActive, tourRef, startTour };

  return (
    <TourContext.Provider value={contextValue}>
      <View
        ref={wrapperRef}
        style={{ flex: 1 }}
        collapsable={false}
        onLayout={handleWrapperLayout}
      >
        {children}

        {isActive && (
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { zIndex: 99999, elevation: 99999, opacity: overlayOpacity },
            ]}
            pointerEvents="box-none"
          >
            {/* Animated SVG overlay — hole driven imperatively, zero React-render lag */}
            <AnimatedHoleOverlay
              overlayW={layout.w}
              overlayH={layout.h}
              onPress={handleSkip}
              controlRef={holeControlRef}
              borderRef={borderControlRef}
            />

            {/* Highlight border — updated imperatively in sync with hole */}
            <AnimatedBorder controlRef={borderControlRef} />

            {/* Tooltip */}
            {stepDef && (
              <Animated.View
                pointerEvents="box-none"
                style={{
                  position: 'absolute',
                  left: SIDE_PAD,
                  right: SIDE_PAD,
                  top: tooltipTop,
                  bottom: tooltipBottom,
                  opacity: tooltipOpacity,
                }}
              >
                {!showAbove && <Arrow />}
                <View
                  style={{
                    backgroundColor: colors.cardBackground,
                    borderRadius: 20,
                    overflow: 'hidden',
                    elevation: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.18,
                    shadowRadius: 20,
                    maxHeight: tooltipMaxH,
                  }}
                >
                  <View style={{ height: 3, backgroundColor: primaryColor, opacity: 0.9 }} />
                  <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                    <View style={{ padding: 18 }}>
                      {/* Progress dots + skip */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 14,
                        }}
                      >
                        <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', maxWidth: '70%' }}>
                          {Array.from({ length: totalSteps }).map((_, i) => (
                            <View
                              key={i}
                              style={{
                                width: i === currentStep ? 16 : 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: i === currentStep ? primaryColor : `${primaryColor}40`,
                              }}
                            />
                          ))}
                        </View>
                        <TouchableOpacity
                          onPress={handleSkip}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 20,
                            backgroundColor: `${primaryColor}15`,
                          }}
                        >
                          <Ionicons name="close" size={14} color={colors.textSecondary} />
                          <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: ff }}>
                            {t('tutorial.skip')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text
                        style={{
                          fontSize: 14,
                          lineHeight: 22,
                          color: colors.text,
                          fontFamily: ff,
                          marginBottom: 18,
                          textAlign: 'left',
                        }}
                      >
                        {stepDef.text}
                      </Text>

                      {/* Buttons — always LTR */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: isFirst ? 'flex-end' : 'space-between',
                        }}
                      >
                        {!isFirst && (
                          <TouchableOpacity
                            onPress={handlePrev}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 14,
                              paddingVertical: 9,
                              borderRadius: 10,
                              borderWidth: 1.5,
                              borderColor: `${primaryColor}50`,
                              minWidth: 90,
                              justifyContent: 'center',
                            }}
                          >
                            <Ionicons name="chevron-back" size={15} color={primaryColor} />
                            <Text style={{ fontSize: 13, color: primaryColor, fontFamily: bff }}>
                              {t('tutorial.previous')}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={isLast ? handleFinish : handleNext}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 18,
                            paddingVertical: 9,
                            borderRadius: 10,
                            backgroundColor: primaryColor,
                            minWidth: 110,
                            justifyContent: 'center',
                            elevation: 3,
                            shadowColor: primaryColor,
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.35,
                            shadowRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 13, color: '#fff', fontFamily: bff }}>
                            {isLast ? t('tutorial.finish') : t('tutorial.next')}
                          </Text>
                          {!isLast && <Ionicons name="chevron-forward" size={15} color="#fff" />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
                {showAbove && <Arrow down />}
              </Animated.View>
            )}

            {/* Loading skip */}
            {!holeRect && !stepDef && (
              <TouchableOpacity
                onPress={handleSkip}
                style={{
                  position: 'absolute',
                  top: Platform.OS === 'ios' ? 52 : 44,
                  alignSelf: 'center',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: `${primaryColor}20`,
                }}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: ff }}>
                  {t('tutorial.skip')}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </View>
    </TourContext.Provider>
  );
}
