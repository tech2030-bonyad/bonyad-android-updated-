import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useRTL } from '../hooks/useRTL';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTopPadding } from '../utils/statusBarHelper';
import {
  getTechnicianStatus,
  TechnicianStatusResponse,
  TECHNICIAN_STATUS_REJECTED,
  TECHNICIAN_STATUS_SUSPENDED_API,
} from '../services/TechnicianStatusService';

interface WaitingApprovalScreenProps {
  onApproved: () => void;
  onBack?: () => void;
  onLogout?: () => void;
}

const BLUE = '#005DAC';
const BLUE_LIGHT = '#E8F2FF';
const BLUE_MID = '#B3D1F5';
const RED = '#EF4444';
const RED_LIGHT = '#FEF2F2';
const AMBER = '#F59E0B';
const AMBER_LIGHT = '#FFFBEB';

// ─── Animated pulsing badge ───────────────────────────────────────────────────
function PulsingBadge({
  iconName,
  iconColor,
  ringColor,
  badgeColor,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  ringColor: string;
  badgeColor: string;
}) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = pulse(ring1, 0);
    const a2 = pulse(ring2, 700);
    a1.start();
    a2.start();
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [ring1, ring2]);

  const ringStyle = (anim: Animated.Value) => ({
    position: 'absolute' as const,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: ringColor,
    opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.55, 0.2, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.65] }) }],
  });

  return (
    <View style={styles.badgeWrapper}>
      <Animated.View style={ringStyle(ring1)} />
      <Animated.View style={ringStyle(ring2)} />
      <View style={[styles.badgeCircleOuter, { borderColor: ringColor, backgroundColor: badgeColor }]}>
        <View style={[styles.badgeCircleInner, { backgroundColor: badgeColor }]}>
          <Ionicons name={iconName} size={36} color={iconColor} />
        </View>
      </View>
    </View>
  );
}

