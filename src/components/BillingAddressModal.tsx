/**
 * BillingAddressModal
 * 
 * Modal for collecting billing address information
 * Styled to match BidFormModal design
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

interface BillingAddress {
  street1: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

interface BillingAddressModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (address: BillingAddress, saveForFuture: boolean) => void;
  isSubmitting?: boolean;
  initialData?: Partial<BillingAddress>;
}

export default function BillingAddressModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting = false,
  initialData,
}: BillingAddressModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [street1, setStreet1] = useState(initialData?.street1 || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [country, setCountry] = useState(initialData?.country || 'SA');
  const [postcode, setPostcode] = useState(initialData?.postcode || '');
  const [saveForFuture, setSaveForFuture] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const IS_WEB = Platform.OS === 'web';
  const IS_MOBILE = Platform.OS === 'ios' || Platform.OS === 'android';
  const isRTL = i18n.language === 'ar';

  const { alertState, showError: showErrorAlert, hideAlert } = useAlertPopup();

  const modalWidth = IS_WEB ? Math.min(520, screenWidth - 32) : screenWidth - 32;
  const modalMaxHeight = IS_MOBILE ? screenHeight - 100 : screenHeight * 0.85;

  useEffect(() => {
    if (visible && initialData) {
      setStreet1(initialData.street1 || '');
      setCity(initialData.city || '');
      setState(initialData.state || '');
      setCountry(initialData.country || 'SA');
      setPostcode(initialData.postcode || '');
    }
  }, [visible, initialData]);

  const handleSubmit = () => {
    // Validation
    if (!street1.trim()) {
      showErrorAlert(t('Please enter street address'), t('Error'));
      return;
    }

    if (!city.trim()) {
      showErrorAlert(t('Please enter city'), t('Error'));
      return;
    }

    if (!state.trim()) {
      showErrorAlert(t('Please enter state/province'), t('Error'));
      return;
    }

    if (!country.trim()) {
      showErrorAlert(t('Please enter country'), t('Error'));
      return;
    }

    if (!postcode.trim()) {
      showErrorAlert(t('Please enter postal code'), t('Error'));
      return;
    }

    onSubmit(
      {
        street1: street1.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        postcode: postcode.trim(),
      },
      saveForFuture
    );
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setStreet1('');
      setCity('');
      setState('');
      setCountry('SA');
      setPostcode('');
      setSaveForFuture(false);
      onClose();
    }
  };

  const isSubmitDisabled =
    isSubmitting ||
    !street1.trim() ||
    !city.trim() ||
    !state.trim() ||
    !country.trim() ||
    !postcode.trim();

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
                    <Ionicons name="location-outline" size={28} color={COLORS.primary80} />
                  </View>
                  <Text style={[styles.headerTitle, { fontSize: scaledSize(20) }]}>{t('Billing Address')}</Text>
                  <TouchableOpacity 
                    onPress={handleClose} 
                    style={styles.closeButton}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView 
                  style={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContentContainer}
                >
                  {/* Street Address Input */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputHeader}>
                      <Ionicons name="home-outline" size={16} color={COLORS.primary80} />
                      <Text style={styles.inputLabel}>{t('Street Address')}</Text>
                      <Text style={styles.requiredText}>*</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('Enter street address')}
                      placeholderTextColor={COLORS.textSecondary}
                      value={street1}
                      onChangeText={setStreet1}
                      autoCapitalize="words"
                      editable={!isSubmitting}
                    />
                  </View>

                  {/* City Input */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputHeader}>
                      <Ionicons name="business-outline" size={16} color={COLORS.green80} />
                      <Text style={[styles.inputLabel, { color: COLORS.green80 }]}>{t('City')}</Text>
                      <Text style={styles.requiredText}>*</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('Enter city')}
                      placeholderTextColor={COLORS.textSecondary}
                      value={city}
                      onChangeText={setCity}
                      autoCapitalize="words"
                      editable={!isSubmitting}
                    />
                  </View>

                  {/* State Input */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputHeader}>
                      <Ionicons name="map-outline" size={16} color={COLORS.amber60} />
                      <Text style={[styles.inputLabel, { color: COLORS.amber60 }]}>{t('State/Province')}</Text>
                      <Text style={styles.requiredText}>*</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('Enter state or province')}
                      placeholderTextColor={COLORS.textSecondary}
                      value={state}
                      onChangeText={setState}
                      autoCapitalize="words"
                      editable={!isSubmitting}
                    />
                  </View>

                  {/* Country Input */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputHeader}>
                      <Ionicons name="globe-outline" size={16} color={COLORS.primary80} />
                      <Text style={styles.inputLabel}>{t('Country')}</Text>
                      <Text style={styles.requiredText}>*</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('Enter country')}
                      placeholderTextColor={COLORS.textSecondary}
                      value={country}
                      onChangeText={setCountry}
                      autoCapitalize="characters"
                      editable={!isSubmitting}
                    />
                  </View>

                  {/* Postal Code Input */}
                  <View style={styles.inputSection}>
                    <View style={styles.inputHeader}>
                      <Ionicons name="mail-outline" size={16} color={COLORS.green80} />
                      <Text style={[styles.inputLabel, { color: COLORS.green80 }]}>{t('Postal Code')}</Text>
                      <Text style={styles.requiredText}>*</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder={t('Enter postal code')}
                      placeholderTextColor={COLORS.textSecondary}
                      value={postcode}
                      onChangeText={setPostcode}
                      keyboardType="default"
                      editable={!isSubmitting}
                    />
                  </View>

                  {/* Save for Future Checkbox */}
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setSaveForFuture(!saveForFuture)}
                    disabled={isSubmitting}
                  >
                    <View style={[
                      styles.checkbox,
                      saveForFuture && { backgroundColor: COLORS.primary60, borderColor: COLORS.primary60 },
                    ]}>
                      {saveForFuture && (
                        <Ionicons name="checkmark" size={16} color={COLORS.textWhite} />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>{t('Save this address for future payments')}</Text>
                  </TouchableOpacity>
                </ScrollView>

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
                      styles.submitButton,
                      isSubmitDisabled && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitDisabled}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={COLORS.textWhite} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color={COLORS.textWhite} />
                        <Text style={[styles.submitButtonText, { fontSize: scaledSize(16) }]}>{t('Continue')}</Text>
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
  scrollContent: {
    flexGrow: 0,
    maxHeight: 500,
  },
  scrollContentContainer: {
    padding: 20,
    gap: 20,
  },
  inputSection: {
    gap: 10,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary80,
  },
  requiredText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  textInput: {
    fontSize: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.textDividers,
    backgroundColor: COLORS.bgWhite,
    color: COLORS.textBody,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textDividers,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textBody,
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
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.primary60,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
});
