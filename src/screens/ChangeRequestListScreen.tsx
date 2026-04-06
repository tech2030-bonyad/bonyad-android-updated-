/**
 * ChangeRequestListScreen – Android
 * Lists change requests for a project; navigates to detail or create.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useRTL } from '../hooks/useRTL';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getChangeRequestsByProject, ChangeRequest, ChangeRequestStatus } from '../services/ChangeRequestService';
import { showError } from '../utils/alert';
import { getTopPadding } from '../utils/statusBarHelper';

interface ChangeRequestListScreenProps {
  projectId: number;
  onBack: () => void;
  onViewDetail: (changeRequestId: number) => void;
  onCreateRequest: () => void;
}

const statusLabel: Record<string, string> = {
  PENDING: 'Pending',
  RESPONDED: 'Responded',
  AGREED: 'Agreed',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  PENDING_SIGNATURE: 'Pending signature',
  IN_DISCUSSION: 'In discussion',
  PARTIALLY_AGREED: 'Partially agreed',
  USER_SIGNED: 'User signed',
  TECHNICIAN_SIGNED: 'Technician signed',
  BOTH_SIGNED: 'Both signed',
};

export default function ChangeRequestListScreen({
  projectId,
  onBack,
  onViewDetail,
  onCreateRequest,
}: ChangeRequestListScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { arrowBackIcon } = useRTL();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await getChangeRequestsByProject(projectId);
      setList(data);
    } catch (e: any) {
      showError(e.message || t('Failed to load change requests'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const renderItem = ({ item }: { item: ChangeRequest }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground || '#fff', borderColor: colors.border }]}
      onPress={() => onViewDetail(item.id)}
      activeOpacity={0.7}
    >
      <Text style={[styles.desc, { color: colors.text }]} numberOfLines={2}>{item.description}</Text>
      <View style={styles.row}>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.requestedBy}</Text>
        <View style={[styles.badge, { backgroundColor: (colors.primary || '#005DAC') + '20' }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {statusLabel[item.status] || item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, styles.headerLTR, { paddingTop: getTopPadding(insets, 8), borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack}>
            <BackArrowIonicons variant="arrow" size={24} color={colors.text}/>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('Change requests')}</Text>
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
        <Text style={[styles.title, { color: colors.text }]}>{t('Change requests')}</Text>
        <TouchableOpacity onPress={onCreateRequest}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={list}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('No change requests')}</Text>
            <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={onCreateRequest}>
              <Text style={styles.createBtnText}>{t('Request modification')}</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  list: { padding: 16, paddingBottom: 32 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  desc: { fontSize: 15, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 12, fontSize: 15 },
  createBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  createBtnText: { color: '#fff', fontWeight: '600' },
});
