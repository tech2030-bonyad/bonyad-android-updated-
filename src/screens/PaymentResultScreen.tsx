import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { getPaymentStatus, PaymentStatus } from '../services/PaymentService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface PaymentResultScreenProps {
  checkoutId: string;
  onBack?: () => void;
  onSuccess?: (transactionId?: number) => void;
  onRetry?: () => void;
}

export default function PaymentResultScreen({
  checkoutId,
  onBack,
  onSuccess,
  onRetry,
}: PaymentResultScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();
  const isRTL = i18n.language === 'ar';

  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<number | undefined>();

  const { alertState, showError, hideAlert } = useAlertPopup();

  useEffect(() => {
    verifyPayment();
  }, [checkoutId]);

  const verifyPayment = async () => {
    try {
      setIsVerifying(true);
      setVerificationError(null);

      const status = await getPaymentStatus(checkoutId);
      setPaymentStatus(status.status);
      
      if (status.transactionId) {
        setTransactionId(parseInt(status.transactionId));
      }

      // If payment completed, call success callback after a delay
      if (status.isPaymentResult && status.status === 'COMPLETED') {
        setTimeout(() => {
          onSuccess?.(transactionId);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      setVerificationError(error.message || t('Failed to verify payment'));
      showError(error.message || t('Failed to verify payment'), t('Error'));
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'COMPLETED':
        return 'checkmark-circle';
      case 'FAILED':
        return 'close-circle';
      case 'PENDING':
        return 'time';
      default:
        return 'help-circle';
    }
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'COMPLETED':
        return colors.success || '#1A9F78';
      case 'FAILED':
        return colors.error || '#FF3B30';
      case 'PENDING':
        return colors.warning || '#FFA500';
      default:
        return colors.textSecondary || '#999999';
    }
  };

  const getStatusTitle = () => {
    switch (paymentStatus) {
      case 'COMPLETED':
        return t('Payment Successful');
      case 'FAILED':
        return t('Payment Failed');
      case 'PENDING':
        return t('Payment Pending');
      default:
        return t('Payment Status');
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'COMPLETED':
        return t('Your payment has been processed successfully.');
      case 'FAILED':
        return t('Your payment could not be processed. Please try again.');
      case 'PENDING':
        return t('Your payment is being processed. Please wait.');
      default:
        return t('Unable to determine payment status.');
    }
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
          {t('Payment Result')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isVerifying ? (
          <View style={styles.verifyingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.verifyingText, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
              {t('Verifying payment...')}
            </Text>
          </View>
        ) : verificationError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color={colors.error} />
            <Text style={[styles.errorTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
              {t('Verification Error')}
            </Text>
            <Text style={[styles.errorMessage, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {verificationError}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={verifyPayment}
            >
              <Text style={[styles.retryButtonText, { color: colors.cardBackground, fontSize: scaledSize(14) }]}>
                {t('Retry Verification')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <View style={[styles.iconContainer, { backgroundColor: getStatusColor() + '20' }]}>
              <Ionicons name={getStatusIcon() as any} size={64} color={getStatusColor()} />
            </View>
            <Text style={[styles.statusTitle, { color: colors.text, fontSize: scaledSize(24) }]}>
              {getStatusTitle()}
            </Text>
            <Text style={[styles.statusMessage, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {getStatusMessage()}
            </Text>

            {transactionId && (
              <View style={[styles.transactionInfo, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <Text style={[styles.transactionLabel, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                  {t('Transaction ID')}
                </Text>
                <Text style={[styles.transactionValue, { color: colors.text, fontSize: scaledSize(16) }]}>
                  #{transactionId}
                </Text>
              </View>
            )}

            {paymentStatus === 'COMPLETED' && (
              <View style={styles.successActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => onSuccess?.(transactionId)}
                >
                  <Text style={[styles.actionButtonText, { color: colors.cardBackground, fontSize: scaledSize(16) }]}>
                    {t('Continue')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {paymentStatus === 'FAILED' && (
              <View style={styles.failedActions}>
                {onRetry && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={onRetry}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.cardBackground, fontSize: scaledSize(16) }]}>
                      {t('Try Again')}
                    </Text>
                  </TouchableOpacity>
                )}
                {onBack && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.border }]}
                    onPress={onBack}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.text, fontSize: scaledSize(16) }]}>
                      {t('Go Back')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </View>

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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  verifyingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  verifyingText: {
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 400,
  },
  errorTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontWeight: '600',
  },
  resultContainer: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 400,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  statusMessage: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  transactionInfo: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  transactionLabel: {
    marginBottom: 4,
  },
  transactionValue: {
    fontWeight: '700',
  },
  successActions: {
    width: '100%',
    marginTop: 24,
  },
  failedActions: {
    width: '100%',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    fontWeight: '600',
  },
});
