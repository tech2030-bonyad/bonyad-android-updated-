/**
 * BidFormModal — Technician bid submission (simple, theme-aligned layout).
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { showSuccess, showError } from '../utils/alert';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import AppBottomSheetModal from '../components/AppBottomSheetModal';

const RIYAL_LIGHT = require('../../assets/saudi_riyal_logo.svg');
const RIYAL_DARK = require('../../assets/saudi_riyal_logo_dark.svg');

interface BidFormModalProps {
  visible: boolean;
  project: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BidFormModal({ visible, project, onClose, onSuccess }: BidFormModalProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { scaledSize } = useFontFamily();
  const [bidPrice, setBidPrice] = useState('');
  const [bidDescription, setBidDescription] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { alertState, showError: showErrorAlert, hideAlert } = useAlertPopup();

  const isDark = theme === 'dark';
  const riyalSource = isDark ? RIYAL_DARK : RIYAL_LIGHT;

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: {
          width: '100%',
          gap: 16,
          paddingBottom: 8,
        },
        context: {
          borderRadius: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.cardBackground,
          padding: 14,
          gap: 10,
        },
        contextTop: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        },
        contextIconWrap: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.primary + '14',
          alignItems: 'center',
          justifyContent: 'center',
        },
        contextMain: { flex: 1, gap: 4 },
        contextTitle: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.text,
        },
        contextDesc: {
          fontSize: 12,
          lineHeight: 17,
          color: colors.textSecondary,
        },
        budgetLine: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: 2,
        },
        budgetLabel: {
          fontSize: 11,
          fontWeight: '500',
          color: colors.textSecondary,
        },
        field: { gap: 6 },
        labelRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        label: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.textSecondary,
        },
        star: { fontSize: 12, color: '#EF4444', fontWeight: '700' },
        inputShell: {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.cardBackground,
          paddingHorizontal: 12,
          minHeight: 48,
        },
        input: {
          flex: 1,
          fontSize: 17,
          fontWeight: '600',
          color: colors.text,
          paddingVertical: Platform.OS === 'android' ? 10 : 12,
        },
        inputMuted: {
          fontSize: 16,
          fontWeight: '500',
          color: colors.text,
        },
        inputSuffix: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingLeft: 8,
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderLeftColor: colors.border,
          marginVertical: 8,
        },
        riyalInField: { width: 22, height: 20 },
        daysHint: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.primary,
        },
        textAreaShell: {
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.cardBackground,
          paddingHorizontal: 12,
          paddingVertical: 10,
          minHeight: 120,
        },
        textArea: {
          fontSize: 15,
          lineHeight: 22,
          color: colors.text,
          textAlignVertical: 'top',
          minHeight: 100,
        },
        charCount: {
          fontSize: 11,
          color: colors.textSecondary,
          textAlign: 'right',
          marginTop: 4,
        },
        actions: {
          flexDirection: 'row',
          gap: 10,
          marginTop: 4,
        },
        btnGhost: {
          flex: 1,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: 'transparent',
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
        },
        btnGhostText: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.text,
        },
        btnPrimary: {
          flex: 1,
          flexDirection: 'row',
          borderRadius: 12,
          backgroundColor: colors.primary,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        btnPrimaryDisabled: { opacity: 0.45 },
        btnPrimaryText: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.white ?? '#fff',
        },
      }),
    [colors]
  );

  const getServiceName = () => {
    if (!project) return '';
    return i18n.language === 'ar' ? project.serviceNameAr || '' : project.serviceNameEn || '';
  };

  const submitBid = async () => {
    if (!bidPrice || parseFloat(bidPrice) <= 0) {
      showErrorAlert(t('Please enter a valid price'), t('Error'));
      return;
    }
    if (!bidDescription.trim()) {
      showErrorAlert(t('Please enter bid description'), t('Error'));
      return;
    }
    if (!estimatedDays || parseInt(estimatedDays, 10) <= 0) {
      showErrorAlert(t('Please enter valid duration'), t('Error'));
      return;
    }
    if (!project?.id) {
      showErrorAlert('Invalid project ID', t('Error'));
      return;
    }

    const token = await storage.getAuthToken();
    if (!token) {
      showErrorAlert('No auth token found', t('Error'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.BIDS.CREATE), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          proposedBudget: parseFloat(bidPrice),
          estimatedDurationDays: parseInt(estimatedDays, 10),
          comment: bidDescription.trim(),
        }),
      });

      if (response.ok) {
        showSuccess(t('Bid submitted successfully'));
        setTimeout(() => {
          setBidPrice('');
          setBidDescription('');
          setEstimatedDays('');
          onClose();
          onSuccess?.();
        }, 600);
      } else {
        await response.text();
        showError(t('Failed to submit bid'));
      }
    } catch {
      showError(t('Error submitting bid'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setBidPrice('');
      setBidDescription('');
      setEstimatedDays('');
      onClose();
    }
  };

  const isSubmitDisabled = isSubmitting || !bidPrice || !bidDescription || !estimatedDays;
  const budgetFmt =
    project?.budget != null
      ? new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US').format(project.budget)
      : null;

  return (
    <>
      <AppBottomSheetModal
        visible={visible}
        onClose={handleClose}
        title={t('Place Bid')}
        subtitle={getServiceName() || undefined}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
          <View style={s.context}>
            <View style={s.contextTop}>
              <View style={s.contextIconWrap}>
                <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
              </View>
              <View style={s.contextMain}>
                <Text style={s.contextTitle} numberOfLines={2}>
                  {getServiceName() || t('Project')}
                </Text>
                <Text style={s.contextDesc} numberOfLines={3}>
                  {project?.description?.trim() ? project.description : t('No description')}
                </Text>
                {budgetFmt != null && (
                  <View style={s.budgetLine}>
                    <Text style={s.budgetLabel}>{t('Budget')}</Text>
                    <Text style={[s.contextTitle, { fontSize: 14 }]}>{budgetFmt}</Text>
                    <ExpoImage source={riyalSource} style={{ width: 16, height: 15 }} contentFit="contain" />
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={s.label}>{t('Your Bid Price')}</Text>
              <Text style={s.star}>*</Text>
            </View>
            <View style={s.inputShell}>
              <TextInput
                style={s.input}
                placeholder={t('Enter amount')}
                placeholderTextColor={colors.textSecondary}
                value={bidPrice}
                onChangeText={setBidPrice}
                keyboardType="decimal-pad"
                editable={!isSubmitting}
              />
            </View>
          </View>

          <View style={s.field}>
            <View style={s.labelRow}>
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={s.label}>{t('Estimated Duration')}</Text>
              <Text style={s.star}>*</Text>
            </View>
            <View style={s.inputShell}>
              <TextInput
                style={[s.input, s.inputMuted]}
                placeholder={t('Days')}
                placeholderTextColor={colors.textSecondary}
                value={estimatedDays}
                onChangeText={setEstimatedDays}
                keyboardType="number-pad"
                editable={!isSubmitting}
              />
              <View style={s.inputSuffix}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={s.daysHint}>{t('Days')}</Text>
              </View>
            </View>
          </View>

          <View style={s.field}>
            <View style={s.labelRow}>
              <Ionicons name="document-text-outline" size={14} color={colors.primary} />
              <Text style={s.label}>{t('Proposal Description')}</Text>
              <Text style={s.star}>*</Text>
            </View>
            <View style={s.textAreaShell}>
              <TextInput
                style={s.textArea}
                placeholder={t('Describe your approach, experience, and why you are the best fit for this project...')}
                placeholderTextColor={colors.textSecondary}
                value={bidDescription}
                onChangeText={setBidDescription}
                multiline
                maxLength={500}
                editable={!isSubmitting}
              />
            </View>
            <Text style={s.charCount}>{bidDescription.length}/500</Text>
          </View>

          <View style={s.actions}>
            <TouchableOpacity style={s.btnGhost} onPress={handleClose} disabled={isSubmitting}>
              <Text style={[s.btnGhostText, { fontSize: scaledSize(15) }]}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnPrimary, isSubmitDisabled && s.btnPrimaryDisabled]}
              onPress={submitBid}
              disabled={isSubmitDisabled}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.white ?? '#fff'} />
              ) : (
                <>
                  <Ionicons name="send" size={18} color={colors.white ?? '#fff'} />
                  <Text style={[s.btnPrimaryText, { fontSize: scaledSize(15) }]}>{t('Submit Bid')}</Text>
                </>
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
