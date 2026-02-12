import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { SmallTaskBid } from '../types/smallTasks';
import SmallTaskBidCard from './SmallTaskBidCard';

interface SmallTaskBidComparisonViewProps {
  bids: SmallTaskBid[];
  onAccept: (bidId: number) => void;
  onReject: (bidId: number) => void;
  onViewTechnician: (technicianId: number) => void;
  formatBudget: (amount: number) => string;
  sortBy?: 'price' | 'rating' | 'time' | 'date';
}

export default function SmallTaskBidComparisonView({
  bids,
  onAccept,
  onReject,
  onViewTechnician,
  formatBudget,
  sortBy: initialSortBy = 'price',
}: SmallTaskBidComparisonViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, fonts } = useFontFamily();

  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'time' | 'date'>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedBids = [...bids].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'price':
        comparison = a.amount - b.amount;
        break;
      case 'time':
        comparison = a.estimatedHours - b.estimatedHours;
        break;
      case 'date':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'rating':
        // TODO: Get actual ratings from API
        comparison = 0;
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const bestValueBid = sortedBids.length > 0 ? sortedBids[0] : null;

  const handleSort = (field: 'price' | 'rating' | 'time' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: 'price' | 'rating' | 'time' | 'date') => {
    if (sortBy !== field) return 'swap-vertical-outline';
    return sortOrder === 'asc' ? 'arrow-up' : 'arrow-down';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
          {t('Compare Bids')} ({bids.length})
        </Text>
      </View>

      {/* Sort Options */}
      <View style={[styles.sortContainer, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>{t('Sort by')}:</Text>
        <View style={styles.sortButtons}>
          {[
            { key: 'price' as const, label: t('Price') },
            { key: 'time' as const, label: t('Time') },
            { key: 'date' as const, label: t('Date') },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortButton,
                {
                  backgroundColor: sortBy === option.key ? colors.primary : colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleSort(option.key)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  {
                    color: sortBy === option.key ? '#FFFFFF' : colors.text,
                    fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600',
                  },
                ]}
              >
                {option.label}
              </Text>
              <Ionicons
                name={getSortIcon(option.key) as any}
                size={16}
                color={sortBy === option.key ? '#FFFFFF' : colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Best Value Badge */}
      {bestValueBid && (
        <View style={[styles.bestValueBadge, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="trophy" size={20} color={colors.primary} />
          <Text style={[styles.bestValueText, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
            {t('Best Value')}: {formatBudget(bestValueBid.amount)} - {bestValueBid.technicianName}
          </Text>
        </View>
      )}

      {/* Bids List */}
      <ScrollView style={styles.bidsList} showsVerticalScrollIndicator={false}>
        {sortedBids.map((bid, index) => (
          <View key={bid.id} style={styles.bidWrapper}>
            {index === 0 && bestValueBid && (
              <View style={[styles.bestValueIndicator, { backgroundColor: colors.primary }]}>
                <Ionicons name="star" size={12} color="#FFFFFF" />
                <Text style={styles.bestValueIndicatorText}>{t('Best Value')}</Text>
              </View>
            )}
            <SmallTaskBidCard
              bid={bid}
              index={index}
              onAccept={() => onAccept(bid.id)}
              onReject={() => onReject(bid.id)}
              onViewTechnician={() => onViewTechnician(bid.technicianId)}
              formatBudget={formatBudget}
              isUser={true}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sortContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sortLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bestValueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    gap: 8,
  },
  bestValueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bidsList: {
    flex: 1,
  },
  bidWrapper: {
    position: 'relative',
  },
  bestValueIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    gap: 4,
  },
  bestValueIndicatorText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
