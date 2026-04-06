import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import { CreateCheckoutRequest } from '../services/PaymentService';
import RialIcon from '../components/RialIcon';

interface CommissionPaymentScreenProps {
  onBack?: () => void;
  onNavigateToCheckout?: (request: CreateCheckoutRequest, description: string) => void;
}

interface CommissionSettings {
  commissionRate: number;
  minCommission: number;
  maxCommission: number;
}

export default function CommissionPaymentScreen({ 
  onBack,
  onNavigateToCheckout,
}: CommissionPaymentScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isRTL = i18n.language === 'ar';
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
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(screenSlideX, { toValue: screenWidth, duration: 220, useNativeDriver: true }),
    ]).start(() => onBack?.());
  };

  const [projectAmount, setProjectAmount] = useState('');
  const [commission, setCommission] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>({
    commissionRate: 0.01, // Default 1%
    minCommission: 10,    // Default min 10 SAR
    maxCommission: 1000,  // Default max 1000 SAR
  });
  
  // Prevent duplicate payment initiation
  const isPaymentInitiated = useRef(false);
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();

  // Reset payment initiation flag on mount
  useEffect(() => {
    isPaymentInitiated.current = false;
    console.log('🔄 [CommissionPayment] Component mounted, reset payment flag');
  }, []);

  // Load commission settings from API (placeholder for now)
  useEffect(() => {
    // TODO: Fetch commission settings from API
    // const fetchSettings = async () => {
    //   try {
    //     const settings = await PaymentService.getCommissionSettings();
    //     setCommissionSettings(settings);
    //   } catch (error) {
    //     console.error('Failed to load commission settings:', error);
    //   }
    // };
    // fetchSettings();
  }, []);

  // Calculate commission based on settings
  const calculateCommission = (amountString: string) => {
    const cleanAmount = amountString.replace(/[^0-9.]/g, '');
    
    if (cleanAmount && !isNaN(parseFloat(cleanAmount)) && parseFloat(cleanAmount) > 0) {
      const amount = parseFloat(cleanAmount);
      let fee = amount * commissionSettings.commissionRate;
      // Apply min/max constraints
      fee = Math.max(fee, commissionSettings.minCommission);
      fee = Math.min(fee, commissionSettings.maxCommission);
      setCommission(fee.toFixed(2));
    } else {
      setCommission('');
    }
  };

  const commissionAmount = commission ? parseFloat(commission) : 0;
  const projectAmountValue = projectAmount ? parseFloat(projectAmount.replace(/[^0-9.]/g, '')) : 0;

  const handleAmountChange = (value: string) => {
    setProjectAmount(value);
    calculateCommission(value);
  };

  // Navigate to checkout screen with payment details
  const initiatePayment = useCallback(() => {
    console.log('🔥 [CommissionPayment] initiatePayment called');
    console.log('   commissionAmount:', commissionAmount);
    console.log('   onNavigateToCheckout:', onNavigateToCheckout ? 'defined' : 'undefined');
    console.log('   isPaymentInitiated:', isPaymentInitiated.current);
    
    // Prevent duplicate payment initiation
    if (isPaymentInitiated.current) {
      console.log('⚠️ [CommissionPayment] Payment already initiated, ignoring duplicate call');
      return;
    }
    
    if (commissionAmount <= 0 || !onNavigateToCheckout) {
      console.error('❌ [CommissionPayment] Cannot initiate - invalid amount or callback');
      return;
    }
    
    isPaymentInitiated.current = true;

    // Build checkout request for commission payment
    const checkoutRequest: CreateCheckoutRequest = {
      amount: commissionAmount,
      currency: 'SAR',
      paymentType: 'DB', // Direct debit
      paymentBrand: 'MADA', // Default to MADA
      merchantTransactionId: `COMMISSION-${Date.now()}`,
      customer: {
        email: 'customer@bonyad.com', // Will be overridden by backend with logged-in user
        givenName: 'Customer',
        surname: 'Name',
      },
      billing: {
        street1: 'Riyadh',
        city: 'Riyadh',
        state: 'Riyadh',
        country: 'SA',
        postcode: '12345',
      },
    };

    console.log('📤 [CommissionPayment] Checkout request built:', JSON.stringify(checkoutRequest, null, 2));

    const description = t('commissionPayment.paymentDescription', {
      amount: projectAmountValue.toFixed(2),
    });

    console.log('📤 [CommissionPayment] Calling onNavigateToCheckout...');
    onNavigateToCheckout(checkoutRequest, description);
    console.log('✅ [CommissionPayment] onNavigateToCheckout called successfully');
    hideConfirmation();
  }, [commissionAmount, projectAmountValue, onNavigateToCheckout, t, hideConfirmation]);

  const processPayment = () => {
    if (commissionAmount <= 0) return;

    showConfirmation(
      t('commissionPayment.confirmTitle'),
      t('commissionPayment.confirmMessage', {
        amount: commissionAmount.toFixed(2),
        project: projectAmountValue.toFixed(2),
      }),
      initiatePayment
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <Animated.View
        style={[
          styles.animatedScreen,
          {
            backgroundColor: colors.background,
            // Flush under AppTopBar — same as portfolio (no duplicate safe-area inset)
            paddingTop: 0,
            opacity: screenOpacity,
            transform: [{ translateX: screenSlideX }],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
        >
          {/* Header – LTR so back stays left */}
          {onBack && (
            <View style={[styles.header, styles.headerLTR, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={handleBackScreen}>
                <BackArrowIonicons variant="chevron" size={24} color={colors.text}/>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(17) }]}>
                {t('commissionPayment.title')}
              </Text>
              <View style={{ width: 24 }} />
            </View>
          )}

          <View style={styles.content}>
            {/* Title */}
            <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(24) }]}>
              {t('commissionPayment.title')}
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {t('commissionPayment.description', {
                rate: (commissionSettings.commissionRate * 100).toFixed(0),
                min: commissionSettings.minCommission,
              })}
            </Text>

            {/* Project Amount Field */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text, fontSize: scaledSize(16) }]}>
                {t('commissionPayment.projectAmount')}
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('commissionPayment.enterProjectAmount')}
                  placeholderTextColor={colors.textSecondary}
                  value={projectAmount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  {...Platform.select({
                    web: {
                      inputMode: 'decimal' as any,
                      autoComplete: 'off' as any,
                      type: 'text' as any,
                    },
                  })}
                />
                <RialIcon
                  size={scaledSize(18)}
                  variant="dark"
                  style={isRTL ? { marginRight: 10 } : { marginLeft: 10 }}
                />
              </View>
            </View>

            {/* Commission Value Field (Read-only) */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text, fontSize: scaledSize(16) }]}>
                {t('commissionPayment.commissionAmount')}
              </Text>
              <View style={[styles.inputContainer, styles.disabledInput, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={commission ? `${commission}` : ''}
                  placeholder={t('commissionPayment.calculatedAutomatically')}
                  placeholderTextColor={colors.textSecondary}
                  editable={false}
                />
              </View>
            </View>

            {/* Info Text */}
            <View style={[styles.infoContainer, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text, fontSize: scaledSize(14) }]}>
                {t('commissionPayment.infoText', {
                  rate: (commissionSettings.commissionRate * 100).toFixed(0),
                  min: commissionSettings.minCommission,
                  max: commissionSettings.maxCommission,
                })}
              </Text>
            </View>

            {/* Pay Button */}
            <View style={[styles.buttonContainer, { paddingBottom: 20 }]}>
              <TouchableOpacity
                style={[
                  styles.payButton,
                  {
                    backgroundColor: commissionAmount > 0 ? colors.primary : colors.border,
                    opacity: commissionAmount > 0 && !isProcessingPayment ? 1 : 0.6,
                  },
                ]}
                onPress={processPayment}
                disabled={commissionAmount <= 0 || isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <View style={styles.processingContainer}>
                    <Text style={[styles.payButtonText, { color: colors.cardBackground, fontSize: scaledSize(18) }]}>
                    {t('commissionPayment.processing')}
                  </Text>
                  </View>
                ) : (
                  <Text style={[styles.payButtonText, { color: colors.cardBackground, fontSize: scaledSize(18) }]}>
                    {t('commissionPayment.payAmount', { amount: commissionAmount > 0 ? commissionAmount.toFixed(2) : '0.00' })}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
      
      {/* Alert Popup -->
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedScreen: {
    flex: 1,
  },
  headerLTR: {
    direction: 'ltr',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  disabledInput: {
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  payButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    fontWeight: '700',
  },
});
