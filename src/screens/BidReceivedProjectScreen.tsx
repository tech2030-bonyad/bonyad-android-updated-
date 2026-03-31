/**
 * BidReceivedProjectScreen
 * 
 * Screen for displaying project details when status is BID_RECEIVED.
 * Shows different UI based on user persona:
 * - User/Homeowner: Can view and compare bids from service providers, accept or decline bids
 *                   Also shows visit requests from technicians
 * - Technician: Can view project details and their submitted bid status
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  TextStyle,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import BookAppointmentModal from '../components/BookAppointmentModal';
import AppBottomSheetModal from '../components/AppBottomSheetModal';

// ===== DESIGN TOKENS FROM FIGMA =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary50: '#1A6DB4',
  primary10: '#E6EFF7',
  primary20: '#B3CEE6',
  // Greens
  green90: '#007B36',
  green80: '#008B3E',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  // Purple
  purple100: '#3C076D',
  purple70: '#5E0BA1',
  purple60: '#6A0DAD',
  purple10: '#EFE6F5',
  // Amber
  amber60: '#FFB703',
  amber70: '#DA9C02',
  // Text
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  // Backgrounds
  bgWhite: '#FFFFFF',
};

const SCREEN_RIYAL_LIGHT = require('../../assets/saudi_riyal_logo.svg');
const SCREEN_RIYAL_DARK = require('../../assets/saudi_riyal_logo_dark.svg');

interface Bid {
  id: number;
  technicianId: number;
  technicianName: string;
  proposedBudget: number;
  comment: string;
  createdAt: string;
  status: string;
  technician?: {
    id: number;
    name: string;
    profileImage?: string;
    rating?: number;
    reviewCount?: number;
    projectsCount?: number;
    responseTime?: string;
    distance?: string;
  };
}

interface VisitRequest {
  id: number;
  technicianId: number;
  technicianName: string;
  projectId: number;
  status: string;
  requestedDate?: string;
  notes?: string;
  createdAt: string;
  technician?: {
    id: number;
    name: string;
    profileImage?: string;
    rating?: number;
    reviewCount?: number;
    projectsCount?: number;
    responseTime?: string;
    distance?: string;
  };
}

interface Phase {
  id: number;
  phaseNumber: number;
  description: string;
  title?: string;
  moneySpent: number;
  timeSpentDays: number;
  status?: string;
}

interface Project {
  id: number;
  description: string;
  status: string;
  budget: number;
  address?: string;
  createdAt: string;
  serviceNameEn?: string;
  serviceNameAr?: string;
  requirements?: string[];
  timeRequiredDays?: number;
  phases?: Phase[];
}

interface BidReceivedProjectScreenProps {
  project: Project;
  onBack: () => void;
  onAcceptBid?: (bidId: number) => void;
  onDeclineBid?: (bidId: number) => void;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onViewTechnician?: (technicianId: number) => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
}

type UserTab = 'bids' | 'visits';

function generatePhaseTitle(phase: Phase, tr: (k: string) => string): string {
  if (phase.title && phase.title.trim()) return phase.title;
  return `${tr('Phase')} ${phase.phaseNumber}`;
}

function normalizePhasesPayload(raw: unknown): Phase[] {
  const asArray = ((): unknown[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      if (Array.isArray(o.content)) return o.content;
      if (Array.isArray(o.phases)) return o.phases;
      if (Array.isArray(o.data)) return o.data;
    }
    return [];
  })();

  return asArray
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const p = item as Record<string, unknown>;
      let id = Number(p.id);
      if (!Number.isFinite(id)) id = -(index + 1);
      let phaseNumber = Number(p.phaseNumber);
      if (!Number.isFinite(phaseNumber)) phaseNumber = index + 1;
      const title = p.title != null && String(p.title).trim() ? String(p.title) : undefined;
      const status = p.status != null ? String(p.status) : undefined;
      return {
        id,
        phaseNumber,
        description: String(p.description ?? ''),
        title,
        moneySpent: Number(p.moneySpent) || 0,
        timeSpentDays: Number(p.timeSpentDays) || 0,
        status,
      } as Phase;
    })
    .filter((x): x is Phase => x !== null);
}

function sortPhasesByNumber(list: Phase[]): Phase[] {
  return [...list].sort((a, b) => (a.phaseNumber || 0) - (b.phaseNumber || 0));
}

/** Plain number + riyal SVG (no SAR text). */
function FormattedAmountWithRiyal({
  amount,
  textStyle,
  iconSize = 18,
}: {
  amount: number;
  textStyle?: TextStyle | TextStyle[];
  iconSize?: number;
}) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const src = theme === 'dark' ? SCREEN_RIYAL_DARK : SCREEN_RIYAL_LIGHT;
  const formatted = new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={textStyle}>{formatted}</Text>
      <ExpoImage source={src} style={{ width: iconSize, height: iconSize * 0.9 }} contentFit="contain" />
    </View>
  );
}

function makeBidStyles(c: typeof COLORS) {
  return StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: c.primary10,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    backgroundColor: c.bgWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: c.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    fontSize: 12,
    fontWeight: '400',
    color: c.primary80,
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textHeader,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starIcon: {
    color: c.amber60,
    fontSize: 10,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '300',
    color: c.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '300',
    color: c.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: c.textDividers,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: c.primary10,
    borderWidth: 0.5,
    borderColor: c.primary50,
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '200',
    color: c.textBody,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textBody,
  },
  amountRow: {
    flexDirection: 'row',
    backgroundColor: c.green10,
    borderWidth: 0.5,
    borderColor: c.green80,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  amountLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: c.green90,
  },
  amountValue: {
    fontSize: 12,
    fontWeight: '400',
    color: c.green90,
    textAlign: 'right',
  },
  proposalSection: {
    paddingVertical: 16,
    gap: 8,
  },
  proposalTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: c.textBody,
  },
  proposalText: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.green60,
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  acceptText: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textWhite,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.purple10,
    borderWidth: 0.5,
    borderColor: c.purple70,
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  declineText: {
    fontSize: 12,
    fontWeight: '400',
    color: c.purple70,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  });
}

