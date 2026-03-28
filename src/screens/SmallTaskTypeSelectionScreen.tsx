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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SmallTaskType, getSmallTaskTypeImageUrl } from '../services/SmallTaskService';

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
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const primaryColor = isDarkMode ? COLORS.primaryDark : COLORS.primaryLight;
  const borderColor = isDarkMode ? COLORS.borderDark : COLORS.borderLight;
  const topSpacing = Platform.OS === 'android' ? 0 : Math.max(insets.top, 20);

  useEffect(() => {
    loadTaskTypes();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
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
        <View style={[
          styles.header, 
          { 
            paddingTop: topSpacing,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            borderBottomColor: colors.border,
          }
        ]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={primaryColor} 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: primaryColor }]}>
            {t('select_task_type')}
          </Text>
          <View style={{ width: 40 }} />
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
        <View style={[
          styles.header, 
          { 
            paddingTop: topSpacing,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            borderBottomColor: colors.border,
          }
        ]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={primaryColor} 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: primaryColor }]}>
            {t('select_task_type')}
          </Text>
          <View style={{ width: 40 }} />
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
        <View style={[
          styles.header, 
          { 
            paddingTop: topSpacing,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            borderBottomColor: colors.border,
          }
        ]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={primaryColor} 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: primaryColor }]}>
            {t('select_task_type')}
          </Text>
          <View style={{ width: 40 }} />
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
      <View style={[
        styles.header, 
        { 
          paddingTop: topSpacing,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          borderBottomColor: colors.border,
        }
      ]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={primaryColor} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: primaryColor }]}>
          {t('select_task_type')}
        </Text>
        <View style={{ width: 40 }} />
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

// Task Type Card - iOS matching design
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
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const name = i18n.language === 'ar' ? taskType.nameAr : taskType.nameEn;
  const description = taskType.description ?? 
    (i18n.language === 'ar' ? (taskType as any).descriptionAr : (taskType as any).descriptionEn) ?? '';
  const imageUrl = getSmallTaskTypeImageUrl(taskType);

  return (
    <Animated.View
      style={{
        opacity: cardAnim,
        transform: [
          {
            translateY: cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        style={[
          styles.taskTypeCard,
          {
            backgroundColor: colors.cardBackground,
            borderColor: borderColor,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        onPress={() => onSelect(taskType)}
        activeOpacity={0.7}
      >
        {/* Icon Circle */}
        <View style={[styles.iconCircle, { backgroundColor: primaryColor + '15' }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.taskTypeImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="checkmark-circle" size={24} color={primaryColor} />
          )}
        </View>

        {/* Content */}
        <View style={[styles.cardContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text 
            style={[
              styles.taskTypeName, 
              { 
                color: colors.text,
                textAlign: isRTL ? 'right' : 'left',
              }
            ]} 
            numberOfLines={1}
          >
            {name}
          </Text>
          {description ? (
            <Text 
              style={[
                styles.taskTypeDescription, 
                { 
                  color: colors.textSecondary,
                  textAlign: isRTL ? 'right' : 'left',
                }
              ]} 
              numberOfLines={2}
            >
              {description}
            </Text>
          ) : null}
        </View>

        {/* Chevron */}
        <View style={styles.chevronContainer}>
          <Ionicons 
            name={isRTL ? "chevron-back" : "chevron-forward"} 
            size={16} 
            color={colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    height: 88,
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
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  taskTypeImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  cardContent: {
    flex: 1,
    marginHorizontal: 16,
    justifyContent: 'center',
  },
  taskTypeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskTypeDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  chevronContainer: {
    width: 20,
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
