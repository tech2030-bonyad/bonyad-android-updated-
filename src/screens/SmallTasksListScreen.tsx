/**
 * SmallTasksListScreen - Displays a list of small tasks matching iOS design.
 * 
 * Features:
 * - iOS-matching card design with status badge, bids count
 * - Filter dropdown for status
 * - Search functionality
 * - Pull-to-refresh
 * - RTL/Arabic support
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Animated,
  TextInput,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import { getMyRequests, getAvailableRequests, getMyBids } from '../services/SmallTaskService';
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

const { width: STASK_DEVICE_WIDTH } = Dimensions.get('window');

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

interface SmallTaskRequest {
  id: number;
  taskType: {
    id: number;
    nameAr: string;
    nameEn: string;
  };
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  createdAt: string;
  bidCount?: number;
  bidsCount?: number;
  amount?: number;
  userName?: string;
}

interface SmallTasksListScreenProps {
  onBack?: () => void;
  onTaskPress: (task: SmallTaskRequest) => void;
  filter?: 'available' | 'my-bids' | 'in-progress' | 'completed';
  refreshTrigger?: number;
  isTechnician?: boolean;
}

export default function SmallTasksListScreen({
  onBack,
  onTaskPress,
  filter = 'available',
  refreshTrigger,
  isTechnician: propIsTechnician,
}: SmallTasksListScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDarkMode = theme === 'dark';
  
  const [tasks, setTasks] = useState<SmallTaskRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const dropdownAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  const primaryColor = isDarkMode ? COLORS.primaryDark : COLORS.primaryLight;
  const borderColor = isDarkMode ? COLORS.borderDark : COLORS.borderLight;
  const isArabic = i18n.language?.startsWith('ar');

  useEffect(() => {
    loadTasks();
  }, [filter, refreshTrigger, propIsTechnician]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(dropdownAnimation, {
        toValue: showFilterDropdown ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnimation, {
        toValue: showFilterDropdown ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showFilterDropdown]);

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return COLORS.statusPending;
      case 'ACCEPTED':
      case 'ASSIGNED':
        return COLORS.statusAccepted;
      case 'IN_PROGRESS':
        return COLORS.statusInProgress;
      case 'COMPLETED':
        return COLORS.statusCompleted;
      case 'CANCELLED':
        return COLORS.statusCancelled;
      default:
        return COLORS.statusCancelled;
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'PENDING': t('smallTasks.statusPending'),
      'IN_PROGRESS': t('smallTasks.statusInProgress'),
      'COMPLETED': t('smallTasks.statusCompleted'),
      'CANCELLED': t('smallTasks.statusCancelled'),
      'ACCEPTED': t('smallTasks.statusAccepted'),
      'ASSIGNED': t('smallTasks.statusAccepted'),
      'REJECTED': t('smallTasks.statusRejected'),
    };
    return statusMap[status.toUpperCase()] || status;
  };

  const getAllStatuses = () => ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      const role = await storage.getUserRole();
      const isTechnician = propIsTechnician ?? (role?.toUpperCase() === 'TECHNICIAN');

      if (!token) {
        setTasks([]);
        setIsLoading(false);
        return;
      }

      let allTasks: SmallTaskRequest[] = [];

      if (filter === 'available' && isTechnician) {
        const requests = await getAvailableRequests();
        allTasks = requests.map((task: any) => {
          const existingType = task.taskType && typeof task.taskType === 'object' && task.taskType.id != null
            ? { id: task.taskType.id, nameAr: task.taskType.nameAr || '', nameEn: task.taskType.nameEn || '' }
            : null;
          const taskType = existingType ?? (task.taskTypeId
            ? { id: task.taskTypeId, nameAr: task.taskTypeNameAr || '', nameEn: task.taskTypeNameEn || '' }
            : { id: 0, nameEn: 'Task', nameAr: 'مهمة' });
          return {
            ...task,
            taskType,
            bidCount: task.bidsCount ?? task.bidCount ?? 0,
            userName: task.userName,
          } as SmallTaskRequest;
        });
      } else if (filter === 'my-bids' && isTechnician) {
        const { bids } = await getMyBids();
        allTasks = bids.map((bid: any) => ({
          id: bid.smallTaskRequestId || bid.requestId || 0,
          taskType: bid.request?.taskType || bid.taskType || { nameEn: 'Task', nameAr: 'مهمة' },
          description: bid.request?.description || bid.description || '',
          address: bid.request?.address || '',
          latitude: bid.request?.latitude || 0,
          longitude: bid.request?.longitude || 0,
          status: bid.request?.status || bid.status || 'PENDING',
          createdAt: bid.createdAt || '',
          bidCount: 0,
          amount: bid.price || bid.amount,
        })) as SmallTaskRequest[];
      } else if (!isTechnician) {
        const requests = await getMyRequests();
        allTasks = requests.map((task: any) => ({
          ...task,
          taskType: task.taskTypeId
            ? { id: task.taskTypeId, nameAr: task.taskTypeNameAr || '', nameEn: task.taskTypeNameEn || '' }
            : { id: 0, nameEn: 'Task', nameAr: 'مهمة' },
          bidCount: task.bidsCount ?? task.bidCount ?? 0,
          userName: task.userName,
        })) as SmallTaskRequest[];
      } else {
        const requests = await getAvailableRequests();
        allTasks = requests.map((task: any) => ({
          ...task,
          taskType: task.taskTypeId
            ? { id: task.taskTypeId, nameAr: task.taskTypeNameAr || '', nameEn: task.taskTypeNameEn || '' }
            : { id: 0, nameEn: 'Task', nameAr: 'مهمة' },
          bidCount: task.bidsCount ?? task.bidCount ?? 0,
          userName: task.userName,
        })) as SmallTaskRequest[];
      }

      // Filter by status based on filter prop
      let filteredByStatus = allTasks;
      if (filter === 'in-progress') {
        filteredByStatus = allTasks.filter(task => {
          const status = (task.status || '').toUpperCase();
          return status === 'IN_PROGRESS' || status === 'ACCEPTED' || 
                 status === 'ASSIGNED' || status === 'PENDING';
        });
      } else if (filter === 'completed') {
        filteredByStatus = allTasks.filter(task => task.status?.toUpperCase() === 'COMPLETED');
      } else if (filter === 'available') {
        filteredByStatus = allTasks.filter(task => {
          const status = (task.status || '').toUpperCase();
          return status === 'PENDING' || status === 'AVAILABLE';
        });
      }

      // Sort by date (newest first)
      filteredByStatus = [...filteredByStatus].sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      setTasks(filteredByStatus);
    } catch (error: any) {
      console.error('Error loading small tasks:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (selectedCategory !== 'All') {
      let taskStatus = (task.status || '').trim().toUpperCase();
      if (taskStatus === 'ASSIGNED') taskStatus = 'ACCEPTED';
      if (taskStatus !== selectedCategory.toUpperCase()) return false;
    }
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const taskType = task.taskType || { nameEn: 'Task', nameAr: 'مهمة' };
    const taskName = i18n.language === 'ar' ? taskType.nameAr : taskType.nameEn;
    return (
      taskName.toLowerCase().includes(query) ||
      (task.description || '').toLowerCase().includes(query) ||
      (task.address || '').toLowerCase().includes(query)
    );
  });

  const dropdownHeight = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.min((1 + getAllStatuses().length) * 48, 288)],
  });

  const rotateInterpolate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primaryColor}
          />
        }
      >
        {/* Header Section - iOS style */}
        <View style={[styles.headerSection, isArabic ? styles.headerSectionRTL : styles.headerSectionLTR]}>
          <Text style={[styles.pageTitle, { color: primaryColor }]}>
            {t('smallTasks.myTaskRequests')}
          </Text>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {t('smallTasks.totalRequests')} {filteredTasks.length}
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[
          styles.searchContainer,
          {
            backgroundColor: colors.cardBackground,
            borderColor: borderColor,
          }
        ]}>
          <Feather name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('smallTasks.searchTasks')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Dropdown */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: colors.cardBackground,
                borderColor: borderColor,
              }
            ]}
            onPress={() => setShowFilterDropdown(!showFilterDropdown)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterButtonText, { color: colors.text }]}>
              {selectedCategory === 'All' ? t('smallTasks.all') : getStatusLabel(selectedCategory)}
            </Text>
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <Feather name="chevron-down" size={20} color={primaryColor} />
            </Animated.View>
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.filterDropdown,
              {
                backgroundColor: colors.cardBackground,
                borderColor: borderColor,
                maxHeight: dropdownHeight,
                opacity: dropdownAnimation,
              },
            ]}
          >
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} bounces={false}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  { backgroundColor: selectedCategory === 'All' ? primaryColor + '15' : 'transparent' },
                ]}
                onPress={() => {
                  setSelectedCategory('All');
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={[
                  styles.filterOptionText,
                  { color: selectedCategory === 'All' ? primaryColor : colors.text }
                ]}>
                  {t('smallTasks.all')}
                </Text>
                {selectedCategory === 'All' && (
                  <Feather name="check" size={16} color={primaryColor} />
                )}
              </TouchableOpacity>

              {getAllStatuses().map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    { backgroundColor: selectedCategory === status ? primaryColor + '15' : 'transparent' },
                  ]}
                  onPress={() => {
                    setSelectedCategory(status);
                    setShowFilterDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    { color: selectedCategory === status ? primaryColor : colors.text }
                  ]}>
                    {getStatusLabel(status)}
                  </Text>
                  {selectedCategory === status && (
                    <Feather name="check" size={16} color={primaryColor} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={50} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('smallTasks.noRequestsFound')}
            </Text>
          </View>
        ) : (
          <View style={styles.tasksContainer}>
            {filteredTasks.map((task, index) => (
              <SmallTaskRequestCard
                key={task.id}
                task={task}
                index={index}
                onPress={() => onTaskPress(task)}
                colors={colors}
                primaryColor={primaryColor}
                borderColor={borderColor}
                formatDate={formatDate}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                t={t}
                i18n={i18n}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Small Task Request Card - matches project card design with shimmer animation
const SmallTaskRequestCard = React.memo(({
  task,
  index,
  onPress,
  colors,
  primaryColor,
  borderColor,
  formatDate,
  getStatusColor,
  getStatusLabel,
  t,
  i18n,
}: {
  task: SmallTaskRequest;
  index: number;
  onPress: () => void;
  colors: any;
  primaryColor: string;
  borderColor: string;
  formatDate: (date: string) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  t: (key: string) => string;
  i18n: any;
}) => {
  const taskType = task.taskType || { nameEn: 'Task', nameAr: 'مهمة' };
  const taskName = i18n.language === 'ar' ? taskType.nameAr : taskType.nameEn;
  const statusColor = getStatusColor(task.status);
  const bidsCount = task.bidsCount ?? task.bidCount ?? 0;

  // Continuously looping shimmer sweep
  const shimmerX = useSharedValue(-STASK_DEVICE_WIDTH);
  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(STASK_DEVICE_WIDTH, {
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

  // Entry animation: scale + fade from below
  const entryAnim = useSharedValue(0);
  useEffect(() => {
    entryAnim.value = withTiming(1, { duration: 350, easing: ReEasing.out(ReEasing.quad) });
  }, []);

  const entryStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entryAnim.value, [0, 1], [0.5, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(entryAnim.value, [0, 1], [0.94, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <ReAnimated.View
      style={[
        styles.taskCard,
        { backgroundColor: colors.cardBackground, borderColor: colors.border + '55' },
        entryStyle,
      ]}
    >
      {/* Shimmer band */}
      <ReAnimated.View style={[styles.shimmerWrap, shimmerStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', statusColor + '30', statusColor + '55', statusColor + '30', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </ReAnimated.View>

      {/* Top color accent bar */}
      <LinearGradient
        colors={[statusColor, statusColor + '88']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.cardContent}>
        {/* ID + Status badge */}
        <View style={styles.cardTopRow}>
          <View style={styles.idRow}>
            <Ionicons name="flash-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.idText, { color: colors.textSecondary }]}>#{task.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18', borderColor: statusColor + '45' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(task.status)}</Text>
          </View>
        </View>

        {/* Task name */}
        <Text style={[styles.taskTypeName, { color: colors.text }]} numberOfLines={1}>
          {taskName}
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Footer: date + bids */}
        <View style={styles.cardFooter}>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
            <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{formatDate(task.createdAt)}</Text>
          </View>
          {bidsCount > 0 && (
            <View style={[styles.statChip, { backgroundColor: primaryColor + '15' }]}>
              <Ionicons name="hand-left-outline" size={11} color={primaryColor} />
              <Text style={[styles.statChipText, { color: primaryColor }]}>
                {bidsCount} {bidsCount === 1 ? t('smallTasks.bid') : t('smallTasks.bids')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </ReAnimated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 8,
    paddingVertical: 24,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    marginBottom: 16,
  },
  headerSectionLTR: {
    alignItems: 'flex-start',
  },
  headerSectionRTL: {
    alignItems: 'flex-end',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  countText: {
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterContainer: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterOptionText: {
    fontSize: 14,
  },
  tasksContainer: {
    gap: 16,
  },
  taskCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 5,
  },
  shimmerWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    width: STASK_DEVICE_WIDTH,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  cardContent: {
    padding: 16,
    zIndex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  idText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskTypeName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
