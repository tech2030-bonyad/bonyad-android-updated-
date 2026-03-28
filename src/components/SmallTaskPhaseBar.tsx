import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface PhaseBarItem {
  status: string;
  label: string;
  icon: 'tendering' | 'approved' | 'inProgress' | 'completed';
}

interface SmallTaskPhaseBarProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  statuses?: PhaseBarItem[];
}

// Per README: PENDING → ACCEPTED (bid accepted, payment required) → IN_PROGRESS (payment done) → COMPLETED
const getDefaultStatuses = (t: (key: string) => string): PhaseBarItem[] => [
  { status: 'PENDING', label: t('Pending'), icon: 'tendering' },
  { status: 'ACCEPTED', label: t('Accepted'), icon: 'approved' },
  { status: 'IN_PROGRESS', label: t('In Progress'), icon: 'inProgress' },
  { status: 'COMPLETED', label: t('Completed'), icon: 'completed' },
];

function StepSvgIcon({ icon, color }: { icon: PhaseBarItem['icon']; color: string }) {
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
}

export default function SmallTaskPhaseBar({
  currentStatus,
  onStatusChange,
  statuses,
}: SmallTaskPhaseBarProps) {
  const { t } = useTranslation();
  const resolvedStatuses = statuses || getDefaultStatuses(t);
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const itemRefs = useRef<{ [key: string]: View | null }>({});

  useEffect(() => {
    // Scroll to current status on mount
    setTimeout(() => {
      scrollToStatus(currentStatus);
    }, 300);
  }, [currentStatus]);

  const scrollToStatus = (status: string) => {
    const itemRef = itemRefs.current[status];
    if (itemRef && scrollViewRef.current) {
      itemRef.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          const screenWidth = Dimensions.get('window').width;
          const scrollX = x - screenWidth / 2 + 60; // Center the item
          scrollViewRef.current?.scrollTo({
            x: Math.max(0, scrollX),
            animated: true,
          });
        },
        () => {}
      );
    }
  };

  const getStatusIndex = (status: string) => {
    // Handle both ACCEPTED and ASSIGNED (legacy) as the same status
    const normalizedStatus = status === 'ASSIGNED' ? 'ACCEPTED' : status;
    return resolvedStatuses.findIndex(s => s.status === normalizedStatus);
  };

  // Normalize status for display (ASSIGNED → ACCEPTED)
  const normalizedCurrentStatus = currentStatus === 'ASSIGNED' ? 'ACCEPTED' : currentStatus;
  const currentIndex = getStatusIndex(normalizedCurrentStatus);
  const activeItem = resolvedStatuses[currentIndex >= 0 ? currentIndex : 0];

  // Android requirement: show only current status icon
  if (Platform.OS === 'android') {
    return (
      <View style={[styles.singleStatusContainer, { backgroundColor: colors.cardBackground }]}>
        <View
          style={[
            styles.statusCircle,
            styles.singleStatusCircle,
            {
              backgroundColor: colors.primary + '14',
              borderColor: colors.primary,
            },
          ]}
        >
          <StepSvgIcon icon={activeItem.icon} color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {resolvedStatuses.map((item, index) => {
          const isActive = item.status === normalizedCurrentStatus;
          const isPast = currentIndex > index;
          const isFuture = currentIndex < index;

          return (
            <TouchableOpacity
              key={item.status}
              style={styles.phaseItem}
              onPress={() => {
                onStatusChange(item.status);
                scrollToStatus(item.status);
              }}
              activeOpacity={0.7}
            >
              <View
                ref={(ref) => {
                  itemRefs.current[item.status] = ref;
                }}
                style={styles.phaseItemContent}
              >
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
                  <StepSvgIcon icon={item.icon} color={isActive || isPast ? '#FFFFFF' : colors.textSecondary} />
                </View>

                {/* Status Label */}
                <Text
                  style={[
                    styles.statusLabel,
                    {
                      color: isActive ? colors.primary : colors.textSecondary,
                      fontWeight: isActive ? '600' : '400',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t(item.label)}
                </Text>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  phaseItem: {
    marginRight: 8,
  },
  phaseItemContent: {
    alignItems: 'center',
    minWidth: 100,
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
    fontSize: 12,
    textAlign: 'center',
  },
  singleStatusContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  singleStatusCircle: {
    marginBottom: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
});
