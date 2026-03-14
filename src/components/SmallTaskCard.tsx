import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { SmallTaskRequest } from '../types/smallTasks';

// iOS-matching design colors
const COLORS = {
  primaryLight: '#1A6DB4',
  primaryDark: '#4D8EC5',
  borderLight: 'rgba(26, 109, 180, 0.2)',
  borderDark: 'rgba(77, 142, 197, 0.3)',
  statusPending: '#FF9500',
  statusAccepted: '#007AFF',
  statusInProgress: '#AF52DE',
  statusCompleted: '#34C759',
  statusCancelled: '#8E8E93',
};

interface SmallTaskCardProps {
  task: SmallTaskRequest;
  onPress: () => void;
  index?: number;
}

export default function SmallTaskCard({ task, onPress, index = 0 }: SmallTaskCardProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const primaryColor = isDarkMode ? COLORS.primaryDark : COLORS.primaryLight;
  const borderColor = isDarkMode ? COLORS.borderDark : COLORS.borderLight;

  useEffect(() => {
    if (Platform.OS === 'android') {
      const delay = index * 80;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
    }
  }, [index]);

  const taskName = task.taskType
    ? isRTL
      ? task.taskType?.nameAr || t('task')
      : task.taskType?.nameEn || t('task')
    : t('task');

  const bidsCount = task.bidsCount ?? task.bidCount ?? 0;

  const getStatusColor = (status: string): string => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return COLORS.statusPending;
      case 'ACCEPTED':
      case 'ASSIGNED': return COLORS.statusAccepted;
      case 'IN_PROGRESS': return COLORS.statusInProgress;
      case 'COMPLETED': return COLORS.statusCompleted;
      case 'CANCELLED': return COLORS.statusCancelled;
      default: return COLORS.statusCancelled;
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'PENDING': t('pending'),
      'IN_PROGRESS': t('in_progress'),
      'COMPLETED': t('completed'),
      'CANCELLED': t('cancelled'),
      'ACCEPTED': t('accepted'),
      'ASSIGNED': t('accepted'),
    };
    return statusMap[status?.toUpperCase()] || status;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const statusColor = getStatusColor(task.status);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            borderColor: borderColor,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Status Badge at top */}
        <View style={[styles.statusBadgeContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: statusColor + '15' },
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(task.status)}
            </Text>
          </View>
        </View>

        {/* Task Type Name */}
        <Text
          style={[
            styles.taskTypeName,
            { color: colors.text, textAlign: isRTL ? 'right' : 'left' },
          ]}
          numberOfLines={2}
        >
          {taskName}
        </Text>

        <View style={{ flex: 1 }} />

        {/* Bids Count */}
        <View style={[styles.bidsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.bidsText, { color: colors.textSecondary }]}>
            {bidsCount} {bidsCount === 1 ? t('bid') : t('bids')}
          </Text>
        </View>

        {/* Date */}
        <Text style={[styles.dateText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          {formatDate(task.createdAt)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 160,
    height: 160,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statusBadgeContainer: {
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  taskTypeName: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 8,
  },
  bidsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  bidsText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 11,
  },
});
