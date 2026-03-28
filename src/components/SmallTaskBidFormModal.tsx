import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
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
import AppBottomSheetModal from './AppBottomSheetModal';

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
  const isDarkMode = theme === 'dark';

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

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
      showError(t('smallTasks.bidModal.pleaseEnterValidAmount'), t('smallTasks.bidModal.validationError'));
      return;
    }

    if (!description.trim()) {
      showError(t('smallTasks.bidModal.pleaseEnterDescription'), t('smallTasks.bidModal.validationError'));
      return;
    }

    if (!estimatedHours || parseFloat(estimatedHours) <= 0) {
      showError(t('smallTasks.bidModal.pleaseEnterValidHours'), t('smallTasks.bidModal.validationError'));
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
      showSuccess(t('smallTasks.bidModal.bidSubmittedSuccess'), t('smallTasks.success'));
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
      showError(err.message || t('smallTasks.bidModal.failedToSubmitBid'), t('smallTasks.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  if (!task) return null;

  const taskName = task.taskType
    ? i18n.language === 'ar'
      ? task.taskType?.nameAr || t('smallTasks.task')
      : task.taskType?.nameEn || t('smallTasks.task')
    : t('smallTasks.task');
  const riyalLogo = isDarkMode
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  return (
    <>
      <AppBottomSheetModal
        visible={visible}
        onClose={handleClose}
        title={t('smallTasks.bidModal.submitBid')}
        subtitle={taskName}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Task Info */}
            <View style={[styles.taskInfo, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.taskHeader}>
                <View style={[styles.taskIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="construct" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskName, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {taskName}
                  </Text>
                  {task.budget && (
                    <View style={styles.budgetRow}>
                      <Text style={[styles.budgetLabel, { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily }]}>
                        {t('smallTasks.bidModal.budget')}:
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
                {t('smallTasks.bidModal.yourBidAmountSar')} *
              </Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <ExpoImage source={riyalLogo} style={styles.riyalLogo} contentFit="contain" />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: fonts?.body || fontFamily }]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder={t('smallTasks.bidModal.enterAmount')}
                  placeholderTextColor={colors.textSecondary}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Hours Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                {t('smallTasks.bidModal.estimatedHours')} *
              </Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text, fontFamily: fonts?.body || fontFamily }]}
                  value={estimatedHours}
                  onChangeText={setEstimatedHours}
                  keyboardType="numeric"
                  placeholder={t('smallTasks.bidModal.enterHours')}
                  placeholderTextColor={colors.textSecondary}
                  editable={!isSubmitting}
                />
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                {t('smallTasks.description')} *
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                    fontFamily: fonts?.body || fontFamily,
                  },
                ]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                placeholder={t('smallTasks.bidModal.describeOfferPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                editable={!isSubmitting}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.buttonText, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                {t('smallTasks.bidModal.cancel')}
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
                  {t('smallTasks.bidModal.submitBid')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </AppBottomSheetModal>

      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    width: '100%',
  },
  content: {
    padding: 0,
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
