import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { SmallTaskBid } from '../types/smallTasks';

interface SmallTaskBidCardProps {
  bid: SmallTaskBid;
  index: number;
  onAccept?: () => void;
  onReject?: () => void;
  onWithdraw?: () => void;
  onViewTechnician?: () => void;
  formatBudget: (amount: number) => string;
  isUser?: boolean;
  isMyBid?: boolean;
}

// Design tokens matching project bid cards
const COLORS = {
  primary60: '#005DAC',
  primary10: '#E6EFF7',
  primary80: '#004A8A',
  green80: '#008B3E',
  green10: '#E6F5EC',
  purple70: '#00549B',
  purple10: '#EFE6F5',
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  bgWhite: '#FFFFFF',
  error: '#EF4444',
  error10: '#FEE2E2',
  amber60: '#FFB703',
  amber10: '#FFF8E6',
};

export default function SmallTaskBidCard({
  bid,
  index,
  onAccept,
  onReject,
  onWithdraw,
  onViewTechnician,
  formatBudget,
  isUser = false,
  isMyBid = false,
}: SmallTaskBidCardProps) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, fonts } = useFontFamily();
  const isDarkMode = theme === 'dark';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return { bg: COLORS.green10, text: COLORS.green80 };
      case 'REJECTED':
        return { bg: COLORS.error10, text: COLORS.error };
      case 'WITHDRAWN':
        return { bg: COLORS.amber10, text: COLORS.amber60 };
      default:
        return { bg: COLORS.primary10, text: COLORS.primary80 };
    }
  };

  const statusColors = getStatusColor(bid.status);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isMyBid ? COLORS.green10 : isDarkMode ? colors.cardBackground : COLORS.bgWhite,
          borderColor: isMyBid ? COLORS.green80 : colors.border,
          borderWidth: isMyBid ? 1.5 : 1,
        },
      ]}
    >
      {/* My Bid Indicator */}
      {isMyBid && (
        <View style={[styles.myBidBadge, { backgroundColor: COLORS.green80 }]}>
          <Ionicons name="checkmark-circle" size={14} color={COLORS.textWhite} />
          <Text style={styles.myBidText}>{t('My Bid')}</Text>
        </View>
      )}

      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={onViewTechnician}
        activeOpacity={onViewTechnician ? 0.7 : 1}
        disabled={!onViewTechnician}
      >
        <View style={[styles.numberBadge, { backgroundColor: COLORS.primary10 }]}>
          <Text style={[styles.numberText, { color: COLORS.primary80 }]}>{index + 1}</Text>
        </View>

        {/* Technician Avatar */}
        <View style={styles.avatarContainer}>
          {bid.technicianAvatar ? (
            <ExpoImage
              source={{ uri: bid.technicianAvatar }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: COLORS.primary10 }]}>
              <Text style={[styles.avatarText, { color: COLORS.primary80 }]}>
                {bid.technicianName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={[styles.providerName, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
            {bid.technicianName}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={COLORS.amber60} />
            <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
              4.9 (234) {/* TODO: Get from API */}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color={colors.textSecondary} />
              <Text style={[styles.distanceText, { color: colors.textSecondary }]}>0.8 km</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>156</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('Projects')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
            {(bid.estimatedDuration ?? bid.estimatedHours) != null ? `${bid.estimatedDuration ?? bid.estimatedHours} ${bid.estimatedDuration != null ? t('min') : t('hours')}` : null}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('Duration')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>2h</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('Response')}</Text>
        </View>
      </View>

      {/* Bid Amount */}
      <View style={styles.amountRow}>
        <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>{t('Bid Amount')}</Text>
        <Text style={[styles.amountValue, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
          {formatBudget(bid.price ?? bid.amount ?? 0)}
        </Text>
      </View>

      {/* Proposal */}
      {(bid.notes ?? bid.description) && (
        <View style={styles.proposalSection}>
          <Text style={[styles.proposalTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
            {t('Proposal')}
          </Text>
          <Text style={[styles.proposalText, { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily }]}>
            {bid.notes ?? bid.description}
          </Text>
        </View>
      )}

      {/* Status Badge */}
      {bid.status !== 'PENDING' && (
        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
          <Text style={[styles.statusText, { color: statusColors.text }]}>
            {t(bid.status)}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {bid.status === 'PENDING' && (
        <View style={styles.actionRow}>
          {isUser && (
            <>
              <TouchableOpacity
                style={[styles.rejectButton, { borderColor: colors.border }]}
                onPress={onReject}
              >
                <Ionicons name="close-circle" size={16} color={COLORS.error} />
                <Text style={[styles.rejectText, { color: COLORS.error, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('Reject')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.acceptButton, { backgroundColor: colors.primary }]}
                onPress={onAccept}
              >
                <Ionicons name="checkmark-circle" size={16} color={COLORS.textWhite} />
                <Text style={[styles.acceptText, { color: COLORS.textWhite, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('Accept')}
                </Text>
              </TouchableOpacity>
            </>
          )}
          {!isUser && isMyBid && onWithdraw && (
            <TouchableOpacity
              style={[styles.withdrawButton, { borderColor: COLORS.purple70 }]}
              onPress={onWithdraw}
            >
              <Ionicons name="arrow-undo" size={16} color={COLORS.purple70} />
              <Text style={[styles.withdrawText, { color: COLORS.purple70, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                {t('Withdraw')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* View Profile Button */}
      {onViewTechnician && (
        <TouchableOpacity
          style={[styles.viewProfileButton, { borderColor: colors.border }]}
          onPress={onViewTechnician}
        >
          <Ionicons name="person-outline" size={16} color={colors.primary} />
          <Text style={[styles.viewProfileText, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
            {t('View Profile')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  myBidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 4,
  },
  myBidText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '400',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statBox: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '400',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary10,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  proposalSection: {
    marginBottom: 12,
  },
  proposalTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  proposalText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  rejectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  withdrawButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  withdrawText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 6,
  },
  viewProfileText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
