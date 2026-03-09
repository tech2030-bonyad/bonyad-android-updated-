import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { storage } from '../utils/storage';
import { createBid } from '../services/SmallTaskService';
import { SmallTaskRequest } from '../types/smallTasks';
import AlertPopup, { useAlertPopup } from './AlertPopup';

interface SmallTaskBidFormModalProps {
  visible: boolean;
  task: SmallTaskRequest | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SmallTaskBidFormModal({
  visible,
  task,
  onClose,
  onSuccess,
}: SmallTaskBidFormModalProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, fonts } = useFontFamily();
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

  // Animation values (Android only)
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && Platform.OS === 'android') {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!visible) {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && task) {
      // Pre-fill with suggested values
      if (task.budget) {
        setAmount(task.budget.toString());
      }
      if (task.estimatedDuration) {
        const hours = Math.ceil(task.estimatedDuration / 60);
        setEstimatedHours(hours.toString());
      }
    }
  }, [visible, task]);

  const handleSubmit = async () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      showError(t('Please enter a valid amount'), t('Validation Error'));
      return;
    }

    if (!description.trim()) {
      showError(t('Please enter a description'), t('Validation Error'));
      return;
    }

    if (!estimatedHours || parseFloat(estimatedHours) <= 0) {
      showError(t('Please enter valid hours'), t('Validation Error'));
      return;
    }

    if (!task) return;

    setIsSubmitting(true);

    try {
      await createBid(task.id, {
        price: parseFloat(amount),
        estimatedDuration: Math.round(parseFloat(estimatedHours) * 60),
        notes: description.trim(),
      });
      showSuccess(t('Bid submitted successfully'), t('Success'));
      setAmount('');
      setDescription('');
      setEstimatedHours('');
      setTimeout(() => {
        hideAlert();
        onClose();
        onSuccess();
      }, 1500);
    } catch (error: unknown) {
      const err = error as { message?: string };
      showError(err.message || t('Failed to submit bid'), t('Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!task) return null;

  const taskName = task.taskType
    ? isRTL
      ? task.taskType?.nameAr || t('Task')
      : task.taskType?.nameEn || t('Task')
    : t('Task');
  const riyalLogo = isDarkMode
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
            }}
          >
            <View style={styles.backdropContent} />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: colors.cardBackground,
              transform: [{ translateY: Platform.OS === 'android' ? slideAnim : 0 }],
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
              {t('Submit Bid')}
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Task Info */}
            <View style={[styles.taskInfo, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[styles.taskHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.taskIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="construct" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskName, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {taskName}
                  </Text>
                  {task.budget && (
                    <View style={[styles.budgetRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.budgetLabel, { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily }]}>
                        {t('Budget')}:
                      </Text>
                      <ExpoImage source={riyalLogo} style={styles.riyalLogoSmall} contentFit="contain" />
                      <Text style={[styles.budgetValue, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                        {new Intl.NumberFormat('en-US').format(task.budget)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                {t('Your Bid Amount (SAR)')} *
              </Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <ExpoImage source={riyalLogo} style={styles.riyalLogo} contentFit="contain" />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      fontFamily: fonts?.body || fontFamily,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder={t('Enter amount')}
                  placeholderTextColor={colors.textSecondary}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Hours Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                {t('Estimated Hours')} *
              </Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      fontFamily: fonts?.body || fontFamily,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  value={estimatedHours}
                  onChangeText={setEstimatedHours}
                  keyboardType="numeric"
                  placeholder={t('Enter hours')}
                  placeholderTextColor={colors.textSecondary}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                {t('Description')} *
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                    fontFamily: fonts?.body || fontFamily,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder={t('Describe your offer and experience...')}
                placeholderTextColor={colors.textSecondary}
                editable={!isSubmitting}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.buttonText, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                {t('Cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#fff', fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('Submit Bid')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropContent: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    maxHeight: 500,
  },
  taskInfo: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  budgetLabel: {
    fontSize: 13,
  },
  budgetValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
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
  riyalLogo: {
    width: 20,
    height: 20,
  },
  riyalLogoSmall: {
    width: 14,
    height: 14,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
