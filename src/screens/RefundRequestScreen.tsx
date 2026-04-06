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
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import {
  getMyRefundRequests,
  requestRefund,
  RefundRequest,
  RefundStatus,
} from '../services/PaymentService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

interface RefundRequestScreenProps {
  onBack: () => void;
  transactionId?: number; // If provided, show refund request form for this transaction
}

export default function RefundRequestScreen({
  onBack,
  transactionId,
}: RefundRequestScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();
  const isRTL = i18n.language === 'ar';

  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(!!transactionId);
  const [refundReason, setRefundReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | undefined>(transactionId);

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();

  useEffect(() => {
    if (!showRequestModal) {
      loadRefundRequests();
    }
  }, [showRequestModal]);

  const loadRefundRequests = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await getMyRefundRequests({
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

  const handleRequestRefund = () => {
    if (!selectedTransactionId) {
      showError(t('Please select a transaction'), t('Error'));
      return;
    }

    if (!refundReason.trim() || refundReason.trim().length < 10) {
      showError(t('Please provide a reason (minimum 10 characters)'), t('Error'));
      return;
    }

    if (refundReason.trim().length > 1000) {
      showError(t('Reason must be less than 1000 characters'), t('Error'));
      return;
    }

    showConfirmation(
      t('Request Refund'),
      t('Are you sure you want to request a refund for this transaction?'),
      async () => {
        await submitRefundRequest();
      }
    );
  };

  const submitRefundRequest = async () => {
    if (!selectedTransactionId) return;

    try {
      setIsSubmitting(true);
      const refund = await requestRefund(selectedTransactionId, refundReason.trim());
      showSuccess(t('Refund request submitted successfully'), t('Success'));
      setShowRequestModal(false);
      setRefundReason('');
      setSelectedTransactionId(undefined);
      loadRefundRequests(true);
    } catch (error: any) {
      console.error('Error requesting refund:', error);
      showError(error.message || t('Failed to submit refund request'), t('Error'));
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

  const renderRefundRequestCard = (request: RefundRequest) => {
    const statusColor = getStatusColor(request.status);
    const statusIcon = getStatusIcon(request.status);

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

        <View style={styles.requestDetails}>
          <Text style={[styles.reasonLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
            {t('Reason')}:
          </Text>
          <Text style={[styles.reasonText, { color: colors.text, fontSize: scaledSize(14) }]}>
            {request.reason}
          </Text>
        </View>

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

        {request.processedAt && (
          <View style={styles.processedInfo}>
            <Ionicons name="checkmark-done" size={14} color={colors.success} />
            <Text style={[styles.processedText, { color: colors.success, fontSize: scaledSize(11) }]}>
              {t('Processed on')} {formatDate(request.processedAt)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderRequestModal = () => {
    const characterCount = refundReason.length;
    const minChars = 10;
    const maxChars = 1000;

    return (
      <Modal
        visible={showRequestModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowRequestModal(false);
          setRefundReason('');
          setSelectedTransactionId(undefined);
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
                  {t('Request Refund')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowRequestModal(false);
                    setRefundReason('');
                    setSelectedTransactionId(undefined);
                  }}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.modalBody}>
                  <Text style={[styles.inputLabel, { color: colors.text, fontSize: scaledSize(14) }]}>
                    {t('Refund Reason')} *
                  </Text>
                  <Text style={[styles.inputHint, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                    {t('Please explain why you are requesting a refund (10-1000 characters)')}
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
                    placeholder={t('Enter refund reason...')}
                    placeholderTextColor={colors.textSecondary}
                    value={refundReason}
                    onChangeText={setRefundReason}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={maxChars}
                  />
                  <View style={styles.characterCountContainer}>
                    <Text
                      style={[
                        styles.characterCount,
                        {
                          color:
                            characterCount < minChars || characterCount > maxChars
                              ? colors.error
                              : colors.textSecondary,
                          fontSize: scaledSize(11),
                        },
                      ]}
                    >
                      {characterCount}/{maxChars} {t('characters')}
                      {characterCount < minChars && ` (${t('minimum')} ${minChars})`}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowRequestModal(false);
                    setRefundReason('');
                    setSelectedTransactionId(undefined);
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
                        refundReason.trim().length >= minChars && refundReason.trim().length <= maxChars
                          ? colors.primary
                          : colors.border,
                      opacity:
                        refundReason.trim().length >= minChars && refundReason.trim().length <= maxChars && !isSubmitting
                          ? 1
                          : 0.6,
                    },
                  ]}
                  onPress={handleRequestRefund}
                  disabled={
                    isSubmitting ||
                    refundReason.trim().length < minChars ||
                    refundReason.trim().length > maxChars
                  }
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.cardBackground} />
                  ) : (
                    <Text style={[styles.modalSubmitText, { color: colors.cardBackground, fontSize: scaledSize(14) }]}>
                      {t('Submit Request')}
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
          <BackArrowIonicons variant="arrow" size={24} color={colors.text}/>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(20) }]}>
          {t('Refund Requests')}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setSelectedTransactionId(undefined);
            setShowRequestModal(true);
          }}
          style={styles.addButton}
        >
          <Ionicons name="add-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

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
          <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
            {t('Your refund requests will appear here')}
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setSelectedTransactionId(undefined);
              setShowRequestModal(true);
            }}
          >
            <Text style={[styles.emptyButtonText, { color: colors.cardBackground, fontSize: scaledSize(14) }]}>
              {t('Request Refund')}
            </Text>
          </TouchableOpacity>
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

      {/* Request Modal */}
      {renderRequestModal()}

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
  addButton: {
    padding: 4,
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
  requestDetails: {
    marginTop: 8,
  },
  reasonLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  reasonText: {
    lineHeight: 20,
  },
  adminNotesContainer: {
    marginTop: 12,
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
    marginTop: 12,
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
  processedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  processedText: {
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
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
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
    marginBottom: 4,
  },
  inputHint: {
    marginBottom: 12,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCountContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 11,
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
