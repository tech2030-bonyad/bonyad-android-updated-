import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
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

const figmaMobileColors = {
  background: '#FFFFFF',
  titleBlue: '#1A6DB4',
  textDark: '#2D2D2D',
  buttonBlue: '#005DAC',
};

export default function WaitingApprovalScreen({
  onApproved,
  onBack,
  onLogout,
}: WaitingApprovalScreenProps) {
  const { colors, theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDarkMode = theme === 'dark';
  const isRTL = i18n.language === 'ar';

  const [status, setStatus] = useState<TechnicianStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApplicationRejected, setIsApplicationRejected] = useState(false);
  const [isSuspendedBlocked, setIsSuspendedBlocked] = useState(false);
  const [rejectionDetail, setRejectionDetail] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const extractRejectionDetailFromStatusPayload = (data: Record<string, unknown>): string | null => {
    const preferKeys = [
      'rejectionReason',
      'rejectionMessage',
      'rejection_reason',
      'rejection_note',
      'rejectionNote',
      'admin_note',
      'adminNote',
      'reason',
      'detail',
      'description',
      'message',
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
      const applicationStatus = String((statusData as any).applicationStatus ?? '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_');
      const rr = String((statusData as any).rejectionReason ?? '').trim();
      const rm = String((statusData as any).rejectionMessage ?? '').trim();
      const rSnake = String((statusData as any).rejection_reason ?? '').trim();
      const msgText = String((statusData as any).message ?? '').toLowerCase();

      const isRejectedState =
        st === 'REJECTED' ||
        st === 'DECLINED' ||
        applicationStatus === 'REJECTED' ||
        applicationStatus === 'DECLINED' ||
        !!(rr || rm || rSnake) ||
        msgText.includes('rejected') ||
        msgText.includes('declined') ||
        msgText.includes('not approved');
      const isSuspendedOnly =
        !isRejectedState && (st === 'SUSPENDED' || applicationStatus === 'SUSPENDED');

      if (isRejectedState) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsApplicationRejected(true);
        setIsSuspendedBlocked(false);
        setRejectionDetail(
          extractRejectionDetailFromStatusPayload(statusData as unknown as Record<string, unknown>)
        );
        return;
      }

      if (statusData.status === 'APPROVED' && statusData.onboarded) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        onApproved();
        return;
      }

      if (statusData.status === 'APPROVED' && !statusData.onboarded) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        onApproved();
        return;
      }

      if (isSuspendedOnly) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsSuspendedBlocked(true);
        return;
      }

      if (statusData.hasPendingDataRequests) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        onApproved();
        return;
      }
    } catch (err: unknown) {
      console.error('❌ Error checking technician status:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg === TECHNICIAN_STATUS_REJECTED) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsApplicationRejected(true);
        setIsSuspendedBlocked(false);
        setStatus(null);
        const detail = (err as any)?.detail;
        setRejectionDetail(typeof detail === 'string' && detail.trim() ? detail.trim() : null);
      } else if (msg === TECHNICIAN_STATUS_SUSPENDED_API) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsApplicationRejected(false);
        setIsSuspendedBlocked(true);
        setStatus(null);
        setRejectionDetail(null);
      } else {
        setIsApplicationRejected(false);
        setIsSuspendedBlocked(false);
        setRejectionDetail(null);
        setError(msg || t('Failed to check status') || 'Failed to check status');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    pollingIntervalRef.current = setInterval(() => {
      checkStatus();
    }, 10000);
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
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

  const backgroundColor = isDarkMode ? colors.background : figmaMobileColors.background;
  const titleColor = isDarkMode ? colors.text : figmaMobileColors.titleBlue;
  const textColor = isDarkMode ? colors.text : figmaMobileColors.textDark;
  const primaryColor = isDarkMode ? colors.primary : figmaMobileColors.buttonBlue;
  const rejectColor = colors.error || '#EF4444';
  const suspendColor = '#F59E0B';
  const showBlockedState = isApplicationRejected || isSuspendedBlocked;

  if (isLoading && !status && !showBlockedState) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <View style={[styles.loadingContent, { paddingTop: getTopPadding(insets, 40) }]}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('Loading...') || 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  const headerIconName = isApplicationRejected
    ? ('close-circle-outline' as const)
    : isSuspendedBlocked
      ? ('ban-outline' as const)
      : ('hourglass-outline' as const);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={[styles.scrollContent, { paddingTop: Platform.OS === 'web' ? 0 : getTopPadding(insets, 20) }]}
    >
      <View style={styles.content}>
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </TouchableOpacity>
          )}
          {onLogout && (
            <TouchableOpacity onPress={onLogout} style={styles.signOutButton}>
              <Ionicons name="log-out-outline" size={22} color={textColor} />
              <Text style={[styles.signOutButtonText, { color: textColor }]}>{t('Sign out') || 'Sign out'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isApplicationRejected
                ? rejectColor + '20'
                : isSuspendedBlocked
                  ? suspendColor + '25'
                  : primaryColor + '20',
            },
          ]}
        >
          <Ionicons
            name={headerIconName}
            size={72}
            color={isApplicationRejected ? rejectColor : isSuspendedBlocked ? suspendColor : primaryColor}
          />
        </View>

        <Text
          style={[
            styles.title,
            {
              color: isApplicationRejected ? rejectColor : isSuspendedBlocked ? suspendColor : titleColor,
            },
          ]}
        >
          {isApplicationRejected
            ? t('waitingApproval.rejectedTitle') || 'Application not approved'
            : isSuspendedBlocked
              ? t('waitingApproval.suspendedTitle') || 'Account suspended'
              : t('Waiting for Approval') || 'Waiting for Approval'}
        </Text>

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {isApplicationRejected
            ? t('waitingApproval.rejectedSubtitle') ||
              'Your provider application was not approved. If you believe this is a mistake, please contact support.'
            : isSuspendedBlocked
              ? t('waitingApproval.suspendedSubtitle') ||
                'Your provider account is suspended. Please contact support.'
              : t('Your profile is being reviewed by our admin team. This usually takes a few hours. We will notify you once your account is approved.') ||
                'Your profile is being reviewed by our admin team. This usually takes a few hours. We will notify you once your account is approved.'}
        </Text>

        {isApplicationRejected ? (
          <View style={[styles.rejectionMessageCard, { borderColor: rejectColor + '40', backgroundColor: rejectColor + '12' }]}>
            <Text style={[styles.rejectionMessageTitle, { color: rejectColor }]}>
              {t('waitingApproval.rejectionMessageTitle') || 'Message from the review team'}
            </Text>
            <Text style={[styles.rejectionMessageBody, { color: textColor }]}>
              {(rejectionDetail && rejectionDetail.trim()) ||
                t('waitingApproval.applicationRejectedDetail') ||
                'Your technician application was not approved. Contact support if you need help.'}
            </Text>
          </View>
        ) : null}

        {status && !showBlockedState && (
          <View style={[styles.statusCard, { backgroundColor: isDarkMode ? colors.cardBackground : '#F5F5F5' }]}>
            <View style={[styles.statusRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="information-circle-outline" size={24} color={primaryColor} />
              <Text style={[styles.statusText, { color: textColor }]}>
                {t('Status') || 'Status'}: <Text style={{ fontWeight: '700' }}>{status.status}</Text>
              </Text>
            </View>
            {(status.status === 'WAITING_ADMIN_APPROVAL' || status.status === 'PENDING') && (
              <Text style={[styles.statusSubtext, { color: colors.textSecondary, marginLeft: isRTL ? 0 : 36, marginRight: isRTL ? 36 : 0 }]}>
                {t('Your profile is complete and pending admin review.') || 'Your profile is complete and pending admin review.'}
              </Text>
            )}
          </View>
        )}

        {error && !showBlockedState ? (
          <View style={[styles.errorCard, { backgroundColor: rejectColor + '20', borderColor: rejectColor }]}>
            <Ionicons name="alert-circle-outline" size={24} color={rejectColor} />
            <Text style={[styles.errorText, { color: rejectColor }]}>{error}</Text>
          </View>
        ) : null}

        {!showBlockedState ? (
          <View style={[styles.refreshIndicator, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ActivityIndicator size="small" color={primaryColor} />
            <Text style={[styles.refreshText, { color: colors.textSecondary }]}>
              {t('Checking status every 10 seconds...') || 'Checking status every 10 seconds...'}
            </Text>
          </View>
        ) : (
          <Text style={[styles.refreshText, { color: colors.textSecondary, textAlign: 'center', marginBottom: 16 }]}>
            {t('waitingApproval.rejectedPollingStopped') || 'Automatic checks stopped. You can refresh to verify your status.'}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: primaryColor }]}
          onPress={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.refreshButtonText}>{t('Refresh Status') || 'Refresh Status'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingBottom: 40 },
  content: { width: '100%', maxWidth: 400, paddingHorizontal: 24, alignItems: 'center' },
  header: { width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backButton: {},
  signOutButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  signOutButtonText: { fontSize: 14 },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  description: { textAlign: 'center', lineHeight: 24, marginBottom: 32, paddingHorizontal: 20 },
  statusCard: { width: '100%', padding: 16, borderRadius: 12, marginBottom: 16 },
  statusRow: { alignItems: 'center', gap: 12 },
  statusText: { flex: 1, fontSize: 14 },
  statusSubtext: { marginTop: 8, fontSize: 12 },
  errorCard: { width: '100%', padding: 16, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  errorText: { flex: 1, fontSize: 14 },
  rejectionMessageCard: { width: '100%', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  rejectionMessageTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  rejectionMessageBody: { fontSize: 14, lineHeight: 22 },
  refreshIndicator: { alignItems: 'center', gap: 8, marginBottom: 16 },
  refreshText: { fontSize: 12 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8, minWidth: 200 },
  refreshButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  loadingContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },
});
