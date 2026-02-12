import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { SmallTaskRequest } from '../types/smallTasks';

interface SmallTaskCardProps {
  task: SmallTaskRequest;
  onPress: () => void;
  index?: number;
}

export default function SmallTaskCard({ task, onPress, index = 0 }: SmallTaskCardProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, fonts, scaledSize } = useFontFamily();
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Staggered entrance animation (Android only)
    if (Platform.OS === 'android') {
      const delay = index * 80; // 80ms delay between cards
      
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
      // Instant display on iOS/Web
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
    }
  }, [index]);

  const taskName = task.taskType
    ? isRTL
      ? task.taskType?.nameAr || t('Task')
      : task.taskType?.nameEn || t('Task')
    : t('Task');
  const budget = task.budget || task.amount || 0;

  const riyalLogo = isDarkMode
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#FFB703';
      case 'IN_PROGRESS':
        return colors.primary;
      case 'COMPLETED':
        return '#4CAF50';
      case 'CANCELLED':
        return '#F44336';
      case 'ASSIGNED':
        return '#2196F3';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'PENDING': t('Pending'),
      'IN_PROGRESS': t('In Progress'),
      'COMPLETED': t('Completed'),
      'CANCELLED': t('Cancelled'),
      'ASSIGNED': t('Assigned'),
    };
    return statusMap[status.toUpperCase()] || status;
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: scaleAnim },
        ],
      }}
    >
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Header with Icon & Name */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="construct" size={24} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text
              style={[
                styles.taskName,
                { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {taskName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(task.status), fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' },
                ]}
              >
                {getStatusLabel(task.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <Text
          style={[
            styles.description,
            {
              color: colors.textSecondary,
              fontFamily: fonts?.body || fontFamily,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          numberOfLines={2}
        >
          {task.description}
        </Text>

        {/* Location */}
        <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
          <Text
            style={[
              styles.infoText,
              { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily },
            ]}
            numberOfLines={1}
          >
            {task.address}
          </Text>
        </View>

        {/* Footer: Budget & Bids */}
        <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <ExpoImage
              source={riyalLogo}
              style={styles.riyalLogo}
              contentFit="contain"
            />
            <Text style={[styles.budget, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
              {new Intl.NumberFormat('en-US').format(budget)}
            </Text>
          </View>

          {task.bidCount !== undefined && (
            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
              <Text
                style={[
                  styles.infoText,
                  { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily },
                ]}
              >
                {task.bidCount} {t('bids')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  riyalLogo: {
    width: 16,
    height: 16,
  },
  budget: {
    fontSize: 16,
    fontWeight: '700',
  },
});
