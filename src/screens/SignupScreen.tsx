import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Dimensions,
  Animated,
  Easing,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../utils/storage';
import BonyadLogo from '../components/BonyadLogo';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import AnimatedRoleToggle from '../components/AnimatedRoleToggle';
import { PhoneInput, NameInput, EmailInput, PasswordInput, CustomCheckbox } from '../components/CustomInput';
import { useSignupValidation } from '../validation/useSignupValidation';
import { normalizePhoneToEnglish } from '../utils/phoneUtils';
import TermsScreen from './TermsScreen';

type FocusableField = 'phone' | 'name' | 'email' | 'password' | 'confirm';

function firstRegisterFieldErrorMessage(errors: unknown): string | null {
  if (!errors || typeof errors !== 'object') return null;
  const e = errors as Record<string, unknown>;
  const keys = [
    'password',
    'Password',
    'newPassword',
    'confirmPassword',
    'phoneNumber',
    'phone',
    'PhoneNumber',
    'name',
    'Name',
  ];
  for (const k of keys) {
    const v = e[k];
    if (v == null) continue;
    if (Array.isArray(v) && v.length > 0) return String(v[0]);
    if (typeof v === 'string') return v;
  }
  return null;
}

export default function SignupScreen({
  onNavigateToLogin,
  onNavigateToOTP,
  onNavigateToOverview,
}: {
  onNavigateToLogin: () => void;
  onNavigateToOTP: (phone: string, role: 'user' | 'technician') => void;
  onNavigateToOverview?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const insets = useSafeAreaInsets();

  // Alert Popup Hook
  const { alertState, showError, showAlert, showWarning, showAlertWithCountdown, hideAlert } = useAlertPopup();

  // Responsive state
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const IS_SMALL_WEB = IS_WEB && screenWidth < 768;

  // Form State
  const [selectedRole, setSelectedRole] = useState<'user' | 'technician'>('user');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState<FocusableField | null>(null);

  // Terms
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsScreen, setShowTermsScreen] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const isArabic = i18n.language.startsWith('ar');
  const alignment: 'flex-start' | 'flex-end' = isArabic ? 'flex-end' : 'flex-start';
  const successColor = colors.success || '#22C55E';
  const mutedColor = colors.textTertiary || colors.textSecondary || '#9CA3AF';

  const { values, flags } = useSignupValidation({
    phone,
    name,
    email,
    password,
    confirmPassword,
  });

  const [isLoading, setIsLoading] = useState(false);

  // If technician is selected, email is not required/used.
  useEffect(() => {
    if (selectedRole === 'technician') {
      setEmail('');
      setFocusedField((prev) => (prev === 'email' ? null : prev));
    }
  }, [selectedRole]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleFieldFocus = (field: FocusableField) => () => setFocusedField(field);
  const handleFieldBlur = (field: FocusableField) => () => {
    setFocusedField((prev) => (prev === field ? null : prev));
  };

  const handlePhoneChange = (value: string) => {
    // PhoneInput component already filters/trims to 10 Saudi digits
    setPhone(value);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value.replace(/\s/g, ''));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value.replace(/\s/g, ''));
  };

  const handleEmailChange = (value: string) => {
    setEmail(value.trim().toLowerCase());
  };

  const ValidationHintItem = ({
    passed,
    label,
    isFirst = false,
  }: {
    passed: boolean;
    label: string;
    isFirst?: boolean;
  }) => (
    <View
      style={[
        styles.validationHintRow,
        {
          marginTop: isFirst ? 0 : 4,
          flexDirection: isArabic ? 'row-reverse' : 'row',
        },
      ]}
    >
      <Ionicons
        name={passed ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={passed ? successColor : mutedColor}
      />
      <Text
        style={[
          styles.validationHintText,
          {
            marginLeft: isArabic ? 0 : 6,
            marginRight: isArabic ? 6 : 0,
            color: passed ? successColor : mutedColor,
            textAlign: isArabic ? 'right' : 'left',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  const handleOpenTerms = () => {
    setShowTermsScreen(true);
  };

  const handleAcceptTerms = (termsId: number, version: string) => {
    setAgreedToTerms(true);
    setShowTermsScreen(false);
  };

  const handleDeclineTerms = () => {
    setAgreedToTerms(false);
    setShowTermsScreen(false);
    showWarning(t('You must accept the terms to continue'), t('Required'));
  };

  const handleSignup = async () => {
    if (!agreedToTerms) {
      showWarning(t('Please agree to terms and conditions'), t('Required'));
      return;
    }

    setSubmitAttempted(true);

    const formattedPhone = values.phone;
    setPhone(formattedPhone);

    if (!flags.phoneValid) {
      showError(t('signup.validation.phone'), t('validation_failed'));
      return;
    }

    if (!flags.nameValid) {
      showError(t('signup.validation.name'), t('validation_failed'));
      return;
    }

    if (selectedRole === 'user' && !flags.emailValid) {
      showError(t('signup.validation.email'), t('validation_failed'));
      return;
    }

    if (!flags.passwordValid) {
      showError(t('signup.validation.password.requirements'), t('validation_failed'));
      return;
    }

    if (!flags.confirmValid) {
      showError(t('signup.validation.confirm'), t('validation_failed'));
      return;
    }

    setIsLoading(true);

    try {
      await performSignup(formattedPhone);
    } catch (error) {
      showError(t('network_error'), t('Error'));
      setIsLoading(false);
    }
  };

  const performSignup = async (formattedPhone: string) => {
    const apiURL = buildApiUrl(API_ENDPOINTS.AUTH.REGISTER);
    // Normalize Arabic digits → English, validate 10-digit Saudi format (05XXXXXXXX)
    const phoneNormalized = normalizePhoneToEnglish(String(formattedPhone)).replace(/\D/g, '').slice(0, 10);
    if (phoneNormalized.length !== 10 || !phoneNormalized.startsWith('0')) {
      showError(t('signup.validation.phone'), t('validation_failed'));
      setIsLoading(false);
      return;
    }
    // Strip leading 0 for API (API expects 9-digit: 5XXXXXXXX)
    const phoneOnly = phoneNormalized.replace(/^0/, '');

    // USER sends entered email; TECHNICIAN sends basic registration fields.
    const requestBody: Record<string, string> =
      selectedRole === 'user'
        ? {
            name: name.trim(),
            phoneNumber: phoneOnly,
            password: password,
            role: 'USER',
            email: email.trim().toLowerCase(),
          }
        : {
            name: name.trim(),
            phoneNumber: phoneOnly,
            password: password,
            role: 'TECHNICIAN',
          };

    const response = await fetch(apiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 201 || response.ok) {
      setIsLoading(false);
      onNavigateToOTP(phoneOnly, selectedRole);
    } else {
      setIsLoading(false);
      const responseText = await response.text();
      let errorMessage = t('validation_failed');

      try {
        const data = JSON.parse(responseText);
        if (data.errorCode === 'USER_ALREADY_EXISTS' || data.errorCode === 'USER_ALREADY_EXISTS_PENDING' || data.errorCode === 'PHONE_ALREADY_EXISTS' || data.errorCode === 'EMAIL_ALREADY_EXISTS') {
          const message = isArabic ? data.messageAr : data.messageEn;
          showAlertWithCountdown(
            t('validation_failed'),
            message || t('Account already exists'),
            'info',
            3,
            isArabic ? 'الانتقال إلى تسجيل الدخول' : 'Navigating to login',
            () => onNavigateToLogin()
          );
          return;
        }
        const fieldMsg = firstRegisterFieldErrorMessage(data.errors);
        if (fieldMsg) {
          errorMessage = fieldMsg;
        } else {
          errorMessage = isArabic ? (data.messageAr || data.message) : (data.messageEn || data.message);
        }
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }

      showError(errorMessage || t('validation_failed'), t('Error'));
    }
  };

  // Styles
  const figmaMobileColors = {
    background: '#FFFFFF',
    titleBlue: '#1A6DB4',
    textDark: '#2D2D2D',
    buttonBlue: '#005DAC',
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: isDarkMode ? colors.background : figmaMobileColors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.mainContainer, { flex: 1, paddingTop: Platform.OS === 'web' ? 0 : insets.top, paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom }]}>
        <ScrollView
          style={[styles.container, { backgroundColor: isDarkMode ? colors.background : figmaMobileColors.background }]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentWrapper}>
            {/* Language & Logo */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => i18n.changeLanguage(isArabic ? 'en' : 'ar')}>
                <Text style={{ color: isDarkMode ? colors.primary : figmaMobileColors.buttonBlue, fontWeight: 'bold' }}>
                  {isArabic ? 'EN' : 'AR'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.logoContainer}>
              <BonyadLogo size="medium" />
            </View>

            <Text style={[styles.title, { color: isDarkMode ? colors.text : figmaMobileColors.titleBlue }]}>
              {t('Create an Account')}
            </Text>
            <Text style={[styles.subtitle, { color: isDarkMode ? colors.textSecondary : figmaMobileColors.textDark }]}>
              {t('Manage your properties and services.')}
            </Text>

            {/* Role Toggle */}
            <View style={styles.formSection}>
              <AnimatedRoleToggle
                selectedRole={selectedRole}
                onRoleChange={setSelectedRole}
              />

              <PhoneInput
                label={t('Mobile number')}
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder={t('auth.placeholders.phone')}
                onFocus={handleFieldFocus('phone')}
                onBlur={handleFieldBlur('phone')}
              />
              {focusedField === 'phone' && (
                <ValidationHintItem passed={flags.phoneValid} label={t('signup.validation.phone')} isFirst />
              )}

              <NameInput
                label={t('Full Name')}
                value={name}
                onChangeText={setName}
                placeholder={t('Enter your full name')}
                onFocus={handleFieldFocus('name')}
                onBlur={handleFieldBlur('name')}
              />
              {focusedField === 'name' && (
                <ValidationHintItem passed={flags.nameValid} label={t('signup.validation.name')} isFirst />
              )}

              {selectedRole === 'user' && (
                <>
                  <EmailInput
                    label={t('Email')}
                    value={email}
                    onChangeText={handleEmailChange}
                    placeholder={t('Enter your email')}
                    onFocus={handleFieldFocus('email')}
                    onBlur={handleFieldBlur('email')}
                  />
                  {focusedField === 'email' && (
                    <ValidationHintItem passed={flags.emailValid} label={t('signup.validation.email')} isFirst />
                  )}
                </>
              )}

              <PasswordInput
                label={t('Password')}
                value={password}
                onChangeText={handlePasswordChange}
                placeholder={t('auth.placeholders.password')}
                onFocus={handleFieldFocus('password')}
                onBlur={handleFieldBlur('password')}
              />
              {(focusedField === 'password' || (submitAttempted && !flags.passwordValid)) && (
                <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
                  <ValidationHintItem passed={flags.passwordRules.minLength} label={t('signup.validation.password.minLength')} isFirst />
                  <ValidationHintItem passed={flags.passwordRules.uppercase} label={t('signup.validation.password.uppercase')} />
                  <ValidationHintItem passed={flags.passwordRules.number} label={t('signup.validation.password.number')} />
                  <ValidationHintItem passed={flags.passwordRules.special} label={t('signup.validation.password.special')} />
                  <ValidationHintItem passed={flags.passwordRules.noSpaces} label={t('signup.validation.password.spaces')} />
                  <ValidationHintItem passed={flags.passwordRules.noSequence} label={t('signup.validation.password.sequence')} />
                </View>
              )}

              <PasswordInput
                label={t('Confirm Password')}
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                placeholder={t('Confirm your password')}
                onFocus={handleFieldFocus('confirm')}
                onBlur={handleFieldBlur('confirm')}
              />
              {(focusedField === 'confirm' || (submitAttempted && !flags.confirmValid)) && (
                <ValidationHintItem passed={flags.confirmValid} label={t('signup.validation.confirm')} isFirst />
              )}

              {/* Terms */}
              <View style={{ marginTop: 16, zIndex: 10 }}>
                <CustomCheckbox
                  checked={agreedToTerms}
                  onPress={() => setAgreedToTerms(!agreedToTerms)}
                  label={t('I agree to the')}
                  linkText={t('Terms and Conditions')}
                  onLinkPress={handleOpenTerms}
                />
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                style={[styles.signupButton, isLoading && styles.disabledButton]}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signupButtonText}>{t('Sign Up')}</Text>}
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginLinkContainer}>
                <Text style={{ color: colors.textSecondary }}>{t('Already have an account?')}</Text>
                <TouchableOpacity onPress={onNavigateToLogin}>
                  <Text style={styles.loginLinkText}>{t('Login')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        countdown={alertState.countdown}
        onClose={hideAlert}
      />

      <Modal visible={showTermsScreen} animationType="slide" presentationStyle="pageSheet">
        <TermsScreen
          type={selectedRole.toUpperCase() as 'USER' | 'TECHNICIAN'}
          onAccept={handleAcceptTerms}
          onDecline={handleDeclineTerms}
        />
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 50 },
  contentWrapper: { alignItems: 'center' },
  topBar: { width: '100%', alignItems: 'flex-end', marginBottom: 20 },
  logoContainer: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  formSection: { width: '100%', gap: 16 },
  validationHintGroup: { marginTop: 4, marginBottom: 8, width: '100%' },
  validationHintRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  validationHintText: { fontSize: 12 },
  signupButton: { backgroundColor: '#00549B', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  disabledButton: { opacity: 0.7 },
  signupButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loginLinkContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 8 },
  loginLinkText: { color: '#00549B', fontWeight: 'bold' },
});
