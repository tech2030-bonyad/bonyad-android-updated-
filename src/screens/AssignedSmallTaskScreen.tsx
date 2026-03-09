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
import SmallTaskPhaseBar from '../components/SmallTaskPhaseBar';
import SmallTaskStatusTimeline from '../components/SmallTaskStatusTimeline';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import { SmallTaskRequest, SmallTaskBid } from '../types/smallTasks';

const COLORS = {
  primary60: '#005DAC',
  primary80: '#004A8A',
  primary10: '#E6EFF7',
  green80: '#008B3E',
  green10: '#E6F5EC',
  amber60: '#FFB703',
  amber10: '#FFF8E6',
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textWhite: '#FFFFFF',
  bgWhite: '#FFFFFF',
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
  const isRTL = i18n.language === 'ar';
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
      setError(t('Failed to load data. Please try again.'));
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
    // Only the requester can view bids; for technician use task (prop) details for display
    if (isTechnician) {
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
      t('Start Work'),
      t('Are you ready to start working on this task?'),
      async () => {
        setIsUpdatingStatus(true);
        try {
          await updateRequestStatus(task.id, 'IN_PROGRESS');
          showSuccess(t('Work started successfully'), t('Success'));
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
        showError(t('Unable to start chat'), t('Error'));
        return;
      }

      // Generate a consistent roomId by sorting user IDs to ensure the same room ID
      // is generated regardless of which user initiates the chat
      // Format: "room_{smallerUserId}_{largerUserId}"
      // Example: User 5 and User 12 will always get "room_5_12" whether User 5 or User 12 opens chat
      const roomId = `room_${Math.min(currentUserId || 0, otherUserId || 0)}_${Math.max(currentUserId || 0, otherUserId || 0)}`;
      const receiverName = isTechnician
        ? taskDetails.userName || t('User')
        : taskDetails.assignedTechnicianName || t('Technician');

      onOpenChat(roomId, otherUserId, receiverName);
    } catch (error) {
      console.error('Error opening chat:', error);
      showError(t('Error opening chat'), t('Error'));
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
      ? taskDetails.taskType?.nameAr || t('Task')
      : taskDetails.taskType?.nameEn || t('Task')
    : t('Task');

  if (isLoading && !hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('Loading...')}</Text>
        </View>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
            {t('Error')}
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error || t('Something went wrong. Please try again.')}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={loadData}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={[styles.retryButtonText, { fontFamily: fonts?.button || fontFamily, fontWeight: '600' }]}>
              {t('Retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar - Back Button and Status Icon */}
      <View style={[styles.topBar, { paddingTop: IS_ANDROID ? insets.top : (IS_ANDROID_TABLET ? 0 : insets.top) }]}>
        {IS_ANDROID ? (
          <TouchableOpacity onPress={onBack} style={styles.androidBackButton}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
          </TouchableOpacity>
        ) : !IS_ANDROID_TABLET ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
          </TouchableOpacity>
        ) : null}
        <View style={[styles.statusBadge, { backgroundColor: COLORS.green10 }]}>
          <Text style={[styles.statusText, { color: COLORS.green80 }]}>{t('Assigned')}</Text>
        </View>
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
          {/* Phase Bar */}
          <View style={styles.phaseBarContainer}>
            {/* Per README: ACCEPTED status = bid accepted, payment required */}
            <SmallTaskPhaseBar currentStatus="ACCEPTED" onStatusChange={() => {}} />
          </View>

          {/* Status Timeline */}
          <View style={styles.timelineContainer}>
            <SmallTaskStatusTimeline
              currentStatus="ASSIGNED"
              assignedTechnicianName={taskDetails.assignedTechnicianName}
            />
          </View>

          {/* Task Info - Direct Fields (No Card) */}
          <View style={styles.taskInfoSection}>
            {/* Task Icon and Name + Request ID (same as web) */}
            <View style={styles.taskHeaderSection}>
              <View style={[styles.iconContainer, { backgroundColor: COLORS.green10 }]}>
                <Ionicons name="checkmark-circle" size={32} color={COLORS.green80} />
              </View>
              <View style={styles.taskInfo}>
                <Text style={[styles.requestIdText, { color: colors.textSecondary }]}>#{taskDetails.id}</Text>
                <Text style={[styles.taskName, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                  {taskName}
                </Text>
              </View>
            </View>

            {/* Created date (same as web) */}
            {taskDetails.createdAt && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('Created')}</Text>
                <Text style={[styles.fieldValue, { color: colors.text }]}>
                  {new Date(taskDetails.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            )}

            {/* Description */}
            {taskDetails.description && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('Description')}</Text>
                <Text style={[styles.fieldValue, { color: colors.text, fontFamily: fonts?.body || fontFamily }]}>
                  {taskDetails.description}
                </Text>
              </View>
            )}

            {/* Address */}
            {taskDetails.address && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('Address')}</Text>
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                  <Text style={[styles.fieldValue, { color: colors.text }]}>{taskDetails.address}</Text>
                </View>
              </View>
            )}

            {/* Accepted Bid */}
            {acceptedBid && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('Accepted Bid')}</Text>
                <View style={styles.bidAmountRow}>
                  <ExpoImage source={riyalLogo} style={styles.riyalLogo} contentFit="contain" />
                  <Text style={[styles.bidAmount, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                    {formatBudget(acceptedBid.price ?? acceptedBid.amount ?? 0)}
                  </Text>
                </View>
                {(acceptedBid.estimatedDuration != null || acceptedBid.estimatedHours != null) && (
                  <View style={styles.estimatedTimeRow}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.estimatedTimeText, { color: colors.textSecondary }]}>
                      {t('Estimated')}: {acceptedBid.estimatedDuration ?? acceptedBid.estimatedHours} {acceptedBid.estimatedDuration != null ? t('min') : t('hours')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Assigned Technician/User - Direct Fields (No Card) */}
          <View style={styles.contactSection}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
              {isTechnician ? t('Client') : t('Assigned Technician')}
            </Text>
            <View style={styles.contactInfoRow}>
              <View style={[styles.contactIconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons
                  name={isTechnician ? 'person-outline' : 'construct-outline'}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.contactDetails}>
                <Text style={[styles.contactName, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {isTechnician
                    ? taskDetails.userName || t('User')
                    : taskDetails.assignedTechnicianName || t('Technician')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.chatButton, { backgroundColor: colors.primary }]}
                onPress={handleOpenChat}
              >
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.textWhite} />
                <Text style={[styles.chatButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('Chat')}
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
                  {t('Payment required before the technician can start work.')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.payButton, { backgroundColor: colors.primary }]}
                onPress={() => onPay(taskDetails, acceptedBid.price ?? acceptedBid.amount ?? 0)}
              >
                <Ionicons name="card" size={20} color={COLORS.textWhite} />
                <Text style={[styles.payButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('Pay')} {formatBudget(acceptedBid.price ?? acceptedBid.amount ?? 0)}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Waiting Message - user, after payment */}
          {!isTechnician && taskDetails.paymentStatus === 'PAID' && (
            <View style={[styles.messageSection, { backgroundColor: COLORS.primary10 }]}>
              <Ionicons name="time-outline" size={24} color={COLORS.primary80} />
              <Text style={[styles.messageText, { color: COLORS.primary80, fontFamily: fonts?.body || fontFamily }]}>
                {t('Waiting for technician to start work...')}
              </Text>
            </View>
          )}

          {/* Technician: waiting for user to pay */}
          {isTechnician && (taskDetails.paymentStatus === 'PENDING' || taskDetails.paymentStatus === null) && (
            <View style={[styles.messageSection, { backgroundColor: COLORS.amber10 }]}>
              <Ionicons name="card-outline" size={24} color={COLORS.amber60} />
              <Text style={[styles.messageText, { color: COLORS.primary80, fontFamily: fonts?.body || fontFamily }]}>
                {t('Waiting for the user to complete payment. You can start work after payment.')}
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
            style={[styles.floatingButton, { backgroundColor: colors.primary }]}
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
                  {t('Start Work')}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  androidBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 4,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  phaseBarContainer: {
    marginBottom: 16,
  },
  timelineContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  taskInfoSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  taskHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  requestIdText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  taskName: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  fieldSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 24,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
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
    marginHorizontal: 20,
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
    marginHorizontal: 20,
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
