/**
 * RequestModificationScreen – Android
 * Form to create a new change request (description + optional phase changes).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRTL } from '../hooks/useRTL';
import { requestChanges, PhaseChangeRequest } from '../services/ChangeRequestService';
import { showError, showSuccess } from '../utils/alert';
import { getTopPadding } from '../utils/statusBarHelper';

interface RequestModificationScreenProps {
  projectId: number;
  onBack: () => void;
  onSuccess?: () => void;
}

export default function RequestModificationScreen({
  projectId,
  onBack,
  onSuccess,
}: RequestModificationScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { arrowBackIcon } = useRTL();
  const insets = useSafeAreaInsets();
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      showError(t('Please enter a description'));
      return;
    }
    setSubmitting(true);
    try {
      await requestChanges(projectId, { description: trimmed });
      showSuccess(t('Change request submitted'));
      onSuccess?.();
      onBack();
    } catch (e: any) {
      showError(e.message || t('Failed to submit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, styles.headerLTR, { paddingTop: getTopPadding(insets, 8), borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <BackArrowIonicons variant="arrow" size={24} color={colors.text}/>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('Request modification')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.label, { color: colors.text }]}>{t('Describe the changes you want')}</Text>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          placeholder={t('E.g. add a phase, change budget, update timeline...')}
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
        />
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={submitting || !description.trim()}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>{t('Submit request')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  label: { fontSize: 15, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