// ─── Review stepper ───────────────────────────────────────────────────────────
function ReviewStep({
  index,
  label,
  sublabel,
  state,
  isLast,
}: {
  index: number;
  label: string;
  sublabel?: string;
  state: 'done' | 'active' | 'pending';
  isLast: boolean;
}) {
  const dotBg =
    state === 'done' ? BLUE : state === 'active' ? BLUE : '#E0E0E0';
  const dotBorder =
    state === 'done' ? BLUE : state === 'active' ? BLUE : '#BDBDBD';
  const labelColor =
    state === 'done' ? '#1A1A1A' : state === 'active' ? BLUE : '#999999';

  return (
    <View style={stepStyles.row}>
      {/* Line + dot column */}
      <View style={stepStyles.lineCol}>
        {index > 0 && (
          <View
            style={[
              stepStyles.lineTop,
              { backgroundColor: state !== 'pending' || index === 1 ? BLUE_MID : '#E0E0E0' },
            ]}
          />
        )}
        <View style={[stepStyles.dot, { backgroundColor: dotBg, borderColor: dotBorder }]}>
          {state === 'done' && (
            <Ionicons name="checkmark" size={11} color="#fff" />
          )}
          {state === 'active' && (
            <View style={stepStyles.activeDotInner} />
          )}
        </View>
        {!isLast && (
          <View
            style={[
              stepStyles.lineBottom,
              { backgroundColor: state === 'done' ? BLUE_MID : '#E0E0E0' },
            ]}
          />
        )}
      </View>
      {/* Text column */}
      <View style={stepStyles.textCol}>
        <Text style={[stepStyles.label, { color: labelColor }]}>{label}</Text>
        {sublabel ? (
          <Text style={stepStyles.sublabel}>{sublabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', minHeight: 52 },
  lineCol: { width: 28, alignItems: 'center' },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  activeDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  lineTop: { width: 2, flex: 1, maxHeight: 14 },
  lineBottom: { width: 2, flex: 1 },
  textCol: { flex: 1, paddingLeft: 12, paddingTop: 1, paddingBottom: 12 },
  label: { fontSize: 14, fontWeight: '600' },
  sublabel: { fontSize: 12, color: '#999999', marginTop: 2 },
});

// ─── Info chip ────────────────────────────────────────────────────────────────
function InfoChip({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <View style={chipStyles.chip}>
      <Ionicons name={icon} size={14} color={BLUE} />
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: BLUE_LIGHT,
    borderWidth: 1,
    borderColor: BLUE_MID,
  },
  label: { fontSize: 12, color: BLUE, fontWeight: '500' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function WaitingApprovalScreen({
  onApproved,
  onBack,
  onLogout,
}: WaitingApprovalScreenProps) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const { isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const isDarkMode = theme === 'dark';

  // ── state (logic unchanged) ────────────────────────────────────────────────
  const [status, setStatus] = useState<TechnicianStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApplicationRejected, setIsApplicationRejected] = useState(false);
  const [isSuspendedBlocked, setIsSuspendedBlocked] = useState(false);
  const [rejectionDetail, setRejectionDetail] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const extractRejectionDetailFromStatusPayload = (data: Record<string, unknown>): string | null => {
    const preferKeys = [
      'rejectionReason', 'rejectionMessage', 'rejection_reason',
      'rejection_note', 'rejectionNote', 'admin_note', 'adminNote',
      'reason', 'detail', 'description', 'message',
    ];
    for (const k of preferKeys) {
      const v = data[k];
      if (typeof v === 'string' && v.trim()) {
        const s = v.trim();
        const low = s.toLowerCase();
        if (!['forbidden', 'unauthorized', 'bad request', 'error'].includes(low)) return s;
      }
    }
    return null;
  };

  const checkStatus = async () => {
    try {
      const statusData = await getTechnicianStatus();
      setStatus(statusData);
      setError(null);
      setIsApplicationRejected(false);
      setIsSuspendedBlocked(false);
      setRejectionDetail(null);

      const st = String(statusData.status ?? '').trim().toUpperCase().replace(/\s+/g, '_');
      const applicationStatus = String((statusData as any).applicationStatus ?? '').trim().toUpperCase().replace(/\s+/g, '_');
      const rr = String((statusData as any).rejectionReason ?? '').trim();
      const rm = String((statusData as any).rejectionMessage ?? '').trim();
      const rSnake = String((statusData as any).rejection_reason ?? '').trim();
      const msgText = String((statusData as any).message ?? '').toLowerCase();

      const isRejectedState =
        st === 'REJECTED' || st === 'DECLINED' ||
        applicationStatus === 'REJECTED' || applicationStatus === 'DECLINED' ||
        !!(rr || rm || rSnake) ||
        msgText.includes('rejected') || msgText.includes('declined') || msgText.includes('not approved');
      const isSuspendedOnly =
        !isRejectedState && (st === 'SUSPENDED' || applicationStatus === 'SUSPENDED');

      if (isRejectedState) {
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        setIsApplicationRejected(true);
        setIsSuspendedBlocked(false);
        setRejectionDetail(extractRejectionDetailFromStatusPayload(statusData as unknown as Record<string, unknown>));
        return;
      }

      if (statusData.status === 'APPROVED' && statusData.onboarded) {
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        onApproved(); return;
      }

      if (statusData.status === 'APPROVED' && !statusData.onboarded) {
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        onApproved(); return;
      }

      if (isSuspendedOnly) {
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        setIsSuspendedBlocked(true); return;
      }

      if (statusData.hasPendingDataRequests) {
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        onApproved(); return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === TECHNICIAN_STATUS_REJECTED) {
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        setIsApplicationRejected(true);
        setIsSuspendedBlocked(false);
        setStatus(null);
        const detail = (err as any)?.detail;
        setRejectionDetail(typeof detail === 'string' && detail.trim() ? detail.trim() : null);
      } else if (msg === TECHNICIAN_STATUS_SUSPENDED_API) {
        if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        setIsApplicationRejected(false);
        setIsSuspendedBlocked(true);
        setStatus(null);
        setRejectionDetail(null);
      } else {
        setIsApplicationRejected(false);
        setIsSuspendedBlocked(false);
        setRejectionDetail(null);
        setError(msg || t('waitingApproval.failedToCheckStatus'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    pollingIntervalRef.current = setInterval(() => { checkStatus(); }, 10000);
    return () => {
      if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
    };
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    setIsApplicationRejected(false);
    setIsSuspendedBlocked(false);
    setRejectionDetail(null);
    checkStatus();
  };

  // ── derived colors ─────────────────────────────────────────────────────────
  const bg = isDarkMode ? colors.background : '#F5F7FA';
  const cardBg = isDarkMode ? colors.cardBackground : '#FFFFFF';
  const textPrimary = isDarkMode ? colors.text : '#1A1A1A';
  const textSec = isDarkMode ? colors.textSecondary : '#666666';
  const showBlockedState = isApplicationRejected || isSuspendedBlocked;

  const badgeIconName: React.ComponentProps<typeof Ionicons>['name'] = isApplicationRejected
    ? 'close-circle'
    : isSuspendedBlocked
      ? 'ban'
      : 'time';
  const badgeIconColor = isApplicationRejected ? RED : isSuspendedBlocked ? AMBER : BLUE;
  const badgeRingColor = isApplicationRejected ? RED : isSuspendedBlocked ? AMBER : BLUE;
  const badgeBg = isApplicationRejected ? RED_LIGHT : isSuspendedBlocked ? AMBER_LIGHT : BLUE_LIGHT;

  // ── stepper states ─────────────────────────────────────────────────────────
  type StepState = 'done' | 'active' | 'pending';
  const step1: StepState = 'done';
  const step2: StepState = showBlockedState ? (isApplicationRejected ? 'done' : 'active') : 'active';
  const step3: StepState = 'pending';

  // ── loading ────────────────────────────────────────────────────────────────
  if (isLoading && !status && !showBlockedState) {
    return (
      <View style={[styles.container, { backgroundColor: bg, paddingTop: getTopPadding(insets, 40) }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={[styles.loadingText, { color: textSec }]}>
            {t('waitingApproval.loading')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* ── Top bar (always LTR) ─────────────────────────────────────────────── */}
      <View
        style={[
          styles.topBar,
          { paddingTop: Platform.OS === 'web' ? 4 : getTopPadding(insets, 4) },
        ]}
      >
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.topBarBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <BackArrowIonicons variant="chevron" size={22} color={textPrimary} />
          </TouchableOpacity>
        ) : <View style={styles.topBarBtn} />}

        {onLogout && (
          <TouchableOpacity onPress={onLogout} style={[styles.topBarBtn, styles.logoutBtn]}>
            <Ionicons name="log-out-outline" size={18} color={textSec} />
            <Text style={[styles.logoutText, { color: textSec }]}>
              {t('waitingApproval.signOut')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

      {/* ── Badge ───────────────────────────────────────────────────────────── */}
      <PulsingBadge
        iconName={badgeIconName}
        iconColor={badgeIconColor}
        ringColor={badgeRingColor}
        badgeColor={badgeBg}
      />

      {/* ── Title + subtitle ─────────────────────────────────────────────────── */}
      <Text style={[styles.title, { color: isApplicationRejected ? RED : isSuspendedBlocked ? AMBER : textPrimary }]}>
        {isApplicationRejected
          ? t('waitingApproval.rejectedTitle')
          : isSuspendedBlocked
            ? t('waitingApproval.suspendedTitle')
            : t('waitingApproval.title')}
      </Text>
      <Text style={[styles.subtitle, { color: textSec }]}>
        {isApplicationRejected
          ? t('waitingApproval.rejectedSubtitle')
          : isSuspendedBlocked
            ? t('waitingApproval.suspendedSubtitle')
            : t('waitingApproval.subtitle')}
      </Text>

      {/* ── Rejection / Suspended accent card ──────────────────────────────── */}
      {isApplicationRejected && (
        <View style={[styles.accentCard, { backgroundColor: cardBg, borderLeftColor: RED }]}>
          <View style={styles.accentCardHeader}>
            <Ionicons name="alert-circle" size={16} color={RED} />
            <Text style={[styles.accentCardTitle, { color: RED }]}>
              {t('waitingApproval.rejectionMessageTitle')}
            </Text>
          </View>
          <Text style={[styles.accentCardBody, { color: textPrimary }]}>
            {(rejectionDetail && rejectionDetail.trim()) || t('waitingApproval.applicationRejectedDetail')}
          </Text>
        </View>
      )}
      {isSuspendedBlocked && (
        <View style={[styles.accentCard, { backgroundColor: cardBg, borderLeftColor: AMBER }]}>
          <View style={styles.accentCardHeader}>
            <Ionicons name="warning" size={16} color={AMBER} />
            <Text style={[styles.accentCardTitle, { color: AMBER }]}>
              {t('waitingApproval.accountSuspended')}
            </Text>
          </View>
          <Text style={[styles.accentCardBody, { color: textPrimary }]}>
            {t('waitingApproval.suspendedSubtitle')}
          </Text>
        </View>
      )}

      {/* ── Review stepper (only in pending state) ────────────────────────── */}
      {!showBlockedState && (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardHeading, { color: textPrimary }]}>
            {t('waitingApproval.reviewProcess')}
          </Text>
          <ReviewStep
            index={0}
            label={t('waitingApproval.profileSubmitted')}
            sublabel={t('waitingApproval.profileSubmittedSub')}
            state={step1}
            isLast={false}
          />
          <ReviewStep
            index={1}
            label={t('waitingApproval.underReview')}
            sublabel={t('waitingApproval.underReviewSub')}
            state={step2}
            isLast={false}
          />
          <ReviewStep
            index={2}
            label={t('waitingApproval.approvedStep')}
            sublabel={t('waitingApproval.approvedStepSub')}
            state={step3}
            isLast
          />
        </View>
      )}

      {/* ── Info chips (pending state only) ──────────────────────────────── */}
      {!showBlockedState && (
        <View style={styles.chipsRow}>
          <InfoChip icon="time-outline" label={t('waitingApproval.tile1Value')} />
          <InfoChip icon="shield-checkmark-outline" label={t('waitingApproval.tile2Value')} />
          <InfoChip icon="notifications-outline" label={t('waitingApproval.tile3Value')} />
        </View>
      )}

      {/* ── Error card ───────────────────────────────────────────────────── */}
      {error && !showBlockedState && (
        <View style={[styles.accentCard, { backgroundColor: cardBg, borderLeftColor: RED, marginTop: 0 }]}>
          <View style={styles.accentCardHeader}>
            <Ionicons name="alert-circle-outline" size={16} color={RED} />
            <Text style={[styles.accentCardTitle, { color: RED }]}>{error}</Text>
          </View>
        </View>
      )}

      {/* ── Auto-refresh note ────────────────────────────────────────────── */}
      <View style={styles.autoRefreshRow}>
        {!showBlockedState ? (
          <>
            <ActivityIndicator size="small" color={BLUE} style={{ marginRight: 6 }} />
            <Text style={[styles.autoRefreshText, { color: textSec }]}>
              {t('waitingApproval.checkingStatus')}
            </Text>
          </>
        ) : (
          <Text style={[styles.autoRefreshText, { color: textSec, textAlign: 'center' }]}>
            {t('waitingApproval.rejectedPollingStopped')}
          </Text>
        )}
      </View>

      {/* ── Refresh button ───────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.refreshBtn, isLoading && { opacity: 0.7 }]}
        onPress={handleRefresh}
        disabled={isLoading}
        activeOpacity={0.82}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }} />
            <Text style={styles.refreshBtnText}>{t('waitingApproval.refreshStatus')}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── Sign-out ghost button ────────────────────────────────────────── */}
      {onLogout && (
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: isDarkMode ? colors.border : '#DDDDDD' }]}
          onPress={onLogout}
          activeOpacity={0.75}
        >
          <Ionicons name="log-out-outline" size={16} color={textSec} style={{ marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }} />
          <Text style={[styles.signOutBtnText, { color: textSec }]}>
            {t('waitingApproval.signOut')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 14, fontSize: 15 },

  // top bar — always LTR, sits above the ScrollView
  topBar: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  topBarBtn: { padding: 4 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  logoutText: { fontSize: 13 },

  // badge
  badgeWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  badgeCircleOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCircleInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // title / subtitle
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  // accent card (rejection / suspended / error)
  accentCard: {
    width: '100%',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 16,
    ...Platform.select({
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  accentCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  accentCardTitle: { fontSize: 13, fontWeight: '700' },
  accentCardBody: { fontSize: 14, lineHeight: 21 },

  // info card with stepper
  card: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  cardHeading: { fontSize: 13, fontWeight: '600', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.6 },

  // chips
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  // auto refresh row
  autoRefreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  autoRefreshText: { fontSize: 12 },

  // buttons
  refreshBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BLUE,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  refreshBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  signOutBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  signOutBtnText: { fontSize: 14, fontWeight: '500' },
});
