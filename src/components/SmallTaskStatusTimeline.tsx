import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
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
  const StepSvgIcon = ({
    icon,
    color,
  }: {
    icon: 'tendering' | 'approved' | 'inProgress' | 'completed';
    color: string;
  }) => {
    const strokeWidth = 1.9;
    switch (icon) {
      case 'tendering':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
            <Path d="M12 2v10l4 2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );
      case 'approved':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );
      case 'inProgress':
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
            <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );
      default:
        return (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Polyline points="4 12 9 17 20 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );
    }
  };

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
    { status: 'PENDING', label: t('Pending'), icon: 'tendering' as const },
    { status: 'ACCEPTED', label: t('Accepted'), icon: 'approved' as const },
    { status: 'IN_PROGRESS', label: t('In Progress'), icon: 'inProgress' as const },
    { status: 'COMPLETED', label: t('Completed'), icon: 'completed' as const },
  ];

  const getStatusIndex = (status: string) => {
    // Handle both ACCEPTED and ASSIGNED (legacy) as the same status
    const normalizedStatus = status === 'ASSIGNED' ? 'ACCEPTED' : status;
    return statuses.findIndex((s) => s.status === normalizedStatus);
  };

  // Normalize status for display (ASSIGNED → ACCEPTED)
  const normalizedCurrentStatus = currentStatus === 'ASSIGNED' ? 'ACCEPTED' : currentStatus;
  const currentIndex = getStatusIndex(normalizedCurrentStatus);
  const activeItem = statuses[currentIndex >= 0 ? currentIndex : 0];
  const activeColor = getStatusColor(activeItem.status);

  // Android requirement: show only current status icon
  if (Platform.OS === 'android') {
    return (
      <View style={[styles.singleStatusContainer, { backgroundColor: colors.cardBackground, borderColor: '#E5E7EB' }]}>
        <View
          style={[
            styles.statusCircle,
            styles.singleStatusCircle,
            {
              backgroundColor: activeColor + '14',
              borderColor: activeColor,
            },
          ]}
        >
          <StepSvgIcon icon={activeItem.icon} color={activeColor} />
        </View>
      </View>
    );
  }

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
              <StepSvgIcon icon={item.icon} color={isActive || isPast ? '#FFFFFF' : colors.textSecondary} />
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
  singleStatusContainer: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleStatusCircle: {
    marginBottom: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
});
