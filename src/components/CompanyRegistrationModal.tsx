/**
 * CompanyRegistrationModal – collects company name + CR number,
 * then verifies via Wathq before switching to company mode.
 * Port of iOS CompanyRegistrationSheet.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

interface CompanyRegistrationModalProps {
  visible: boolean;
  nationalId: string;
  onConfirm: (companyName: string, crNumber: string) => void;
  onCancel: () => void;
}

export default function CompanyRegistrationModal({
  visible,
  nationalId,
  onConfirm,
  onCancel,
}: CompanyRegistrationModalProps) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const { fontFamily, boldFontFamily, scaledSize } = useFontFamily();
  const [companyName, setCompanyName] = useState('');
  const [crNumber, setCrNumber] = useState('');

  const isValid =
    companyName.trim().length > 0 &&
    crNumber.length === 10 &&
    /^\d{10}$/.test(crNumber);

  const handleCrChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setCrNumber(digits);
  };

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(companyName.trim(), crNumber);
    setCompanyName('');
    setCrNumber('');
  };

  const handleCancel = () => {
    setCompanyName('');
    setCrNumber('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} hitSlop={12}>
              <Text style={[styles.cancelText, { color: '#00A5F4', fontFamily }]}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: boldFontFamily }]}>
              {t('Switch to Company')}
            </Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Icon */}
            <View style={styles.iconWrap}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(0,165,244,0.12)' }]}>
                <Ionicons name="business" size={30} color="#00A5F4" />
              </View>
            </View>

            {/* Info card */}
            <View style={[styles.infoCard, { backgroundColor: 'rgba(0,165,244,0.08)' }]}>
              <Ionicons name="information-circle" size={18} color="#00A5F4" />
              <Text style={[styles.infoText, { color: colors.text, fontFamily, fontSize: scaledSize(13) }]}>
                {t('Your National ID will be verified against the Commercial Registration via Wathq to confirm authorization.')}
              </Text>
            </View>

            {/* National ID (read-only) */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: boldFontFamily }]}>
                {t('National ID')}
              </Text>
              <View style={[styles.readOnlyField, { backgroundColor: isDark ? colors.cardBackground : '#F5F5F5', borderColor: colors.border }]}>
                <Ionicons name="person" size={16} color="#00A5F4" />
                <Text style={[styles.readOnlyText, { color: colors.text, fontFamily }]}>
                  {nationalId || '-'}
                </Text>
                <Ionicons name="lock-closed" size={12} color={colors.textSecondary} />
              </View>
            </View>

            {/* Company Name */}
            <View style={styles.fieldWrap}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: boldFontFamily }]}>
                  {t('Company Name')}
                </Text>
                <Text style={{ color: 'red' }}> *</Text>
              </View>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: isDark ? colors.cardBackground : '#FFF', borderColor: colors.border, fontFamily }]}
                placeholder={t('Enter company name')}
                placeholderTextColor={colors.textTertiary}
                value={companyName}
                onChangeText={setCompanyName}
              />
            </View>

            {/* CR Number */}
            <View style={styles.fieldWrap}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: boldFontFamily }]}>
                  {t('CR Number')}
                </Text>
                <Text style={{ color: 'red' }}> *</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? colors.cardBackground : '#FFF',
                    borderColor: crNumber.length === 0 ? colors.border : crNumber.length === 10 ? 'rgba(52,199,89,0.5)' : 'rgba(255,59,48,0.4)',
                    fontFamily,
                  },
                ]}
                placeholder={t('10-digit CR number')}
                placeholderTextColor={colors.textTertiary}
                value={crNumber}
                onChangeText={handleCrChange}
                keyboardType="number-pad"
                maxLength={10}
              />
              {crNumber.length > 0 && crNumber.length !== 10 && (
                <Text style={[styles.errorHint, { fontFamily }]}>{t('CR number must be 10 digits')}</Text>
              )}
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!isValid}
              activeOpacity={0.8}
              style={[styles.confirmBtn, { backgroundColor: isValid ? '#00A5F4' : 'rgba(128,128,128,0.3)' }]}
            >
              <Ionicons name="shield-checkmark" size={16} color="#FFF" />
              <Text style={[styles.confirmBtnText, { fontFamily: boldFontFamily }]}>
                {t('Verify & Switch')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 16 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  cancelText: { fontSize: 15 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  iconWrap: { alignItems: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12 },
  infoText: { flex: 1, lineHeight: 18 },
  fieldWrap: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  readOnlyText: { flex: 1, fontSize: 15 },
  input: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  errorHint: { color: '#FF3B30', fontSize: 11, marginTop: 2 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
