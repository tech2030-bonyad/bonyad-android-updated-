import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useFontFamily } from '../../context/FontContext';

interface EmptySmallTasksStateProps {
  message?: string;
  submessage?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptySmallTasksState({
  message,
  submessage,
  actionLabel,
  onAction,
}: EmptySmallTasksStateProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, fonts } = useFontFamily();

  return (
    <View style={styles.container}>
      <Ionicons name="clipboard-outline" size={64} color={colors.textDividers} />
      <Text style={[styles.message, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
        {message || t('No tasks found')}
      </Text>
      {submessage && (
        <Text style={[styles.submessage, { color: colors.textSecondary }]}>{submessage}</Text>
      )}
      {onAction && actionLabel && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={onAction}
        >
          <Text style={[styles.actionButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 16,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  submessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
