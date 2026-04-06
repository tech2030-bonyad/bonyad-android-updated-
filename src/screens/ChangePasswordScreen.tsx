import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { storage } from '../utils/storage';
import { API_BASE_URL, API_ENDPOINTS, buildApiUrl } from '../config/api';
import { changePassword } from '../services/ProfileService';
import { getTopPadding } from '../utils/statusBarHelper';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import { evaluatePassword } from '../validation/passwordPolicy';
import AnimatedLoadingScreen from '../components/AnimatedLoadingScreen';

// Figma Design Colors
const FIGMA_COLORS = {
  primary: '#005DAC',
  primaryDark: '#003867',
  primaryLight: '#E6EFF7',
  inputBorder: '#80AED6',
  inputBackground: '#F0F0F0',
  textHeader: '#003867',
  textBody: '#2D2D2D',
  textSecondary: '#6E6E6E',
  white: '#FFFFFF',
  divider: '#D9D9D9',
};

interface ChangePasswordScreenProps {
  onBack: () => void;
}

interface UserProfile {
  name?: string;
  avatar?: string;
  profileImage?: string;
}

export default function ChangePasswordScreen({ onBack }: ChangePasswordScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const inputTextAlign = i18n.language?.startsWith('ar') ? 'right' : 'left';
  
  const { alertState, showAlert, showError, hideAlert } = useAlertPopup();

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
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(screenSlideX, { toValue: screenWidth, duration: 220, useNativeDriver: true }),
    ]).start(() => onBack());
  };
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'new' | 'confirm' | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const isArabic = i18n.language?.startsWith('ar');
  const alignment: 'flex-start' | 'flex-end' = isArabic ? 'flex-end' : 'flex-start';
  const hintSuccess = colors.success || '#22C55E';
  const hintMuted = colors.textTertiary || colors.textSecondary || '#9CA3AF';

  const { rules: passwordRules, isValid: newPasswordValid } = useMemo(
    () => evaluatePassword(newPassword),
    [newPassword]
  );
  const confirmValid = confirmPassword.length > 0 && newPassword === confirmPassword;

  const showNewPasswordHints =
    focusedField === 'new' || newPassword.length > 0 || validationAttempted;
  const showConfirmHints =
    focusedField === 'confirm' || confirmPassword.length > 0 || validationAttempted;

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
          flexDirection: isArabic ? 'row-reverse' : 'row',
        },
      ]}
    >
      <Ionicons name={passed ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={passed ? hintSuccess : hintMuted} />
      <Text
        style={[
          styles.validationHintText,
          {
            marginLeft: isArabic ? 0 : 6,
            marginRight: isArabic ? 6 : 0,
            color: passed ? hintSuccess : hintMuted,
            textAlign: isArabic ? 'right' : 'left',
            fontSize: scaledSize(12),
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        setIsFetching(false);
        return;
      }

      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.USER.PROFILE),
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Construct full URLs for images
        if (data.profileImage || data.avatar) {
          const imagePath = data.profileImage || data.avatar;
          if (!imagePath.startsWith('http')) {
            data.avatar = `${API_BASE_URL.replace('/api', '')}${imagePath}`;
          } else {
            data.avatar = imagePath;
          }
        }
        
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setValidationAttempted(true);
      showError(t('changePassword.allFieldsRequired'), t('validation_failed'));
      return;
    }
    if (!newPasswordValid) {
      setValidationAttempted(true);
      showError(t('signup.validation.password.requirements'), t('validation_failed'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationAttempted(true);
      showError(t('signup.validation.confirm'), t('validation_failed'));
      return;
    }
    if (oldPassword === newPassword) {
      setValidationAttempted(true);
      showError(t('changePassword.mustBeDifferent'), t('validation_failed'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await changePassword(oldPassword, newPassword);

      showAlert(t('changePassword.success'), result.message, 'success', [
        {
          text: t('changePassword.ok'),
          onPress: () => {
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setValidationAttempted(false);
            setFocusedField(null);
            handleBackScreen();
          },
        },
      ]);
    } catch (error: any) {
      showError(error.message || t('changePassword.failed'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Theme-aware colors
  const bgColor = isDarkMode ? colors.background : FIGMA_COLORS.white;
  const textColor = isDarkMode ? colors.text : FIGMA_COLORS.textBody;
  const headerTextColor = isDarkMode ? colors.text : FIGMA_COLORS.primaryDark;
  const inputBgColor = isDarkMode ? colors.cardBackground : FIGMA_COLORS.inputBackground;
  const inputBorderColor = isDarkMode ? colors.border : FIGMA_COLORS.inputBorder;
  const inputTextColor = isDarkMode ? colors.text : FIGMA_COLORS.primaryDark;
  const primaryColor = isDarkMode ? colors.primary : FIGMA_COLORS.primary;
  const dividerColor = isDarkMode ? colors.border : FIGMA_COLORS.divider;
  const avatarBgColor = isDarkMode ? colors.surface : FIGMA_COLORS.primaryLight;

  if (isFetching) {
    return (
      <Animated.View style={[styles.loadingContainer, { backgroundColor: bgColor, paddingTop: insets.top, opacity: screenOpacity, transform: [{ translateX: screenSlideX }] }]}>
        <AnimatedLoadingScreen showMessage={false} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top, opacity: screenOpacity, transform: [{ translateX: screenSlideX }] }]}>
      {/* Header */}
      <View style={[styles.headerRow, styles.headerLTR]}>
        <TouchableOpacity onPress={handleBackScreen} style={styles.backButton}>
          <BackArrowIonicons variant="chevron" size={24} color={headerTextColor} forceLtrLayout />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: headerTextColor, fontSize: scaledSize(18) }]}>
          {t('changePassword.title')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* User Avatar Section */}
        <View style={styles.userSection}>
          <View style={[styles.avatarContainer, { backgroundColor: avatarBgColor }]}>
            {userProfile?.avatar ? (
              <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
            ) : (
              <Ionicons name="person" size={50} color={primaryColor} />
            )}
          </View>
          <Text style={[styles.userName, { color: headerTextColor, fontSize: scaledSize(18) }]}>
            {userProfile?.name || t('myData.usernamePlaceholder')}
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Enter Current Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor, fontSize: scaledSize(14) }]}>
              {t('changePassword.currentPassword')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor: inputBorderColor }]}>
                <TextInput
                style={[styles.input, { color: inputTextColor, textAlign: inputTextAlign }]}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder={t('changePassword.enterCurrentPassword')}
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
                  secureTextEntry={!showOldPassword}
                />
              <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showOldPassword ? 'eye-off' : 'eye'}
                    size={20}
                  color={isDarkMode ? '#888888' : FIGMA_COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
          </View>

          {/* Enter New Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor, fontSize: scaledSize(14) }]}>
              {t('changePassword.newPassword')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor: inputBorderColor }]}>
                <TextInput
                style={[styles.input, { color: inputTextColor, textAlign: inputTextAlign }]}
                  value={newPassword}
                  onChangeText={(v) => setNewPassword(v.replace(/\s/g, ''))}
                  placeholder={t('changePassword.enterNewPassword')}
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
                  secureTextEntry={!showNewPassword}
                  onFocus={() => setFocusedField('new')}
                  onBlur={() => setFocusedField((f) => (f === 'new' ? null : f))}
                />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showNewPassword ? 'eye-off' : 'eye'}
                    size={20}
                  color={isDarkMode ? '#888888' : FIGMA_COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
          </View>

          {/* Re-Enter New Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: textColor, fontSize: scaledSize(14) }]}>
              {t('changePassword.reEnterNewPassword')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBgColor, borderColor: inputBorderColor }]}>
                <TextInput
                style={[styles.input, { color: inputTextColor, textAlign: inputTextAlign }]}
                  value={confirmPassword}
                  onChangeText={(v) => setConfirmPassword(v.replace(/\s/g, ''))}
                  placeholder={t('changePassword.confirmNewPassword')}
                placeholderTextColor={isDarkMode ? '#888888' : '#999999'}
                  secureTextEntry={!showConfirmPassword}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField((f) => (f === 'confirm' ? null : f))}
                />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={20}
                  color={isDarkMode ? '#888888' : FIGMA_COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            {showConfirmHints && (
              <View style={[styles.validationHintGroup, { alignItems: alignment }]}>
                <PasswordHintItem passed={confirmValid} label={t('signup.validation.confirm')} isFirst />
              </View>
            )}
          </View>
        </View>

        {/* Save Button */}
          <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: primaryColor },
            isLoading && styles.buttonDisabled,
          ]}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
            <Text style={styles.saveButtonText}>{t('changePassword.save')}</Text>
            )}
          </TouchableOpacity>
      </ScrollView>
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLTR: {
    direction: 'ltr',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 32,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  divider: {
    height: 0.5,
    width: '100%',
  },
  formSection: {
    gap: 12,
  },
  fieldGroup: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 0,
    height: 32,
    lineHeight: 32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 8,
    height: 43,
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '300',
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  validationHintGroup: {
    marginTop: 6,
    marginBottom: 4,
  },
  validationHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validationHintText: {
    lineHeight: 16,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
  },
});
