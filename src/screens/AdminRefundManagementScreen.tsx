import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import {
  getAllRefundRequests,
  getRefundRequest,
  approveRefundRequest,
  rejectRefundRequest,
  processRefund,
  RefundRequest,
  RefundStatus,
} from '../services/PaymentService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

interface AdminRefundManagementScreenProps {
  onBack: () => void;
}

export default function AdminRefundManagementScreen({
  onBack,
}: AdminRefundManagementScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();
  const isRTL = i18n.language === 'ar';

  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RefundStatus | 'ALL'>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'process' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();

  useEffect(() => {
    loadRefundRequests();
  }, [selectedStatus]);

  const loadRefundRequests = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await getAllRefundRequests({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        page: 0,
        size: 50,
      });

      setRefundRequests(response.content);
    } catch (error: any) {
      console.error('Error loading refund requests:', error);
      showError(error.message || t('Failed to load refund requests'), t('Error'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleApprove = (request: RefundRequest) => {
    setSelectedRequest(request);
    setActionType('approve');
    setAdminNotes('');
    setShowActionModal(true);
  };

  const handleReject = (request: RefundRequest) => {
    setSelectedRequest(request);
    setActionType('reject');
    setRejectionReason('');
    setAdminNotes('');
    setShowActionModal(true);
  };

  const handleProcess = (request: RefundRequest) => {
    showConfirmation(
      t('Process Refund'),
      t('Mark this refund as processed? This should only be done after the actual refund has been completed via the payment gateway.'),
      async () => {
        await submitProcess(request);
      }
    );
  };

  const submitApprove = async () => {
    if (!selectedRequest) return;

    try {
      setIsSubmitting(true);
      await approveRefundRequest(selectedRequest.id, adminNotes.trim() || undefined);
      showSuccess(t('Refund request approved'), t('Success'));
      setShowActionModal(false);
      setSelectedRequest(null);
      setActionType(null);
      setAdminNotes('');
      loadRefundRequests(true);
    } catch (error: any) {
      console.error('Error approving refund:', error);
      showError(error.message || t('Failed to approve refund'), t('Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!selectedRequest) return;

    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      showError(t('Please provide a rejection reason (minimum 10 characters)'), t('Error'));
      return;
    }

    try {
      setIsSubmitting(true);
      await rejectRefundRequest(
        selectedRequest.id,
        rejectionReason.trim(),
        adminNotes.trim() || undefined
      );
      showSuccess(t('Refund request rejected'), t('Success'));
      setShowActionModal(false);
      setSelectedRequest(null);
      setActionType(null);
      setRejectionReason('');
      setAdminNotes('');
      loadRefundRequests(true);
    } catch (error: any) {
      console.error('Error rejecting refund:', error);
      showError(error.message || t('Failed to reject refund'), t('Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitProcess = async (request: RefundRequest) => {
    try {
      setIsSubmitting(true);
      await processRefund(request.id);
      showSuccess(t('Refund marked as processed'), t('Success'));
      loadRefundRequests(true);
    } catch (error: any) {
      console.error('Error processing refund:', error);
      showError(error.message || t('Failed to process refund'), t('Error'));
    } finally {
      setIsSubmitting(false);
    }
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

  const formatAmount = (amount: number, currency: string = 'SAR') => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: RefundStatus) => {
    switch (status) {
      case 'APPROVED':
        return colors.success || '#1A9F78';
      case 'PENDING':
        return colors.warning || '#FFA500';
      case 'REJECTED':
        return colors.error || '#FF3B30';
      case 'PROCESSED':
        return colors.primary || '#005DAC';
      default:
        return colors.textSecondary || '#999999';
    }
  };

  const getStatusIcon = (status: RefundStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'checkmark-circle';
      case 'PENDING':
        return 'time';
      case 'REJECTED':
        return 'close-circle';
      case 'PROCESSED':
        return 'checkmark-done-circle';
      default:
        return 'help-circle';
    }
  };

  const renderFilterChips = () => {
    const statuses: (RefundStatus | 'ALL')[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'PROCESSED'];

    return (
      <View style={[styles.filtersContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {statuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedStatus === status ? colors.primary : colors.cardBackground,
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
                {status === 'ALL' ? t('All') : t(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderRefundRequestCard = (request: RefundRequest) => {
    const statusColor = getStatusColor(request.status);
    const statusIcon = getStatusIcon(request.status);
    const transaction = request.paymentTransaction;

    return (
      <View
        key={request.id}
        style={[styles.requestCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestHeaderLeft}>
            <View style={[styles.statusIconContainer, { backgroundColor: statusColor + '20' }]}>
              <Ionicons name={statusIcon as any} size={20} color={statusColor} />
            </View>
            <View style={styles.requestInfo}>
              <Text style={[styles.requestId, { color: colors.text, fontSize: scaledSize(14) }]}>
                {t('Request')} #{request.id}
              </Text>
              <Text style={[styles.requestDate, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                {formatDate(request.createdAt)}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor, fontSize: scaledSize(11) }]}>
              {t(request.status)}
            </Text>
          </View>
        </View>

        {/* User Info */}
        {request.requestedByName && (
          <View style={styles.userInfo}>
            <Ionicons name="person" size={14} color={colors.textSecondary} />
            <Text style={[styles.userText, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
              {request.requestedByName} (ID: {request.requestedById})
            </Text>
          </View>
        )}

        {/* Transaction Info */}
        {transaction && (
          <View style={styles.transactionInfo}>
            <Text style={[styles.transactionLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
              {t('Transaction')}:
            </Text>
            <Text style={[styles.transactionText, { color: colors.text, fontSize: scaledSize(14) }]}>
              {formatAmount(transaction.amount, transaction.currency)} - {t(transaction.status)}
            </Text>
          </View>
        )}

        {/* Reason */}
        <View style={styles.reasonContainer}>
          <Text style={[styles.reasonLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
            {t('Reason')}:
          </Text>
          <Text style={[styles.reasonText, { color: colors.text, fontSize: scaledSize(13) }]}>
            {request.reason}
          </Text>
        </View>

        {/* Admin Notes */}
        {request.adminNotes && (
          <View style={styles.adminNotesContainer}>
            <Text style={[styles.adminNotesLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
              {t('Admin Notes')}:
            </Text>
            <Text style={[styles.adminNotesText, { color: colors.text, fontSize: scaledSize(12) }]}>
              {request.adminNotes}
            </Text>
          </View>
        )}

        {/* Rejection Reason */}
        {request.rejectionReason && (
          <View style={[styles.rejectionContainer, { backgroundColor: colors.error + '10' }]}>
            <Text style={[styles.rejectionLabel, { color: colors.error, fontSize: scaledSize(12) }]}>
              {t('Rejection Reason')}:
            </Text>
            <Text style={[styles.rejectionText, { color: colors.error, fontSize: scaledSize(12) }]}>
              {request.rejectionReason}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {request.status === 'PENDING' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton, { backgroundColor: colors.success }]}
                onPress={() => handleApprove(request)}
              >
                <Ionicons name="checkmark" size={16} color={colors.cardBackground} />
                <Text style={[styles.actionButtonText, { color: colors.cardBackground, fontSize: scaledSize(12) }]}>
                  {t('Approve')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton, { backgroundColor: colors.error }]}
                onPress={() => handleReject(request)}
              >
                <Ionicons name="close" size={16} color={colors.cardBackground} />
                <Text style={[styles.actionButtonText, { color: colors.cardBackground, fontSize: scaledSize(12) }]}>
                  {t('Reject')}
                </Text>
              </TouchableOpacity>
            </>
          )}
          {request.status === 'APPROVED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.processButton, { backgroundColor: colors.primary }]}
              onPress={() => handleProcess(request)}
            >
              <Ionicons name="checkmark-done" size={16} color={colors.cardBackground} />
              <Text style={[styles.actionButtonText, { color: colors.cardBackground, fontSize: scaledSize(12) }]}>
                {t('Mark as Processed')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderActionModal = () => {
    return (
      <Modal
        visible={showActionModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowActionModal(false);
          setSelectedRequest(null);
          setActionType(null);
          setAdminNotes('');
          setRejectionReason('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.overlay || 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
                  {actionType === 'approve' && t('Approve Refund')}
                  {actionType === 'reject' && t('Reject Refund')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowActionModal(false);
                    setSelectedRequest(null);
                    setActionType(null);
                    setAdminNotes('');
                    setRejectionReason('');
                  }}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modalBody}>
                  {actionType === 'reject' && (
                    <>
                      <Text style={[styles.inputLabel, { color: colors.text, fontSize: scaledSize(14) }]}>
                        {t('Rejection Reason')} *
                      </Text>
                      <TextInput
                        style={[
                          styles.reasonInput,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            color: colors.text,
                            fontSize: scaledSize(14),
                          },
                        ]}
                        placeholder={t('Enter rejection reason...')}
                        placeholderTextColor={colors.textSecondary}
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        maxLength={500}
                      />
                    </>
                  )}
                  <Text style={[styles.inputLabel, { color: colors.text, fontSize: scaledSize(14) }]}>
                    {t('Admin Notes')} ({t('Optional')})
                  </Text>
                  <TextInput
                    style={[
                      styles.notesInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.text,
                        fontSize: scaledSize(14),
                      },
                    ]}
                    placeholder={t('Enter admin notes...')}
                    placeholderTextColor={colors.textSecondary}
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowActionModal(false);
                    setSelectedRequest(null);
                    setActionType(null);
                    setAdminNotes('');
                    setRejectionReason('');
                  }}
                >
                  <Text style={[styles.modalCancelText, { color: colors.text, fontSize: scaledSize(14) }]}>
                    {t('Cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    {
                      backgroundColor:
                        actionType === 'reject' && (!rejectionReason.trim() || rejectionReason.trim().length < 10)
                          ? colors.border
                          : actionType === 'approve'
                            ? colors.success
                            : colors.error,
                      opacity:
                        actionType === 'reject' && (!rejectionReason.trim() || rejectionReason.trim().length < 10)
                          ? 0.6
                          : 1,
                    },
                  ]}
                  onPress={actionType === 'approve' ? submitApprove : submitReject}
                  disabled={
                    isSubmitting ||
                    (actionType === 'reject' && (!rejectionReason.trim() || rejectionReason.trim().length < 10))
                  }
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.cardBackground} />
                  ) : (
                    <Text style={[styles.modalSubmitText, { color: colors.cardBackground, fontSize: scaledSize(14) }]}>
                      {actionType === 'approve' ? t('Approve') : t('Reject')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.cardBackground,
            borderBottomColor: colors.border,
            paddingTop: insets.top,
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(20) }]}>
          {t('Refund Management')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filters */}
      {renderFilterChips()}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('Loading refund requests...')}
          </Text>
        </View>
      ) : refundRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
            {t('No refund requests')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadRefundRequests(true)} />}
        >
          {refundRequests.map((request) => renderRefundRequestCard(request))}
        </ScrollView>
      )}

      {/* Action Modal */}
      {renderActionModal()}

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
        confirmStyle={confirmState.confirmStyle}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirmation}
      />
    </View>
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
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  filtersContainer: {
    borderBottomWidth: 1,
  },
  filterScroll: {
    maxHeight: 60,
  },
  filterContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
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
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestHeaderLeft: {
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
  requestInfo: {
    flex: 1,
  },
  requestId: {
    fontWeight: '700',
    marginBottom: 4,
  },
  requestDate: {
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  userText: {
    flex: 1,
  },
  transactionInfo: {
    marginBottom: 12,
  },
  transactionLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionText: {
    fontWeight: '600',
  },
  reasonContainer: {
    marginBottom: 12,
  },
  reasonLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  reasonText: {
    lineHeight: 18,
  },
  adminNotesContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  adminNotesLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  adminNotesText: {
    lineHeight: 18,
  },
  rejectionContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  rejectionLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  rejectionText: {
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {},
  rejectButton: {},
  processButton: {},
  actionButtonText: {
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
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: 4,
    position: 'absolute',
    right: 16,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontWeight: '600',
  },
});
