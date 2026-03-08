import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import {
  createCheckout,
  getPaymentStatus,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  PaymentStatus,
} from '../services/PaymentService';
import { getServerBaseUrl } from '../config/api';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface PaymentCheckoutScreenProps {
  onBack: () => void;
  onSuccess?: (transactionId: number) => void;
  checkoutRequest: CreateCheckoutRequest;
  phaseId?: number;
  smallTaskRequestId?: number;
  subscriptionId?: number;
}

// HyperPay COPYandPAY Configuration
const HYPERPAY_BASE_URL = __DEV__ 
  ? 'https://test.oppwa.com' 
  : 'https://eu-prod.oppwa.com';

export default function PaymentCheckoutScreen({
  onBack,
  onSuccess,
  checkoutRequest,
  phaseId,
  smallTaskRequestId,
  subscriptionId,
}: PaymentCheckoutScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();
  const isRTL = i18n.language === 'ar';
  const isWeb = Platform.OS === 'web';

  const [checkoutData, setCheckoutData] = useState<CreateCheckoutResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

  useEffect(() => {
    initializeCheckout();
  }, []);

  const initializeCheckout = async () => {
    console.log('🔥 [PaymentCheckout] initializeCheckout called');
    console.log('   checkoutRequest:', JSON.stringify(checkoutRequest, null, 2));
    
    try {
      setIsLoading(true);
      const request: CreateCheckoutRequest = {
        ...checkoutRequest,
        phaseId,
        subscriptionId,
        // Set callback URL for result page
        shopperResultUrl: `${getServerBaseUrl()}/payment/result?checkoutId={checkoutId}`,
      };

      console.log('📤 [PaymentCheckout] Calling createCheckout API...');
      const response = await createCheckout(request);
      console.log('✅ [PaymentCheckout] createCheckout response:', JSON.stringify(response, null, 2));
      setCheckoutData(response);
    } catch (error: any) {
      console.error('❌ [PaymentCheckout] Error creating checkout:', error);
      showError(error.message || t('Failed to initialize payment'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Generate HTML for HyperPay COPYandPAY
  const generateHyperPayHTML = (checkoutId: string): string => {
    const callbackUrl = `${getServerBaseUrl()}/payment/result?checkoutId=${checkoutId}`;
    const brands = checkoutRequest.paymentBrand || 'VISA MASTER MADA';
    const locale = i18n.language === 'ar' ? 'ar' : 'en';

    return `
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
          }
          .payment-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .loading {
            text-align: center;
            padding: 40px;
            color: #666;
          }
        </style>
        <script>
          // Set wpwlOptions BEFORE script loads
          window.wpwlOptions = {
            style: 'card',
            locale: '${locale}',
            showCVV: true,
            showOwner: true,
            showEmail: false,
            showBilling: false,
          };
        </script>
      </head>
      <body>
        <div class="payment-container">
          <div id="payment-form">
            <form class="paymentWidgets" data-brands="${brands}" action="${callbackUrl}" method="POST"></form>
          </div>
          <div class="loading" id="loading">Loading payment form...</div>
        </div>
        <script src="${HYPERPAY_BASE_URL}/v1/paymentWidgets.js?checkoutId=${checkoutId}"></script>
        <script>
          // Hide loading when form is ready
          window.addEventListener('load', function() {
            setTimeout(function() {
              var loading = document.getElementById('loading');
              if (loading) loading.style.display = 'none';
            }, 1000);
          });
        </script>
      </body>
      </html>
    `;
  };

  const checkPaymentStatus = async (checkoutId: string) => {
    try {
      setIsProcessing(true);
      const status = await getPaymentStatus(checkoutId);
      setPaymentStatus(status.status);

      if (status.isPaymentResult && status.status === 'COMPLETED') {
        showSuccess(t('Payment completed successfully'), t('Success'));
        setTimeout(() => {
          if (checkoutData?.transactionId) {
            onSuccess?.(checkoutData.transactionId);
          }
        }, 1500);
      } else if (status.status === 'FAILED') {
        showError(t('Payment failed. Please try again.'), t('Payment Failed'));
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      showError(error.message || t('Failed to check payment status'), t('Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (amount: number, currency: string = 'SAR') => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Render payment form using WebView with HyperPay COPYandPAY HTML
  const renderPaymentForm = () => {
    if (!checkoutData) return null;

    const htmlContent = generateHyperPayHTML(checkoutData.checkoutId);

    return (
      <WebView
        source={{ html: htmlContent }}
        style={styles.webView}
        onNavigationStateChange={(navState) => {
          const { url } = navState;
          // Check if redirected to result page
          if (url.includes('/payment/result') || url.includes('resultCode') || url.includes('checkoutId')) {
            if (checkoutData?.checkoutId) {
              // Extract checkoutId from URL if present
              const urlParams = new URLSearchParams(url.split('?')[1] || '');
              const checkoutIdFromUrl = urlParams.get('checkoutId') || checkoutData.checkoutId;
              checkPaymentStatus(checkoutIdFromUrl);
            }
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          // Allow navigation to result page
          if (request.url.includes('/payment/result') || request.url.includes('checkoutId')) {
            if (checkoutData?.checkoutId) {
              checkPaymentStatus(checkoutData.checkoutId);
            }
            return false; // Prevent navigation, handle it ourselves
          }
          return true;
        }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webViewLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.webViewLoadingText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {t('Loading payment form...')}
            </Text>
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          showError(t('Failed to load payment form'), t('Error'));
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            {t('Payment Checkout')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('Initializing payment...')}
          </Text>
        </View>
      </View>
    );
  }

  if (!checkoutData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            {t('Payment Checkout')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text, fontSize: scaledSize(16) }]}>
            {t('Failed to initialize payment')}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={initializeCheckout}
          >
            <Text style={[styles.retryButtonText, { color: colors.cardBackground, fontSize: scaledSize(14) }]}>
              {t('Retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
            {t('Payment Checkout')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
            {formatAmount(checkoutRequest.amount, checkoutRequest.currency)}
          </Text>
        </View>
        {isProcessing && (
          <View style={styles.processingIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>

      {/* Payment Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.primary + '10' }]}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.text, fontSize: scaledSize(12) }]}>
          {t('Please complete the payment using the secure form below')}
        </Text>
      </View>

      {/* Payment Form */}
      {renderPaymentForm()}

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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '600',
  },
  headerSubtitle: {
    marginTop: 2,
  },
  processingIndicator: {
    padding: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    gap: 12,
  },
  webViewLoadingText: {
    marginTop: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontWeight: '600',
    textAlign: 'center',
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
});
