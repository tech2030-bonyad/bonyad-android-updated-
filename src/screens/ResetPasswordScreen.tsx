import React, { useState, useEffect, useMemo } from 'react';
import {
  ScrollView,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { Button } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useRTL } from '../hooks/useRTL';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resetPassword } from '../services/AuthService';
import { showAlert, showError } from '../utils/alert';
import { getTopPadding } from '../utils/statusBarHelper';
import { PasswordInput } from '../components/CustomInput';
import BonyadLogo from '../components/BonyadLogo';
import { evaluatePassword } from '../validation/passwordPolicy';

interface ResetPasswordScreenProps {
  phoneNumber: string;
  role: 'USER' | 'TECHNICIAN';
  otpCode: string;
  onBack: () => void;
  onPasswordReset: () => void;
}

export default function ResetPasswordScreen({ phoneNumber, role, otpCode, onBack, onPasswordReset }: ResetPasswordScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();
  const { arrowBackIcon, isRTL, rowDirection, textAlign } = useRTL();
  const insets = useSafeAreaInsets();
  const alignment: 'flex-start' | 'flex-end' = isRTL ? 'flex-end' : 'flex-start';
  const hintSuccess = colors.success || '#22C55E';
  const hintMuted = colors.textTertiary || colors.textSecondary || '#9CA3AF';

  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const shouldRenderMobile = Platform.OS !== 'web' || !IS_LARGE_WEB;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'new' | 'confirm' | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { rules: passwordRules, isValid: newPasswordValid } = useMemo(
    () => evaluatePassword(newPassword),
    [newPassword]
  );
  const confirmValid = confirmPassword.length > 0 && newPassword === confirmPassword;

  const PasswordHintItem = ({
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
          flexDirection: rowDirection,
        },
      ]}
    >
      <Ionicons name={passed ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={passed ? hintSuccess : hintMuted} />
      <Text
        style={[
          styles.validationHintText,
          {
            marginLeft: isRTL ? 0 : 6,
            marginRight: isRTL ? 6 : 0,
            color: passed ? hintSuccess : hintMuted,
            textAlign: textAlign as 'left' | 'right',
            fontSize: scaledSize(12),
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  const showNewHints =
    focusedField === 'new' || newPassword.length > 0 || validationAttempted;
  const showConfirmHints =
    focusedField === 'confirm' || confirmPassword.length > 0 || validationAttempted;

  const handleReset = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setValidationAttempted(true);
      showError(t('missing_fields'), t('validation_failed'));
      return;
    }
    if (!newPasswordValid) {
      setValidationAttempted(true);
      showError(t('signup.validation.password.requirements'), t('validation_failed'));
      return;
    }
    if (!confirmValid) {
      setValidationAttempted(true);
      showError(t('signup.validation.confirm'), t('validation_failed'));
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(phoneNumber, role, otpCode, newPassword, confirmPassword);
      showAlert(t('Password reset successfully'));
      onPasswordReset();
    } catch (error: any) {
      showError(error.message || t('Failed to reset password'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };

  const passwordFormFields = (
    <>
      <PasswordInput
        label={t('New Password')}
        value={newPassword}
        onChangeText={(v) => setNewPassword(v.replace(/\s/g, ''))}
        placeholder={t('Enter your new password')}
        autoCapitalize="none"
        onFocus={() => setFocusedField('new')}
        onBlur={() => setFocusedField((f) => (f === 'new' ? null : f))}
      />
      {showNewHints && (
        <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
          <PasswordHintItem passed={passwordRules.minLength} label={t('signup.validation.password.minLength')} isFirst />
          <PasswordHintItem passed={passwordRules.uppercase} label={t('signup.validation.password.uppercase')} />
          <PasswordHintItem passed={passwordRules.number} label={t('signup.validation.password.number')} />
          <PasswordHintItem passed={passwordRules.special} label={t('signup.validation.password.special')} />
          <PasswordHintItem passed={passwordRules.noSpaces} label={t('signup.validation.password.spaces')} />
          <PasswordHintItem passed={passwordRules.noSequence} label={t('signup.validation.password.sequence')} />
        </View>
      )}

      <PasswordInput
        label={t('Confirm Password')}
        value={confirmPassword}
        onChangeText={(v) => setConfirmPassword(v.replace(/\s/g, ''))}
        placeholder={t('Confirm your new password')}
        autoCapitalize="none"
        onFocus={() => setFocusedField('confirm')}
        onBlur={() => setFocusedField((f) => (f === 'confirm' ? null : f))}
      />
      {showConfirmHints && (
        <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
          <PasswordHintItem passed={confirmValid} label={t('signup.validation.confirm')} isFirst />
        </View>
      )}
    </>
  );

  if (shouldRenderMobile) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: getTopPadding(insets) }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <BackArrowIonicons variant="arrow" size={24} color={colors.text}/>
            </TouchableOpacity>
            <BonyadLogo size="small" />
            <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(24) }]}>{t('Reset Password')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {t('Enter your new password')}
            </Text>
          </View>

          {passwordFormFields}

          {/* Reset Button */}
          <Button
            mode="contained"
            onPress={handleReset}
            disabled={isLoading}
            style={[styles.resetButton, { backgroundColor: colors.primary }]}
            contentStyle={styles.resetButtonContent}
            loading={isLoading}
          >
            {t('Reset Password')}
          </Button>

          {/* Back to Login */}
          <Button
            mode="text"
            onPress={onBack}
            labelStyle={[styles.backToLoginText, { color: colors.textSecondary }]}
          >
            {t('Back to Login')}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Desktop layout
  return (
    <View style={[styles.desktopContainer, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.desktopScrollContent, { paddingTop: getTopPadding(insets) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.desktopFormContainer, { backgroundColor: colors.cardBackground }]}>
          {/* Header */}
          <View style={styles.desktopHeader}>
            <TouchableOpacity onPress={onBack} style={styles.desktopBackButton}>
              <BackArrowIonicons variant="arrow" size={24} color={colors.text}/>
            </TouchableOpacity>
            <BonyadLogo size="medium" />
            <Text style={[styles.desktopTitle, { color: colors.text, fontSize: scaledSize(28) }]}>{t('Reset Password')}</Text>
            <Text style={[styles.desktopSubtitle, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
              {t('Enter your new password')}
            </Text>
          </View>

          {passwordFormFields}

          {/* Reset Button */}
          <Button
            mode="contained"
            onPress={handleReset}
            disabled={isLoading}
            style={[styles.desktopResetButton, { backgroundColor: colors.primary }]}
            contentStyle={styles.desktopResetButtonContent}
            loading={isLoading}
          >
            {t('Reset Password')}
          </Button>

          {/* Back to Login */}
          <Button
            mode="text"
            onPress={onBack}
            labelStyle={[styles.desktopBackToLoginText, { color: colors.textSecondary }]}
          >
            {t('Back to Login')}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  resetButton: {
    borderRadius: 12,
    marginBottom: 16,
  },
  resetButtonContent: {
    paddingVertical: 8,
  },
  backToLoginText: {
    fontSize: 14,
  },
  validationHintGroup: {
    marginTop: 6,
    marginBottom: 12,
  },
  validationHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationHintText: {
    lineHeight: 16,
  },
  // Desktop styles
  desktopContainer: {
    flex: 1,
  },
  desktopScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  desktopFormContainer: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 40,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      } as any,
    }),
  },
  desktopHeader: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  desktopBackButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
  },
  desktopLogo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  desktopTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  desktopSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  desktopResetButton: {
    borderRadius: 12,
    marginBottom: 16,
  },
  desktopResetButtonContent: {
    paddingVertical: 12,
  },
  desktopBackToLoginText: {
    fontSize: 15,
  },
});

