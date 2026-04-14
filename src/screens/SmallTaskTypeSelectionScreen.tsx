import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SmallTaskType, getSmallTaskTypeImageUrl } from '../services/SmallTaskService';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing as ReEasing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const { width: STASK_TYPE_WIDTH } = Dimensions.get('window');

// iOS-matching design colors
const COLORS = {
  primaryLight: '#1A6DB4',
  primaryDark: '#4D8EC5',
  borderLight: 'rgba(26, 109, 180, 0.2)',
  borderDark: 'rgba(77, 142, 197, 0.3)',
};

export type TaskType = SmallTaskType;

interface SmallTaskTypeSelectionScreenProps {
  onSelectTaskType: (taskType: TaskType) => void;
  onBack: () => void;
}

export default function SmallTaskTypeSelectionScreen({
  onSelectTaskType,
  onBack,
}: SmallTaskTypeSelectionScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const primaryColor = isDarkMode ? COLORS.primaryDark : COLORS.primaryLight;
  const borderColor = isDarkMode ? COLORS.borderDark : COLORS.borderLight;
  const topSpacing = Platform.OS === 'android' ? 0 : Math.max(insets.top, 20);

  useEffect(() => {
    loadTaskTypes();
  }, []);

  const loadTaskTypes = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const { getSmallTaskTypes } = await import('../services/SmallTaskService');
      const types = await getSmallTaskTypes();
      setTaskTypes(types);
    } catch (error) {
      console.error('Error loading task types:', error);
      setErrorMessage(t('failed_to_load_task_types'));
      setTaskTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (taskType: TaskType) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onSelectTaskType(taskType);
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topSpacing, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={[styles.backButton, isRTL ? { right: 20 } : { left: 20 }]}>
            <BackArrowIonicons variant="arrow" size={24} color={primaryColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: primaryColor }]}>
            {t('select_task_type')}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topSpacing, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={[styles.backButton, isRTL ? { right: 20 } : { left: 20 }]}>
            <BackArrowIonicons variant="arrow" size={24} color={primaryColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: primaryColor }]}>
            {t('select_task_type')}
          </Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#FF9500" />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {errorMessage}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: primaryColor }]}
            onPress={loadTaskTypes}
          >
            <Text style={styles.retryButtonText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (taskTypes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topSpacing, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={[styles.backButton, isRTL ? { right: 20 } : { left: 20 }]}>
            <BackArrowIonicons variant="arrow" size={24} color={primaryColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: primaryColor }]}>
            {t('select_task_type')}
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={50} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('no_task_types_available')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topSpacing, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.backButton, isRTL ? { right: 20 } : { left: 20 }]}>
          <BackArrowIonicons variant="arrow" size={24} color={primaryColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: primaryColor }]}>
          {t('select_task_type')}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section - iOS style */}
          <View style={styles.titleSection}>
            <Text style={[styles.pageTitle, { color: primaryColor }]}>
              {t('select_task_type')}
            </Text>
            <Text style={[styles.pageDescription, { color: colors.textSecondary }]}>
              {t('choose_task_type_description')}
            </Text>
          </View>

          {/* Task Types List */}
          <View style={styles.taskTypesContainer}>
            {taskTypes.map((taskType, index) => (
              <TaskTypeCard
                key={taskType.id}
                taskType={taskType}
                index={index}
                onSelect={handleSelect}
                colors={colors}
                primaryColor={primaryColor}
                borderColor={borderColor}
                isRTL={isRTL}
                isDarkMode={isDarkMode}
                t={t}
                i18n={i18n}
              />
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// Task Type Card - redesigned with shimmer animation
const TaskTypeCard = React.memo(({
  taskType,
  index,
  onSelect,
  colors,
  primaryColor,
  borderColor,
  isRTL,
  isDarkMode,
  t,
  i18n,
}: {
  taskType: TaskType;
  index: number;
  onSelect: (taskType: TaskType) => void;
  colors: any;
  primaryColor: string;
  borderColor: string;
  isRTL: boolean;
  isDarkMode: boolean;
  t: (key: string) => string;
  i18n: any;
}) => {
  const name = i18n.language === 'ar' ? taskType.nameAr : taskType.nameEn;
  const description = taskType.description ??
    (i18n.language === 'ar' ? (taskType as any).descriptionAr : (taskType as any).descriptionEn) ?? '';
  const imageUrl = getSmallTaskTypeImageUrl(taskType);

  // Continuous left-to-right shimmer
  const shimmerX = useSharedValue(-STASK_TYPE_WIDTH);
  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(STASK_TYPE_WIDTH, {
        duration: 2000 + index * 150,
        easing: ReEasing.inOut(ReEasing.sin),
      }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  // Entry animation (disabled to prevent white flash)
  const entryAnim = useSharedValue(1);

  const entryStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entryAnim.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(entryAnim.value, [0, 1], [20, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <ReAnimated.View
      style={[
        styles.taskTypeCard,
        { backgroundColor: colors.cardBackground, borderColor: colors.border + '55' },
        entryStyle,
      ]}
    >
      {/* Shimmer */}
      <ReAnimated.View style={[styles.shimmerWrap, shimmerStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', primaryColor + '28', primaryColor + '50', primaryColor + '28', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </ReAnimated.View>

      {/* Top accent bar */}
      <LinearGradient
        colors={[primaryColor, primaryColor + '88']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      <TouchableOpacity onPress={() => onSelect(taskType)} activeOpacity={0.82} style={styles.cardInner}>
        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: primaryColor + '18' }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.taskTypeImage} resizeMode="cover" />
          ) : (
            <Ionicons name="checkmark-circle" size={28} color={primaryColor} />
          )}
        </View>

        {/* Text */}
        <View style={styles.cardContent}>
          <Text style={[styles.taskTypeName, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          {!!description && (
            <Text style={[styles.taskTypeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>

        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </ReAnimated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    position: 'absolute',
    padding: 8,
    bottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  titleSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  pageDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  taskTypesContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  taskTypeCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 5,
  },
  shimmerWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    width: STASK_TYPE_WIDTH,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    zIndex: 1,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  taskTypeImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTypeName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  taskTypeDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
