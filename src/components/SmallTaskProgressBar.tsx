import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

interface SmallTaskProgressBarProps {
  progress: number; // 0-100
  estimatedHours?: number;
  elapsedHours?: number;
}

export default function SmallTaskProgressBar({
  progress,
  estimatedHours,
  elapsedHours,
}: SmallTaskProgressBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, fonts } = useFontFamily();

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
          {t('Progress')}
        </Text>
        <Text style={[styles.percentage, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
          {Math.round(progress)}%
        </Text>
      </View>

      <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: widthInterpolated,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>

      {(estimatedHours || elapsedHours) && (
        <View style={styles.timeInfo}>
          {elapsedHours && (
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {t('Elapsed')}: {elapsedHours} {t('hours')}
            </Text>
          )}
          {estimatedHours && (
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {t('Estimated')}: {estimatedHours} {t('hours')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  percentage: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '400',
  },
});
