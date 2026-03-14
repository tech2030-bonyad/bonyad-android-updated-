import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

// iOS-matching design colors
const COLORS = {
  primaryLight: '#1A6DB4',
  primaryDark: '#4D8EC5',
  statusPending: '#FF9500',
  statusAccepted: '#007AFF',
  statusInProgress: '#AF52DE',
  statusCompleted: '#34C759',
};

interface SmallTaskStatusTimelineProps {
  // Per README: PENDING → ACCEPTED (bid accepted, payment required) → IN_PROGRESS (payment done) → COMPLETED
  // ASSIGNED is legacy status, treated as ACCEPTED
  currentStatus: 'PENDING' | 'ACCEPTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedTechnicianName?: string;
  completedAt?: string;
}

export default function SmallTaskStatusTimeline({
  currentStatus,
  assignedTechnicianName,
  completedAt,
}: SmallTaskStatusTimelineProps) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, fonts } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const primaryColor = isDarkMode ? COLORS.primaryDark : COLORS.primaryLight;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PENDING': return COLORS.statusPending;
      case 'ACCEPTED': return COLORS.statusAccepted;
      case 'IN_PROGRESS': return COLORS.statusInProgress;
      case 'COMPLETED': return COLORS.statusCompleted;
      default: return colors.textSecondary;
    }
  };

  // Per README: PENDING → ACCEPTED (payment required) → IN_PROGRESS (paid) → COMPLETED
  // iOS-matching icons (SF Symbols equivalents)
  const statuses = [
    { status: 'PENDING', label: t('Pending'), icon: 'time' },
    { status: 'ACCEPTED', label: t('Accepted'), icon: 'checkmark-circle' }, // iOS: checkmark.circle.fill
    { status: 'IN_PROGRESS', label: t('In Progress'), icon: 'play-circle' }, // iOS: play.circle.fill
    { status: 'COMPLETED', label: t('Completed'), icon: 'checkmark-done-circle' }, // iOS: checkmark.circle.fill
  ];

  const getStatusIndex = (status: string) => {
    // Handle both ACCEPTED and ASSIGNED (legacy) as the same status
    const normalizedStatus = status === 'ASSIGNED' ? 'ACCEPTED' : status;
    return statuses.findIndex((s) => s.status === normalizedStatus);
  };

  // Normalize status for display (ASSIGNED → ACCEPTED)
  const normalizedCurrentStatus = currentStatus === 'ASSIGNED' ? 'ACCEPTED' : currentStatus;
  const currentIndex = getStatusIndex(normalizedCurrentStatus);

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      {statuses.map((item, index) => {
        const isActive = item.status === normalizedCurrentStatus;
        const isPast = currentIndex > index;
        const isFuture = currentIndex < index;
        const statusColor = getStatusColor(item.status);
        const activeColor = isActive ? statusColor : (isPast ? primaryColor : colors.border);

        return (
          <View key={item.status} style={styles.statusItem}>
            {/* Connector Line */}
            {index > 0 && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor: isPast || isActive ? primaryColor : colors.border,
                  },
                ]}
              />
            )}

            {/* Status Circle - iOS style with status-specific colors */}
            <View
              style={[
                styles.statusCircle,
                {
                  backgroundColor: isActive
                    ? statusColor
                    : isPast
                    ? primaryColor + '40'
                    : colors.border,
                  borderColor: isActive ? statusColor : (isPast ? primaryColor : colors.border),
                },
              ]}
            >
              <Ionicons
                name={item.icon as any}
                size={20}
                color={isActive || isPast ? '#FFFFFF' : colors.textSecondary}
              />
            </View>

            {/* Status Label */}
            <Text
              style={[
                styles.statusLabel,
                {
                  color: isActive ? statusColor : colors.textSecondary,
                  fontFamily: isActive ? (fonts?.primaryBold || fontFamily) : (fonts?.body || fontFamily),
                  fontWeight: isActive ? '600' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>

            {/* Additional Info */}
            {item.status === 'ACCEPTED' && isActive && assignedTechnicianName && (
              <Text style={[styles.additionalInfo, { color: colors.textSecondary }]} numberOfLines={1}>
                {assignedTechnicianName}
              </Text>
            )}
            {item.status === 'COMPLETED' && isActive && completedAt && (
              <Text style={[styles.additionalInfo, { color: colors.textSecondary }]} numberOfLines={1}>
                {new Date(completedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    top: 20,
    left: -50,
    width: 100,
    height: 2,
    zIndex: 0,
  },
  statusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 8,
    zIndex: 1,
  },
  statusLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  additionalInfo: {
    fontSize: 10,
    textAlign: 'center',
  },
});
