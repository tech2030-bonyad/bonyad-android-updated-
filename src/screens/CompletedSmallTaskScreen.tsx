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
import { buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { getRequestDetails } from '../services/SmallTaskService';
import SmallTaskPhaseBar from '../components/SmallTaskPhaseBar';
import SmallTaskStatusTimeline from '../components/SmallTaskStatusTimeline';
import SmallTaskReviewForm from '../components/SmallTaskReviewForm';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import { SmallTaskRequest } from '../types/smallTasks';

const COLORS = {
  primary60: '#005DAC',
  primary10: '#E6EFF7',
  green80: '#008B3E',
  green10: '#E6F5EC',
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textWhite: '#FFFFFF',
  bgWhite: '#FFFFFF',
  amber60: '#FFB703',
  amber10: '#FFF8E6',
};

interface CompletedSmallTaskScreenProps {
  task: SmallTaskRequest;
  onBack: () => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string) => void;
  onViewTechnician?: (technicianId: number) => void;
  onViewAllTasks?: () => void;
}

export default function CompletedSmallTaskScreen({
  task,
  onBack,
  onSuccess,
  isTechnician = false,
  onOpenChat,
  onViewTechnician,
  onViewAllTasks,
}: CompletedSmallTaskScreenProps) {
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
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [hasReview, setHasReview] = useState(false);
  const [completedAt, setCompletedAt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

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

    // Success animation
    Animated.sequence([
      Animated.delay(300),
      Animated.spring(successAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    setHasError(false);
    try {
      await loadTaskDetails();
      await checkReviewStatus();
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
      if (data.completedAt || (data as { updatedAt?: string }).updatedAt) {
        setCompletedAt(data.completedAt || (data as { updatedAt?: string }).updatedAt!);
      }
    } catch (error) {
      console.error('Error loading task details:', error);
    }
  };

  const checkReviewStatus = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) return;

      // Check if review exists for small task
      // Note: This endpoint may need to be added to the API - using small task request ID
      const reviewUrl = buildApiUrl(`/reviews/small-task/${task.id}/status`);
      const response = await fetch(reviewUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasReview(data.hasReview || false);
      }
    } catch (error) {
      console.error('Error checking review status:', error);
    }
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

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setHasReview(true);
    showSuccess(t('Review submitted successfully'), t('Success'));
    onSuccess?.();
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
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
          <Text style={[styles.statusText, { color: COLORS.green80 }]}>{t('Completed')}</Text>
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
            <SmallTaskPhaseBar currentStatus="COMPLETED" onStatusChange={() => {}} />
          </View>

          {/* Success Animation */}
          <Animated.View
            style={[
              styles.successContainer,
              {
                opacity: successAnim,
                transform: [{ scale: successAnim }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.checkmarkContainer,
                {
                  backgroundColor: COLORS.green10,
                  transform: [{ scale: checkmarkScale }],
                },
              ]}
            >
              <Ionicons name="checkmark-done-circle" size={64} color={COLORS.green80} />
            </Animated.View>
            <Text style={[styles.successTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
              {t('Task Completed!')}
            </Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              {t('Great work! The task has been successfully completed.')}
            </Text>
          </Animated.View>

          {/* Status Timeline */}
          <View style={styles.timelineContainer}>
            <SmallTaskStatusTimeline
              currentStatus="COMPLETED"
              assignedTechnicianName={taskDetails.assignedTechnicianName}
              completedAt={completedAt}
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
                  {formatDate(taskDetails.createdAt)}
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

            {/* Completed Date */}
            {completedAt && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('Completed Date')}</Text>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={[styles.fieldValue, { color: colors.text }]}>
                    {formatDate(completedAt)}
                  </Text>
                </View>
              </View>
            )}

            {/* Final Amount */}
            {(taskDetails.budget || taskDetails.amount) && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('Final Amount')}</Text>
                <View style={styles.budgetAmountRow}>
                  <ExpoImage source={riyalLogo} style={styles.riyalLogo} contentFit="contain" />
                  <Text style={[styles.budgetAmount, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                    {formatBudget(taskDetails.budget || taskDetails.amount || 0)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Technician/User - Direct Fields (No Card) */}
          <View style={styles.contactSection}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
              {isTechnician ? t('Client') : t('Technician')}
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
              {onViewTechnician && !isTechnician && (
                <TouchableOpacity
                  style={[styles.viewProfileButton, { borderColor: colors.border }]}
                  onPress={() => onViewTechnician(taskDetails.assignedTechnicianId || 0)}
                >
                  <Ionicons name="person-outline" size={16} color={colors.primary} />
                  <Text style={[styles.viewProfileText, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {t('View Profile')}
                  </Text>
                </TouchableOpacity>
              )}
              {onOpenChat && (
                <TouchableOpacity
                  style={[styles.chatButton, { backgroundColor: colors.primary }]}
                  onPress={handleOpenChat}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={COLORS.textWhite} />
                  <Text style={[styles.chatButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>{t('Chat')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Review Section - For Users Only */}
          {!isTechnician && (
            <View style={styles.reviewSection}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                {t('Rate Your Experience')}
              </Text>
              {hasReview ? (
                <View style={[styles.reviewSubmitted, { backgroundColor: COLORS.green10 }]}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.green80} />
                  <Text style={[styles.reviewSubmittedText, { color: COLORS.green80, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {t('Review submitted')}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.reviewButton, { backgroundColor: COLORS.amber60 }]}
                  onPress={() => setShowReviewForm(true)}
                >
                  <Ionicons name="star" size={20} color={COLORS.textWhite} />
                  <Text style={[styles.reviewButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {t('Write a Review')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {onViewAllTasks && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={onViewAllTasks}
              >
                <Ionicons name="list-outline" size={20} color={COLORS.textWhite} />
                <Text style={[styles.actionButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('View All Tasks')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Review Form Modal */}
      {!isTechnician && (
        <SmallTaskReviewForm
          visible={showReviewForm}
          task={taskDetails}
          technicianId={taskDetails.assignedTechnicianId || 0}
          onClose={() => setShowReviewForm(false)}
          onSuccess={handleReviewSuccess}
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
  successContainer: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 24,
  },
  checkmarkContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
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
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  budgetAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  riyalLogo: {
    width: 24,
    height: 24,
  },
  budgetAmount: {
    fontSize: 24,
    fontWeight: '700',
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
    flexWrap: 'wrap',
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
    minWidth: 120,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  viewProfileText: {
    fontSize: 13,
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
  reviewSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  reviewSubmitted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  reviewSubmittedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  actionButtonsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
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
