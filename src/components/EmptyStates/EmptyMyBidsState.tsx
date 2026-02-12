import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useFontFamily } from '../../context/FontContext';

interface EmptyMyBidsStateProps {
  message?: string;
  submessage?: string;
}

export default function EmptyMyBidsState({ message, submessage }: EmptyMyBidsStateProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, fonts } = useFontFamily();

  return (
    <View style={styles.container}>
      <Ionicons name="pricetag-outline" size={48} color={colors.textDividers} />
      <Text style={[styles.message, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
        {message || t('No bids submitted')}
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
