import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import { getRequestDetails, getBidsOnRequest, updateRequestStatus } from '../services/SmallTaskService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import { SmallTaskRequest, SmallTaskBid } from '../types/smallTasks';

// iOS-matching design colors
const COLORS = {
  primaryLight: '#1A6DB4',
  primaryDark: '#4D8EC5',
  borderLight: 'rgba(26, 109, 180, 0.2)',
  borderDark: 'rgba(77, 142, 197, 0.3)',
  statusAccepted: '#007AFF',
  statusCompleted: '#34C759',
  success: '#28A745',
  amber60: '#FFB703',
  amber10: '#FFF8E6',
  textWhite: '#FFFFFF',
};

interface AssignedSmallTaskScreenProps {
  task: SmallTaskRequest;
  onBack: () => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string) => void;
  onViewTechnician?: (technicianId: number) => void;
  /** When user must pay (ACCEPTED + payment PENDING), parent can open payment screen */
  onPay?: (task: SmallTaskRequest, amount: number) => void;
}

export default function AssignedSmallTaskScreen({
  task,
  onBack,
  onSuccess,
  isTechnician = false,
  onOpenChat,
  onViewTechnician,
  onPay,
}: AssignedSmallTaskScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, fonts, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const isDarkMode = theme === 'dark';
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  // Android-only responsive design for tablets
  const IS_ANDROID = Platform.OS === 'android';
  const IS_ANDROID_TABLET = IS_ANDROID && (screenWidth >= 600 || (screenWidth >= 480 && screenHeight >= 800));

  const [taskDetails, setTaskDetails] = useState<SmallTaskRequest>(task);
  const [acceptedBid, setAcceptedBid] = useState<SmallTaskBid | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();

  const primaryColor = isDarkMode ? COLORS.primaryDark : COLORS.primaryLight;
  const borderColor = isDarkMode ? COLORS.borderDark : COLORS.borderLight;
  const topSpacing = Platform.OS === 'android' ? 0 : insets.top;

  const riyalLogo = isDarkMode
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.spring(buttonAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: 200,
      useNativeDriver: true,
    }).start();

    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    setHasError(false);
    try {
      await Promise.all([loadTaskDetails(), loadAcceptedBid()]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(t('smallTasks.failedToLoadData'));
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTaskDetails = async () => {
    try {
      const data = await getRequestDetails(task.id);
      setTaskDetails({
        ...data,
        taskType: data.taskTypeId
          ? { id: data.taskTypeId, nameAr: data.taskTypeNameAr || '', nameEn: data.taskTypeNameEn || '' }
          : undefined,
      } as SmallTaskRequest);
    } catch (error) {
      console.error('Error loading task details:', error);
    }
  };

  const loadAcceptedBid = async () => {
    // Only the requester can view bids; for technician use task (prop) details for display.
    // Resolve role from storage; isTechnician prop may be stale on first mount.
    const role = await storage.getUserRole();
    const isTech = role?.toUpperCase() === 'TECHNICIAN';
    if (isTech) {
      const t = taskDetails || task;
      if (t && (t.amount != null || t.budget != null)) {
        setAcceptedBid({
          id: 0,
          smallTaskRequestId: task.id,
          technicianId: t.acceptedTechnicianId ?? 0,
          technicianName: t.acceptedTechnicianName ?? '',
          price: t.amount ?? t.budget ?? 0,
          amount: t.amount ?? t.budget ?? 0,
          estimatedDuration: t.estimatedDuration ?? 0,
          status: 'ACCEPTED',
          createdAt: '',
        } as SmallTaskBid);
      }
      return;
    }
    try {
      const list = await getBidsOnRequest(task.id);
      const accepted = list.find((b: SmallTaskBid) => b.status === 'ACCEPTED');
      if (accepted) setAcceptedBid(accepted as SmallTaskBid);
    } catch (error) {
      console.error('Error loading accepted bid:', error);
    }
  };

  const handleStartWork = () => {
    showConfirmation(
      t('smallTasks.startWork'),
      t('smallTasks.startWorkConfirm'),
      async () => {
        setIsUpdatingStatus(true);
        try {
          await updateRequestStatus(task.id, 'IN_PROGRESS');
          showSuccess(t('smallTasks.workStartedSuccess'), t('smallTasks.success'));
          await loadData();
          onSuccess?.();
        } catch (error) {
          console.error('Error updating status:', error);
          showError(t('Error updating status'), t('Error'));
        } finally {
          setIsUpdatingStatus(false);
        }
      }
    );
  };

  const handleOpenChat = async () => {
    if (!onOpenChat) return;

    try {
      const token = await storage.getAuthToken();
      if (!token) return;

      const currentUserId = await storage.getUserId();
      const otherUserId = isTechnician
        ? taskDetails.userId || 0
        : taskDetails.assignedTechnicianId || 0;

      if (!otherUserId) {
        showError(t('smallTasks.unableToStartChat'), t('smallTasks.error'));
        return;
      }

      // Generate a consistent roomId by sorting user IDs to ensure the same room ID
      // is generated regardless of which user initiates the chat
      // Format: "room_{smallerUserId}_{largerUserId}"
      // Example: User 5 and User 12 will always get "room_5_12" whether User 5 or User 12 opens chat
      const roomId = `room_${Math.min(currentUserId || 0, otherUserId || 0)}_${Math.max(currentUserId || 0, otherUserId || 0)}`;
      const receiverName = isTechnician
        ? taskDetails.userName || t('smallTasks.user')
        : taskDetails.assignedTechnicianName || t('smallTasks.technician');

      onOpenChat(roomId, otherUserId, receiverName);
    } catch (error) {
      console.error('Error opening chat:', error);
      showError(t('smallTasks.errorOpeningChat'), t('smallTasks.error'));
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const taskName = taskDetails?.taskType
    ? i18n.language === 'ar'
      ? taskDetails.taskType?.nameAr || t('smallTasks.task')
      : taskDetails.taskType?.nameEn || t('smallTasks.task')
    : t('smallTasks.task');

  if (isLoading && !hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topSpacing }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? COLORS.primaryDark : COLORS.primaryLight} />
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('smallTasks.loading')}</Text>
        </View>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topSpacing }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
            {t('smallTasks.error')}
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error || t('smallTasks.somethingWentWrong')}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: isDarkMode ? COLORS.primaryDark : COLORS.primaryLight }]}
            onPress={loadData}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={[styles.retryButtonText, { fontFamily: fonts?.button || fontFamily, fontWeight: '600' }]}>
              {t('smallTasks.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header - iOS style */}
      <View style={[styles.header, styles.headerLTR, { paddingTop: topSpacing, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
          <Ionicons name="chevron-back" size={24} color={primaryColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: primaryColor }]}>{t('smallTasks.taskRequestDetails')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Card - iOS style */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: COLORS.statusAccepted + '30' }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('smallTasks.status')}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.statusAccepted }]} />
              <Text style={[styles.statusValue, { color: COLORS.statusAccepted }]}>{t('smallTasks.statusAccepted')}</Text>
            </View>
          </View>

          {/* Task Type Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('smallTasks.taskType')}</Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>{taskName}</Text>
          </View>

          {/* Description Card - always show; use placeholder for empty/script/invalid */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('smallTasks.description')}</Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {(() => {
                const s = taskDetails.description?.trim();
                if (!s || s === 'Not specified' || /<script/i.test(s)) return t('smallTasks.noDescriptionProvided');
                return s;
              })()}
            </Text>
          </View>

          {/* Address Card */}
          {taskDetails.address ? (
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('smallTasks.address')}</Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>{taskDetails.address}</Text>
            </View>
          ) : null}

          {/* Accepted Bid Card */}
          {acceptedBid ? (
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('smallTasks.acceptedBid')}</Text>
              <View style={styles.bidAmountRow}>
                <ExpoImage source={riyalLogo} style={styles.riyalLogo} contentFit="contain" />
                <Text style={[styles.bidAmount, { color: primaryColor, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                  {formatBudget(acceptedBid.price ?? acceptedBid.amount ?? 0)}
                </Text>
              </View>
              {(acceptedBid.estimatedDuration != null || acceptedBid.estimatedHours != null) && (
                <View style={styles.estimatedTimeRow}>
                  <Text style={[styles.estimatedTimeText, { color: colors.textSecondary }]}>
                    {t('smallTasks.estimated')}: {acceptedBid.estimatedDuration ?? acceptedBid.estimatedHours} {acceptedBid.estimatedDuration != null ? t('smallTasks.min') : t('smallTasks.hours')}
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Created At Card */}
          {taskDetails.createdAt ? (
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('smallTasks.createdAt')}</Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>{formatDate(taskDetails.createdAt)}</Text>
            </View>
          ) : null}

          {/* Assigned Technician/User */}
          <View style={styles.contactSection}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
              {isTechnician ? t('smallTasks.client') : t('smallTasks.assignedTechnician')}
            </Text>
            <View style={styles.contactInfoRow}>
              <View style={[styles.contactIconContainer, { backgroundColor: primaryColor + '15' }]}>
                <Ionicons
                  name={isTechnician ? 'person-outline' : 'construct-outline'}
                  size={24}
                  color={primaryColor}
                />
              </View>
              <View style={styles.contactDetails}>
                <Text style={[styles.contactName, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {isTechnician
                    ? taskDetails.userName || t('smallTasks.user')
                    : taskDetails.assignedTechnicianName || t('smallTasks.technician')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.chatButton, { backgroundColor: primaryColor }]}
                onPress={handleOpenChat}
              >
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.textWhite} />
                <Text style={[styles.chatButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('smallTasks.chat')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* User: Pay button when payment pending */}
          {!isTechnician && (taskDetails.paymentStatus === 'PENDING' || taskDetails.paymentStatus === null) && acceptedBid && onPay && (
            <View style={[styles.messageSection, styles.messageSectionColumn, { backgroundColor: COLORS.amber10 }]}>
              <View style={styles.messageRow}>
                <Ionicons name="card-outline" size={24} color={COLORS.amber60} />
                <Text style={[styles.messageText, { color: COLORS.primary80, fontFamily: fonts?.body || fontFamily }]}>
                  {t('smallTasks.paymentRequiredBeforeStart')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.payButton, { backgroundColor: primaryColor }]}
                onPress={() => onPay(taskDetails, acceptedBid.price ?? acceptedBid.amount ?? 0)}
              >
                <Ionicons name="card" size={20} color={COLORS.textWhite} />
                <Text style={[styles.payButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('smallTasks.pay')} {formatBudget(acceptedBid.price ?? acceptedBid.amount ?? 0)}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Waiting Message - user, after payment */}
          {!isTechnician && taskDetails.paymentStatus === 'PAID' && (
            <View style={[styles.messageSection, { backgroundColor: COLORS.primary10 }]}>
              <Ionicons name="time-outline" size={24} color={COLORS.primary80} />
              <Text style={[styles.messageText, { color: COLORS.primary80, fontFamily: fonts?.body || fontFamily }]}>
                {t('smallTasks.waitingForTechnicianToStart')}
              </Text>
            </View>
          )}

          {/* Technician: waiting for user to pay */}
          {isTechnician && (taskDetails.paymentStatus === 'PENDING' || taskDetails.paymentStatus === null) && (
            <View style={[styles.messageSection, { backgroundColor: COLORS.amber10 }]}>
              <Ionicons name="card-outline" size={24} color={COLORS.amber60} />
              <Text style={[styles.messageText, { color: COLORS.primary80, fontFamily: fonts?.body || fontFamily }]}>
                {t('smallTasks.waitingForUserPayment')}
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Floating Action Button - For Technicians (only after user has paid) */}
      {isTechnician && taskDetails.paymentStatus === 'PAID' && (
        <Animated.View
          style={[
            styles.floatingButtonContainer,
            {
              opacity: buttonAnim,
              transform: [
                {
                  translateY: buttonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
                { scale: buttonAnim },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: primaryColor }]}
            onPress={handleStartWork}
            disabled={isUpdatingStatus}
            activeOpacity={0.8}
          >
            {isUpdatingStatus ? (
              <ActivityIndicator color={COLORS.textWhite} size="small" />
            ) : (
              <>
                <Ionicons name="play-circle" size={20} color={COLORS.textWhite} />
                <Text style={[styles.floatingButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('smallTasks.startWork')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
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
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirmation}
        confirmStyle={confirmState.confirmStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLTR: {
    direction: 'ltr',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 16,
    lineHeight: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  bidAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  riyalLogo: {
    width: 24,
    height: 24,
  },
  bidAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  estimatedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  estimatedTimeText: {
    fontSize: 14,
  },
  contactSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  messageSection: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageSectionColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  payButtonText: {
    color: COLORS.textWhite,
    fontSize: 16,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
