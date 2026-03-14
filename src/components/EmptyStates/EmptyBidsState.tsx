import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useFontFamily } from '../../context/FontContext';

interface EmptyBidsStateProps {
  message?: string;
  submessage?: string;
}

export default function EmptyBidsState({ message, submessage }: EmptyBidsStateProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, fonts } = useFontFamily();

  return (
    <View style={styles.container}>
      <Text style={[styles.message, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
        {message || t('No bids yet')}
      </Text>
      {submessage && (
        <Text style={[styles.submessage, { color: colors.textSecondary }]}>{submessage}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  submessage: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
