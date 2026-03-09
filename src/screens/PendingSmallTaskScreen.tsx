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
  RefreshControl,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import { getRequestDetails, getBidsOnRequest, acceptBid, rejectBid, cancelRequest } from '../services/SmallTaskService';
import SmallTaskPhaseBar from '../components/SmallTaskPhaseBar';
import SmallTaskBidFormModal from '../components/SmallTaskBidFormModal';
import SmallTaskBidCard from '../components/SmallTaskBidCard';
import SmallTaskBidComparisonView from '../components/SmallTaskBidComparisonView';
import SmallTaskCancelModal from '../components/SmallTaskCancelModal';
import SmallTaskEditModal from '../components/SmallTaskEditModal';
import EmptyBidsState from '../components/EmptyStates/EmptyBidsState';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import { SmallTaskRequest, SmallTaskBid } from '../types/smallTasks';

// Design tokens
const COLORS = {
  primary60: '#005DAC',
  primary10: '#E6EFF7',
  primary80: '#004A8A',
  green80: '#008B3E',
  green10: '#E6F5EC',
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  bgWhite: '#FFFFFF',
  error: '#EF4444',
  error10: '#FEE2E2',
  amber60: '#FFB703',
  amber10: '#FFF8E6',
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
  const [bids, setBids] = useState<SmallTaskBid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'comparison'>('list');
  const [userRole, setUserRole] = useState<'user' | 'technician'>('user');
  const [myBidId, setMyBidId] = useState<number | null>(null);

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

    // Button animation delay
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
    try {
      const role = await storage.getUserRole();
      setUserRole(role === 'TECHNICIAN' ? 'technician' : 'user');
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    setHasError(false);
    try {
      await loadTaskDetails();
      // Only the requester can view bids; technicians get "Only the requester can view bids" from API
      if (!isTechnician) {
        await loadBids();
      } else {
        setBids([]);
        // For technician: check if they already bid via my-bids (optional - could call getMyBids and find this request)
        const userId = await storage.getUserId();
        if (userId != null && task.id) {
          try {
            const { getMyBids } = await import('../services/SmallTaskService');
            const { bids: myBids } = await getMyBids();
            const myBid = myBids.find((b: { smallTaskRequestId?: number }) => b.smallTaskRequestId === task.id);
            if (myBid && (myBid as any).id) setMyBidId((myBid as any).id);
          } catch (_) {
            // ignore
          }
        }
      }
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

  const loadBids = async () => {
    if (isTechnician) return; // Only requester can view bids
    try {
      const list = await getBidsOnRequest(task.id);
      setBids(list as SmallTaskBid[]);
    } catch (error) {
      console.error('Error loading bids:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleAcceptBid = async (bidId: number) => {
    showConfirmation(
      t('Accept Bid'),
      t('Are you sure you want to accept this bid? Other bids will be rejected.'),
      async () => {
        try {
          await acceptBid(task.id, bidId);
          showSuccess(t('Bid accepted successfully'), t('Success'));
          await loadData();
          onSuccess?.();
        } catch (error) {
          console.error('Error accepting bid:', error);
          showError(t('Error accepting bid'), t('Error'));
        }
      }
    );
  };

  const handleRejectBid = async (bidId: number) => {
    showConfirmation(
      t('Reject Bid'),
      t('Are you sure you want to reject this bid?'),
      async () => {
        try {
          await rejectBid(bidId);
          showSuccess(t('Bid rejected'), t('Success'));
          await loadData();
        } catch (error) {
          console.error('Error rejecting bid:', error);
          showError(t('Error rejecting bid'), t('Error'));
        }
      }
    );
  };

  const handleCancelRequest = async () => {
    try {
      await cancelRequest(task.id);
      showSuccess(t('Task request cancelled successfully'), t('Success'));
      onSuccess?.();
      onBack();
    } catch (error: unknown) {
      console.error('Error cancelling request:', error);
      showError((error as Error).message || t('Error cancelling request'), t('Error'));
    }
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
        month: 'short',
        day: 'numeric',
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
        <View style={styles.topBarRight}>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.amber10 }]}>
            <Text style={[styles.statusText, { color: COLORS.amber60 }]}>{t('Pending')}</Text>
          </View>
          {userRole === 'user' && (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCancelModal(true)} style={styles.cancelButton}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
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
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {/* Phase Bar */}
          <View style={styles.phaseBarContainer}>
            <SmallTaskPhaseBar currentStatus="PENDING" onStatusChange={() => {}} />
          </View>

          {/* Task Info - Direct Fields (No Card) */}
          <View style={styles.taskInfoSection}>
            {/* Task Icon and Name + Request ID & Status (same as web) */}
            <View style={styles.taskHeaderSection}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="construct" size={32} color={colors.primary} />
              </View>
              <View style={styles.taskInfo}>
                <View style={[styles.requestIdStatusRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.requestIdText, { color: colors.textSecondary }]}>#{taskDetails.id}</Text>
                  <View style={[styles.cardStatusBadge, { backgroundColor: '#FFB70320' }]}>
                    <Text style={[styles.cardStatusBadgeText, { color: '#FFB703' }]}>{t('Pending')}</Text>
                  </View>
                </View>
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

            {/* Budget */}
            {(taskDetails.budget || taskDetails.amount) && (
              <View style={styles.fieldSection}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('Budget')}</Text>
                <View style={styles.budgetRow}>
                  <ExpoImage source={riyalLogo} style={styles.riyalLogo} contentFit="contain" />
                  <Text style={[styles.budgetText, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                    {formatBudget(taskDetails.budget || taskDetails.amount || 0)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Bids Section - For Users */}
          {userRole === 'user' && (
            <View style={styles.bidsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                  {t('Bids Received')} ({bids.length})
                </Text>
                {bids.length > 0 && (
                  <TouchableOpacity
                    style={styles.viewModeButton}
                    onPress={() => setViewMode(viewMode === 'list' ? 'comparison' : 'list')}
                  >
                    <Ionicons
                      name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {bids.length === 0 ? (
                <EmptyBidsState
                  message={t('No bids yet')}
                  submessage={t('Technicians will start bidding soon')}
                />
              ) : viewMode === 'comparison' ? (
                <SmallTaskBidComparisonView
                  bids={bids}
                  onAccept={handleAcceptBid}
                  onReject={handleRejectBid}
                  onViewTechnician={(technicianId) => onViewTechnician?.(technicianId)}
                  formatBudget={formatBudget}
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
                    formatBudget={formatBudget}
                    isUser={true}
                  />
                ))
              )}
            </View>
          )}

          {/* For Technicians - Show if already bid */}
          {isTechnician && myBidId && (
            <View style={[styles.myBidSection, { backgroundColor: COLORS.green10 }]}>
              <View style={styles.myBidInfo}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.green80} />
                <Text style={[styles.myBidText, { color: COLORS.green80, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('You have already submitted a bid for this task')}
                </Text>
              </View>
            </View>
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
            onPress={() => setShowBidModal(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.floatingButtonText, { fontFamily: fonts?.button || fontFamily, fontWeight: '600' }]}>
              {t('Submit Bid')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Bid Form Modal */}
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

      {/* Cancel Modal */}
      <SmallTaskCancelModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelRequest}
        taskName={taskName}
      />

      {/* Edit Modal */}
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
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
    paddingBottom: 100,
  },
  phaseBarContainer: {
    marginBottom: 16,
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
  requestIdStatusRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  requestIdText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardStatusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  riyalLogo: {
    width: 24,
    height: 24,
  },
  budgetText: {
    fontSize: 24,
    fontWeight: '700',
  },
  bidsSection: {
    marginHorizontal: 16,
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
  },
  viewModeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myBidSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  myBidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myBidText: {
    flex: 1,
    fontSize: 14,
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
