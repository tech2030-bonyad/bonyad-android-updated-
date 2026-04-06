import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  I18nManager,
} from 'react-native';
import type { TooltipProps } from 'react-native-copilot';
import { useCopilot } from 'react-native-copilot';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

/**
 * Tooltip with Skip always visible (including on the last step), matching web UX.
 */
export default function CopilotTourTooltip({ labels }: TooltipProps) {
  const { goToNext, goToPrev, stop, currentStep, isFirstStep, isLastStep } = useCopilot();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { width } = useWindowDimensions();
  const maxTooltipWidth = Math.min(width - 32, 340);

  const skipLabel = labels.skip ?? t('coachMark.skip');
  const prevLabel = labels.previous ?? t('coachMark.previous');
  const nextLabel = labels.next ?? t('coachMark.next');
  const finishLabel = labels.finish ?? t('coachMark.finish');

  const fontStyle = { fontFamily: fontFamily || undefined };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          maxWidth: maxTooltipWidth,
        },
      ]}
    >
      <Text style={[styles.body, { color: colors.text }, fontStyle, { fontSize: scaledSize(14) }]}>
        {currentStep?.text ?? ''}
      </Text>
      <View
        style={[
          styles.actionsRow,
          { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            void stop();
          }}
          style={[styles.textBtn, styles.skipBtn]}
          hitSlop={8}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }, fontStyle, { fontSize: scaledSize(13) }]}>
            {skipLabel}
          </Text>
        </TouchableOpacity>
        <View style={[styles.navCluster, { flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }]}>
          {!isFirstStep ? (
            <TouchableOpacity onPress={() => void goToPrev()} style={styles.textBtn} hitSlop={8}>
              <Text style={[{ color: colors.primary }, fontStyle, { fontSize: scaledSize(13) }]}>{prevLabel}</Text>
            </TouchableOpacity>
          ) : null}
          {!isLastStep ? (
            <TouchableOpacity
              onPress={() => void goToNext()}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              hitSlop={8}
            >
              <Text style={[styles.primaryBtnText, fontStyle, { fontSize: scaledSize(13) }]}>{nextLabel}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => void stop()}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              hitSlop={8}
            >
              <Text style={[styles.primaryBtnText, fontStyle, { fontSize: scaledSize(13) }]}>{finishLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  body: {
    lineHeight: 20,
    marginBottom: 12,
  },
  actionsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  navCluster: {
    alignItems: 'center',
    gap: 8,
  },
  textBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipBtn: {
    marginEnd: 'auto',
  },
  skipText: {
    textDecorationLine: 'underline',
  },
  primaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
