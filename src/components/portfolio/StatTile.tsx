import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

/** Matches TechnicianProfileViewScreen / reviews (COLORS.amber60) */
const RATING_STAR_COLOR = '#FFB703';

type Props = {
  value: string;
  label: string;
  boldFontFamily?: string;
  fontFamily?: string;
  /** When set, show filled Ionicons star after the value (same as app rating UI). */
  showRatingStar?: boolean;
};

export function StatTile({ value, label, boldFontFamily, fontFamily, showRatingStar }: Props) {
  const { colors } = useTheme();
  const showStar = showRatingStar && value !== '—';
  return (
    <View style={[styles.tile, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { fontFamily: boldFontFamily, color: colors.text }]}>{value}</Text>
        {showStar ? <Ionicons name="star" size={14} color={RATING_STAR_COLOR} style={styles.starIcon} /> : null}
      </View>
      <Text style={[styles.label, { fontFamily, color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    gap: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  starIcon: {
    marginBottom: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
});
