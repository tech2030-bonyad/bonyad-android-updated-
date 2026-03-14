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
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import { getRequestDetails, getBidsOnRequest, acceptBid, rejectBid, cancelRequest } from '../services/SmallTaskService';
import SmallTaskBidFormModal from '../components/SmallTaskBidFormModal';
import SmallTaskBidCard from '../components/SmallTaskBidCard';
import SmallTaskBidComparisonView from '../components/SmallTaskBidComparisonView';
import SmallTaskCancelModal from '../components/SmallTaskCancelModal';
import SmallTaskEditModal from '../components/SmallTaskEditModal';
import EmptyBidsState from '../components/EmptyStates/EmptyBidsState';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import { SmallTaskRequest, SmallTaskBid } from '../types/smallTasks';

// iOS-matching design colors
const COLORS = {
  primaryLight: '#1A6DB4',
  primaryDark: '#4D8EC5',
  borderLight: 'rgba(26, 109, 180, 0.2)',
  borderDark: 'rgba(77, 142, 197, 0.3)',
  statusPending: '#FF9500',
  statusAccepted: '#007AFF',
  statusInProgress: '#AF52DE',
  statusCompleted: '#34C759',
  statusCancelled: '#8E8E93',
  error: '#FF3B30',
};

interface PendingSmallTaskScreenProps {
  task: SmallTaskRequest;
  onBack: () => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
  onViewTechnician?: (technicianId: number) => void;
}