// ===== BID CARD COMPONENT (USER VIEW) =====
const BidCard = ({
  bid,
  index,
  onAccept,
  onDecline,
  onViewTechnician,
}: {
  bid: Bid;
  index: number;
  onAccept: () => void;
  onDecline: () => void;
  onViewTechnician?: () => void;
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const c = useMemo(() => ({
    ...COLORS,
    bgWhite: colors.cardBackground,
    textHeader: colors.text,
    textBody: colors.text,
    textSecondary: colors.textSecondary,
    textDividers: colors.border,
    primary10: colors.primary + '20',
    primary50: colors.primary,
    primary80: colors.primary,
    textWhite: colors.white,
    green10: colors.success + '20',
    green60: colors.success,
    green80: colors.success,
    green90: colors.success,
    purple10: colors.cardBackground,
    purple70: colors.primary,
    amber60: colors.warning,
  }), [colors]);
  const bidStyles = useMemo(() => makeBidStyles(c), [c]);
  
  return (
    <View style={bidStyles.card}>
      {/* Header */}
      <TouchableOpacity 
        style={bidStyles.header}
        onPress={onViewTechnician}
        activeOpacity={onViewTechnician ? 0.7 : 1}
      >
        <View style={bidStyles.numberBadge}>
          <Text style={bidStyles.numberText}>{index + 1}</Text>
        </View>
        <View style={bidStyles.headerInfo}>
          <Text style={bidStyles.providerName}>{bid.technicianName}</Text>
          <View style={bidStyles.ratingRow}>
            <Text style={bidStyles.starIcon}>★</Text>
            <Text style={bidStyles.ratingText}>
              {bid.technician?.rating || 4.9} ({bid.technician?.reviewCount || 234})
            </Text>
            <View style={bidStyles.locationRow}>
              <Ionicons name="location" size={12} color={c.textSecondary} />
              <Text style={bidStyles.distanceText}>{bid.technician?.distance || '0.8 mi'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Divider */}
      <View style={bidStyles.divider} />
      
      {/* Stats Row */}
      <View style={bidStyles.statsRow}>
        <View style={bidStyles.statBox}>
          <Text style={bidStyles.statValue}>{bid.technician?.projectsCount || 156}</Text>
          <Text style={bidStyles.statLabel}>{t('Projects')}</Text>
        </View>
        <View style={bidStyles.statBox}>
          <Text style={bidStyles.statValue}>3 {t('weeks')}</Text>
          <Text style={bidStyles.statLabel}>{t('Duration')}</Text>
        </View>
        <View style={bidStyles.statBox}>
          <Text style={bidStyles.statValue}>{bid.technician?.responseTime || '2 hours'}</Text>
          <Text style={bidStyles.statLabel}>{t('Responses')}</Text>
        </View>
      </View>
      
      {/* Bid Amount */}
      <View style={bidStyles.amountRow}>
        <Text style={bidStyles.amountLabel}>{t('Bid Amount')}</Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <FormattedAmountWithRiyal amount={bid.proposedBudget} textStyle={bidStyles.amountValue} iconSize={16} />
        </View>
      </View>
      
      {/* Proposal */}
      <View style={bidStyles.proposalSection}>
        <Text style={bidStyles.proposalTitle}>{t('Proposal')}</Text>
        <Text style={bidStyles.proposalText}>
          {bid.comment || t('We specialize in kitchen renovations with 10+ years experience. Our team will deliver high-quality work with attention to detail.')}
        </Text>
      </View>
      
      {/* Action Buttons */}
      {bid.status === 'PENDING' && (
        <View style={bidStyles.actionRow}>
          <TouchableOpacity style={bidStyles.acceptButton} onPress={onAccept}>
            <Ionicons name="checkmark-circle" size={12} color={c.textWhite} />
            <Text style={bidStyles.acceptText}>{t('Accept')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={bidStyles.declineButton} onPress={onDecline}>
            <Ionicons name="close-circle" size={12} color={c.purple70} />
            <Text style={bidStyles.declineText}>{t('Decline')}</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Status badge for non-pending bids */}
      {bid.status !== 'PENDING' && (
        <View style={[
          bidStyles.statusBadge,
          { backgroundColor: bid.status === 'ACCEPTED' ? c.green10 : '#FEE2E2' }
        ]}>
          <Text style={[
            bidStyles.statusText,
            { color: bid.status === 'ACCEPTED' ? c.green80 : '#EF4444' }
          ]}>
            {bid.status}
          </Text>
        </View>
      )}
    </View>
  );
};

function makeVisitStyles(c: typeof COLORS) {
  return StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: c.primary10,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
    backgroundColor: c.bgWhite,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: c.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: { fontSize: 12, fontWeight: '400', color: c.primary80 },
  headerInfo: { flex: 1, gap: 6 },
  providerName: { fontSize: 16, fontWeight: '700', color: c.textHeader },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starIcon: { color: c.amber60, fontSize: 10 },
  ratingText: { fontSize: 10, fontWeight: '300', color: c.textSecondary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 6 },
  distanceText: { fontSize: 10, fontWeight: '300', color: c.textSecondary },
  divider: { height: 1, backgroundColor: c.textDividers, marginVertical: 16 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: c.primary10,
    borderWidth: 0.5,
    borderColor: c.primary50,
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  statValue: { fontSize: 12, fontWeight: '200', color: c.textBody },
  statLabel: { fontSize: 12, fontWeight: '400', color: c.textBody },
  visitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.primary10,
    borderWidth: 0.5,
    borderColor: c.primary80,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  visitBadgeText: { fontSize: 12, fontWeight: '400', color: c.primary80 },
  notesSection: { paddingVertical: 16, gap: 16 },
  notesTitle: { fontSize: 14, fontWeight: '400', color: c.textBody },
  notesText: { fontSize: 12, fontWeight: '400', color: c.textSecondary, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  bookButton: { backgroundColor: c.primary60 },
  bookText: { fontSize: 12, fontWeight: '400', color: c.textWhite },
  acceptButton: { backgroundColor: c.green60 },
  acceptText: { fontSize: 12, fontWeight: '400', color: c.textWhite },
  declineButton: { backgroundColor: c.purple10, borderWidth: 0.5, borderColor: c.purple70 },
  declineText: { fontSize: 12, fontWeight: '400', color: c.purple70 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  });
}

// ===== VISIT REQUEST CARD COMPONENT (USER VIEW) =====
function formatDate(dateString: string | undefined, t: (key: string) => string): string {
  if (!dateString) return t('Flexible');
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return t('Flexible');
    return date.toLocaleDateString();
  } catch {
    return t('Flexible');
  }
}

const VisitRequestCard = ({
  visitRequest,
  index,
  onAccept,
  onDecline,
  onViewTechnician,
  onBook,
}: {
  visitRequest: VisitRequest;
  index: number;
  onAccept: () => void;
  onDecline: () => void;
  onViewTechnician?: () => void;
  onBook?: () => void;
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const c = useMemo(() => ({
    ...COLORS,
    bgWhite: colors.cardBackground,
    textHeader: colors.text,
    textBody: colors.text,
    textSecondary: colors.textSecondary,
    textDividers: colors.border,
    primary10: colors.primary + '20',
    primary50: colors.primary,
    primary60: colors.primary,
    primary80: colors.primary,
    textWhite: colors.white,
    green10: colors.success + '20',
    green60: colors.success,
    green80: colors.success,
    purple10: colors.cardBackground,
    purple70: colors.primary,
    amber60: colors.warning,
  }), [colors]);
  const visitStyles = useMemo(() => makeVisitStyles(c), [c]);
  
  return (
    <View style={visitStyles.card}>
      {/* Header */}
      <TouchableOpacity 
        style={visitStyles.header}
        onPress={onViewTechnician}
        activeOpacity={onViewTechnician ? 0.7 : 1}
      >
        <View style={visitStyles.numberBadge}>
          <Text style={visitStyles.numberText}>{index + 1}</Text>
        </View>
        <View style={visitStyles.headerInfo}>
          <Text style={visitStyles.providerName}>{visitRequest.technicianName}</Text>
          <View style={visitStyles.ratingRow}>
            <Text style={visitStyles.starIcon}>★</Text>
            <Text style={visitStyles.ratingText}>
              {visitRequest.technician?.rating || 4.9} ({visitRequest.technician?.reviewCount || 234})
            </Text>
            <View style={visitStyles.locationRow}>
              <Ionicons name="location" size={12} color={c.textSecondary} />
              <Text style={visitStyles.distanceText}>{visitRequest.technician?.distance || '0.8 mi'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Divider */}
      <View style={visitStyles.divider} />
      
      {/* Stats Row */}
      <View style={visitStyles.statsRow}>
        <View style={visitStyles.statBox}>
          <Text style={visitStyles.statValue}>{visitRequest.technician?.projectsCount || 156}</Text>
          <Text style={visitStyles.statLabel}>{t('Projects')}</Text>
        </View>
        <View style={visitStyles.statBox}>
          <Text style={visitStyles.statValue}>{formatDate(visitRequest.requestedDate, t)}</Text>
          <Text style={visitStyles.statLabel}>{t('Requested Date')}</Text>
        </View>
        <View style={visitStyles.statBox}>
          <Text style={visitStyles.statValue}>{visitRequest.technician?.responseTime || '2 hours'}</Text>
          <Text style={visitStyles.statLabel}>{t('Responses')}</Text>
        </View>
      </View>
      
      {/* Visit Request Badge */}
      <View style={visitStyles.visitBadge}>
        <Ionicons name="calendar-outline" size={14} color={c.primary80} />
        <Text style={visitStyles.visitBadgeText}>{t('Visit Request')}</Text>
      </View>
      
      {/* Notes */}
      {visitRequest.notes && (
        <View style={visitStyles.notesSection}>
          <Text style={visitStyles.notesTitle}>{t('Notes')}</Text>
          <Text style={visitStyles.notesText}>{visitRequest.notes}</Text>
        </View>
      )}
      
      {/* Action Buttons */}
      {visitRequest.status === 'PENDING' && (
        <View style={visitStyles.actionRow}>
          <TouchableOpacity 
            style={[visitStyles.actionButton, visitStyles.bookButton]} 
            onPress={onBook}
          >
            <Ionicons name="calendar-outline" size={14} color={c.textWhite} />
            <Text style={visitStyles.bookText}>{t('Book')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[visitStyles.actionButton, visitStyles.acceptButton]} onPress={onAccept}>
            <Ionicons name="checkmark-circle" size={12} color={c.textWhite} />
            <Text style={visitStyles.acceptText}>{t('Accept')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[visitStyles.actionButton, visitStyles.declineButton]} onPress={onDecline}>
            <Ionicons name="close-circle" size={12} color={c.purple70} />
            <Text style={visitStyles.declineText}>{t('Decline')}</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Status badge for non-pending visits */}
      {visitRequest.status !== 'PENDING' && (
        <View style={[
          visitStyles.statusBadge,
          { backgroundColor: visitRequest.status === 'ACCEPTED' ? c.green10 : (colors.error + '20') }
        ]}>
          <Text style={[
            visitStyles.statusText,
            { color: visitRequest.status === 'ACCEPTED' ? c.green80 : colors.error }
          ]}>
            {visitRequest.status}
          </Text>
        </View>
      )}
    </View>
  );
};

// ===== PHASE CARD — same layout as PendingProjectScreen =====
const PhaseCard = ({
  phase,
  formatBudget,
}: {
  phase: Phase;
  formatBudget: (amount: number) => string;
}) => {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const riyalSource = theme === 'dark' ? SCREEN_RIYAL_DARK : SCREEN_RIYAL_LIGHT;

  const formatPhaseDuration = (days: number) => {
    if (days < 7) return `${days} ${t('day_unit') || 'days'}`;
    const w = Math.ceil(days / 7);
    return `${w} ${w === 1 ? t('Week') : t('weeks')}`;
  };

  const pcs = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.cardBackground,
          padding: 14,
          marginBottom: 12,
          gap: 10,
        },
        top: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        },
        badge: {
          minWidth: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: colors.primary + '18',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8,
        },
        badgeText: {
          fontSize: 13,
          fontWeight: '800',
          color: colors.primary,
        },
        title: {
          flex: 1,
          fontSize: 14,
          fontWeight: '600',
          color: colors.text,
          lineHeight: 19,
        },
        desc: {
          fontSize: 12,
          lineHeight: 18,
          color: colors.textSecondary,
        },
        bottom: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 10,
          marginTop: 2,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        durationRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          flex: 1,
          marginRight: 8,
        },
        durationText: {
          fontSize: 12,
          color: colors.textSecondary,
          fontWeight: '500',
          flexShrink: 1,
        },
        priceRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        priceText: {
          fontSize: 14,
          fontWeight: '700',
          color: colors.text,
        },
        riyal: { width: 20, height: 18 },
      }),
    [colors]
  );

  return (
    <View style={pcs.wrap}>
      <View style={pcs.top}>
        <View style={pcs.badge}>
          <Text style={pcs.badgeText}>{phase.phaseNumber}</Text>
        </View>
        <Text style={pcs.title} numberOfLines={2}>
          {generatePhaseTitle(phase, t)}
        </Text>
      </View>
      {phase.description?.trim() ? (
        <Text style={pcs.desc} numberOfLines={4}>
          {phase.description}
        </Text>
      ) : null}
      <View style={pcs.bottom}>
        <View style={pcs.durationRow}>
          <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
          <Text style={pcs.durationText} numberOfLines={1}>
            {formatPhaseDuration(phase.timeSpentDays)}
          </Text>
        </View>
        <View style={pcs.priceRow}>
          <Text style={pcs.priceText}>{formatBudget(phase.moneySpent)}</Text>
          <ExpoImage source={riyalSource} style={pcs.riyal} contentFit="contain" />
        </View>
      </View>
    </View>
  );
};

