/**
 * AppTourTooltip — custom tour guide tooltip for Bonyad.
 * Features:
 *  - RTL-aware layout (Arabic / Hebrew)
 *  - Width clamped to screenWidth - 32 so it never clips off-screen
 *  - Smooth spring entry animation
 *  - Matches app brand colours
 */
import React, { useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  I18nManager,
  Dimensions,
} from 'react-native';
import type { TooltipProps } from '@wrack/react-native-tour-guide';

const MARGIN = 16;
const TRIANGLE = 10;
const OFFSET = 14;

function computeLeft(
  targetX: number,
  targetW: number,
  tooltipW: number,
  screenW: number
): number {
  const ideal = targetX + targetW / 2 - tooltipW / 2;
  return Math.max(MARGIN, Math.min(ideal, screenW - tooltipW - MARGIN));
}

interface Props extends TooltipProps {
  primaryColor: string;
  isDark: boolean;
}

const AppTourTooltip = memo(function AppTourTooltip({
  title,
  description,
  position,
  tooltipPosition = 'bottom',
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  targetHeight = 0,
  targetWidth = 0,
  screenWidth,
  screenHeight,
  config,
  hidePrevButton = false,
  hideSkipButton = false,
  primaryColor,
  isDark,
}: Props) {
  const sw = screenWidth ?? Dimensions.get('window').width;
  const sh = screenHeight ?? Dimensions.get('window').height;
  const isRTL = I18nManager.isRTL;
  const isLastStep = useMemo(() => currentStep === totalSteps - 1, [currentStep, totalSteps]);

  const tooltipW = useMemo(() => Math.min(sw - MARGIN * 2, 340), [sw]);
  const left = useMemo(() => computeLeft(position.x, targetWidth, tooltipW, sw), [position.x, targetWidth, tooltipW, sw]);

  // Vertical placement - memoized for performance
  const { placedAbove, topPos, bottomPos } = useMemo(() => {
    const placed = tooltipPosition === 'top';
    let top: number | undefined;
    let bottom: number | undefined;
    if (placed) {
      bottom = sh - position.y + OFFSET;
    } else {
      top = position.y + targetHeight + OFFSET;
    }
    return { placedAbove: placed, topPos: top, bottomPos: bottom };
  }, [tooltipPosition, position.y, targetHeight, sh]);

  // Spring-in animation - optimized for smooth transitions
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset to initial state
    scale.setValue(0.9);
    opacity.setValue(0);

    // Smooth spring animation with optimized parameters
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep, scale, opacity]);

  const nextLabel = useMemo(() =>
    isLastStep ? (config?.doneButtonText ?? 'Done') : (config?.nextButtonText ?? 'Next'),
    [isLastStep, config]
  );
  const prevLabel = useMemo(() => config?.prevButtonText ?? 'Back', [config]);
  const skipLabel = useMemo(() => config?.skipButtonText ?? 'Skip', [config]);

  // Triangle (arrow) pointing at the target - memoized
  const arrowLeft = useMemo(() => Math.max(
    MARGIN + 4,
    Math.min(position.x + targetWidth / 2 - left - TRIANGLE, tooltipW - MARGIN - TRIANGLE * 2)
  ), [position.x, targetWidth, left, tooltipW]);

  const bg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#F2F2F7' : '#1C1C1E';
  const subColor = isDark ? '#AEAEB2' : '#636366';
  const borderColor = isDark ? '#3A3A3C' : '#E5E5EA';

  const TriangleUp = () => (
    <View
      style={[
        styles.triangle,
        {
          left: arrowLeft,
          top: -TRIANGLE,
          borderLeftWidth: TRIANGLE,
          borderRightWidth: TRIANGLE,
          borderBottomWidth: TRIANGLE,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: bg,
        },
      ]}
    />
  );

  const TriangleDown = () => (
    <View
      style={[
        styles.triangle,
        {
          left: arrowLeft,
          bottom: -TRIANGLE,
          borderLeftWidth: TRIANGLE,
          borderRightWidth: TRIANGLE,
          borderTopWidth: TRIANGLE,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: bg,
        },
      ]}
    />
  );

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          left,
          width: tooltipW,
          opacity,
          transform: [{ scale }],
          ...(topPos !== undefined ? { top: topPos } : {}),
          ...(bottomPos !== undefined ? { bottom: bottomPos } : {}),
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Arrow pointing up at target */}
      {!placedAbove && <TriangleUp />}

      <View
        style={[
          styles.card,
          {
            backgroundColor: bg,
            borderColor,
            shadowColor: isDark ? '#000' : '#00000030',
          },
        ]}
      >
        {/* Step indicator */}
        <View style={[styles.stepRow, isRTL && styles.rowRTL]}>
          <View style={[styles.stepDots, isRTL && styles.rowRTL]}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === currentStep ? primaryColor : isDark ? '#3A3A3C' : '#D1D1D6',
                    width: i === currentStep ? 16 : 6,
                  },
                ]}
              />
            ))}
          </View>
          {!hideSkipButton && (
            <TouchableOpacity onPress={onSkip} hitSlop={8} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: subColor }]}>{skipLabel}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: textColor, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {title}
        </Text>

        {/* Description */}
        <Text
          style={[
            styles.description,
            { color: subColor, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {description}
        </Text>

        {/* Buttons */}
        <View style={[styles.buttonsRow, isRTL && styles.rowRTL]}>
          {!hidePrevButton && currentStep > 0 && (
            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor }]}
              onPress={onPrev}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnSecondaryText, { color: textColor }]}>{prevLabel}</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: primaryColor }]}
            onPress={onNext}
            activeOpacity={0.8}
          >
            <Text style={styles.btnPrimaryText}>{nextLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Arrow pointing down at target */}
      {placedAbove && <TriangleDown />}
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if key props change
  return (
    prevProps.currentStep === nextProps.currentStep &&
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.targetWidth === nextProps.targetWidth &&
    prevProps.targetHeight === nextProps.targetHeight &&
    prevProps.primaryColor === nextProps.primaryColor &&
    prevProps.isDark === nextProps.isDark
  );
});

export default AppTourTooltip;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 9999,
  },
  triangle: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    zIndex: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  stepDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  skipBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '400',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnPrimary: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
    minWidth: 80,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  btnSecondary: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
