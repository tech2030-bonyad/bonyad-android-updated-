/**
 * ChangeRequestDetailScreen – Android
 * Shows one change request thread; respond / agree / reject.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useRTL } from '../hooks/useRTL';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getChangeRequestThread,
  respondToChangeRequest,
  agreeOnChanges,
  rejectChangeRequest,
  ChangeRequest,
} from '../services/ChangeRequestService';
import { showError, showSuccess } from '../utils/alert';
import { getTopPadding } from '../utils/statusBarHelper';

interface ChangeRequestDetailScreenProps {
  changeRequestId: number;
  projectId: number;
  onBack: () => void;
  onSuccess?: () => void;
}

export default function ChangeRequestDetailScreen({
  changeRequestId,
  projectId,
  onBack,
  onSuccess,
}: ChangeRequestDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language?.startsWith('ar');
  const { colors } = useTheme();
  const { arrowBackIcon } = useRTL();
  const insets = useSafeAreaInsets();
  const [thread, setThread] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseModal, setResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getChangeRequestThread(changeRequestId);
      setThread(Array.isArray(data) ? data : [data]);
    } catch (e: any) {
      showError(e.message || t('Failed to load'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [changeRequestId]);

  const root = thread.find((r) => !r.parentRequestId) || thread[0];
  const canRespond = root && root.status === 'PENDING';
  const canAgree = root && ['RESPONDED', 'PARTIALLY_AGREED'].includes(root.status);
  const canReject = root && ['PENDING', 'RESPONDED'].includes(root.status);

  const handleRespond = async () => {
    if (!responseText.trim()) return;
    setSubmitting(true);
    try {
      await respondToChangeRequest(changeRequestId, { response: responseText.trim() });
      showSuccess(t('Response submitted'));
      setResponseModal(false);
      setResponseText('');
      load();
      onSuccess?.();
    } catch (e: any) {
      showError(e.message || t('Failed to submit'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAgree = () => {
    Alert.alert(t('Agree'), t('Do you want to agree on these changes?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Agree'),
        onPress: async () => {
          setSubmitting(true);
          try {
            await agreeOnChanges(changeRequestId);
            showSuccess(t('Agreed'));
            load();
            onSuccess?.();
          } catch (e: any) {
            showError(e.message || t('Failed'));
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleReject = () => {
    Alert.alert(t('Reject'), t('Do you want to reject this change request?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Reject'),
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await rejectChangeRequest(changeRequestId);
            showSuccess(t('Rejected'));
            load();
            onSuccess?.();
          } catch (e: any) {
            showError(e.message || t('Failed'));
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  if (loading && thread.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, styles.headerLTR, { paddingTop: getTopPadding(insets, 8), borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack}>
            <BackArrowIonicons variant="arrow" size={24} color={colors.text}/>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('Change request')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, styles.headerLTR, { paddingTop: getTopPadding(insets, 8), borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <BackArrowIonicons variant="arrow" size={24} color={colors.text}/>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('Change request')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {thread.map((item) => (
          <View key={item.id} style={[styles.bubble, { backgroundColor: (colors.primary || '#005DAC') + '12', borderColor: colors.border }]}>
            <Text style={[styles.desc, { color: colors.text }]}>{item.description}</Text>
            {item.response ? <Text style={[styles.response, { color: colors.textSecondary }]}>{item.response}</Text> : null}
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {item.requestedBy || item.respondedBy} · {item.requestedAt || item.respondedAt || ''} · {item.status}
            </Text>
          </View>
        ))}
      </ScrollView>
      {root && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          {canRespond && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => setResponseModal(true)}>
              <Text style={styles.btnText}>{t('Respond')}</Text>
            </TouchableOpacity>
          )}
          {canAgree && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981' }]} onPress={handleAgree} disabled={submitting}>
              <Text style={styles.btnText}>{t('Agree')}</Text>
            </TouchableOpacity>
          )}
          {canReject && (
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleReject} disabled={submitting}>
              <Text style={styles.btnText}>{t('Reject')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <Modal visible={responseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('Your response')}</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholder={t('Type your response...')}
              placeholderTextColor={colors.textSecondary}
              value={responseText}
              onChangeText={setResponseText}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => { setResponseModal(false); setResponseText(''); }}>
                <Text style={[styles.btnText, { color: colors.text }]}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleRespond} disabled={submitting || !responseText.trim()}>
                <Text style={styles.btnText}>{t('Submit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerLTR: {
    direction: 'ltr',
  },
  title: { fontSize: 18, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  bubble: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  desc: { fontSize: 15 },
  response: { fontSize: 14, marginTop: 8 },
  meta: { fontSize: 12, marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10, borderTopWidth: 1 },
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  btnSecondary: { backgroundColor: '#e0e0e0' },
  btnDanger: { backgroundColor: '#DC3545' },
  btnText: { color: '#fff', fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 18, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
});
