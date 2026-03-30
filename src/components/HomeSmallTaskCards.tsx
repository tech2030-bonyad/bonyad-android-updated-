import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { getMyRequests, type SmallTaskRequestApi } from '../services/SmallTaskService';

export interface HomeSmallTaskCardsProps {
  authToken?: string;
  onTaskPress: (task: SmallTaskRequestApi) => void;
}

const statusLabelKey = (status: string): string => {
  const s = (status || '').toUpperCase().replace(/-/g, '_');
  if (s === 'PENDING') return 'Pending';
  if (s === 'ACCEPTED') return 'Accepted';
  if (s === 'IN_PROGRESS') return 'In Progress';
  if (s === 'COMPLETED') return 'Completed';
  if (s === 'CANCELLED') return 'Cancelled';
  return status?.replace(/_/g, ' ') || status;
};

export default function HomeSmallTaskCards({ authToken, onTaskPress }: HomeSmallTaskCardsProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const [tasks, setTasks] = useState<SmallTaskRequestApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getMyRequests();
      setTasks(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || t('Failed to load'));
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load, authToken]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    const u = (status || '').toUpperCase();
    if (u.includes('PENDING')) return '#FF9500';
    if (u.includes('ACCEPTED') || u.includes('IN_PROGRESS')) return '#4CAF50';
    if (u.includes('COMPLETED')) return '#2196F3';
    if (u.includes('CANCEL')) return colors.textSecondary;
    return colors.textSecondary;
  };

  const taskTypeName = (task: SmallTaskRequestApi) => {
    if (i18n.language === 'ar' && task.taskTypeNameAr) return task.taskTypeNameAr;
    if (task.taskTypeNameEn) return task.taskTypeNameEn;
    if (task.taskTypeName) return task.taskTypeName;
    return t('Small task');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
          {t('Loading...')}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error || '#FF3B30'} />
        <Text style={[styles.errorText, { color: colors.text, fontSize: scaledSize(14) }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={load}>
          <Text style={styles.retryButtonText}>{t('Retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(18) }]}>{t('Small tasks')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: scaledSize(13) }]}>
          {t('{{count}} tasks', { count: tasks.length })}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {tasks.map(task => {
          const sc = getStatusColor(task.status);
          return (
            <TouchableOpacity
              key={task.id}
              activeOpacity={0.7}
              onPress={() => onTaskPress(task)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: isDarkMode ? colors.border : 'rgba(0, 0, 0, 0.1)',
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.taskId, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>#{task.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: sc + '20' }]}>
                  <Text style={[styles.statusText, { color: sc, fontSize: scaledSize(11) }]}>{t(statusLabelKey(task.status))}</Text>
                </View>
              </View>
              <Text style={[styles.typeName, { color: colors.text, fontSize: scaledSize(15) }]} numberOfLines={2}>
                {taskTypeName(task)}
              </Text>
              <View style={styles.details}>
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary, fontSize: scaledSize(12) }]} numberOfLines={1}>
                    {task.address?.trim() || t('No address')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                    {formatDate(task.createdAt)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="hand-left-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                    {task.bidsCount ?? 0} {t('Bids')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {},
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
  },
  errorContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  scrollView: {},
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    width: 260,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  taskId: {
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontWeight: '600',
  },
  typeName: {
    fontWeight: '600',
    marginBottom: 10,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    flex: 1,
  },
});
