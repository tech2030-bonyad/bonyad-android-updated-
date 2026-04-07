/**
 * WathqBadge — "Verified by Wathq" badge for company technicians.
 * Shows the Wathq logo + CR number + verified label.
 * Compact variant for search rows / list cards, full variant for profile hero.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

// Wathq brand teal
const WATHQ_COLOR = '#00887A';
const WATHQ_BG = 'rgba(0,136,122,0.10)';
const WATHQ_BG_DARK = 'rgba(0,136,122,0.22)';

interface WathqBadgeProps {
  companyName?: string | null;
  crNumber?: string | null;
  /** 'compact' for list rows, 'full' for profile hero, 'inline' for single-line */
  variant?: 'compact' | 'full' | 'inline';
}

export default function WathqBadge({ companyName, crNumber, variant = 'compact' }: WathqBadgeProps) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  if (variant === 'inline') {
    return (
      <View style={[styles.inlineBadge, { backgroundColor: isDark ? WATHQ_BG_DARK : WATHQ_BG }]}>
        <Ionicons name="shield-checkmark" size={10} color={WATHQ_COLOR} />
        <Text style={[styles.inlineText, { color: WATHQ_COLOR }]}>{t('Wathq')}</Text>
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={[styles.compactWrap, { backgroundColor: isDark ? WATHQ_BG_DARK : WATHQ_BG, borderColor: isDark ? 'rgba(0,136,122,0.35)' : 'rgba(0,136,122,0.20)' }]}>
        <View style={styles.compactRow}>
          <Ionicons name="shield-checkmark" size={12} color={WATHQ_COLOR} />
          <Text style={[styles.compactLabel, { color: WATHQ_COLOR }]} numberOfLines={1}>
            {companyName || t('Company')}
          </Text>
        </View>
        {crNumber ? (
          <Text style={[styles.compactCr, { color: isDark ? colors.textSecondary : '#5F6368' }]} numberOfLines={1}>
            CR: {crNumber}
          </Text>
        ) : null}
      </View>
    );
  }

  // variant === 'full'
  return (
    <View style={[styles.fullWrap, { backgroundColor: isDark ? WATHQ_BG_DARK : WATHQ_BG, borderColor: isDark ? 'rgba(0,136,122,0.35)' : 'rgba(0,136,122,0.20)' }]}>
      <View style={styles.fullHeader}>
        <View style={[styles.fullIconWrap, { backgroundColor: isDark ? 'rgba(0,136,122,0.30)' : 'rgba(0,136,122,0.15)' }]}>
          <Ionicons name="shield-checkmark" size={16} color={WATHQ_COLOR} />
        </View>
        <View style={styles.fullHeaderText}>
          <Text style={[styles.fullTitle, { color: WATHQ_COLOR }]}>
            {t('Verified by Wathq')}
          </Text>
          <Text style={[styles.fullSubtitle, { color: isDark ? colors.textSecondary : '#5F6368' }]}>
            {t('Company Account')}
          </Text>
        </View>
      </View>
      {companyName ? (
        <View style={styles.fullInfoRow}>
          <Ionicons name="business-outline" size={13} color={isDark ? colors.textSecondary : '#5F6368'} />
          <Text style={[styles.fullInfoText, { color: colors.text }]} numberOfLines={1}>{companyName}</Text>
        </View>
      ) : null}
      {crNumber ? (
        <View style={styles.fullInfoRow}>
          <Ionicons name="document-text-outline" size={13} color={isDark ? colors.textSecondary : '#5F6368'} />
          <Text style={[styles.fullInfoText, { color: colors.text }]} numberOfLines={1}>CR: {crNumber}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Inline (single pill)
  inlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inlineText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Compact (for list cards)
  compactWrap: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  compactCr: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 16,
  },
  // Full (for profile hero)
  fullWrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fullIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullHeaderText: {
    flex: 1,
  },
  fullTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  fullSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  fullInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 42,
  },
  fullInfoText: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
});
