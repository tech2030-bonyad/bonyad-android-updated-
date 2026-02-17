/**
 * SmallTaskPaymentScreen
 * Flow: Collect payment info → create small task checkout → WebView with HyperPay → verify status (prod) → success
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { getServerBaseUrl } from '../config/api';
import {
  createSmallTaskPayment,
  getPaymentStatusProd,
  SmallTaskPaymentRequest,
  CreateCheckoutResponse,
} from '../services/PaymentService';
import { CreateCheckoutRequest } from '../services/PaymentService';
import PaymentFlowOrchestrator from '../components/PaymentFlowOrchestrator';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import { SmallTaskRequest } from '../types/smallTasks';

interface SmallTaskPaymentScreenProps {
  task: SmallTaskRequest;
  amount: number;
  onBack: () => void;
  onSuccess: () => void;
}

export default function SmallTaskPaymentScreen({
  task,
  amount,
  onBack,
  onSuccess,
}: SmallTaskPaymentScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, fonts } = useFontFamily();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';

  const [step, setStep] = useState<'form' | 'webview' | 'verifying' | 'done'>('form');
  const [checkoutData, setCheckoutData] = useState<CreateCheckoutResponse | null>(null);
  const [showOrchestrator, setShowOrchestrator] = useState(true);
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const paymentReturnedRef = useRef(false);

  const formatAmount = (value: number) =>
    new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(value);

  const handleOrchestratorComplete = async (checkoutRequest: CreateCheckoutRequest) => {
    setShowOrchestrator(false);
    try {
      const request: SmallTaskPaymentRequest = {
        amount,
        currency: checkoutRequest.currency || 'SAR',
        paymentType: 'DB',
        paymentBrand: checkoutRequest.paymentBrand,
        merchantTransactionId: checkoutRequest.merchantTransactionId,
        customer: checkoutRequest.customer,
        billing: checkoutRequest.billing,
        shopperResultUrl: `${getServerBaseUrl()}/payment/callback`,
      };
      const data = await createSmallTaskPayment(task.id, request);
      setCheckoutData(data);
      setStep('webview');
    } catch (err: any) {
      showError(err.message || t('Failed to start payment'), t('Error'));
      setShowOrchestrator(true);
    }
  };

  const handleWebViewNavigationStateChange = async (navState: { url: string }) => {
    if (paymentReturnedRef.current || !checkoutData?.checkoutId) return;
    const url = navState.url || '';
    const baseUrl = getServerBaseUrl();
    if (url.indexOf(baseUrl) !== -1 && (url.includes('/payment/') || url.includes('payment'))) {
      paymentReturnedRef.current = true;
      setStep('verifying');
      try {
        const status = await getPaymentStatusProd(checkoutData.checkoutId);
        setStep('done');
        if (status.isPaymentResult && status.status === 'COMPLETED') {
          showSuccess(t('Payment successful. The technician can now start work.'), t('Success'));
          setTimeout(() => onSuccess(), 1500);
        } else {
          showError(t('Payment was not successful. Please try again.'), t('Payment Failed'));
          setStep('webview');
          paymentReturnedRef.current = false;
        }
      } catch (err: any) {
        showError(err.message || t('Could not verify payment'), t('Error'));
        setStep('webview');
        paymentReturnedRef.current = false;
      }
    }
  };

  if (step === 'form' && showOrchestrator) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily }]}>
            {t('Pay for Task')}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{formatAmount(amount)}</Text>
        </View>
        <PaymentFlowOrchestrator
          visible={showOrchestrator}
          amount={amount}
          currency="SAR"
          smallTaskRequestId={task.id}
          merchantTransactionId={`ST-${task.id}-${Date.now()}`}
          onClose={() => {
            setShowOrchestrator(false);
            onBack();
          }}
          onComplete={handleOrchestratorComplete}
          onError={(msg) => showError(msg, t('Error'))}
        />
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

  if (step === 'webview' && checkoutData?.redirectUrl) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Payment')}</Text>
        </View>
        <WebView
          source={{ uri: checkoutData.redirectUrl }}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
        />
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

  if (step === 'verifying') {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.verifyingText, { color: colors.text }]}>{t('Verifying payment...')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.primary }]} onPress={onSuccess}>
        <Text style={[styles.doneButtonText, { color: '#fff' }]}>{t('Done')}</Text>
      </TouchableOpacity>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 14,
    marginLeft: 8,
  },
  webview: {
    flex: 1,
    ...(Platform.OS === 'android' ? { marginTop: 0 } : {}),
  },
  verifyingText: {
    fontSize: 16,
  },
  doneButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
