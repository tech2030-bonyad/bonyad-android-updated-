/**
 * Notifications Screen – same mechanism as web (notificationService, filter tabs, section list, mark read, delete).
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useTranslation } from 'react-i18next';
import { notificationService } from '../services/NotificationService';
import type { Notification } from '../services/NotificationService';

/**
 * Parse notification date: datetime without timezone = Saudi Arabia (Asia/Riyadh, UTC+3)
 * so "X mins ago" is correct for users in any country (e.g. Egypt vs Saudi).
 */
const SAUDI_ARABIA_UTC_OFFSET_HOURS = 3;

function parseAsSaudiArabiaTime(str: string): Date {
  const dateTime = str.replace(/\s+/, 'T');
  const match = dateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?/);
  if (!match) return new Date(NaN);
  const [, y, m, d, h, min, s] = match;
  const year = parseInt(y!, 10);
  const month = parseInt(m!, 10) - 1;
  const day = parseInt(d!, 10);
  const hour = parseInt(h!, 10) - SAUDI_ARABIA_UTC_OFFSET_HOURS;
  const minute = parseInt(min!, 10);
  const second = parseInt(s || '0', 10);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function parseNotificationDate(value: string | number | undefined | Record<string, unknown>): Date {
  const now = new Date();
  if (value == null || value === '') return now;

  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    const o = value as Record<string, unknown>;
    const v = o.seconds ?? o.createdAt ?? o.created_at ?? o.date ?? o.timestamp ?? (o.time && o.date ? `${o.date}T${o.time}` : null);
    if (v != null) return parseNotificationDate(v as string | number);
    return now;
  }

  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? now : d;
  }

  const str = String(value).trim();
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    const ms = num < 1e12 ? num * 1000 : num;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? now : d;
  }

  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
    const iso = str.replace(/\s+/, 'T');
    const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(iso) ? iso : iso + ':00';
    const d = parseAsSaudiArabiaTime(withSeconds);
    if (!isNaN(d.getTime())) return d.getTime() > now.getTime() ? now : d;
  }

  const hasTimezone = str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str) && !hasTimezone) {
    const d = parseAsSaudiArabiaTime(str);
    if (!isNaN(d.getTime())) return d.getTime() > now.getTime() ? now : d;
  }

  const d = new Date(str);
  if (isNaN(d.getTime())) return now;
  return d.getTime() > now.getTime() ? now : d;
}

type NotificationFilter = 'all' | 'unread' | 'read';

