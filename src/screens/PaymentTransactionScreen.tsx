import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import {
  getMyTransactions,
  PaymentTransaction,
  PaymentStatus,
  PaymentType,
} from '../services/PaymentService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import { getTopPadding } from '../utils/statusBarHelper';

interface PaymentTransactionScreenProps {
  onBack: () => void;
  onViewTransaction?: (transaction: PaymentTransaction) => void;
  onRequestRefund?: (transaction: PaymentTransaction) => void;
}

export default function PaymentTransactionScreen({
  onBack,
  onViewTransaction,
  onRequestRefund,
}: PaymentTransactionScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<PaymentType | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const { alertState, showError, hideAlert } = useAlertPopup();

  const screenWidth = Dimensions.get('window').width;
  const screenSlideX = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    screenSlideX.setValue(-screenWidth);
    screenOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(screenSlideX, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBackScreen = () => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(screenSlideX, { toValue: screenWidth, duration: 220, useNativeDriver: true }),
    ]).start(() => onBack());
  };

  useEffect(() => {
    loadTransactions();
  }, [selectedStatus, selectedType]);

  const loadTransactions = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
        setPage(0);
      } else {
        setIsLoading(true);
      }

      const currentPage = refresh ? 0 : page;
      const response = await getMyTransactions({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        type: selectedType === 'ALL' ? undefined : selectedType,
        page: currentPage,
        size: 20,
      });

      if (refresh || currentPage === 0) {
        setTransactions(response.content);
      } else {
        setTransactions((prev) => [...prev, ...response.content]);
      }

      setTotalPages(response.totalPages);
      setHasMore(currentPage < response.totalPages - 1);
      setPage(currentPage + 1);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      showError(error.message || t('payments.loadFailed'), t('payments.Error'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadTransactions(true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadTransactions();
    }
  };

  const formatAmount = (amount: number, currency: string = 'SAR') => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return colors.success || '#1A9F78';
      case 'PENDING':
        return colors.warning || '#FFA500';
      case 'FAILED':
        return colors.error || '#FF3B30';
      case 'REFUNDED':
        return colors.textSecondary || '#999999';
      default:
        return colors.textSecondary || '#999999';
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return 'checkmark-circle';
      case 'PENDING':
        return 'time';
      case 'FAILED':
        return 'close-circle';
      case 'REFUNDED':
        return 'arrow-undo-circle';
      default:
        return 'help-circle';
    }
  };

  const getPaymentTypeLabel = (type: PaymentType) => {
    switch (type) {
      case 'PROJECT':
        return t('payments.typeProject');
      case 'PHASE':
        return t('payments.typePhase');
      case 'SMALL_TASK':
        return t('payments.typeSmallTask');
      case 'SUBSCRIPTION':
        return t('payments.typeSubscription');
      default:
        return type;
    }
  };

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case 'COMPLETED':
        return t('payments.statusCompleted');
      case 'PENDING':
        return t('payments.statusPending');
      case 'FAILED':
        return t('payments.statusFailed');
      case 'REFUNDED':
        return t('payments.statusRefunded');
      default:
        return status;
    }
  };

  const renderFilterChips = () => {
    const statuses: (PaymentStatus | 'ALL')[] = ['ALL', 'COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'];
    const types: (PaymentType | 'ALL')[] = ['ALL', 'PROJECT', 'PHASE', 'SMALL_TASK', 'SUBSCRIPTION'];

    return (
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {/* Status Filters */}
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
              {t('payments.status')}:
            </Text>
            {statuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      selectedStatus === status ? colors.primary : colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: selectedStatus === status ? colors.cardBackground : colors.text,
                      fontSize: scaledSize(12),
                    },
                  ]}
                >
                  {status === 'ALL' ? t('payments.all') : getStatusLabel(status as PaymentStatus)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Type Filters */}
          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
              {t('payments.type')}:
            </Text>
            {types.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedType === type ? colors.primary : colors.cardBackground,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: selectedType === type ? colors.cardBackground : colors.text,
                      fontSize: scaledSize(12),
                    },
                  ]}
                >
                  {type === 'ALL' ? t('payments.all') : getPaymentTypeLabel(type as PaymentType)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderTransactionCard = (transaction: PaymentTransaction) => {
    const statusColor = getStatusColor(transaction.status);
    const statusIcon = getStatusIcon(transaction.status);

    return (
      <TouchableOpacity
        key={transaction.id}
        style={[styles.transactionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => onViewTransaction?.(transaction)}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.transactionHeaderLeft}>
            <View style={[styles.statusIconContainer, { backgroundColor: statusColor + '20' }]}>
              <Ionicons name={statusIcon as any} size={20} color={statusColor} />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={[styles.transactionAmount, { color: colors.text, fontSize: scaledSize(18) }]}>
                {formatAmount(transaction.amount, transaction.currency)}
              </Text>
              <Text style={[styles.transactionType, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                {getPaymentTypeLabel(transaction.paymentType)}
                {transaction.projectDescription && ` - ${transaction.projectDescription}`}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor, fontSize: scaledSize(11) }]}>
              {getStatusLabel(transaction.status)}
            </Text>
          </View>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="card" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
              {transaction.paymentBrand}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
              {formatDate(transaction.createdAt)}
            </Text>
          </View>
          {transaction.commissionAmount > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="receipt" size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                {t('payments.commission')}: {formatAmount(transaction.commissionAmount, transaction.currency)}
              </Text>
            </View>
          )}
        </View>

        {transaction.canRequestRefund && !transaction.hasRefundRequest && (
          <TouchableOpacity
            style={[styles.refundButton, { borderColor: colors.primary }]}
            onPress={() => onRequestRefund?.(transaction)}
          >
            <Ionicons name="arrow-undo" size={16} color={colors.primary} />
            <Text style={[styles.refundButtonText, { color: colors.primary, fontSize: scaledSize(12) }]}>
              {t('payments.requestRefund')}
            </Text>
          </TouchableOpacity>
        )}

        {transaction.hasRefundRequest && (
          <View style={[styles.refundRequestedBadge, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="time" size={14} color={colors.warning} />
            <Text style={[styles.refundRequestedText, { color: colors.warning, fontSize: scaledSize(11) }]}>
              {t('payments.refundRequested')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, opacity: screenOpacity, transform: [{ translateX: screenSlideX }] }]}>
      {/* Header – LTR so back stays left, title center */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.cardBackground,
            borderBottomColor: colors.border,
            paddingTop: 0,
            direction: 'ltr',
            flexDirection: 'row',
          },
        ]}
      >
        <TouchableOpacity onPress={handleBackScreen} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(20) }]}>
          {t('payments.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filters */}
      {renderFilterChips()}

      {/* Content */}
      {isLoading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('payments.loading')}
          </Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
            {t('payments.empty')}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
            {t('payments.emptyHint')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          onScrollEndDrag={handleLoadMore}
        >
          {transactions.map((transaction) => renderTransactionCard(transaction))}
          {isLoading && transactions.length > 0 && (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    direction: 'ltr',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontWeight: '600',
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterScroll: {
    maxHeight: 120,
  },
  filterContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterLabel: {
    marginRight: 8,
    fontWeight: '600',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 4,
  },
  filterChipText: {
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  transactionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    fontWeight: '700',
    marginBottom: 4,
  },
  transactionType: {
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  transactionDetails: {
    marginTop: 8,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    flex: 1,
  },
  refundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  refundButtonText: {
    fontWeight: '600',
  },
  refundRequestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 12,
    borderRadius: 8,
    gap: 6,
  },
  refundRequestedText: {
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
