import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';

interface TaskType {
  id: number;
  nameAr: string;
  nameEn: string;
  description?: string;
  basePrice: number;
  estimatedDuration: number;
  isActive: boolean;
}

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
  const [searchQuery, setSearchQuery] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;


  useEffect(() => {
    loadTaskTypes();
    // Entrance animation
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
      const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.TYPES);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTaskTypes(data.taskTypes || []);
      } else {
        setTaskTypes([]);
      }
    } catch (error) {
      console.error('Error loading task types:', error);
      setTaskTypes([]);
    } finally {
      setIsLoading(false);
    }
  };


  const filteredTaskTypes = taskTypes.filter(taskType => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = i18n.language === 'ar' ? taskType.nameAr : taskType.nameEn;
    const description = taskType.description || '';
    return (
      name.toLowerCase().includes(query) ||
      description.toLowerCase().includes(query)
    );
  });

  const handleSelect = (taskType: TaskType) => {
    // Exit animation
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
            paddingTop: Math.max(insets.top, 20),
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }
        ]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons 
              name={isRTL ? "arrow-forward" : "arrow-back"} 
              size={24} 
              color={colors.text} 
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('Select Task Type')}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          paddingTop: Math.max(insets.top, 20),
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }
      ]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons 
            name={isRTL ? "arrow-forward" : "arrow-back"} 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('Select Task Type')}
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
        {/* Search Bar */}
        <View style={[
          styles.searchContainer, 
          { 
            backgroundColor: colors.cardBackground, 
            borderColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }
        ]}>
          <Feather name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[
              styles.searchInput, 
              { 
                color: colors.text,
                textAlign: isRTL ? 'right' : 'left',
                marginLeft: isRTL ? 0 : 12,
                marginRight: isRTL ? 12 : 0,
              }
            ]}
            placeholder={t('Search task types...')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Task Types List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredTaskTypes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={80} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('No task types found')}
              </Text>
            </View>
          ) : (
            <View style={styles.taskTypesContainer}>
              {filteredTaskTypes.map((taskType, index) => {
                const name = i18n.language === 'ar' ? taskType.nameAr : taskType.nameEn;
                
                return (
                  <TaskTypeCard
                    key={taskType.id}
                    taskType={taskType}
                    name={name}
                    index={index}
                    onSelect={handleSelect}
                    colors={colors}
                    t={t}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

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
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  taskTypesContainer: {
    gap: 12,
  },
  taskTypeCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  taskTypeHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskTypeName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});

// Separate component for animated card
const TaskTypeCard = React.memo(({
  taskType,
  name,
  index,
  onSelect,
  colors,
  t,
}: {
  taskType: TaskType;
  name: string;
  index: number;
  onSelect: (taskType: TaskType) => void;
  colors: any;
  t: (key: string) => string;
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
            borderColor: colors.border,
          },
        ]}
        onPress={() => onSelect(taskType)}
        activeOpacity={0.7}
      >
        <View style={styles.taskTypeHeader}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="construct" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.taskTypeName, { color: colors.text }]} numberOfLines={2}>
            {name}
          </Text>
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
});