function makeMyBidStyles(c: typeof COLORS) {
  return StyleSheet.create({
  card: {
    backgroundColor: c.green10,
    borderWidth: 0.5,
    borderColor: c.green60,
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: c.green60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '600', color: c.textBody },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailColumn: { gap: 4 },
  detailLabel: { fontSize: 12, fontWeight: '500', color: c.textSecondary },
  detailValue: { fontSize: 12, fontWeight: '600', color: c.green60 },
  descriptionSection: { gap: 4 },
  descriptionLabel: { fontSize: 12, fontWeight: '600', color: c.textBody },
  descriptionText: { fontSize: 12, fontWeight: '400', color: c.textBody, lineHeight: 18 },
  divider: { height: 1, backgroundColor: c.green80, opacity: 0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12, fontWeight: '600', color: c.amber70 },
  viewButton: {
    backgroundColor: c.green80,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: { fontSize: 16, fontWeight: '400', color: c.textWhite, textAlign: 'center' },
  withdrawButton: {
    backgroundColor: c.purple10,
    borderWidth: 1,
    borderColor: c.purple60,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawButtonText: { fontSize: 16, fontWeight: '400', color: c.purple70, textAlign: 'center' },
  });
}

// ===== MY BID CARD COMPONENT (TECHNICIAN VIEW) =====
const MyBidCard = ({
  bid,
  onViewBid,
  onWithdrawBid,
}: {
  bid: Bid;
  onViewBid: () => void;
  onWithdrawBid: () => void;
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const c = useMemo(() => ({
    ...COLORS,
    textBody: colors.text,
    textSecondary: colors.textSecondary,
    textWhite: colors.white,
    green10: colors.success + '20',
    green60: colors.success,
    green80: colors.success,
    purple10: colors.cardBackground,
    purple60: colors.primary,
    purple70: colors.primary,
    amber70: colors.warning,
  }), [colors]);
  const myBidStyles = useMemo(() => makeMyBidStyles(c), [c]);
  
  return (
    <View style={myBidStyles.card}>
      {/* Header */}
      <View style={myBidStyles.header}>
        <View style={myBidStyles.headerLeft}>
          <View style={myBidStyles.iconBadge}>
            <Ionicons name="checkmark-circle" size={12} color={c.textWhite} />
          </View>
          <Text style={myBidStyles.title}>{t('My Bid')}</Text>
        </View>
      </View>
      
      {/* Bid Details Row */}
      <View style={myBidStyles.detailsRow}>
        <View style={myBidStyles.detailColumn}>
          <Text style={myBidStyles.detailLabel}>{t('Bid')} #</Text>
          <Text style={myBidStyles.detailValue}>{bid.id}</Text>
        </View>
        <View style={[myBidStyles.detailColumn, { alignItems: 'flex-end' }]}>
          <Text style={myBidStyles.detailLabel}>{t('Price')}</Text>
          <FormattedAmountWithRiyal
            amount={bid.proposedBudget}
            textStyle={[myBidStyles.detailValue, { color: c.green60 }]}
            iconSize={14}
          />
        </View>
      </View>
      
      {/* Description */}
      {bid.comment && (
        <View style={myBidStyles.descriptionSection}>
          <Text style={myBidStyles.descriptionLabel}>{t('Description')}</Text>
          <Text style={myBidStyles.descriptionText}>{bid.comment}</Text>
        </View>
      )}
      
      {/* Divider */}
      <View style={myBidStyles.divider} />
      
      {/* Status */}
      <View style={myBidStyles.statusRow}>
        <Ionicons name="time-outline" size={12} color={c.amber70} />
        <Text style={myBidStyles.statusText}>{t('Pending approval')}</Text>
      </View>
      
      {/* Divider */}
      <View style={myBidStyles.divider} />
      
      {/* Action Buttons */}
      <TouchableOpacity style={myBidStyles.viewButton} onPress={onViewBid}>
        <Text style={myBidStyles.viewButtonText}>{t('View My Bid')}</Text>
      </TouchableOpacity>
      
      {bid.status === 'PENDING' && (
        <TouchableOpacity style={myBidStyles.withdrawButton} onPress={onWithdrawBid}>
          <Text style={myBidStyles.withdrawButtonText}>{t('Withdraw Bid')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ===== MAIN COMPONENT =====
export default function BidReceivedProjectScreen({
  project,
  onBack,
  onAcceptBid,
  onDeclineBid,
  onOpenChat,
  onViewTechnician,
  onSuccess,
  isTechnician: propIsTechnician,
}: BidReceivedProjectScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const c = useMemo(() => ({
    ...COLORS,
    bgWhite: colors.cardBackground,
    textHeader: colors.text,
    textBody: colors.text,
    textSecondary: colors.textSecondary,
    textDividers: colors.border,
    primary10: colors.primary + '20',
    primary60: colors.primary,
    primary70: colors.primary,
    primary80: colors.primary,
    primary100: colors.primary,
    textWhite: colors.white,
    green10: colors.success + '20',
    green60: colors.success,
    green80: colors.success,
    green90: colors.success,
    purple10: colors.cardBackground,
    purple100: colors.text,
    purple70: colors.primary,
    purple60: colors.primary,
    amber60: colors.warning,
    amber70: colors.warning,
  }), [colors]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const styles = useMemo(() => makeMainStyles(c), [c]);
  const modalStyles = useMemo(() => makeModalStyles(c), [c]);
  // Use theme-aware palette in JSX: use c. instead of COLORS. for container and inline colors
  const [phases, setPhases] = useState<Phase[]>([]);
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [isMyBidModalVisible, setIsMyBidModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTechnician, setIsTechnician] = useState(propIsTechnician ?? false);
  const [selectedTab, setSelectedTab] = useState<UserTab>('bids');
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedVisitRequest, setSelectedVisitRequest] = useState<VisitRequest | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();
  
  const serviceName = i18n.language === 'ar' ? project?.serviceNameAr : project?.serviceNameEn;

  useEffect(() => {
    loadData();
  }, [project]);

  const loadData = async () => {
    if (!project?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Check user role
      const role = await storage.getUserRole();
      const isTech = role?.toUpperCase() === 'TECHNICIAN';
      setIsTechnician(propIsTechnician ?? isTech);
      
      // Load bids
      await loadBids(isTech);
      
      // Load visit requests for user view
      if (!isTech) {
        await loadVisitRequests();
      }
      
      // Load phases (shown in project details for both personas)
      await loadPhases();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBids = async (isTech?: boolean) => {
    if (!project?.id) return;
    
    try {
      const token = await storage.getAuthToken();
      const userId = await storage.getUserId();
      const url = buildApiUrlWithParams(API_ENDPOINTS.BIDS.LIST, { projectId: project.id });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBids(data);
        
        // If technician, find their bid
        if (isTech && userId) {
          const uid = Number(userId);
          const matchBidToUser = (bid: any): boolean => {
            const candidates = [
              bid?.technicianId,
              bid?.technician_id,
              bid?.technician?.id,
              bid?.technician?.userId,
              bid?.technician?.user_id,
              bid?.userId,
              bid?.user_id,
            ];
            return candidates.some((v) => Number(v) === uid);
          };

          let techBid = (Array.isArray(data) ? data : []).find(matchBidToUser) as Bid | undefined;

          // Fallback: some backends do not include technician's own bid in the public project bids list.
          if (!techBid) {
            try {
              const myUrl = buildApiUrl(API_ENDPOINTS.BIDS.MY_BIDS);
              const myRes = await fetch(myUrl, {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              if (myRes.ok) {
                const myData = await myRes.json();
                const myList = Array.isArray(myData) ? myData : (myData?.bids ?? myData?.data ?? []);
                techBid = (Array.isArray(myList) ? myList : []).find((b: any) => {
                  const pid = Number(b?.projectId ?? b?.project_id ?? b?.project?.id);
                  return pid === Number(project.id);
                }) as Bid | undefined;
              }
            } catch (e) {
              // ignore fallback errors; we'll just show "no bid" state
            }
          }

          setMyBid(techBid || null);
        }
      }
    } catch (error) {
      console.error('Error loading bids:', error);
    }
  };

  const loadPhases = async () => {
    if (!project?.id) return;

    try {
      const token = await storage.getAuthToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      } as const;

      const fetchList = async (url: string): Promise<Phase[]> => {
        const response = await fetch(url, { method: 'GET', headers });
        if (!response.ok) return [];
        const data = await response.json();
        return sortPhasesByNumber(normalizePhasesPayload(data));
      };

      let list = await fetchList(
        buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, { projectId: project.id }),
      );
      if (list.length === 0) {
        list = await fetchList(
          buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.PROJECT_PHASES, { id: project.id }),
        );
      }
      setPhases(list);
    } catch (error) {
      console.error('Error loading phases:', error);
    }
  };

  const loadVisitRequests = async () => {
    if (!project?.id) return;
    
    try {
      const token = await storage.getAuthToken();
      const url = buildApiUrl(API_ENDPOINTS.VISIT_REQUESTS.LIST.replace(':projectId', project.id.toString()));
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setVisitRequests(data);
      }
    } catch (error) {
      console.error('Error loading visit requests:', error);
    }
  };

  const handleAcceptVisitRequest = async (visitRequestId: number) => {
    showConfirmation(
      t('Accept Visit Request'),
      t('Are you sure you want to accept this visit request?'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          const url = buildApiUrlWithParams(API_ENDPOINTS.VISIT_REQUESTS.ACCEPT, { id: visitRequestId });

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            showSuccess(t('Visit request accepted'), t('Success'));
            loadVisitRequests();
            onSuccess?.();
          } else {
            const errorData = await response.json().catch(() => ({}));
            showError(errorData.message || t('Failed to accept visit request'), t('Error'));
          }
        } catch (error) {
          console.error('Error accepting visit request:', error);
          showError(t('Failed to accept visit request'), t('Error'));
        }
      }
    );
  };

  const handleDeclineVisitRequest = async (visitRequestId: number, rejectionReason?: string) => {
    showConfirmation(
      t('Reject Visit Request'),
      t('Are you sure you want to reject this visit request?'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          const url = buildApiUrlWithParams(API_ENDPOINTS.VISIT_REQUESTS.REJECT, { id: visitRequestId });

          const requestBody: Record<string, string> = {};
          if (rejectionReason) {
            requestBody.rejectionReason = rejectionReason;
          }

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
          });

          if (response.ok) {
            showSuccess(t('Visit request rejected'), t('Success'));
            loadVisitRequests();
            onSuccess?.();
          } else {
            const errorData = await response.json().catch(() => ({}));
            showError(errorData.message || t('Failed to reject visit request'), t('Error'));
          }
        } catch (error) {
          console.error('Error rejecting visit request:', error);
          showError(t('Failed to reject visit request'), t('Error'));
        }
      },
      {
        confirmText: t('Reject'),
        confirmStyle: 'destructive',
      }
    );
  };

  /** Plain number only (riyal glyph shown separately, same as PendingProjectScreen). */
  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const displayPhases = useMemo(() => {
    const fromFetch = sortPhasesByNumber(normalizePhasesPayload(phases));
    if (fromFetch.length > 0) return fromFetch;
    return sortPhasesByNumber(normalizePhasesPayload(project?.phases));
  }, [phases, project?.phases, project?.id]);

  const formatDuration = () => {
    const weeks = Math.ceil((project?.timeRequiredDays || 21) / 7);
    return `${weeks}-${weeks + 1} ${t('weeks')}`;
  };

  const handleAcceptBid = async (bidId: number) => {
    if (onAcceptBid) {
      onAcceptBid(bidId);
    } else {
      try {
        const token = await storage.getAuthToken();
        const url = buildApiUrl(API_ENDPOINTS.BIDS.ACCEPT.replace(':id', bidId.toString()));
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          showSuccess(t('Bid accepted successfully'), t('Success'));
          loadBids(isTechnician);
          onSuccess?.();
        } else {
          showError(t('Failed to accept bid'), t('Error'));
        }
      } catch (error) {
        console.error('Error accepting bid:', error);
        showError(t('Failed to accept bid'), t('Error'));
      }
    }
  };

  const handleDeclineBid = async (bidId: number) => {
    if (onDeclineBid) {
      onDeclineBid(bidId);
    } else {
      showConfirmation(
        t('Decline Bid'),
        t('Are you sure you want to decline this bid?'),
        async () => {
          try {
            const token = await storage.getAuthToken();
            const url = buildApiUrl(API_ENDPOINTS.BIDS.DELETE.replace(':id', bidId.toString()));
            
            const response = await fetch(url, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              showSuccess(t('Bid declined'), t('Success'));
              loadBids(isTechnician);
            }
          } catch (error) {
            console.error('Error declining bid:', error);
          }
        },
        {
          confirmText: t('Decline'),
          confirmStyle: 'destructive',
        }
      );
    }
  };

  const handleWithdrawBid = async () => {
    if (!myBid) return;

    showConfirmation(
      t('Withdraw Bid'),
      t('Are you sure you want to withdraw your bid? This action cannot be undone.'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          const url = buildApiUrl(API_ENDPOINTS.BIDS.DELETE.replace(':id', myBid.id.toString()));
          
          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            showSuccess(t('Bid withdrawn successfully'), t('Success'));
            setMyBid(null);
            loadBids(true);
            onSuccess?.();
          } else {
            showError(t('Failed to withdraw bid'), t('Error'));
          }
        } catch (error) {
          console.error('Error withdrawing bid:', error);
          showError(t('Failed to withdraw bid'), t('Error'));
        }
      },
      {
        confirmText: t('Withdraw'),
        confirmStyle: 'destructive',
      }
    );
  };

  const handleViewMyBid = () => {
    if (!myBid) return;
    setIsMyBidModalVisible(true);
  };

  const closeMyBidModal = () => setIsMyBidModalVisible(false);

  // ===== USER VIEW =====
  const renderUserView = () => (
    <>
      {/* Project Overview + Details (User POV) */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeaderTitle, { fontSize: scaledSize(16) }]}>{t('Project Overview')}</Text>
        <View style={[styles.requestIdCreatedRow, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.requestIdText, { color: c.textSecondary }]}>#{project.id}</Text>
          {project.createdAt ? (
            <Text style={[styles.createdText, { color: c.textSecondary }]}>
              {t('Created')}: {formatDate(project.createdAt, t)}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.sectionDescription, { fontSize: scaledSize(14) }]}>
          {t('Review your project details below. Once submitted, service providers will start sending bids.')}
        </Text>
        
        {/* Budget and Duration Cards */}
        <View style={[styles.statsRow, IS_LARGE_WEB && styles.statsRowLargeWeb]}>
          <View style={[styles.statCard, styles.budgetCard, IS_LARGE_WEB && styles.statCardLargeWeb]}>
            <View style={[styles.statHeader, IS_LARGE_WEB && styles.statHeaderLargeWeb]}>
              <Ionicons name="cash-outline" size={IS_LARGE_WEB ? 20 : 12} color={c.primary80} />
              <Text style={[styles.statTitle, IS_LARGE_WEB && styles.statTitleLargeWeb]}>
                {t('Total Budget')}
              </Text>
            </View>
            <FormattedAmountWithRiyal
              amount={project.budget}
              textStyle={[styles.statValueText, IS_LARGE_WEB && styles.statValueTextLargeWeb]}
              iconSize={IS_LARGE_WEB ? 20 : 16}
            />
          </View>
          <View style={[styles.statCard, styles.durationCard, IS_LARGE_WEB && styles.statCardLargeWeb]}>
            <View style={[styles.statHeader, IS_LARGE_WEB && styles.statHeaderLargeWeb]}>
              <Ionicons name="time-outline" size={IS_LARGE_WEB ? 20 : 12} color={c.green90} />
              <Text style={[styles.statTitle, { color: c.green90 }, IS_LARGE_WEB && styles.statTitleLargeWeb]}>
                {t('Duration')}
              </Text>
            </View>
            <Text style={[styles.statValueText, IS_LARGE_WEB && styles.statValueTextLargeWeb]}>
              {formatDuration()}
            </Text>
          </View>
        </View>
      </View>

      {/* Description Section */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, IS_LARGE_WEB && styles.sectionHeaderLargeWeb]}>
          <Ionicons name="document-text-outline" size={IS_LARGE_WEB ? 24 : 12} color={c.primary80} />
          <Text style={[styles.sectionLabel, IS_LARGE_WEB && styles.sectionLabelLargeWeb]}>
            {t('Description')}
          </Text>
        </View>
        <View style={[styles.descriptionBox, IS_LARGE_WEB && styles.descriptionBoxLargeWeb]}>
          <Text style={[styles.descriptionText, IS_LARGE_WEB && styles.descriptionTextLargeWeb]}>
            {project.description}
          </Text>
        </View>
      </View>

      {/* Address Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location-outline" size={12} color={c.primary80} />
          <Text style={styles.sectionLabel}>{t('Project Address')}</Text>
        </View>
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>
            {project.address || t('No address specified')}
          </Text>
        </View>
      </View>

      {/* Requirements Section */}
      {project.requirements && project.requirements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={12} color={c.primary80} />
            <Text style={styles.sectionLabel}>{t('Requirements')}</Text>
          </View>
          <View style={styles.descriptionBox}>
            {project.requirements.map((req, index) => (
              <View key={index} style={styles.requirementItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Work Phases Section */}
      {displayPhases.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, IS_LARGE_WEB && styles.sectionHeaderLargeWeb]}>
            <Ionicons name="layers-outline" size={IS_LARGE_WEB ? 22 : 12} color={c.primary80} />
            <Text style={[styles.sectionLabel, IS_LARGE_WEB && styles.sectionLabelLargeWeb]}>{t('Work Phases')}</Text>
          </View>
          {displayPhases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              formatBudget={formatBudget}
            />
          ))}
        </View>
      )}

      <View style={styles.sectionDivider} />

      {/* Summary Badges Row */}
      <View style={styles.badgesRow}>
        <View style={styles.bidsCountBadge}>
          <Text style={styles.bidsCountText}>
            {bids.length} {t('Bids Received')}
          </Text>
        </View>
        {visitRequests.length > 0 && (
          <View style={styles.visitsCountBadge}>
            <Text style={styles.visitsCountText}>
              {visitRequests.length} {t('Visit Requests')}
            </Text>
          </View>
        )}
      </View>
      
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'bids' && styles.tabActive,
          ]}
          onPress={() => setSelectedTab('bids')}
        >
          <Ionicons 
            name="cash-outline" 
            size={16} 
            color={selectedTab === 'bids' ? c.primary60 : c.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            selectedTab === 'bids' && styles.tabTextActive,
          ]}>
            {t('Bids')} ({bids.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'visits' && styles.tabActive,
          ]}
          onPress={() => setSelectedTab('visits')}
        >
          <Ionicons 
            name="calendar-outline" 
            size={16} 
            color={selectedTab === 'visits' ? c.primary60 : c.textSecondary} 
          />
          <Text style={[
            styles.tabText,
            selectedTab === 'visits' && styles.tabTextActive,
          ]}>
            {t('Visit Requests')} ({visitRequests.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Section Header */}
      <View style={styles.section}>
        <Text style={styles.sectionHeaderTitle}>
          {selectedTab === 'bids' ? t('Review Bids') : t('Review Visit Requests')}
        </Text>
        <Text style={styles.sectionDescription}>
          {selectedTab === 'bids' 
            ? t('Compare proposals from qualified service providers and select the best fit for your project.')
            : t('Review visit requests from technicians who want to assess your project before submitting a bid.')
          }
        </Text>
      </View>
      
      {/* Content based on selected tab */}
      {selectedTab === 'bids' ? (
        <>
          {/* Bids List */}
          {bids.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={48} color={c.textDividers} />
              <Text style={styles.emptyText}>{t('No bids yet')}</Text>
              <Text style={styles.emptySubtext}>
                {t('Service providers will start sending bids soon')}
              </Text>
            </View>
          ) : (
            bids.map((bid, index) => (
              <BidCard
                key={bid.id}
                bid={bid}
                index={index}
                onAccept={() => handleAcceptBid(bid.id)}
                onDecline={() => handleDeclineBid(bid.id)}
                onViewTechnician={() => onViewTechnician?.(bid.technicianId)}
              />
            ))
          )}
        </>
      ) : (
        <>
          {/* Visit Requests List */}
          {visitRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={c.textDividers} />
              <Text style={styles.emptyText}>{t('No visit requests yet')}</Text>
              <Text style={styles.emptySubtext}>
                {t('Technicians can request to visit your property before submitting a bid')}
              </Text>
            </View>
          ) : (
            visitRequests.map((visitRequest, index) => (
              <VisitRequestCard
                key={visitRequest.id}
                visitRequest={visitRequest}
                index={index}
                onAccept={() => handleAcceptVisitRequest(visitRequest.id)}
                onDecline={() => handleDeclineVisitRequest(visitRequest.id)}
                onViewTechnician={() => onViewTechnician?.(visitRequest.technicianId)}
                onBook={() => {
                  setSelectedVisitRequest(visitRequest);
                  setBookingModalVisible(true);
                }}
              />
            ))
          )}
        </>
      )}
    </>
  );

  // ===== TECHNICIAN VIEW =====
  const renderTechnicianView = () => (
    <>
      {/* Project Overview Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeaderTitle, { fontSize: scaledSize(16) }]}>{t('Project Overview')}</Text>
        <View style={[styles.requestIdCreatedRow, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.requestIdText, { color: c.textSecondary }]}>#{project.id}</Text>
          {project.createdAt ? (
            <Text style={[styles.createdText, { color: c.textSecondary }]}>
              {t('Created')}: {formatDate(project.createdAt, t)}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.sectionDescription, { fontSize: scaledSize(14) }]}>
          {t('Review your project details below. Once submitted, service providers will start sending bids.')}
        </Text>
        
        {/* Budget and Duration Cards */}
        <View style={[styles.statsRow, IS_LARGE_WEB && styles.statsRowLargeWeb]}>
          <View style={[styles.statCard, styles.budgetCard, IS_LARGE_WEB && styles.statCardLargeWeb]}>
            <View style={[styles.statHeader, IS_LARGE_WEB && styles.statHeaderLargeWeb]}>
              <Ionicons name="cash-outline" size={IS_LARGE_WEB ? 20 : 12} color={c.primary80} />
              <Text style={[styles.statTitle, IS_LARGE_WEB && styles.statTitleLargeWeb]}>
                {t('Total Budget')}
              </Text>
            </View>
            <FormattedAmountWithRiyal
              amount={project.budget}
              textStyle={[styles.statValueText, IS_LARGE_WEB && styles.statValueTextLargeWeb]}
              iconSize={IS_LARGE_WEB ? 20 : 16}
            />
          </View>
          <View style={[styles.statCard, styles.durationCard, IS_LARGE_WEB && styles.statCardLargeWeb]}>
            <View style={[styles.statHeader, IS_LARGE_WEB && styles.statHeaderLargeWeb]}>
              <Ionicons name="time-outline" size={IS_LARGE_WEB ? 20 : 12} color={c.green90} />
              <Text style={[styles.statTitle, { color: c.green90 }, IS_LARGE_WEB && styles.statTitleLargeWeb]}>
                {t('Duration')}
              </Text>
            </View>
            <Text style={[styles.statValueText, IS_LARGE_WEB && styles.statValueTextLargeWeb]}>
              {formatDuration()}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Description Section */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, IS_LARGE_WEB && styles.sectionHeaderLargeWeb]}>
          <Ionicons name="document-text-outline" size={IS_LARGE_WEB ? 24 : 12} color={c.primary80} />
          <Text style={[styles.sectionLabel, IS_LARGE_WEB && styles.sectionLabelLargeWeb]}>
            {t('Description')}
          </Text>
        </View>
        <View style={[styles.descriptionBox, IS_LARGE_WEB && styles.descriptionBoxLargeWeb]}>
          <Text style={[styles.descriptionText, IS_LARGE_WEB && styles.descriptionTextLargeWeb]}>
            {project.description}
          </Text>
        </View>
      </View>
      
      {/* Requirements Section */}
      {project.requirements && project.requirements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={12} color={c.primary80} />
            <Text style={styles.sectionLabel}>{t('Requirements')}</Text>
          </View>
          <View style={styles.descriptionBox}>
            {project.requirements.map((req, index) => (
              <View key={index} style={styles.requirementItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {/* Work Phases Section */}
      {displayPhases.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, IS_LARGE_WEB && styles.sectionHeaderLargeWeb]}>
            <Ionicons name="layers-outline" size={IS_LARGE_WEB ? 22 : 12} color={c.primary80} />
            <Text style={[styles.sectionLabel, IS_LARGE_WEB && styles.sectionLabelLargeWeb]}>{t('Work Phases')}</Text>
          </View>
          {displayPhases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              formatBudget={formatBudget}
            />
          ))}
        </View>
      )}
      
      {/* Divider */}
      <View style={styles.sectionDivider} />
      
      {/* My Bid Section */}
      {myBid ? (
        <MyBidCard
          bid={myBid}
          onViewBid={handleViewMyBid}
          onWithdrawBid={handleWithdrawBid}
        />
      ) : (
        <View style={styles.noBidContainer}>
          <Ionicons name="hand-left-outline" size={48} color={c.textDividers} />
          <Text style={styles.noBidText}>{t('You have not placed a bid yet')}</Text>
          <Text style={styles.noBidSubtext}>
            {t('Submit a bid to start working on this project')}
          </Text>
        </View>
      )}
    </>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bgWhite, paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.primary60} />
          <Text style={[styles.loadingText, { fontSize: scaledSize(14) }]}>{t('Loading...')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bgWhite, paddingTop: IS_LARGE_WEB ? 0 : insets.top }]}>
      {/* Header - Hidden on large web */}
      {!IS_LARGE_WEB && (
      <View style={[styles.header, styles.headerLTR]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={c.textHeader} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { fontSize: scaledSize(16) }]}>
              {serviceName || t('Project')}
            </Text>
            <Text style={[styles.headerSubtitle, { fontSize: scaledSize(10) }]}>
              {t('Bid Received')}
            </Text>
        </View>
      </View>
      )}
      
      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          IS_LARGE_WEB && styles.webContentFullWidth,
        ]}
      >
        {/* Title Section - Large Web */}
        {IS_LARGE_WEB && (
          <View style={styles.titleSectionLargeWeb}>
            <TouchableOpacity onPress={onBack} style={styles.titleBackButton}>
              <Ionicons name="chevron-back" size={24} color={c.textHeader} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.titleMainText, { fontSize: scaledSize(42) }]}>
                {serviceName || t('Project')}
              </Text>
              <Text style={[styles.titleSubtext, { fontSize: scaledSize(20) }]}>
                {t('Bid Received')}
              </Text>
            </View>
          </View>
        )}
        
        {/* Status Stepper */}
        <View style={[styles.stepperContainer, IS_LARGE_WEB && styles.stepperContainerLargeWeb]}>
          <ProjectCreationFlow currentStep="BID_RECEIVED" />
        </View>
        
        {/* Divider */}
        <View style={[styles.divider, IS_LARGE_WEB && styles.dividerLargeWeb]} />
        {isTechnician ? renderTechnicianView() : renderUserView()}
        
        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* View My Bid Modal (Technician) - unified bottom sheet */}
      <AppBottomSheetModal
        visible={isMyBidModalVisible}
        onClose={closeMyBidModal}
        title={t('My Bid')}
      >
        <View style={modalStyles.row}>
          <Text style={modalStyles.label}>{t('Bid')} #</Text>
          <Text style={modalStyles.value}>{myBid?.id ?? '-'}</Text>
        </View>
        <View style={modalStyles.row}>
          <Text style={modalStyles.label}>{t('Bid Amount')}</Text>
          {myBid ? (
            <FormattedAmountWithRiyal amount={myBid.proposedBudget} textStyle={modalStyles.value} iconSize={18} />
          ) : (
            <Text style={modalStyles.value}>-</Text>
          )}
        </View>
        <View style={modalStyles.row}>
          <Text style={modalStyles.label}>{t('Status')}</Text>
          <View
            style={[
              modalStyles.statusPill,
              {
                backgroundColor:
                  myBid?.status === 'PENDING'
                    ? 'rgba(218, 156, 2, 0.12)'
                    : myBid?.status === 'ACCEPTED'
                      ? 'rgba(0, 172, 79, 0.12)'
                      : 'rgba(239, 68, 68, 0.12)',
              },
            ]}
          >
            <Text
              style={[
                modalStyles.statusText,
                {
                  color:
                    myBid?.status === 'PENDING'
                      ? c.amber70
                      : myBid?.status === 'ACCEPTED'
                        ? c.green80
                        : '#EF4444',
                },
              ]}
            >
              {myBid?.status === 'PENDING' ? t('Pending approval') : (myBid?.status || '-')}
            </Text>
          </View>
        </View>
        <View style={modalStyles.section}>
          <Text style={modalStyles.sectionTitle}>{t('Description')}</Text>
          <Text style={modalStyles.sectionBody}>
            {myBid?.comment || t('No description provided')}
          </Text>
        </View>
        <TouchableOpacity style={modalStyles.primaryButton} onPress={closeMyBidModal}>
          <Text style={modalStyles.primaryButtonText}>{t('OK')}</Text>
        </TouchableOpacity>
      </AppBottomSheetModal>
      
      {/* Book Appointment Modal */}
      {selectedVisitRequest && (
        <BookAppointmentModal
          visible={bookingModalVisible}
          technicianId={selectedVisitRequest.technicianId}
          technicianName={selectedVisitRequest.technicianName}
          projectId={project.id}
          onClose={() => {
            setBookingModalVisible(false);
            setSelectedVisitRequest(null);
          }}
          onSuccess={() => {
            loadVisitRequests();
            onSuccess?.();
          }}
        />
      )}
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      
      {/* Confirmation Popup */}
      <ConfirmationPopup
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmStyle={confirmState.confirmStyle}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirmation}
      />
    </View>
  );
}

