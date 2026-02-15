/**
 * PaymentMethodSelectionModal
 * 
 * Modal for selecting payment method (MADA, VISA, MASTER, Apple Pay)
 * Styled to match BidFormModal design
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaymentBrand } from '../services/PaymentService';
import AlertPopup, { useAlertPopup } from './AlertPopup';

// ===== DESIGN TOKENS FROM FIGMA =====
const COLORS = {
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary50: '#1A6DB4',
  primary10: '#E6EFF7',
  green90: '#007B36',
  green80: '#008B3E',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  purple100: '#3C076D',
  purple10: '#EFE6F5',
  amber60: '#FFB703',
  amber10: '#FFF8E6',
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  bgWhite: '#FFFFFF',
  bgOverlay: 'rgba(0, 56, 103, 0.5)',
};

interface PaymentMethodSelectionModalProps {
  visible: boolean;
  amount: number;
  currency?: string;
  onClose: () => void;
  onSelect: (paymentBrand: PaymentBrand) => void;
  isSubmitting?: boolean;
}

interface PaymentMethod {
  brand: PaymentBrand;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  available: boolean;
}

export default function PaymentMethodSelectionModal({
  visible,
  amount,
  currency = 'SAR',
  onClose,
  onSelect,
  isSubmitting = false,
}: PaymentMethodSelectionModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [selectedMethod, setSelectedMethod] = useState<PaymentBrand | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const IS_WEB = Platform.OS === 'web';
  const IS_MOBILE = Platform.OS === 'ios' || Platform.OS === 'android';
  const isRTL = i18n.language === 'ar';

  const { alertState, showError: showErrorAlert, hideAlert } = useAlertPopup();

  const modalWidth = IS_WEB ? Math.min(520, screenWidth - 32) : screenWidth - 32;
  const modalMaxHeight = IS_MOBILE ? screenHeight - 100 : screenHeight * 0.85;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const paymentMethods: PaymentMethod[] = [
    {
      brand: 'MADA',
      name: 'MADA',
      icon: 'card',
      color: COLORS.green80,
      bgColor: COLORS.green10,
      available: true,
    },
    {
      brand: 'VISA',
      name: 'Visa',
      icon: 'card',
      color: '#1A1F71',
      bgColor: '#E6E8F5',
      available: true,
    },
    {
      brand: 'MASTER',
      name: 'Mastercard',
      icon: 'card',
      color: '#EB001B',
      bgColor: '#FFE6E9',
      available: true,
    },
    {
      brand: 'APPLEPAY',
      name: 'Apple Pay',
      icon: 'logo-apple',
      color: COLORS.textBody,
      bgColor: COLORS.textDividers,
      available: Platform.OS === 'ios', // Only available on iOS
    },
  ];

  const handleSelect = (method: PaymentMethod) => {
    if (!method.available) {
      showErrorAlert(t('This payment method is not available'), t('Error'));
      return;
    }
    setSelectedMethod(method.brand);
  };

  const handleContinue = () => {
    if (!selectedMethod) {
      showErrorAlert(t('Please select a payment method'), t('Error'));
      return;
    }
    onSelect(selectedMethod);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedMethod(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <View style={[styles.modalContainer, { width: modalWidth, maxHeight: modalMaxHeight }]}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerIconContainer}>
                    <Ionicons name="card" size={28} color={COLORS.primary80} />
                  </View>
                  <Text style={[styles.headerTitle, { fontSize: scaledSize(20) }]}>{t('Select Payment Method')}</Text>
                  <TouchableOpacity 
                    onPress={handleClose} 
                    style={styles.closeButton}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.content}>
                  {/* Amount Display */}
                  <View style={styles.amountCard}>
                    <Text style={styles.amountLabel}>{t('Total Amount')}</Text>
                    <Text style={styles.amountValue}>{formatAmount(amount)}</Text>
                  </View>

                  {/* Payment Methods */}
                  <View style={styles.methodsContainer}>
                    <Text style={styles.methodsLabel}>{t('Choose your payment method')}</Text>
                    {paymentMethods.map((method) => {
                      const isSelected = selectedMethod === method.brand;
                      const isDisabled = !method.available;

                      return (
                        <TouchableOpacity
                          key={method.brand}
                          style={[
                            styles.methodCard,
                            isSelected && { borderColor: method.color, borderWidth: 2 },
                            isDisabled && styles.methodCardDisabled,
                          ]}
                          onPress={() => handleSelect(method)}
                          disabled={isDisabled || isSubmitting}
                        >
                          <View style={[styles.methodIconContainer, { backgroundColor: method.bgColor }]}>
                            <Ionicons 
                              name={method.icon as any} 
                              size={24} 
                              color={isDisabled ? COLORS.textSecondary : method.color} 
                            />
                          </View>
                          <View style={styles.methodInfo}>
                            <Text style={[
                              styles.methodName,
                              isDisabled && styles.methodNameDisabled,
                            ]}>
                              {method.name}
                            </Text>
                            {!method.available && (
                              <Text style={styles.methodUnavailable}>
                                {t('Not available')}
                              </Text>
                            )}
                          </View>
                          {isSelected && (
                            <View style={[styles.selectedIndicator, { backgroundColor: method.color }]}>
                              <Ionicons name="checkmark" size={16} color={COLORS.textWhite} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.cancelButtonText, { fontSize: scaledSize(16) }]}>{t('Cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      (!selectedMethod || isSubmitting) && styles.continueButtonDisabled,
                    ]}
                    onPress={handleContinue}
                    disabled={!selectedMethod || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={COLORS.textWhite} />
                    ) : (
                      <>
                        <Ionicons name="arrow-forward" size={18} color={COLORS.textWhite} />
                        <Text style={[styles.continueButtonText, { fontSize: scaledSize(16) }]}>{t('Continue')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardView: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContainer: {
    backgroundColor: COLORS.bgWhite,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textDividers,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textHeader,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  amountCard: {
    backgroundColor: COLORS.primary10,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary80,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary80,
  },
  methodsContainer: {
    gap: 12,
  },
  methodsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textHeader,
    marginBottom: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.textDividers,
    backgroundColor: COLORS.bgWhite,
    gap: 12,
  },
  methodCardDisabled: {
    opacity: 0.5,
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textHeader,
  },
  methodNameDisabled: {
    color: COLORS.textSecondary,
  },
  methodUnavailable: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.textDividers,
    backgroundColor: COLORS.bgWhite,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.purple10,
    borderWidth: 1.5,
    borderColor: COLORS.purple100,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple100,
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary60,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});
