import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface ServiceSuggestionFormScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
}

const SERVICE_CATEGORIES = [
  'HOME_MAINTENANCE',
  'HOME_INSTALLATION',
  'REPAIR',
  'CLEANING',
  'ELECTRICAL',
  'PLUMBING',
  'CARPENTRY',
  'PAINTING',
  'OTHER',
];

export default function ServiceSuggestionFormScreen({
  onBack,
  onSuccess,
}: ServiceSuggestionFormScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily } = useFontFamily();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('HOME_MAINTENANCE');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

  // Animation values (Android only)
  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'android') {
      Animated.sequence([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(formAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      headerAnim.setValue(1);
      formAnim.setValue(1);
    }
  }, []);

  const handleSubmit = async () => {
    // Validation
    if (!nameAr.trim()) {
      showError(t('Please enter Arabic name'), t('Validation Error'));
      return;
    }

    if (!nameEn.trim()) {
      showError(t('Please enter English name'), t('Validation Error'));
      return;
    }

    if (!description.trim()) {
      showError(t('Please enter description'), t('Validation Error'));
      return;
    }

    if (!reason.trim()) {
      showError(t('Please enter reason for suggestion'), t('Validation Error'));
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'), t('Error'));
        setIsSubmitting(false);
        return;
      }

      const url = buildApiUrl(API_ENDPOINTS.SERVICE_SUGGESTIONS.CREATE);
      console.log('📤 Submitting service suggestion:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nameAr: nameAr.trim(),
          nameEn: nameEn.trim(),
          description: description.trim(),
          category,
          reason: reason.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Service suggestion submitted:', data);
        showSuccess(t('Service suggestion submitted successfully'), t('Success'));
        setTimeout(() => {
          hideAlert();
          onSuccess?.();
          onBack();
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to submit suggestion:', response.status, errorData);
        showError(errorData.message || t('Failed to submit suggestion'), t('Error'));
      }
    } catch (error) {
      console.error('❌ Error submitting suggestion:', error);
      showError(t('Error submitting suggestion'), t('Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 20),
            borderBottomColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fontFamily.bold }]}>
            {t('Suggest New Service')}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Form */}
      <Animated.View
        style={[
          styles.formContainer,
          {
            opacity: formAnim,
            transform: [
              {
                translateY: formAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text, fontFamily: fontFamily.regular }]}>
              {t('Suggest a new service that you can provide. Our team will review your suggestion.')}
            </Text>
          </View>

          {/* Arabic Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontFamily: fontFamily.semiBold }]}>
              {t('Service Name (Arabic)')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.cardBackground,
                  color: colors.text,
                  borderColor: colors.border,
                  fontFamily: fontFamily.regular,
                  textAlign: 'right',
                },
              ]}
              value={nameAr}
              onChangeText={setNameAr}
              placeholder={t('e.g., تنظيف مكيفات')}
              placeholderTextColor={colors.textSecondary}
              editable={!isSubmitting}
            />
          </View>

          {/* English Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontFamily: fontFamily.semiBold }]}>
              {t('Service Name (English)')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.cardBackground,
                  color: colors.text,
                  borderColor: colors.border,
                  fontFamily: fontFamily.regular,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              value={nameEn}
              onChangeText={setNameEn}
              placeholder={t('e.g., AC Cleaning')}
              placeholderTextColor={colors.textSecondary}
              editable={!isSubmitting}
            />
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontFamily: fontFamily.semiBold }]}>
              {t('Category')} *
            </Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                enabled={!isSubmitting}
                style={[styles.picker, { color: colors.text }]}
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <Picker.Item key={cat} label={t(cat)} value={cat} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontFamily: fontFamily.semiBold }]}>
              {t('Description')} *
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.cardBackground,
                  color: colors.text,
                  borderColor: colors.border,
                  fontFamily: fontFamily.regular,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholder={t('Describe the service in detail...')}
              placeholderTextColor={colors.textSecondary}
              editable={!isSubmitting}
            />
          </View>

          {/* Reason */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontFamily: fontFamily.semiBold }]}>
              {t('Reason for Suggestion')} *
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.cardBackground,
                  color: colors.text,
                  borderColor: colors.border,
                  fontFamily: fontFamily.regular,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              placeholder={t('Why should this service be added?')}
              placeholderTextColor={colors.textSecondary}
              editable={!isSubmitting}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={[styles.submitButtonText, { fontFamily: fontFamily.semiBold }]}>
                  {t('Submit Suggestion')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  formContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