function makeModalStyles(c: typeof COLORS) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      padding: 16,
    },
    backdropPressable: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      backgroundColor: c.bgWhite,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.primary10,
    },
    cardWeb: {
      maxWidth: 520,
      width: '100%',
      alignSelf: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textHeader,
    },
    closeButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: c.primary10,
    },
    divider: {
      height: 1,
      backgroundColor: c.textDividers,
      marginVertical: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 12,
    },
    label: {
      fontSize: 12,
      fontWeight: '400',
      color: c.textSecondary,
    },
    value: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textBody,
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.06)',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    section: {
      marginTop: 6,
      marginBottom: 16,
      gap: 6,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textBody,
    },
    sectionBody: {
      fontSize: 12,
      fontWeight: '400',
      color: c.textBody,
      lineHeight: 18,
    },
    primaryButton: {
      backgroundColor: c.primary60,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textWhite,
    },
  });
}

function makeMainStyles(c: typeof COLORS) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 24,
    },
    headerLTR: {
      direction: 'ltr',
    },
    headerLargeWeb: {
      paddingHorizontal: 48,
      paddingVertical: 32,
      gap: 56,
    },
    backButton: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backButtonLargeWeb: {
      width: 40,
      height: 40,
    },
    headerTitleContainer: {
      flex: 1,
      gap: 6,
    },
    headerTitleContainerLargeWeb: {
      gap: 8,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textHeader,
    },
    headerTitleLargeWeb: {
      fontSize: 34,
      fontWeight: '400',
    },
    headerSubtitle: {
      fontSize: 10,
      fontWeight: '300',
      color: c.textSecondary,
    },
    headerSubtitleLargeWeb: {
      fontSize: 16,
    },
    stepperContainer: {
      paddingHorizontal: 16,
    },
    stepperContainerLargeWeb: {
      paddingHorizontal: 48,
      paddingTop: 8,
      paddingBottom: 16,
    },
    divider: {
      height: 1,
      backgroundColor: c.textDividers,
      marginHorizontal: 16,
      marginTop: 8,
    },
    dividerLargeWeb: {
      marginHorizontal: 0,
      marginTop: 0,
      marginBottom: 24,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
    },
    webContent: {
      maxWidth: 1344,
      alignSelf: 'center',
      width: '100%',
      paddingHorizontal: 48,
      paddingVertical: 16,
    },
    webContentFullWidth: {
      width: '100%',
      paddingHorizontal: 48,
      paddingVertical: 16,
    },
    section: {
      marginBottom: 16,
    },
    sectionHeaderTitle: {
      fontSize: 16,
      fontWeight: '400',
      color: c.textHeader,
      marginBottom: 12,
    },
    requestIdCreatedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    requestIdText: {
      fontSize: 12,
      fontWeight: '500',
    },
    createdText: {
      fontSize: 12,
      fontWeight: '400',
    },
    sectionDescription: {
      fontSize: 14,
      fontWeight: '300',
      color: c.textBody,
      lineHeight: 21,
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 10,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '400',
      color: c.primary80,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: c.textDividers,
      marginVertical: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 16,
    },
    statsRowLargeWeb: {
      gap: 32,
    },
    statCard: {
      flex: 1,
      borderWidth: 0.5,
      borderRadius: 8,
      padding: 16,
      gap: 6,
    },
    statCardLargeWeb: {
      padding: 32,
      gap: 8,
      minHeight: 79,
    },
    budgetCard: {
      backgroundColor: c.primary10,
      borderColor: c.textHeader,
    },
    durationCard: {
      backgroundColor: c.green10,
      borderColor: c.green80,
    },
    statHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statHeaderLargeWeb: {
      gap: 6,
      marginBottom: 8,
    },
    statTitle: {
      fontSize: 12,
      fontWeight: '400',
      color: c.primary80,
    },
    statTitleLargeWeb: {
      fontSize: 16,
    },
    statValueText: {
      fontSize: 12,
      fontWeight: '400',
      color: c.textSecondary,
    },
    statValueTextLargeWeb: {
      fontSize: 14,
    },
    descriptionBox: {
      borderWidth: 0.5,
      borderColor: c.textDividers,
      borderRadius: 6,
      padding: 16,
    },
    descriptionBoxLargeWeb: {
      padding: 32,
      minHeight: 98,
    },
    sectionHeaderLargeWeb: {
      gap: 16,
      marginBottom: 32,
    },
    sectionLabelLargeWeb: {
      fontSize: 16,
    },
    descriptionTextLargeWeb: {
      fontSize: 14,
      lineHeight: 21,
    },
    descriptionText: {
      fontSize: 12,
      fontWeight: '400',
      color: c.textBody,
      lineHeight: 18,
    },
    requirementItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 4,
    },
    bulletPoint: {
      fontSize: 12,
      color: c.textBody,
    },
    requirementText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '400',
      color: c.textBody,
      lineHeight: 18,
    },
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    bidsCountBadge: {
      backgroundColor: c.green10,
      borderWidth: 0.5,
      borderColor: c.green80,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    bidsCountText: {
      fontSize: 12,
      fontWeight: '400',
      color: c.green90,
    },
    visitsCountBadge: {
      backgroundColor: c.primary10,
      borderWidth: 0.5,
      borderColor: c.primary60,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    visitsCountText: {
      fontSize: 12,
      fontWeight: '400',
      color: c.primary80,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: c.primary10,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    tabActive: {
      backgroundColor: c.bgWhite,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '500',
      color: c.textSecondary,
    },
    tabTextActive: {
      color: c.primary60,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: c.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 40,
      gap: 12,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textBody,
    },
    emptySubtext: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
    },
    noBidContainer: {
      alignItems: 'center',
      padding: 32,
      gap: 12,
      backgroundColor: c.primary10,
      borderRadius: 8,
    },
    noBidText: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textBody,
    },
    noBidSubtext: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
    },
    titleSectionLargeWeb: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingHorizontal: 48,
      paddingTop: 24,
      paddingBottom: 0,
    },
    titleBackButton: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    titleContainer: {
      flex: 1,
      gap: 8,
    },
    titleMainText: {
      fontSize: 42,
      fontWeight: '700',
      color: c.textHeader,
      lineHeight: 42,
    },
    titleSubtext: {
      fontSize: 20,
      fontWeight: '300',
      color: c.textSecondary,
      lineHeight: 20,
    },
  });
}
