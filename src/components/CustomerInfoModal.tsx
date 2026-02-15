/**
 * CustomerInfoModal
 * 
 * Modal for collecting customer information (email, first name, last name)
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
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
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

interface CustomerInfo {
  email: string;
  givenName: string;
  surname: string;
}

interface CustomerInfoModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (info: CustomerInfo) => void;
  isSubmitting?: boolean;
  initialData?: Partial<CustomerInfo>;
}

export default function CustomerInfoModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting = false,
  initialData,
}: CustomerInfoModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(initialData?.email || '');
  const [givenName, setGivenName] = useState(initialData?.givenName || '');
  const [surname, setSurname] = useState(initialData?.surname || '');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const IS_WEB = Platform.OS === 'web';
  const IS_MOBILE = Platform.OS === 'ios' || Platform.OS === 'android';
  const isRTL = i18n.language === 'ar';

  const { alertState, showError: showErrorAlert, hideAlert } = useAlertPopup();

  const modalWidth = IS_WEB ? Math.min(520, screenWidth - 32) : screenWidth - 32;
  const modalMaxHeight = IS_MOBILE ? screenHeight - 100 : screenHeight * 0.85;

  useEffect(() => {
    if (visible && !initialData) {
      loadUserProfile();
    } else if (visible && initialData) {
      setEmail(initialData.email || '');
      setGivenName(initialData.givenName || '');
      setSurname(initialData.surname || '');
    }
  }, [visible, initialData]);

  const loadUserProfile = async () => {
    try {
      setIsLoadingProfile(true);
      const token = await storage.getAuthToken();
      if (!token) return;

      const response = await fetch(buildApiUrl(API_ENDPOINTS.USER.PROFILE), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmail(data.email || '');
        // Try to split name if available
        if (data.name) {
          const nameParts = data.name.trim().split(' ');
          if (nameParts.length >= 2) {
            setGivenName(nameParts[0]);
            setSurname(nameParts.slice(1).join(' '));
          } else {
            setGivenName(data.name);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = () => {
    // Validation
    if (!email.trim()) {
      showErrorAlert(t('Please enter your email address'), t('Error'));
      return;
    }

    if (!validateEmail(email.trim())) {
      showErrorAlert(t('Please enter a valid email address'), t('Error'));
      return;
    }

    if (!givenName.trim()) {
      showErrorAlert(t('Please enter your first name'), t('Error'));
      return;
    }

    if (!surname.trim()) {
      showErrorAlert(t('Please enter your last name'), t('Error'));
      return;
    }

    onSubmit({
      email: email.trim(),
      givenName: givenName.trim(),
      surname: surname.trim(),
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('');
      setGivenName('');
      setSurname('');
      onClose();
    }
  };

  const isSubmitDisabled = isSubmitting || !email.trim() || !givenName.trim() || !surname.trim() || !validateEmail(email.trim());

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
                    <Ionicons name="person-outline" size={28} color={COLORS.primary80} />
                  </View>
                  <Text style={[styles.headerTitle, { fontSize: scaledSize(20) }]}>{t('Customer Information')}</Text>
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
                  {isLoadingProfile ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={COLORS.primary60} />
                      <Text style={styles.loadingText}>{t('Loading your information...')}</Text>
                    </View>
                  ) : (
                    <>
                      {/* Email Input */}
                      <View style={styles.inputSection}>
                        <View style={styles.inputHeader}>
                          <Ionicons name="mail-outline" size={16} color={COLORS.primary80} />
                          <Text style={styles.inputLabel}>{t('Email Address')}</Text>
                          <Text style={styles.requiredText}>*</Text>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder={t('Enter your email')}
                          placeholderTextColor={COLORS.textSecondary}
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          editable={!isSubmitting}
                        />
                      </View>

                      {/* First Name Input */}
                      <View style={styles.inputSection}>
                        <View style={styles.inputHeader}>
                          <Ionicons name="person-outline" size={16} color={COLORS.green80} />
                          <Text style={[styles.inputLabel, { color: COLORS.green80 }]}>{t('First Name')}</Text>
                          <Text style={styles.requiredText}>*</Text>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder={t('Enter your first name')}
                          placeholderTextColor={COLORS.textSecondary}
                          value={givenName}
                          onChangeText={setGivenName}
                          autoCapitalize="words"
                          editable={!isSubmitting}
                        />
                      </View>

                      {/* Last Name Input */}
                      <View style={styles.inputSection}>
                        <View style={styles.inputHeader}>
                          <Ionicons name="person-outline" size={16} color={COLORS.amber60} />
                          <Text style={[styles.inputLabel, { color: COLORS.amber60 }]}>{t('Last Name')}</Text>
                          <Text style={styles.requiredText}>*</Text>
                        </View>
                        <TextInput
                          style={styles.textInput}
                          placeholder={t('Enter your last name')}
                          placeholderTextColor={COLORS.textSecondary}
                          value={surname}
                          onChangeText={setSurname}
                          autoCapitalize="words"
                          editable={!isSubmitting}
                        />
                      </View>
                    </>
                  )}
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
    maxHeight: 400,
  },
  scrollContentContainer: {
    padding: 20,
    gap: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
