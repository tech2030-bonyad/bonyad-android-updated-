import { useState, useRef, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import type { TutorialScreenKey } from '../utils/coachMarks';
import { coachMarksStorage } from '../utils/coachMarks';

export type SimpleTourStep = { id: string; i18nSuffix: string };

/** Spotlight uses ref bounds from measureInWindow (no inset); aligns hole edge with the control border. */
const PAD = 0;
const REMEASURE_MAX = 28;

/**
 * Minimal multi-step tour: register refs by step id, measure into stepRect for ScreenTourOverlay.
 * Phase helper for tabs that only need a few highlights (Chat, Profile, New, …).
 */
export function useSimpleScreenTour(
  steps: SimpleTourStep[],
  tutorialKey: TutorialScreenKey,
  /** e.g. increment after ScrollView scroll so measureInWindow runs on the settled layout */
  ...remeasureDeps: unknown[]
) {
  const refs = useRef<Record<string, View | null>>({});
  const registerFns = useRef<Record<string, (el: View | null) => void>>({});
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [stepRect, setStepRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  /** Stable per-id callbacks so FlatList headers / rows don’t get ref churn every render. */
  const register = useCallback((id: string) => {
    if (!registerFns.current[id]) {
      registerFns.current[id] = (el: View | null) => {
        refs.current[id] = el;
      };
    }
    return registerFns.current[id];
  }, []);

  useEffect(() => {
    if (!tourActive) {
      setStepRect(null);
      return;
    }

    let cancelled = false;

    const measureTick = (attempt: number) => {
      if (cancelled) return;
      const step = steps[tourStep];
      if (!step) {
        setStepRect(null);
        return;
      }
      const ref = refs.current[step.id];
      if (!ref) {
        if (attempt < REMEASURE_MAX) {
          requestAnimationFrame(() => measureTick(attempt + 1));
        }
        return;
      }
      ref.measureInWindow((x, y, w, h) => {
        if (cancelled) return;
        if (w <= 0 || h <= 0) {
          if (attempt < REMEASURE_MAX) {
            requestAnimationFrame(() => measureTick(attempt + 1));
          }
          return;
        }
        setStepRect({
          x: x - PAD,
          y: y - PAD,
          w: w + 2 * PAD,
          h: h + 2 * PAD,
        });
      });
    };

    requestAnimationFrame(() => requestAnimationFrame(() => measureTick(0)));
    const t1 = setTimeout(() => measureTick(0), 48);
    const t2 = setTimeout(() => measureTick(0), 200);
    const t3 = setTimeout(() => measureTick(0), 450);
    const t4 = setTimeout(() => measureTick(0), 700);
    const t5 = setTimeout(() => measureTick(0), 1100);

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remeasureDeps intentionally triggers re-measure only
  }, [tourActive, tourStep, steps, ...remeasureDeps]);

  const startTour = useCallback(() => {
    setStepRect(null);
    setTourStep(0);
    setTourActive(true);
  }, []);

  const endTour = useCallback(async () => {
    setTourActive(false);
    setTourStep(0);
    setStepRect(null);
    await coachMarksStorage.markTutorialComplete(tutorialKey);
  }, [tutorialKey]);

  /** For ScrollView scroll-to-target (e.g. Profile) before measureInWindow. */
  const getTargetRef = useCallback((id: string) => refs.current[id] ?? null, []);

  return {
    tourActive,
    tourStep,
    setTourStep,
    stepRect,
    register,
    getTargetRef,
    startTour,
    endTour,
    clearTutorialAndStart: async () => {
      await coachMarksStorage.clearTutorial(tutorialKey);
      startTour();
    },
  };
}