export default function PendingSmallTaskScreen({
  task,
  onBack,
  onSuccess,
  isTechnician = false,
  onViewTechnician,
}: PendingSmallTaskScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';

  const [taskDetails, setTaskDetails] = useState<SmallTaskRequest>(task);
  const [bids, setBids] = useState<SmallTaskBid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'comparison'>('list');
  const [userRole, setUserRole] = useState<'user' | 'technician'>('user');
  const [myBidId, setMyBidId] = useState<number | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();

  const primaryColor = isDarkMode ? COLORS.primaryDark : COLORS.primaryLight;
  const borderColor = isDarkMode ? COLORS.borderDark : COLORS.borderLight;

  useEffect(() => {
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
    ]).start();

    Animated.spring(buttonAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: 200,
      useNativeDriver: true,
    }).start();

    checkUserRole();
    loadData();
  }, []);

  const checkUserRole = async () => {
    const role = await storage.getUserRole();
    setUserRole(role === 'TECHNICIAN' ? 'technician' : 'user');
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loadTaskDetails();
      if (!isTechnician) {
        await loadBids();
      } else {
        setBids([]);
        const userId = await storage.getUserId();
        if (userId != null && task.id) {
          try {
            const { getMyBids } = await import('../services/SmallTaskService');
            const { bids: myBids } = await getMyBids();
            const myBid = myBids.find((b: { smallTaskRequestId?: number }) => b.smallTaskRequestId === task.id);
            if (myBid && (myBid as any).id) setMyBidId((myBid as any).id);
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(t('failed_to_load_data'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadTaskDetails = async () => {
    const data = await getRequestDetails(task.id);
    setTaskDetails({
      ...data,
      taskType: data.taskTypeId
        ? { id: data.taskTypeId, nameAr: data.taskTypeNameAr || '', nameEn: data.taskTypeNameEn || '' }
        : undefined,
    } as SmallTaskRequest);
  };

  const loadBids = async () => {
    if (isTechnician) return;
    const list = await getBidsOnRequest(task.id);
    setBids(list as SmallTaskBid[]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleAcceptBid = async (bidId: number) => {
    showConfirmation(
      t('accept_bid'),
      t('confirm_accept_bid_message'),
      async () => {
        try {
          await acceptBid(task.id, bidId);
          showSuccess(t('bid_accepted_successfully'), t('success'));
          await loadData();
          onSuccess?.();
        } catch (error) {
          showError(t('error_accepting_bid'), t('error'));
        }
      }
    );
  };

  const handleRejectBid = async (bidId: number) => {
    showConfirmation(
      t('reject_bid'),
      t('confirm_reject_bid'),
      async () => {
        try {
          await rejectBid(bidId);
          showSuccess(t('bid_rejected'), t('success'));
          await loadData();
        } catch (error) {
          showError(t('error_rejecting_bid'), t('error'));
        }
      }
    );
  };

  const handleCancelRequest = async () => {
    try {
      await cancelRequest(task.id);
      showSuccess(t('request_cancelled_successfully'), t('success'));
      onSuccess?.();
      onBack();
    } catch (error: unknown) {
      showError((error as Error).message || t('error_cancelling_request'), t('error'));
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return COLORS.statusPending;
      case 'ACCEPTED': return COLORS.statusAccepted;
      case 'IN_PROGRESS': return COLORS.statusInProgress;
      case 'COMPLETED': return COLORS.statusCompleted;
      case 'CANCELLED': return COLORS.statusCancelled;
      default: return COLORS.statusCancelled;
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'PENDING': t('pending'),
      'ACCEPTED': t('accepted'),
      'IN_PROGRESS': t('in_progress'),
      'COMPLETED': t('completed'),
      'CANCELLED': t('cancelled'),
    };
    return statusMap[status?.toUpperCase()] || status;
  };

  const taskName = taskDetails?.taskType
    ? i18n.language === 'ar'
      ? taskDetails.taskType?.nameAr || t('task')
      : taskDetails.taskType?.nameEn || t('task')
    : t('task');

  const statusColor = getStatusColor(taskDetails.status);
  const canCancel = taskDetails.status === 'PENDING' || taskDetails.status === 'ACCEPTED';

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('loading')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>{t('error')}</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: primaryColor }]}
            onPress={loadData}
          >
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[
        styles.header,
        { paddingTop: insets.top, borderBottomColor: colors.border },
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={primaryColor} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: primaryColor }]}>
          {t('task_request_details')}
        </Text>

        <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {userRole === 'user' && canCancel && (
            <>
              <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.actionButton}>
                <Ionicons name="create-outline" size={20} color={primaryColor} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCancelModal(true)} style={styles.actionButton}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={primaryColor} />
          }
        >
          {/* Status Card - iOS style (no phase bar, just status card with colored border) */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: statusColor + '30' }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('status')}</Text>
            <View style={[styles.statusRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusValue, { color: statusColor }]}>
                {getStatusLabel(taskDetails.status)}
              </Text>
            </View>
          </View>

          {/* Task Type Card */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('task_type')}</Text>
            <Text style={[styles.cardValue, { color: colors.text }]}>{taskName}</Text>
          </View>

          {/* Description Card */}
          {taskDetails.description && (
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('description')}</Text>
              <Text style={[styles.cardValue, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {taskDetails.description}
              </Text>
            </View>
          )}

          {/* Address Card */}
          {taskDetails.address && (
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('address')}</Text>
              <Text style={[styles.cardValue, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>{taskDetails.address}</Text>
            </View>
          )}

          {/* Bids Card - iOS style with hand.raised.fill icon and View Bids button */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('bids')}</Text>
            <View style={[styles.bidsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.bidsInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.bidsCountText, { color: colors.text }]}>
                  {bids.length} {bids.length === 1 ? t('bid') : t('bids')}
                </Text>
              </View>
              {/* View Bids button - iOS style */}
              {bids.length > 0 && userRole === 'user' && (
                <TouchableOpacity
                  style={[styles.viewBidsButton, { backgroundColor: primaryColor }]}
                  onPress={() => {/* Scroll to bids section */}}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewBidsButtonText}>{t('view_bids')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Created Date Card */}
          {taskDetails.createdAt && (
            <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: borderColor }]}>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{t('created_at')}</Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>
                {formatDate(taskDetails.createdAt)}
              </Text>
            </View>
          )}

          {/* Bids Section - For Users */}
          {userRole === 'user' && (
            <View style={styles.bidsSection}>
              <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('bids_received')} ({bids.length})
                </Text>
                {bids.length > 0 && (
                  <TouchableOpacity
                    style={styles.viewModeButton}
                    onPress={() => setViewMode(viewMode === 'list' ? 'comparison' : 'list')}
                  >
                    <Ionicons
                      name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
                      size={20}
                      color={primaryColor}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {bids.length === 0 ? (
                <EmptyBidsState
                  message={t('no_bids_yet')}
                  submessage={t('technicians_will_start_bidding_soon')}
                />
              ) : viewMode === 'comparison' ? (
                <SmallTaskBidComparisonView
                  bids={bids}
                  onAccept={handleAcceptBid}
                  onReject={handleRejectBid}
                  onViewTechnician={(technicianId) => onViewTechnician?.(technicianId)}
                  formatBudget={(amount: number) => new Intl.NumberFormat('en-US').format(amount) + ' SAR'}
                />
              ) : (
                bids.map((bid, index) => (
                  <SmallTaskBidCard
                    key={bid.id}
                    bid={bid}
                    index={index}
                    onAccept={() => handleAcceptBid(bid.id)}
                    onReject={() => handleRejectBid(bid.id)}
                    onViewTechnician={() => onViewTechnician?.(bid.technicianId)}
                    formatBudget={(amount: number) => new Intl.NumberFormat('en-US').format(amount) + ' SAR'}
                    isUser={true}
                  />
                ))
              )}
            </View>
          )}

          {/* For Technicians - Show if already bid */}
          {isTechnician && myBidId && (
            <View style={[styles.myBidSection, { backgroundColor: COLORS.statusCompleted + '15' }]}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.statusCompleted} />
              <Text style={[styles.myBidText, { color: COLORS.statusCompleted }]}>
                {t('you_have_already_submitted_a_bid')}
              </Text>
            </View>
          )}

          {/* Cancel Button - iOS style with xmark.circle.fill icon */}
          {userRole === 'user' && canCancel && (
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: COLORS.error }]}
              onPress={() => setShowCancelModal(true)}
            >
              <Ionicons name="close-circle" size={18} color="#FFFFFF" style={styles.cancelButtonIcon} />
              <Text style={styles.cancelButtonText}>{t('cancel_request')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>

      {/* Floating Action Button - For Technicians */}
      {isTechnician && !myBidId && (
        <Animated.View
          style={[
            styles.floatingButtonContainer,
            {
              opacity: buttonAnim,
              transform: [
                { translateY: buttonAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) },
                { scale: buttonAnim },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: primaryColor }]}
            onPress={() => setShowBidModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingButtonText}>{t('submit_bid')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Modals */}
      <SmallTaskBidFormModal
        visible={showBidModal}
        task={taskDetails}
        onClose={() => setShowBidModal(false)}
        onSuccess={() => {
          setShowBidModal(false);
          loadData();
          onSuccess?.();
        }}
      />

      <SmallTaskCancelModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelRequest}
        taskName={taskName}
      />

      <SmallTaskEditModal
        visible={showEditModal}
        task={taskDetails}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          setShowEditModal(false);
          loadData();
          onSuccess?.();
        }}
      />

      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  bidsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bidsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bidsCountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewBidsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewBidsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bidsSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myBidSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  myBidText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  cancelButtonIcon: {
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  floatingButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
