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
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import SmallTaskBidFormModal from '../components/SmallTaskBidFormModal';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import { getBidsOnRequest, acceptBid, rejectBid, updateRequestStatus } from '../services/SmallTaskService';
import { SmallTaskRequest, SmallTaskBid } from '../types/smallTasks';

interface SmallTaskDetailScreenProps {
  task: SmallTaskRequest;
  onBack: () => void;
  onSuccess?: () => void;
  onSubmitBid?: () => void;
  isTechnician?: boolean;
}

export default function SmallTaskDetailScreen({
  task,
  onBack,
  onSuccess,
  onSubmitBid,
  isTechnician = false,
}: SmallTaskDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, fonts } = useFontFamily();
  const insets = useSafeAreaInsets();
  const isDarkMode = theme === 'dark';
  const isArabic = i18n.language?.startsWith('ar');

  const [taskDetails, setTaskDetails] = useState<SmallTaskRequest | null>(task);
  const [bids, setBids] = useState<SmallTaskBid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<'PENDING' | 'ACCEPTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>(task.status || 'PENDING');
  const [showBidModal, setShowBidModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'technician'>('user');
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(1)).current;
  
  const { alertState, showError, showSuccess, showConfirm, hideAlert } = useAlertPopup();
  
  const riyalLogo = theme === 'dark'
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  useEffect(() => {
    checkUserRole();
    loadTaskDetails();
  }, [task]);

  const checkUserRole = async () => {
    try {
      const role = await storage.getUserRole();
      setUserRole(role === 'technician' ? 'technician' : 'user');
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const loadTaskDetails = async () => {
    if (!task?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('smallTasks.pleaseLoginAgain'), t('smallTasks.error'));
        setIsLoading(false);
        return;
      }

      // Load task details and bids (only requester can view bids; technicians get "Only the requester can view bids")
      if (userRole === 'user') {
        await loadBids();
      } else {
        setBids([]);
      }
    } catch (error) {
      console.error('Error loading task details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBids = async () => {
    if (!task?.id) return;
    // Only the requester can view bids; skip for technicians to avoid "Only the requester can view bids" error
    if (userRole !== 'user') {
      setBids([]);
      return;
    }
    try {
      const list = await getBidsOnRequest(task.id);
      setBids(list as SmallTaskBid[]);
    } catch (error) {
      console.error('Error loading bids:', error);
    }
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US').format(budget);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleStatusChange = (status: string) => {
    if (status === 'PENDING' || status === 'ACCEPTED' || status === 'ASSIGNED' || status === 'IN_PROGRESS' || status === 'COMPLETED' || status === 'CANCELLED') {
      setCurrentStatus(status);
    }
  };

  const handleUpdateStatus = async (newStatus: 'IN_PROGRESS' | 'COMPLETED') => {
    if (!task?.id) return;

    showConfirm(
t('smallTasks.updateStatus'),
      t('smallTasks.markTaskStatusConfirm', {
        status: newStatus === 'IN_PROGRESS' ? t('smallTasks.statusInProgress') : t('smallTasks.statusCompleted')
      }),
      async () => {
        setIsUpdatingStatus(true);
        try {
          await updateRequestStatus(task.id, newStatus);
          showSuccess(t('smallTasks.statusUpdatedSuccess'), t('smallTasks.success'));
          setCurrentStatus(newStatus);
          setTimeout(() => {
            hideAlert();
            onSuccess?.();
          }, 1500);
        } catch (error) {
          console.error('❌ Error updating status:', error);
          showError(t('smallTasks.errorUpdatingStatus'), t('smallTasks.error'));
        } finally {
          setIsUpdatingStatus(false);
        }
      }
    );
  };

  const handleAcceptBid = async (bidId: number) => {
    showConfirm(
      t('smallTasks.acceptBid'),
      t('smallTasks.acceptBidConfirm'),
      async () => {
        try {
          await acceptBid(task.id, bidId);
          showSuccess(t('smallTasks.bidAcceptedSuccess'), t('smallTasks.success'));
          setTimeout(() => {
            hideAlert();
            loadTaskDetails();
            onSuccess?.();
          }, 1500);
        } catch (error) {
          console.error('❌ Error accepting bid:', error);
          showError(t('smallTasks.errorAcceptingBid'), t('smallTasks.error'));
        }
      }
    );
  };

  const handleRejectBid = async (bidId: number) => {
    showConfirm(
      t('smallTasks.rejectBid'),
      t('smallTasks.rejectBidConfirm'),
      async () => {
        try {
          await rejectBid(bidId);
          showSuccess(t('smallTasks.bidRejected'), t('smallTasks.success'));
          setTimeout(() => {
            hideAlert();
            loadTaskDetails();
          }, 1500);
        } catch (error) {
          console.error('❌ Error rejecting bid:', error);
          showError(t('smallTasks.errorRejectingBid'), t('smallTasks.error'));
        }
      }
    );
  };

  const taskName = taskDetails?.taskType
    ? i18n.language === 'ar'
      ? taskDetails.taskType?.nameAr || t('smallTasks.task')
      : taskDetails.taskType?.nameEn || t('smallTasks.task')
    : t('smallTasks.task');

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, isArabic ? styles.headerRTL : styles.headerLTR, { paddingTop: Math.max(insets.top, 20), borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <BackArrowIonicons variant="chevron" size={24} color={colors.text} forceLtrLayout={!isArabic} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('smallTasks.taskDetails')}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Task Info Card - iOS style (no phase bar) */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.taskHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="construct" size={32} color={colors.primary} />
              </View>
              <View style={styles.taskInfo}>
                <Text style={[styles.taskIdText, { color: colors.textSecondary }]}>
                  #{taskDetails?.id ?? task?.id}
                </Text>
                <Text style={[styles.taskName, { color: colors.text }]}>
                  {taskName}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(currentStatus) }]}>
                    {getStatusLabel(currentStatus)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Description Section */}
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('smallTasks.description')}
              </Text>
            </View>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {(() => {
                const s = taskDetails?.description?.trim();
                if (!s || s === 'Not specified' || /<script/i.test(s)) return t('smallTasks.noDescriptionProvided');
                return s;
              })()}
            </Text>
          </View>

          {/* Budget and Duration */}
          {(taskDetails?.budget || taskDetails?.amount) && (
            <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cash-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('smallTasks.budget')}
                </Text>
              </View>
              <View style={styles.budgetContainer}>
                <ExpoImage
                  source={riyalLogo}
                  style={styles.riyalLogo}
                  contentFit="contain"
                />
                <Text style={[styles.budgetText, { color: colors.primary }]}>
                  {formatBudget(taskDetails.budget || taskDetails.amount || 0)}
                </Text>
              </View>
            </View>
          )}

          {/* Address Section */}
          <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('smallTasks.address')}
              </Text>
            </View>
            <Text style={[styles.addressText, { color: colors.textSecondary }]}>
              {taskDetails?.address || t('smallTasks.noAddressProvided')}
            </Text>
          </View>

          {/* Bids Section */}
          {bids.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('smallTasks.bids')} ({bids.length})
                </Text>
              </View>
              {bids.map((bid) => (
                <View key={bid.id} style={[styles.bidCard, { borderColor: colors.border }]}>
                  <View style={styles.bidHeader}>
                    <Text style={[styles.bidTechnicianName, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                      {bid.technicianName}
                    </Text>
                    <View style={styles.bidAmountContainer}>
                      <ExpoImage
                        source={riyalLogo}
                        style={styles.riyalLogoSmall}
                        contentFit="contain"
                      />
                      <Text style={[styles.bidAmount, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                        {formatBudget(bid.price ?? bid.amount ?? 0)}
                      </Text>
                    </View>
                  </View>
                  {(bid.notes ?? bid.description) && (
                    <Text style={[styles.bidMessage, { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily }]}>
                      {bid.notes ?? bid.description}
                    </Text>
                  )}
                  <View style={styles.bidFooterRow}>
                    <Text style={[styles.bidDate, { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily }]}>
                      {formatDate(bid.createdAt)}
                    </Text>
                    {userRole === 'user' && currentStatus === 'PENDING' && (
                      <View style={styles.bidActions}>
                        <TouchableOpacity
                          style={[styles.bidActionButton, styles.rejectButton, { borderColor: colors.border }]}
                          onPress={() => handleRejectBid(bid.id)}
                        >
                          <Ionicons name="close" size={16} color="#F44336" />
                          <Text style={[styles.bidActionText, { color: '#F44336', fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                            {t('smallTasks.reject')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.bidActionButton, styles.acceptButton, { backgroundColor: colors.primary }]}
                          onPress={() => handleAcceptBid(bid.id)}
                        >
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={[styles.bidActionText, { color: '#fff', fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                            {t('smallTasks.accept')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Created Date */}
          {taskDetails?.createdAt && (
            <View style={[styles.section, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('smallTasks.created')}
                </Text>
              </View>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDate(taskDetails.createdAt)}
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Floating Action Buttons */}
      {userRole === 'technician' && currentStatus === 'PENDING' && (
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
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowBidModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="pricetag" size={20} color="#fff" />
            <Text style={[styles.floatingButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
              {t('smallTasks.submitBid')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Status Update Buttons for Technician */}
      {userRole === 'technician' && (currentStatus === 'ACCEPTED' || currentStatus === 'ASSIGNED' || currentStatus === 'IN_PROGRESS') && (
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
              ],
            },
          ]}
        >
          {(currentStatus === 'ACCEPTED' || currentStatus === 'ASSIGNED') && (
            <TouchableOpacity
              style={[styles.floatingButton, { backgroundColor: colors.primary }]}
              onPress={() => handleUpdateStatus('IN_PROGRESS')}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={20} color="#fff" />
                  <Text style={[styles.floatingButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {t('smallTasks.startWork')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {currentStatus === 'IN_PROGRESS' && (
            <TouchableOpacity
              style={[styles.floatingButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleUpdateStatus('COMPLETED')}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={[styles.floatingButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {t('smallTasks.markComplete')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Bid Form Modal */}
      <SmallTaskBidFormModal
        visible={showBidModal}
        task={taskDetails}
        onClose={() => setShowBidModal(false)}
        onSuccess={() => {
          setShowBidModal(false);
          onSuccess?.();
          onBack();
        }}
      />

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

  function getStatusColor(status: string): string {
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case 'PENDING':
        return '#FFB703';
      case 'ACCEPTED':
      case 'ASSIGNED':
        return '#10B981';
      case 'IN_PROGRESS':
        return colors.primary;
      case 'COMPLETED':
        return '#4CAF50';
      case 'CANCELLED':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  }

  function getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': t('smallTasks.statusPending'),
      'ACCEPTED': t('smallTasks.statusAccepted'),
      'ASSIGNED': t('smallTasks.statusAssigned'),
      'IN_PROGRESS': t('smallTasks.statusInProgress'),
      'COMPLETED': t('smallTasks.statusCompleted'),
      'CANCELLED': t('smallTasks.statusCancelled'),
    };
    return statusMap[status.toUpperCase()] || status;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerLTR: {
    direction: 'ltr',
  },
  headerRTL: {
    direction: 'rtl',
  },
  backButton: {
    padding: 8,
    position: 'absolute',
    zIndex: 1,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseBarContainer: {
    marginBottom: 24,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskIdText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  taskName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  riyalLogo: {
    width: 20,
    height: 20,
  },
  budgetText: {
    fontSize: 20,
    fontWeight: '700',
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bidCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bidTechnicianName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  bidAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riyalLogoSmall: {
    width: 14,
    height: 14,
  },
  bidAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  bidMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  bidDate: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 14,
  },
  bidFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  bidActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bidActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  rejectButton: {
    borderWidth: 1,
  },
  acceptButton: {},
  bidActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: 'transparent',
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
