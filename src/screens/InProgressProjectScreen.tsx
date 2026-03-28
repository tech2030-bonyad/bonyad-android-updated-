import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { showError, showSuccess } from '../utils/alert';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import AppBottomSheetModal from '../components/AppBottomSheetModal';
import { createCheckout, getPaymentStatus } from '../services/PaymentService';
import { getUserProfile } from '../services/ProfileService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_PHASE_PAYMENT_KEY = 'PENDING_PHASE_PAYMENT';

// ===== DESIGN TOKENS (matching Figma design) =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary10: '#E6EFF7',
  // Greens
  green80: '#008B3E',
  green70: '#009C47',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  // Amber
  amber60: '#FFB703',
  amber50: '#FFD683',
  amber10: '#FFF2CF',
  // Text
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  // Backgrounds
  bgWhite: '#FFFFFF',
  bgGray: '#F0F0F0',
};

interface InProgressProjectScreenProps {
  project: any;
  onBack: () => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onViewTechnician?: (technicianId: number) => void;
  onBookAppointment?: (technicianId: number, technicianName: string, projectId?: number) => void;
  onNavigateToChangeRequests?: (projectId: number) => void;
}

interface Phase {
  id: number;
  projectId: number;
  phaseNumber: number;
  description: string;
  timeSpentDays: number;
  moneySpent: number;
  paymentStatus: string;
  paidAt?: string;
  approved: boolean;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

type PhaseStatus = 'paid' | 'ready_for_payment' | 'awaiting_approval' | 'locked';

export default function InProgressProjectScreen({
  project,
  onBack,
  onSuccess,
  isTechnician = false,
  onOpenChat,
  onViewTechnician,
  onBookAppointment,
  onNavigateToChangeRequests,
}: InProgressProjectScreenProps) {
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
    textWhite: colors.white,
    green10: colors.success + '20',
    green60: colors.success,
    green70: colors.success,
    green80: colors.success,
    amber10: colors.warning + '25',
    amber60: colors.warning,
    amber50: colors.warning,
    bgGray: colors.gray100,
  }), [colors]);
  const styles = useMemo(() => makeStyles(c), [c]);
  
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;

  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payingPhaseId, setPayingPhaseId] = useState<number | null>(null);
  const [completingPhaseId, setCompletingPhaseId] = useState<number | null>(null);
  const [completingProject, setCompletingProject] = useState(false);

  // Custom confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmOnConfirm, setConfirmOnConfirm] = useState<(() => void) | null>(null);
  const [confirmButtonText, setConfirmButtonText] = useState('');

  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [InProgressProjectScreen] ==========================================');
    console.log('🔵 [InProgressProjectScreen] ✅ SCREEN OPENED');
    console.log('🔵 [InProgressProjectScreen] ==========================================');
    console.log('🔵 [InProgressProjectScreen] Project ID:', project?.id);
    console.log('🔵 [InProgressProjectScreen] Project Status:', project?.status?.toUpperCase());
    console.log('🔵 [InProgressProjectScreen] Is Technician:', isTechnician);
    console.log('🔵 [InProgressProjectScreen] Mode:', isTechnician ? 'TECHNICIAN VIEW' : 'USER VIEW');
    console.log('═══════════════════════════════════════════════════════════');
    loadPhases();
  }, [project]);

  const loadPhases = async () => {
    if (!project?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'));
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, {
        projectId: project.id,
      });

      console.log('🔵 [InProgressProjectScreen] Fetching phases from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔵 [InProgressProjectScreen] Loaded phases:', data.length);
        setPhases(data);
      } else {
        showError(t('Failed to load phases'));
      }
    } catch (error: any) {
      console.error('❌ [InProgressProjectScreen] Error loading phases:', error);
      showError(error.message || t('Failed to load phases'));
    } finally {
      setIsLoading(false);
    }
  };

  // ===== PAYMENT FUNCTIONS =====
  const handlePayPhase = (phase: Phase) => {
    console.log('🔘 [InProgressProjectScreen] Pay button clicked for phase:', phase.id);

    setConfirmTitle(t('Pay for Phase'));
    setConfirmMessage(
      t('Pay {{amount}} SAR for "{{description}}"?', {
        amount: formatBudget(phase.moneySpent),
        description: phase.description,
      })
    );
    setConfirmButtonText(t('Pay Now'));
    setConfirmOnConfirm(() => () => {
      payForPhase(phase.id);
    });
    setShowConfirmModal(true);
  };

  const payForPhase = async (phaseId: number) => {
    setShowConfirmModal(false);
    setPayingPhaseId(phaseId);
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) {
      setPayingPhaseId(null);
      return;
    }

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'));
        setPayingPhaseId(null);
        return;
      }

      // Use create-checkout + redirect on native (same as web / HyperPay)
      if (Platform.OS !== 'web') {
        const profile = await getUserProfile().catch(() => ({}));
        const paymentData = {
          phaseId: phase.id,
          amount: phase.moneySpent,
          currency: 'SAR',
          paymentType: 'DB' as const,
          paymentBrand: 'MADA' as const,
          merchantTransactionId: `PHASE-${phase.id}-${Date.now()}`,
          customer: {
            email: profile?.email || 'user@bonyad.app',
            givenName: profile?.firstName || profile?.name?.split(' ')[0] || 'User',
            surname: profile?.lastName || profile?.name?.split(' ').slice(1).join(' ') || '',
          },
          billing: {
            street1: profile?.address || 'King Fahd Road',
            city: profile?.city || 'Riyadh',
            state: profile?.state || 'Riyadh',
            country: 'SA',
            postcode: profile?.postcode || '12345',
          },
        };
        const result = await createCheckout(paymentData);
        const checkoutId = result?.checkoutId || result?.id;
        let redirectUrl = result?.redirectUrl || result?.shopperUrl;
        if (!redirectUrl && checkoutId) {
          const isProduction = String(checkoutId).includes('prod');
          redirectUrl = isProduction
            ? `https://eu-prod.oppwa.com/v1/checkouts/${checkoutId}`
            : `https://eu-test.oppwa.com/v1/checkouts/${checkoutId}`;
        }
        if (redirectUrl) {
          await AsyncStorage.setItem(
            PENDING_PHASE_PAYMENT_KEY,
            JSON.stringify({ checkoutId: String(checkoutId), phaseId, projectId: project?.id })
          );
          await Linking.openURL(redirectUrl);
        } else {
          showError(t('No payment URL received'));
        }
        setPayingPhaseId(null);
        return;
      }

      // Web or fallback: direct POST /phases/:id/pay
      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.PAY, { phaseId });
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok || response.status === 201) {
        showSuccess(t('Payment processed successfully'));
        setTimeout(() => {
          loadPhases();
          onSuccess?.();
        }, 1000);
      } else {
        const errorText = await response.text();
        showError(t('Failed to process payment'));
      }
    } catch (error: any) {
      showError(error.message || t('Failed to process payment'));
    } finally {
      setPayingPhaseId(null);
    }
  };

  // When app returns from payment gateway, check pending and poll status
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active') return;
      try {
        const raw = await AsyncStorage.getItem(PENDING_PHASE_PAYMENT_KEY);
        if (!raw) return;
        const pending = JSON.parse(raw) as { checkoutId: string; phaseId: number; projectId?: number };
        const status = await getPaymentStatus(pending.checkoutId);
        if (status?.success) {
          await AsyncStorage.removeItem(PENDING_PHASE_PAYMENT_KEY);
          showSuccess(t('Payment successful'));
          loadPhases();
          onSuccess?.();
        } else if (status?.description && (status.description.toLowerCase().includes('fail') || status.description.toLowerCase().includes('reject'))) {
          await AsyncStorage.removeItem(PENDING_PHASE_PAYMENT_KEY);
          showError(t('Payment failed or was cancelled'));
        }
      } catch (_) {
        // Ignore; user may still be on payment page
      }
    });
    return () => subscription.remove();
  }, [project?.id]);

  // ===== COMPLETE PHASE FUNCTIONS (TECHNICIAN) =====
  const handleCompletePhase = (phase: Phase) => {
    console.log('🔘 [InProgressProjectScreen] Complete phase button clicked:', phase.id);

    setConfirmTitle(t('Complete Phase'));
    setConfirmMessage(
      t('Are you sure you want to mark "{{description}}" as completed?', {
        description: phase.description,
      })
    );
    setConfirmButtonText(t('Complete'));
    setConfirmOnConfirm(() => () => {
      completePhase(phase.id);
    });
    setShowConfirmModal(true);
  };

  const completePhase = async (phaseId: number) => {
    setShowConfirmModal(false);
    setCompletingPhaseId(phaseId);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'));
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.COMPLETE, {
        phaseId,
      });

      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 [InProgressProjectScreen] Complete Phase');
      console.log('🟢 [InProgressProjectScreen] Endpoint: POST /phases/{phaseId}/complete');
      console.log('🟢 [InProgressProjectScreen] Phase ID:', phaseId);
      console.log('🟢 [InProgressProjectScreen] URL:', url);
      console.log('═══════════════════════════════════════════════════════════');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [InProgressProjectScreen] Complete Response Status:', response.status);

      if (response.ok || response.status === 201) {
        console.log('✅ [InProgressProjectScreen] Phase completed successfully!');
        showSuccess(t('Phase marked as complete'));
        setTimeout(() => {
          loadPhases();
          onSuccess?.();
        }, 1000);
      } else {
        const errorText = await response.text();
        console.error('❌ [InProgressProjectScreen] Failed to complete phase:', errorText);
        showError(t('Failed to complete phase'));
      }
    } catch (error: any) {
      console.error('❌ [InProgressProjectScreen] Error completing phase:', error);
      showError(error.message || t('Failed to complete phase'));
    } finally {
      setCompletingPhaseId(null);
    }
  };

  // ===== COMPLETE PROJECT FUNCTIONS (TECHNICIAN) =====
  const handleCompleteProject = () => {
    console.log('🔘 [InProgressProjectScreen] Complete project button clicked');

    setConfirmTitle(t('Complete Project'));
    setConfirmMessage(
      t('Are you sure you want to mark this project as completed? This action cannot be undone.')
    );
    setConfirmButtonText(t('Complete Project'));
    setConfirmOnConfirm(() => () => {
      completeProject();
    });
    setShowConfirmModal(true);
  };

  const completeProject = async () => {
    setShowConfirmModal(false);
    setCompletingProject(true);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'));
        return;
      }

      const url = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.COMPLETE, {
        id: project.id,
      });

      console.log('═══════════════════════════════════════════════════════════');
      console.log('🟢 [InProgressProjectScreen] Complete Project');
      console.log('🟢 [InProgressProjectScreen] Endpoint: POST /projects/{projectId}/complete');
      console.log('🟢 [InProgressProjectScreen] Project ID:', project.id);
      console.log('🟢 [InProgressProjectScreen] URL:', url);
      console.log('═══════════════════════════════════════════════════════════');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [InProgressProjectScreen] Complete Project Response Status:', response.status);

      if (response.ok || response.status === 201) {
        console.log('✅ [InProgressProjectScreen] Project completed successfully!');
        showSuccess(t('Project completed successfully'));
        setTimeout(() => {
          onSuccess?.();
          onBack();
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || t('Failed to complete project');
        console.error('❌ [InProgressProjectScreen] Failed to complete project:', errorMessage);
        showError(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ [InProgressProjectScreen] Error completing project:', error);
      showError(error.message || t('Failed to complete project'));
    } finally {
      setCompletingProject(false);
    }
  };

  // ===== HELPER FUNCTIONS =====
  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPhaseStatus = (phase: Phase, index: number): PhaseStatus => {
    const isPaid = phase.paymentStatus === 'PAID' || phase.paymentStatus === 'paid';
    
    if (isPaid) {
      return 'paid';
    }

    // Find the previous phase
    const previousPhase = index > 0 ? phases[index - 1] : null;
    const isPreviousPaid = previousPhase
      ? previousPhase.paymentStatus === 'PAID' || previousPhase.paymentStatus === 'paid'
      : true; // First phase is always unlocked

    if (!isPreviousPaid) {
      return 'locked';
    }

    // According to API: Phase must be approved before payment can be made
    // If phase is approved, it's ready for payment
    if (phase.approved) {
      return 'ready_for_payment';
    }

    // Otherwise, awaiting approval (phase not yet approved)
    return 'awaiting_approval';
  };

  const getPhaseStatusConfig = (status: PhaseStatus) => {
    switch (status) {
      case 'paid':
        return {
          bgColor: c.green10,
          borderColor: c.green60,
          iconBgColor: c.green60,
          icon: 'checkmark-circle' as const,
          iconColor: c.textWhite,
          textColor: c.green60,
          amountColor: c.green80,
        };
      case 'ready_for_payment':
        return {
          bgColor: c.amber10,
          borderColor: c.amber60,
          iconBgColor: c.amber60,
          icon: 'card-outline' as const,
          iconColor: c.textWhite,
          textColor: c.amber60,
          amountColor: c.textBody,
        };
      case 'awaiting_approval':
        return {
          bgColor: c.primary10,
          borderColor: c.primary60,
          iconBgColor: c.primary60,
          icon: 'time-outline' as const,
          iconColor: c.textWhite,
          textColor: c.primary60,
          amountColor: c.textBody,
        };
      case 'locked':
      default:
        return {
          bgColor: c.bgWhite,
          borderColor: c.textDividers,
          iconBgColor: c.bgGray,
          icon: 'lock-closed' as const,
          iconColor: c.textSecondary,
          textColor: c.textSecondary,
          amountColor: c.textBody,
        };
    }
  };

  const getServiceName = () => {
    if (i18n.language === 'ar') {
      return project?.serviceNameAr || project?.serviceName || t('Contracting Services');
    }
    return project?.serviceNameEn || project?.serviceName || t('Contracting Services');
  };

  // ===== CALCULATIONS =====
  const totalAmount = phases.reduce((sum, p) => sum + p.moneySpent, 0);
  const paidAmount = phases
    .filter(p => p.paymentStatus === 'PAID' || p.paymentStatus === 'paid')
    .reduce((sum, p) => sum + p.moneySpent, 0);
  const remainingAmount = totalAmount - paidAmount;
  const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // Check if all phases are completed and paid (for technician to complete project)
  const allPhasesPaid = phases.length > 0 && phases.every(
    p => p.paymentStatus === 'PAID' || p.paymentStatus === 'paid'
  );
  const allPhasesCompleted = phases.length > 0 && phases.every(p => p.completed);
  const canCompleteProject = allPhasesPaid && allPhasesCompleted;
  const completedPhasesCount = phases.filter(p => p.completed).length;
  const paidPhasesCount = phases.filter(
    p => p.paymentStatus === 'PAID' || p.paymentStatus === 'paid'
  ).length;

  // ===== RENDER FUNCTIONS =====
  const renderPhaseCard = (phase: Phase, index: number) => {
    const status = getPhaseStatus(phase, index);
    const config = getPhaseStatusConfig(status);
    const isPaying = payingPhaseId === phase.id;
    const isCompleting = completingPhaseId === phase.id;

    return (
      <View
        key={phase.id}
        style={[
          styles.phaseCard,
          {
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        {/* Phase Header */}
        <View style={styles.phaseHeader}>
          <View style={styles.phaseHeaderLeft}>
            <View style={[styles.phaseIconContainer, { backgroundColor: config.iconBgColor }]}>
              <Ionicons name={config.icon} size={12} color={config.iconColor} />
            </View>
            <Text style={[styles.phaseName, { color: c.textBody }]}>
              {phase.description}
            </Text>
          </View>
          <Text style={[styles.phaseAmount, { color: config.amountColor }]}>
            {formatBudget(phase.moneySpent)} {t('SAR')}
          </Text>
        </View>

        {/* Status Text */}
        {status === 'paid' && phase.paidAt && (
          <Text style={[styles.phaseStatusText, { color: config.textColor }]}>
            {t('Paid on {{date}}', { date: formatDate(phase.paidAt) })}
          </Text>
        )}
        {status === 'ready_for_payment' && !isTechnician && (
          <Text style={[styles.phaseStatusText, { color: config.textColor }]}>
            {t('Ready for payment')}
          </Text>
        )}
        {status === 'ready_for_payment' && isTechnician && (
          <Text style={[styles.phaseStatusText, { color: config.textColor }]}>
            {t('Awaiting payment from User')}
          </Text>
        )}
        {status === 'awaiting_approval' && !isTechnician && (
          <Text style={[styles.phaseStatusText, { color: config.textColor }]}>
            {t('Awaiting phase approval')}
          </Text>
        )}
        {status === 'awaiting_approval' && isTechnician && (
          <Text style={[styles.phaseStatusText, { color: config.textColor }]}>
            {t('Phase pending approval')}
          </Text>
        )}

        {/* Divider */}
        <View style={styles.phaseDivider} />

        {/* Status Row / Action */}
        {status === 'paid' && (
          <View style={styles.phaseStatusRow}>
            <View style={styles.phaseStatusIndicator}>
              <Ionicons name="checkmark-circle" size={14} color={c.green70} />
              <Text style={[styles.phaseStatusLabel, { color: c.green70 }]}>
                {t('Payment Completed')}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={c.textSecondary}
            />
          </View>
        )}

        {/* USER: Pay Button */}
        {!isTechnician && status === 'ready_for_payment' && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => handlePayPhase(phase)}
            disabled={isPaying}
          >
            {isPaying ? (
              <ActivityIndicator size="small" color={c.textWhite} />
            ) : (
              <>
                <Ionicons name="card-outline" size={20} color={c.textWhite} />
                <Text style={styles.payButtonText}>
                  {t('Pay now')} - {formatBudget(phase.moneySpent)} {t('SAR')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* USER: Awaiting Approval State */}
        {!isTechnician && status === 'awaiting_approval' && (
          <View style={styles.awaitingButton}>
            <Ionicons name="time-outline" size={20} color={c.primary60} />
            <Text style={styles.awaitingButtonText}>
              {t('Awaiting Approval')}
            </Text>
          </View>
        )}

        {/* Locked State */}
        {status === 'locked' && (
          <View style={styles.lockedButton}>
            <Text style={styles.lockedButtonText}>
              {t('Awaiting Previous Phase')}
            </Text>
          </View>
        )}

        {/* TECHNICIAN: Complete Phase Button */}
        {isTechnician && status === 'paid' && !phase.completed && (
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: c.green70 }]}
            onPress={() => handleCompletePhase(phase)}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <ActivityIndicator size="small" color={c.textWhite} />
            ) : (
              <Text style={styles.completeButtonText}>
                {t('Complete Phase')}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* TECHNICIAN: Awaiting Payment - Disabled Complete */}
        {isTechnician && status === 'ready_for_payment' && (
          <View style={[styles.completeButton, { backgroundColor: c.amber50 }]}>
            <Text style={styles.completeButtonText}>
              {t('Awaiting Payment')}
            </Text>
          </View>
        )}

        {/* TECHNICIAN: Awaiting Approval - Show status */}
        {isTechnician && status === 'awaiting_approval' && (
          <View style={[styles.completeButton, { backgroundColor: c.primary60 }]}>
            <Text style={styles.completeButtonText}>
              {t('Phase Pending Approval')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bgWhite, paddingTop: IS_LARGE_WEB ? 0 : insets.top }]}>
      {/* Title Section - Hidden on large web */}
      {!IS_LARGE_WEB && (
        <View style={styles.titleSection}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={c.textBody}
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[styles.titleText, { fontSize: scaledSize(20) }]}>
              {getServiceName()}
            </Text>
            <Text style={[styles.subtitleText, { fontSize: scaledSize(14) }]}>
              {t('In Progress')}
            </Text>
          </View>
          {onNavigateToChangeRequests && project?.id != null ? (
            <TouchableOpacity onPress={() => onNavigateToChangeRequests(project.id)} style={styles.changeRequestsLink}>
              <Ionicons name="document-text-outline" size={20} color={c.primary60} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          IS_LARGE_WEB && styles.contentContainerLargeWeb,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section - Large Web */}
        {IS_LARGE_WEB && (
          <View style={styles.titleSectionLargeWeb}>
            <TouchableOpacity onPress={onBack} style={styles.titleBackButton}>
            <Ionicons
              name="chevron-back"
              size={24}
                color={c.textHeader}
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
              <Text style={[styles.titleMainText, { fontSize: scaledSize(42) }]}>
                {getServiceName()}
              </Text>
              <Text style={[styles.titleSubtext, { fontSize: scaledSize(20) }]}>
                {t('In Progress')}
              </Text>
          </View>
        </View>
        )}

        {/* Status Flow */}
        <View style={[styles.flowContainer, IS_LARGE_WEB && styles.flowContainerLargeWeb]}>
          <ProjectCreationFlow currentStep="IN_PROGRESS" />
        </View>

        <View style={[styles.divider, IS_LARGE_WEB && styles.dividerLargeWeb]} />
        
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { fontSize: scaledSize(20) }]}>{t('Payment & Progress')}</Text>
          <Text style={[styles.sectionSubtitle, { fontSize: scaledSize(14) }]}>
            {t('Track phase completion and make payments for each milestone.')}
          </Text>
        </View>

        {/* Payment Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('Payment Summary')}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>{t('Total Paid')}</Text>
              <Text style={styles.summaryValue}>
                {formatBudget(paidAmount)} {t('SAR')}
              </Text>
            </View>
            <View style={[styles.summaryItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.summaryLabel}>{t('Remaining')}</Text>
              <Text style={styles.summaryValue}>
                {formatBudget(remainingAmount)} {t('SAR')}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(progressPercentage, 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={c.primary60} />
            <Text style={[styles.loadingText, { fontSize: scaledSize(14) }]}>{t('Loading phases...')}</Text>
          </View>
        ) : phases.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-outline" size={64} color={c.textDividers} />
            <Text style={styles.emptyText}>{t('No phases available yet')}</Text>
          </View>
        ) : (
          /* Phase Cards */
          <View style={styles.phasesContainer}>
            {phases.map((phase, index) => renderPhaseCard(phase, index))}
          </View>
        )}

        {/* User: Waiting for Technician Section */}
        {!isTechnician && allPhasesPaid && phases.length > 0 && (
          <View style={styles.waitingSection}>
            <View style={styles.waitingHeader}>
              <Ionicons 
                name={allPhasesCompleted ? 'checkmark-circle' : 'time-outline'} 
                size={24} 
                color={allPhasesCompleted ? c.green60 : c.amber60} 
              />
              <Text style={styles.waitingSectionTitle}>
                {allPhasesCompleted 
                  ? t('Project Completed!') 
                  : t('All Payments Complete')}
              </Text>
            </View>
            <Text style={styles.waitingSectionSubtitle}>
              {allPhasesCompleted
                ? t('The technician has completed all phases. The project is now finished.')
                : t('Waiting for the technician to complete the project work.')}
            </Text>
            <View style={styles.waitingProgressInfo}>
              <View style={styles.waitingProgressItem}>
                <Ionicons name="checkmark-circle" size={18} color={c.green60} />
                <Text style={styles.waitingProgressText}>
                  {t('All phases paid')}
                </Text>
              </View>
              {allPhasesCompleted && (
                <View style={styles.waitingProgressItem}>
                  <Ionicons name="checkmark-circle" size={18} color={c.green60} />
                  <Text style={styles.waitingProgressText}>
                    {t('All phases completed')}
                  </Text>
                </View>
              )}
              {!allPhasesCompleted && (
                <View style={styles.waitingProgressItem}>
                  <Ionicons name="time-outline" size={18} color={c.amber60} />
                  <Text style={styles.waitingProgressText}>
                    {t('{{completed}}/{{total}} phases completed by technician', {
                      completed: completedPhasesCount,
                      total: phases.length,
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Technician: Complete Project Section */}
        {isTechnician && phases.length > 0 && (
          <View style={styles.completeProjectSection}>
            <View style={styles.completeProjectInfo}>
              <View style={styles.completeProjectHeader}>
                <Ionicons 
                  name={canCompleteProject ? 'checkmark-circle' : 'information-circle-outline'} 
                  size={24} 
                  color={canCompleteProject ? c.green60 : c.primary60} 
                />
                <Text style={styles.completeProjectTitle}>
                  {canCompleteProject ? t('Ready to Complete') : t('Project Completion')}
                </Text>
              </View>
              <Text style={styles.completeProjectSubtitle}>
                {canCompleteProject
                  ? t('All phases are paid and completed. You can now finalize the project.')
                  : t('{{completed}}/{{total}} phases completed, {{paid}}/{{total}} paid', {
                      completed: completedPhasesCount,
                      paid: paidPhasesCount,
                      total: phases.length,
                    })}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.completeProjectButton,
                !canCompleteProject && styles.completeProjectButtonDisabled,
              ]}
              onPress={handleCompleteProject}
              disabled={!canCompleteProject || completingProject}
            >
              {completingProject ? (
                <ActivityIndicator size="small" color={c.textWhite} />
              ) : (
                <>
                  <Ionicons 
                    name="flag" 
                    size={20} 
                    color={canCompleteProject ? c.textWhite : c.textSecondary} 
                  />
                  <Text 
                    style={[
                      styles.completeProjectButtonText,
                      !canCompleteProject && styles.completeProjectButtonTextDisabled,
                    ]}
                  >
                    {t('Complete Project')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirmation Modal - unified bottom sheet design */}
      <AppBottomSheetModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={confirmTitle}
        heightFraction={0.45}
      >
        <Text style={styles.modalMessage}>{confirmMessage}</Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.modalCancelButton]}
            onPress={() => setShowConfirmModal(false)}
          >
            <Text style={styles.modalCancelButtonText}>{t('Cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.modalConfirmButton]}
            onPress={() => {
              if (confirmOnConfirm) {
                confirmOnConfirm();
              }
            }}
          >
            <Text style={styles.modalConfirmButtonText}>{confirmButtonText}</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheetModal>
    </View>
  );
}

function makeStyles(c: typeof COLORS) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    backgroundColor: c.primary70,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  headerLTR: {
    direction: 'ltr',
  },
  headerLargeWeb: {
    paddingHorizontal: 48,
    paddingBottom: 32,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTextContainer: {
    alignItems: 'center',
  },
  logoTextEn: {
    fontSize: 20,
    fontWeight: '800',
    color: c.primary10,
  },
  logoTextAr: {
    fontSize: 16,
    color: c.primary10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconButton: {
    padding: 4,
  },
  // Title Section
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  titleSectionLargeWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 48,
    paddingTop: 24,
    paddingBottom: 0,
  },
  backButton: {
    padding: 4,
  },
  changeRequestsLink: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonLargeWeb: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    gap: 8,
  },
  titleContainerLargeWeb: {
    gap: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: c.textHeader,
  },
  titleTextLargeWeb: {
    fontSize: 34,
    fontWeight: '400',
  },
  subtitleText: {
    fontSize: 14,
    fontWeight: '300',
    color: c.textSecondary,
  },
  subtitleTextLargeWeb: {
    fontSize: 16,
  },
  // Flow
  flowContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  flowContainerLargeWeb: {
    paddingHorizontal: 48,
    paddingTop: 8,
    paddingBottom: 16,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: c.textDividers,
    marginHorizontal: 0,
  },
  dividerLargeWeb: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 24,
  },
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contentContainerLargeWeb: {
    paddingHorizontal: 48,
    paddingTop: 16,
    width: '100%',
  },
  // Section Header
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: c.textHeader,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: c.textBody,
    lineHeight: 20,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: c.primary60,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: c.primary10,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '300',
    color: c.primary10,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textWhite,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(230, 239, 247, 0.5)',
    borderRadius: 64,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: c.textWhite,
    borderRadius: 64,
  },
  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: c.textSecondary,
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: c.textSecondary,
  },
  // Phases Container
  phasesContainer: {
    gap: 16,
  },
  // Phase Card
  phaseCard: {
    borderRadius: 8,
    borderWidth: 0.5,
    padding: 16,
    gap: 16,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  phaseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  phaseIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseName: {
    fontSize: 16,
    fontWeight: '400',
    flex: 1,
  },
  phaseAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  phaseStatusText: {
    fontSize: 14,
    fontWeight: '400',
  },
  phaseDivider: {
    height: 1,
    backgroundColor: c.textDividers,
    opacity: 0.3,
  },
  phaseStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseStatusLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  // Pay Button
  payButton: {
    backgroundColor: c.amber60,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: c.textWhite,
  },
  // Locked Button
  lockedButton: {
    backgroundColor: c.bgWhite,
    borderColor: c.textSecondary,
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },
  // Awaiting Button
  awaitingButton: {
    backgroundColor: c.primary10,
    borderColor: c.primary60,
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  awaitingButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.primary60,
  },
  // Complete Button (Technician)
  completeButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textWhite,
  },
  // Waiting Section (User)
  waitingSection: {
    marginTop: 24,
    backgroundColor: c.amber10,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: c.amber60,
    gap: 16,
  },
  waitingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waitingSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textHeader,
  },
  waitingSectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: c.textBody,
    lineHeight: 20,
  },
  waitingProgressInfo: {
    gap: 10,
    marginTop: 8,
  },
  waitingProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waitingProgressText: {
    fontSize: 14,
    fontWeight: '400',
    color: c.textBody,
  },
  // Complete Project Section (Technician)
  completeProjectSection: {
    marginTop: 24,
    backgroundColor: c.primary10,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: c.primary60,
    gap: 16,
  },
  completeProjectInfo: {
    gap: 8,
  },
  completeProjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completeProjectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: c.textHeader,
  },
  completeProjectSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: c.textBody,
    lineHeight: 20,
  },
  completeProjectButton: {
    backgroundColor: c.green60,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  completeProjectButtonDisabled: {
    backgroundColor: c.bgGray,
  },
  completeProjectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textWhite,
  },
  completeProjectButtonTextDisabled: {
    color: c.textSecondary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: c.bgWhite,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      } as any,
      default: {
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.textHeader,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: c.textBody,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: c.primary10,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textBody,
  },
  modalConfirmButton: {
    backgroundColor: c.primary60,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textWhite,
  },
  // Title Section - Large Web (Figma Design) - Updated styles
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
  titleBackButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  }
  });
}

