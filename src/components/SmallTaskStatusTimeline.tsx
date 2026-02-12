import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

interface SmallTaskStatusTimelineProps {
  currentStatus: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedTechnicianName?: string;
  completedAt?: string;
}

export default function SmallTaskStatusTimeline({
  currentStatus,
  assignedTechnicianName,
  completedAt,
}: SmallTaskStatusTimelineProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, fonts } = useFontFamily();

  const statuses = [
    { status: 'PENDING', label: t('Pending'), icon: 'time-outline' },
    { status: 'ASSIGNED', label: t('Assigned'), icon: 'checkmark-circle-outline' },
    { status: 'IN_PROGRESS', label: t('In Progress'), icon: 'construct-outline' },
    { status: 'COMPLETED', label: t('Completed'), icon: 'checkmark-done-circle-outline' },
  ];

  const getStatusIndex = (status: string) => {
    return statuses.findIndex((s) => s.status === status);
  };

  const currentIndex = getStatusIndex(currentStatus);

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      {statuses.map((item, index) => {
        const isActive = item.status === currentStatus;
        const isPast = currentIndex > index;
        const isFuture = currentIndex < index;

        return (
          <View key={item.status} style={styles.statusItem}>
            {/* Connector Line */}
            {index > 0 && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor: isPast || isActive ? colors.primary : colors.border,
                  },
                ]}
              />
            )}

            {/* Status Circle */}
            <View
              style={[
                styles.statusCircle,
                {
                  backgroundColor: isActive
                    ? colors.primary
                    : isPast
                    ? colors.primary + '40'
                    : colors.border,
                  borderColor: isActive ? colors.primary : colors.border,
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
                  color: isActive ? colors.primary : colors.textSecondary,
                  fontFamily: isActive ? (fonts?.primaryBold || fontFamily) : (fonts?.body || fontFamily),
                  fontWeight: isActive ? '600' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>

            {/* Additional Info */}
            {item.status === 'ASSIGNED' && isActive && assignedTechnicianName && (
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
