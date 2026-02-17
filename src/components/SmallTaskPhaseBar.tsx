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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface PhaseBarItem {
  status: string;
  label: string;
  icon: string;
}

interface SmallTaskPhaseBarProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  statuses?: PhaseBarItem[];
}

// Per README: PENDING → ACCEPTED (bid accepted, payment required) → IN_PROGRESS (payment done) → COMPLETED
const DEFAULT_STATUSES: PhaseBarItem[] = [
  { status: 'PENDING', label: 'Pending', icon: 'time-outline' },
  { status: 'ACCEPTED', label: 'Accepted', icon: 'card-outline' }, // Payment required
  { status: 'IN_PROGRESS', label: 'In Progress', icon: 'construct-outline' },
  { status: 'COMPLETED', label: 'Completed', icon: 'checkmark-circle-outline' },
];

export default function SmallTaskPhaseBar({
  currentStatus,
  onStatusChange,
  statuses = DEFAULT_STATUSES,
}: SmallTaskPhaseBarProps) {
  const { t } = useTranslation();
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
    return statuses.findIndex(s => s.status === normalizedStatus);
  };

  // Normalize status for display (ASSIGNED → ACCEPTED)
  const normalizedCurrentStatus = currentStatus === 'ASSIGNED' ? 'ACCEPTED' : currentStatus;
  const currentIndex = getStatusIndex(normalizedCurrentStatus);

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {statuses.map((item, index) => {
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
});