interface NotificationsScreenProps {
  onBack?: () => void;
  onNavigateToProject?: (projectId: number) => void;
  onNavigateToPhase?: (projectId: number, phaseId?: number) => void;
  onNavigateToBid?: (projectId: number, bidId: number) => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationsScreen({
  onBack,
  onNavigateToProject,
  onNavigateToPhase,
  onNavigateToBid,
  onUnreadCountChange,
}: NotificationsScreenProps) {
  const { colors, theme } = useTheme();
  const { t, i18n } = useTranslation();
  const { scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilter>('all');

  const fetchNotifications = async () => {
    try {
      if (!isRefreshing) setIsLoading(true);
      const data = await notificationService.fetchNotifications();
      const normalizedData = data.map((n: any) => ({
        ...n,
        title: n.title ?? '',
        message: n.message ?? '',
        read: n.read !== undefined ? Boolean(n.read) : Boolean(n.isRead),
        createdAt: n.createdAt ?? n.created_at ?? new Date().toISOString(),
      }));
      setNotifications(normalizedData);
      const unreadCount = normalizedData.filter((n: Notification) => !n.read).length;
      onUnreadCountChange?.(unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (notificationId: number) => {
    const success = await notificationService.markAsRead(notificationId);
    if (success) {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
        const unreadCount = updated.filter((n) => !n.read).length;
        onUnreadCountChange?.(unreadCount);
        return updated;
      });
    } else {
      Alert.alert(t('Error'), t('Failed to mark notification as read'));
    }
  };

  const markAllAsRead = async () => {
    const success = await notificationService.markAllAsRead();
    if (success) {
      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, read: true }));
        onUnreadCountChange?.(0);
        return updated;
      });
    } else {
      Alert.alert(t('Error'), t('Failed to mark all notifications as read'));
    }
  };

  const deleteNotification = async (notificationId: number) => {
    const success = await notificationService.deleteNotification(notificationId);
    if (success) {
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== notificationId);
        const unreadCount = updated.filter((n) => !n.read).length;
        onUnreadCountChange?.(unreadCount);
        return updated;
      });
    } else {
      Alert.alert(t('Error'), t('Failed to delete notification'));
    }
  };

  const handleNotificationTap = (notification: Notification) => {
    markAsRead(notification.id);
    switch (notification.notificationType) {
      case 'BID_RECEIVED':
      case 'VISIT_REQUEST':
        if (notification.relatedProjectId) onNavigateToProject?.(notification.relatedProjectId);
        break;
      case 'PHASE_COMPLETED':
      case 'PHASE_CREATED':
      case 'PHASE_APPROVED':
        if (notification.relatedProjectId) onNavigateToPhase?.(notification.relatedProjectId, notification.relatedPhaseId);
        break;
      case 'BID_ACCEPTED':
        if (notification.relatedProjectId != null && notification.relatedBidId != null) onNavigateToBid?.(notification.relatedProjectId, notification.relatedBidId);
        break;
      default:
        break;
    }
  };

  const getFilteredNotifications = () => {
    switch (selectedFilter) {
      case 'unread': return notifications.filter((n) => !n.read);
      case 'read': return notifications.filter((n) => n.read);
      default: return notifications;
    }
  };

  const groupNotificationsByTime = (notifs: Notification[]) => {
    const now = new Date();
    const groups: Record<string, Notification[]> = {
      Today: [],
      Yesterday: [],
      '1 Week Ago': [],
      '1 Month Ago': [],
    };
    notifs.forEach((notif) => {
      const createdDate = parseNotificationDate(notif.createdAt);
      const diffMs = now.getTime() - createdDate.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffDays < 0 || !Number.isFinite(diffDays)) groups.Today.push(notif);
      else if (diffDays === 0) groups.Today.push(notif);
      else if (diffDays === 1) groups.Yesterday.push(notif);
      else if (diffDays <= 7) groups['1 Week Ago'].push(notif);
      else groups['1 Month Ago'].push(notif);
    });
    return Object.keys(groups)
      .filter((key) => groups[key].length > 0)
      .map((key) => ({ title: key, data: groups[key] }));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = getFilteredNotifications();
  const sections = useMemo(() => groupNotificationsByTime(filteredNotifications), [filteredNotifications]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('Loading notifications...')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, paddingVertical: 16, paddingHorizontal: 16 }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(20), marginLeft: onBack ? 0 : 16 }]}>
          {t('Notifications')}
        </Text>
      </View>

      <View style={[styles.filterTabs, { backgroundColor: colors.background, paddingBottom: 16, paddingHorizontal: 16, gap: 10 }]}>
        <TouchableOpacity
          onPress={() => setSelectedFilter('all')}
          style={[styles.tab, { backgroundColor: selectedFilter === 'all' ? colors.primary : colors.gray100, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 }]}
        >
          <Text style={[styles.tabText, { color: selectedFilter === 'all' ? colors.white : colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('All')} ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedFilter('unread')}
          style={[styles.tab, { backgroundColor: selectedFilter === 'unread' ? colors.primary : colors.gray100, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 }]}
        >
          <Text style={[styles.tabText, { color: selectedFilter === 'unread' ? colors.white : colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('Unread')} ({unreadCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedFilter('read')}
          style={[styles.tab, { backgroundColor: selectedFilter === 'read' ? colors.primary : colors.gray100, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 }]}
        >
          <Text style={[styles.tabText, { color: selectedFilter === 'read' ? colors.white : colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('Read')} ({notifications.length - unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.listContent, { paddingTop: 8, paddingBottom: 32, paddingHorizontal: 4, backgroundColor: colors.background }]}
        renderItem={({ item, index }) => (
          <NotificationCard
            notification={item}
            index={index}
            onTap={() => handleNotificationTap(item)}
            onDelete={() => deleteNotification(item.id)}
            colors={colors}
            isDarkMode={isDarkMode}
            t={t}
            textAlign={i18n.language === 'ar' ? 'right' : 'left'}
            scaledSize={scaledSize}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.sectionHeader, { color: colors.text, fontSize: scaledSize(16), marginTop: 16, marginBottom: 8 }]}>
            {t(title)}
          </Text>
        )}
        renderSectionFooter={() => <View style={[styles.sectionDivider, { backgroundColor: colors.border, marginVertical: 10 }]} />}
        keyExtractor={(item) => item.id.toString()}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={[styles.emptyState, { padding: 40, backgroundColor: colors.background }]}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: scaledSize(16), marginTop: 16 }]}>
              {selectedFilter === 'unread' ? t('No unread notifications') : t('No notifications')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

interface NotificationCardProps {
  notification: Notification;
  index?: number;
  onTap: () => void;
  onDelete: () => void;
  colors: typeof import('../constants/Colors').LightColors;
  isDarkMode: boolean;
  t: (key: string) => string;
  textAlign?: 'left' | 'right';
  scaledSize: (n: number) => number;
}

function NotificationCard({ notification, onTap, onDelete, colors, isDarkMode, t, textAlign = 'left', scaledSize }: NotificationCardProps) {
  const getIconName = (type: string): string => {
    switch (type) {
      case 'BID_RECEIVED':
      case 'BID_ACCEPTED': return 'cash-outline';
      case 'VISIT_REQUEST': return 'home-outline';
      case 'PHASE_COMPLETED':
      case 'PHASE_CREATED':
      case 'PHASE_APPROVED': return 'clipboard-outline';
      case 'PAYMENT_RECEIVED': return 'card-outline';
      case 'CONTRACT_SIGNED': return 'document-text-outline';
      case 'FEEDBACK_RECEIVED': return 'chatbubble-outline';
      case 'APPOINTMENT_CONFIRMED': return 'calendar-outline';
      default: return 'notifications-outline';
    }
  };

  const formatTime = (value: string | number | undefined): string => {
    const date = parseNotificationDate(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMs < 0 || !Number.isFinite(diffMs)) return t('Just now');
    if (diffSecs < 60) return t('Just now');
    if (diffMins < 60) return diffMins === 1 ? `1 ${t('min ago')}` : `${diffMins} ${t('mins ago')}`;
    if (diffHours < 24) return diffHours === 1 ? `1 ${t('hour ago')}` : `${diffHours} ${t('hours ago')}`;
    if (diffDays < 7) return diffDays === 1 ? `1 ${t('day ago')}` : `${diffDays} ${t('days ago')}`;
    if (diffWeeks < 4) return diffWeeks === 1 ? `1 ${t('week ago')}` : `${diffWeeks} ${t('weeks ago')}`;
    return date.toLocaleDateString();
  };

  const badgeBg = colors.primary;

  return (
    <>
      <TouchableOpacity
        onPress={onTap}
        onLongPress={() => {
          Alert.alert(t('Delete Notification'), t('Are you sure?'), [
            { text: t('Cancel'), style: 'cancel' },
            { text: t('Delete'), style: 'destructive', onPress: onDelete },
          ]);
        }}
        activeOpacity={0.7}
        style={[
          styles.card,
          {
            backgroundColor: notification.read ? colors.cardBackground : (isDarkMode ? 'rgba(26, 109, 180, 0.1)' : 'rgba(0, 93, 172, 0.05)'),
            borderWidth: 1,
            borderColor: notification.read ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') : badgeBg,
            paddingVertical: 16,
            paddingHorizontal: 16,
            marginVertical: 4,
            minHeight: 80,
            borderRadius: 6,
          },
        ]}
      >
        <View style={[styles.cardContent, { flexDirection: textAlign === 'right' ? 'row-reverse' : 'row', gap: 12 }]}>
          <View style={[styles.iconCircle, { width: 48, height: 48, borderRadius: 24, backgroundColor: badgeBg, marginLeft: textAlign === 'right' ? 16 : 16, marginRight: textAlign === 'right' ? 0 : undefined }]}>
            <Ionicons name={getIconName(notification.notificationType) as any} size={20} color={colors.white} />
          </View>
          <View style={[styles.cardTextContent, { flex: 1, gap: 4, marginLeft: textAlign === 'right' ? 0 : 16, marginRight: textAlign === 'right' ? 16 : 0 }]}>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign, fontSize: scaledSize(16), lineHeight: 22 }]} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={[styles.message, { color: colors.text, textAlign, fontSize: scaledSize(14), lineHeight: 20 }]} numberOfLines={2}>
              {notification.message}
            </Text>
          </View>
          <View style={[styles.cardRight, { gap: 8, minWidth: 50 }]}>
            <View style={[styles.timestampRow, { flexDirection: textAlign === 'right' ? 'row-reverse' : 'row', gap: 4 }]}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.timestamp, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>{formatTime(notification.createdAt)}</Text>
            </View>
            {!notification.read && (
              <View style={[styles.unreadDot, { width: 8, height: 8, borderRadius: 4, backgroundColor: badgeBg }]} />
            )}
          </View>
        </View>
      </TouchableOpacity>
      <View style={{ height: 20 }} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingText: { marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: {},
  title: { fontWeight: '400', flex: 1 },
  filterTabs: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center' },
  tabText: { fontWeight: '600' },
  listContent: {},
  sectionHeader: { fontWeight: '500' },
  sectionDivider: { height: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center' },
  card: { overflow: 'hidden' },
  cardContent: { alignItems: 'center' },
  iconCircle: { justifyContent: 'center', alignItems: 'center' },
  cardTextContent: { justifyContent: 'center' },
  cardTitle: { fontWeight: '700' },
  message: { fontWeight: '400' },
  cardRight: { alignItems: 'center', justifyContent: 'center' },
  timestampRow: { alignItems: 'center' },
  timestamp: { fontWeight: '400' },
  unreadDot: {},
});
