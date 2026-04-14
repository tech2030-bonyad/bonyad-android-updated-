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
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { getRequestDetails } from '../services/SmallTaskService';
import SmallTaskReviewForm from '../components/SmallTaskReviewForm';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import { SmallTaskRequest } from '../types/smallTasks';

// iOS-matching design colors
const COLORS = {
  primaryLight: '#1A6DB4',
  primaryDark: '#4D8EC5',
  borderLight: 'rgba(26, 109, 180, 0.2)',
  borderDark: 'rgba(77, 142, 197, 0.3)',
  statusCompleted: '#34C759',
  green10: '#E6F5EC',
  amber60: '#FFB703',
  textWhite: '#FFFFFF',
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
  const isDarkMode = theme === 'dark';
  const isArabic = i18n.language?.startsWith('ar');
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
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(1)).current;

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

  const primaryColor = isDarkMode ? COLORS.primaryDark : COLORS.primaryLight;
  const borderColor = isDarkMode ? COLORS.borderDark : COLORS.borderLight;
  const topSpacing = Platform.OS === 'android' ? 0 : insets.top;

  const riyalLogo = isDarkMode
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  useEffect(() => {
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
        showError(t('smallTasks.unableToStartChat'), t('smallTasks.error'));
        return;
      }

      const roomId = `room_${Math.min(currentUserId || 0, otherUserId || 0)}_${Math.max(currentUserId || 0, otherUserId || 0)}`;
      const receiverName = isTechnician
        ? taskDetails.userName || t('User')
        : taskDetails.assignedTechnicianName || t('Technician');

      onOpenChat(roomId, otherUserId, receiverName);
    } catch (error) {
      console.error('Error opening chat:', error);
      showError(t('smallTasks.errorOpeningChat'), t('smallTasks.error'));
    }
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setHasReview(true);
    showSuccess(t('smallTasks.reviewSubmittedSuccess'), t('smallTasks.success'));
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
      ? taskDetails.taskType?.nameAr || t('smallTasks.task')
      : taskDetails.taskType?.nameEn || t('smallTasks.task')
    : t('smallTasks.task');

  if (isLoading && !hasError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topSpacing }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
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
            style={[styles.retryButton, { backgroundColor: primaryColor }]}
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
      {/* Header - iOS style */}
      <View style={[styles.header, isArabic ? styles.headerRTL : styles.headerLTR, { paddingTop: topSpacing, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackButton}>
          <BackArrowIonicons variant="chevron" size={24} color={primaryColor} forceLtrLayout={!isArabic} />
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
          {/* Success Animation - iOS style */}
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
              <Ionicons name="checkmark-done-circle" size={64} color={COLORS.statusCompleted} />
            </Animated.View>
            <Text style={[styles.successTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
              {t('smallTasks.taskCompleted')}
            </Text>
            <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
              {t('smallTasks.taskCompletedSubtitle')}
            </Text>
          </Animated.View>

          {/* Status Card - iOS style */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: COLORS.statusCompleted + '30' }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('smallTasks.status')}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.statusCompleted }]} />
              <Text style={[styles.statusValue, { color: COLORS.statusCompleted }]}>{t('smallTasks.statusCompleted')}</Text>
            </View>
          </View>

          {/* Task Type Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('smallTasks.taskType')}</Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>{taskName}</Text>
          </View>

          {/* Description Card */}
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

          {/* Created At Card */}
          {taskDetails.createdAt ? (
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('smallTasks.createdAt')}</Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>{formatDate(taskDetails.createdAt)}</Text>
            </View>
          ) : null}

          {/* Completed Date Card */}
          {completedAt ? (
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('smallTasks.completedDate')}</Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>{formatDate(completedAt)}</Text>
            </View>
          ) : null}

          {/* Final Amount Card */}
          {(taskDetails.budget || taskDetails.amount) ? (
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('smallTasks.finalAmount')}</Text>
              <View style={styles.budgetAmountRow}>
                <ExpoImage source={riyalLogo} style={styles.riyalLogo} contentFit="contain" />
                <Text style={[styles.budgetAmount, { color: primaryColor, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                  {formatBudget(taskDetails.budget || taskDetails.amount || 0)}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Technician/User */}
          <View style={styles.contactSection}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
              {isTechnician ? t('smallTasks.client') : t('smallTasks.technician')}
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
              {onViewTechnician && !isTechnician && (
                <TouchableOpacity
                  style={[styles.viewProfileButton, { borderColor: colors.border }]}
                  onPress={() => onViewTechnician(taskDetails.assignedTechnicianId || 0)}
                >
                  <Ionicons name="person-outline" size={16} color={primaryColor} />
                  <Text style={[styles.viewProfileText, { color: primaryColor, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {t('smallTasks.viewProfile')}
                  </Text>
                </TouchableOpacity>
              )}
              {onOpenChat && (
                <TouchableOpacity
                  style={[styles.chatButton, { backgroundColor: primaryColor }]}
                  onPress={handleOpenChat}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={COLORS.textWhite} />
                  <Text style={[styles.chatButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>{t('smallTasks.chat')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Review Section - For Users Only */}
          {!isTechnician && (
            <View style={styles.reviewSection}>
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                {t('smallTasks.rateYourExperience')}
              </Text>
              {hasReview ? (
                <View style={[styles.reviewSubmitted, { backgroundColor: COLORS.green10 }]}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.statusCompleted} />
                  <Text style={[styles.reviewSubmittedText, { color: COLORS.statusCompleted, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {t('smallTasks.reviewSubmitted')}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.reviewButton, { backgroundColor: COLORS.amber60 }]}
                  onPress={() => setShowReviewForm(true)}
                >
                  <Ionicons name="star" size={20} color={COLORS.textWhite} />
                  <Text style={[styles.reviewButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {t('smallTasks.writeReview')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {onViewAllTasks && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: primaryColor }]}
                onPress={onViewAllTasks}
              >
                <Ionicons name="list-outline" size={20} color={COLORS.textWhite} />
                <Text style={[styles.actionButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('smallTasks.viewAllTasks')}
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
  headerRTL: {
    direction: 'rtl',
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
  successContainer: {
    alignItems: 'center',
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
