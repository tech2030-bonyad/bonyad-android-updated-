/**
 * useLanguageFlip
 *
 * Returns a Reanimated animated style that plays a horizontal flip animation
 * every time the i18n language changes.  Apply it to any container that should
 * visually "flip" on locale switch (root view, tab bar, etc.).
 *
 * Animation sequence:
 *   1. scaleX  1 → 0  (fold flat, 160 ms ease-in)
 *   2. scaleX  0 → 1  (unfold with spring overshoot, 240 ms ease-out)
 *
 * The layout / text direction changes while the view is flat (scaleX ≈ 0), so
 * when it expands back the user sees the new direction emerge — exactly like a
 * physical card being flipped over.
 */
import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import i18n from '../localization/i18n';

export function useLanguageFlip() {
  const scaleX = useSharedValue(1);

  useEffect(() => {
    const handleLanguageChanged = () => {
      scaleX.value = withSequence(
        // Phase 1: fold the bar flat
        withTiming(0, { duration: 160, easing: Easing.in(Easing.ease) }),
        // Phase 2: spring open — slight overshoot for a satisfying "snap"
        withSpring(1, { damping: 14, stiffness: 280, mass: 0.8 }),
      );
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [scaleX]);

  return useAnimatedStyle(() => ({
    transform: [{ scaleX: scaleX.value }],
    // Dim while folded so the mid-flip blank is not jarring
    opacity: interpolate(scaleX.value, [0, 0.35, 1], [0, 0.55, 1]),
  }));
}
