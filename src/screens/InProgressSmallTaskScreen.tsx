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
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import SmallTaskPhaseBar from '../components/SmallTaskPhaseBar';
import SmallTaskStatusTimeline from '../components/SmallTaskStatusTimeline';
import SmallTaskProgressBar from '../components/SmallTaskProgressBar';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
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
};

interface InProgressSmallTaskScreenProps {
  task: SmallTaskRequest;
  onBack: () => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string) => void;
}

export default function InProgressSmallTaskScreen({
  task,
  onBack,
  onSuccess,
  isTechnician = false,
  onOpenChat,
}: InProgressSmallTaskScreenProps) {
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
  const [isCompleting, setIsCompleting] = useState(false);
  const [progress, setProgress] = useState(50); // Default progress
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

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

    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: progress / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    setHasError(false);
    try {
      await loadTaskDetails();
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
      const token = await storage.getAuthToken();
      if (!token) return;

      const url = buildApiUrl(`/small-tasks/requests/${task.id}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTaskDetails(data);
        // Calculate progress if available
        if (data.progress) {
          setProgress(data.progress);
        }
      }
    } catch (error) {
      console.error('Error loading task details:', error);
    }
  };

  const handleMarkComplete = () => {
    showConfirmation(
      t('Mark Complete'),
      t('Are you sure you want to mark this task as completed?'),
      async () => {
        setIsCompleting(true);
        try {
          const token = await storage.getAuthToken();
          if (!token) {
            showError(t('Please login again'), t('Error'));
            return;
          }

          const url = buildApiUrlWithParams(API_ENDPOINTS.SMALL_TASKS.UPDATE_STATUS, { id: task.id });
          const response = await fetch(url, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'COMPLETED' }),
          });

          if (response.ok) {
            showSuccess(t('Task marked as completed'), t('Success'));
            await loadData();
            onSuccess?.();
          } else {
            showError(t('Failed to update status'), t('Error'));
          }
        } catch (error) {
          console.error('Error updating status:', error);
          showError(t('Error updating status'), t('Error'));
        } finally {
          setIsCompleting(false);
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
        <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.statusText, { color: colors.primary }]}>{t('In Progress')}</Text>
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
            <SmallTaskPhaseBar currentStatus="IN_PROGRESS" onStatusChange={() => {}} />
          </View>

          {/* Status Timeline */}
          <View style={styles.timelineContainer}>
            <SmallTaskStatusTimeline currentStatus="IN_PROGRESS" />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <SmallTaskProgressBar progress={progress} />
          </View>

          {/* Task Info - Direct Fields (No Card) */}
          <View style={styles.taskInfoSection}>
            {/* Task Icon and Name */}
            <View style={styles.taskHeaderSection}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="construct" size={32} color={colors.primary} />
              </View>
              <View style={styles.taskInfo}>
                <Text style={[styles.taskName, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                  {taskName}
                </Text>
              </View>
            </View>

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
          </View>

          {/* Contact - Direct Fields (No Card) */}
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
              <TouchableOpacity
                style={[styles.chatButton, { backgroundColor: colors.primary }]}
                onPress={handleOpenChat}
              >
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.textWhite} />
                <Text style={[styles.chatButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>{t('Chat')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Floating Action Button - For Technicians */}
      {isTechnician && (
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
            style={[styles.floatingButton, { backgroundColor: COLORS.green80 }]}
            onPress={handleMarkComplete}
            disabled={isCompleting}
            activeOpacity={0.8}
          >
            {isCompleting ? (
              <ActivityIndicator color={COLORS.textWhite} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.textWhite} />
                <Text style={[styles.floatingButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('Mark Complete')}
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
    marginBottom: 16,
  },
  progressContainer: {
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
