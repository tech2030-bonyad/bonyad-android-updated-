/**
 * SmallTasksListScreen - Displays a list of small tasks with filtering and search.
 *
 * - Displays tasks based on filter prop: 'available', 'my-bids', 'in-progress', 'completed'
 * - Search + status filter dropdown (All, Pending, In Progress, Completed, etc.)
 * - Pull-to-refresh
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
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from '../utils/storage';
import { getMyRequests, getAvailableRequests, getMyBids } from '../services/SmallTaskService';

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
  /** When set, used for available vs my-requests (avoids async role delay on Android) */
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
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';
  const [tasks, setTasks] = useState<SmallTaskRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const dropdownAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  const riyalLogo = theme === 'dark'
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  useEffect(() => {
    loadTasks();
  }, [filter, refreshTrigger, propIsTechnician]);

  useEffect(() => {
    if (showFilterDropdown) {
      Animated.parallel([
        Animated.timing(dropdownAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(dropdownAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(rotateAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showFilterDropdown]);

  const toggleFilterDropdown = () => {
    setShowFilterDropdown(!showFilterDropdown);
  };

  const getAllStatuses = () => {
    return ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'PENDING': t('Pending'),
      'IN_PROGRESS': t('In Progress'),
      'COMPLETED': t('Completed'),
      'CANCELLED': t('Cancelled'),
      'ACCEPTED': t('Accepted'),
      'REJECTED': t('Rejected'),
    };
    return statusMap[status.toUpperCase()] || status;
  };

  const getStatusFilterLabel = (statusValue: string) => {
    if (statusValue === 'All') return t('All');
    return getStatusLabel(statusValue);
  };

  const handleStatusSelect = (statusValue: string) => {
    setSelectedCategory(statusValue === 'All' ? 'All' : statusValue);
    setShowFilterDropdown(false);
  };

  const getDropdownHeight = () => {
    const allStatuses = getAllStatuses();
    const optionCount = 1 + allStatuses.length;
    return Math.min(optionCount * 48, 288);
  };

  const dropdownHeight = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, getDropdownHeight()],
  });

  const dropdownOpacity = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const rotateInterpolate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      const role = await storage.getUserRole();
      const isTechnician = propIsTechnician ?? (role?.toUpperCase() === 'TECHNICIAN');

      if (__DEV__ && filter === 'available') {
        console.log('🔍 [SmallTasksListScreen] loadTasks role=', role, 'propIsTechnician=', propIsTechnician, 'isTechnician=', isTechnician, 'filter=', filter);
      }

      if (!token) {
        setTasks([]);
        setIsLoading(false);
        return;
      }

      let allTasks: SmallTaskRequest[] = [];

      if (filter === 'available' && isTechnician) {
        const requests = await getAvailableRequests();
        allTasks = requests.map((task: { taskTypeId?: number; taskTypeNameAr?: string; taskTypeNameEn?: string; userName?: string; bidsCount?: number; [k: string]: unknown }) => {
          const existingType = task.taskType && typeof task.taskType === 'object' && (task.taskType as any).id != null
            ? { id: (task.taskType as any).id, nameAr: (task.taskType as any).nameAr || '', nameEn: (task.taskType as any).nameEn || '' }
            : null;
          const taskType = existingType ?? (task.taskTypeId
            ? { id: task.taskTypeId, nameAr: task.taskTypeNameAr || '', nameEn: task.taskTypeNameEn || '' }
            : { id: 0, nameEn: 'Task', nameAr: 'مهمة' });
          return {
            ...task,
            taskType,
            bidCount: (task.bidsCount ?? (task as any).bidCount) ?? 0,
            userName: task.userName,
          } as SmallTaskRequest;
        });
      } else if (filter === 'my-bids' && isTechnician) {
        const { bids } = await getMyBids();
        allTasks = bids.map((bid: { smallTaskRequestId?: number; requestId?: number; request?: SmallTaskRequest; taskType?: { nameAr: string; nameEn: string }; description?: string; address?: string; latitude?: number; longitude?: number; status?: string; createdAt?: string; price?: number; amount?: number; estimatedDuration?: number }) => ({
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
        allTasks = requests.map((task: { taskTypeId?: number; taskTypeNameAr?: string; taskTypeNameEn?: string; userName?: string; bidsCount?: number; [k: string]: unknown }) => ({
          ...task,
          taskType: task.taskTypeId
            ? { id: task.taskTypeId, nameAr: task.taskTypeNameAr || '', nameEn: task.taskTypeNameEn || '' }
            : { id: 0, nameEn: 'Task', nameAr: 'مهمة' },
          bidCount: (task.bidsCount ?? (task as any).bidCount) ?? 0,
          userName: task.userName,
        })) as SmallTaskRequest[];
      } else {
        const requests = await getAvailableRequests();
        allTasks = requests.map((task: { taskTypeId?: number; taskTypeNameAr?: string; taskTypeNameEn?: string; userName?: string; bidsCount?: number; [k: string]: unknown }) => ({
          ...task,
          taskType: task.taskTypeId
            ? { id: task.taskTypeId, nameAr: task.taskTypeNameAr || '', nameEn: task.taskTypeNameEn || '' }
            : { id: 0, nameEn: 'Task', nameAr: 'مهمة' },
          bidCount: (task.bidsCount ?? (task as any).bidCount) ?? 0,
          userName: task.userName,
        })) as SmallTaskRequest[];
      }

        // Filter by status based on filter prop
        let filteredByStatus = allTasks;
        if (filter === 'in-progress') {
          filteredByStatus = allTasks.filter(task => {
            const status = (task.status || '').toUpperCase();
            return status === 'IN_PROGRESS' || status === 'ACCEPTED' || 
                   status === 'ASSIGNED' || status === 'PENDING' || 
                   status === 'BID_RECEIVED';
          });
        } else if (filter === 'completed') {
          filteredByStatus = allTasks.filter(task => {
            const status = (task.status || '').toUpperCase();
            return status === 'COMPLETED';
          });
        } else if (filter === 'available') {
          // Same as web: only show tasks open for bidding (PENDING or AVAILABLE)
          filteredByStatus = allTasks.filter(task => {
            const status = (task.status || '').toUpperCase();
            return status === 'PENDING' || status === 'AVAILABLE';
          });
          if (__DEV__) {
            console.log('📋 [SmallTasksListScreen] Available: PENDING/AVAILABLE:', filteredByStatus.length, 'of', allTasks.length);
          }
        } else if (filter === 'my-bids') {
          filteredByStatus = allTasks;
        }

        // Sort by date (newest first) - same as web
        filteredByStatus = [...filteredByStatus].sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

        setTasks(filteredByStatus);
    } catch (error: any) {
      console.error('❌ [SmallTasksListScreen] Error loading small tasks:', error);
      console.error('❌ [SmallTasksListScreen] Error Message:', error.message);
      console.error('❌ [SmallTasksListScreen] Error Stack:', error.stack);
      setTasks([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      console.log('🏁 [SmallTasksListScreen] Loading completed');
      console.log('═══════════════════════════════════════════════════════════');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US').format(budget);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'PENDING') return '#FFB703';
    if (s === 'ACCEPTED' || s === 'ASSIGNED') return '#008B3E';
    if (s === 'IN_PROGRESS') return '#8B5CF6';
    if (s === 'COMPLETED') return '#008B3E';
    if (s === 'CANCELLED') return '#FF3B30';
    return colors.textSecondary || '#666666';
  };

  const filteredTasks = tasks.filter(task => {
    if (selectedCategory !== 'All') {
      let taskStatus = (task.status || '').trim().toUpperCase();
      if (taskStatus === 'ASSIGNED') taskStatus = 'ACCEPTED';
      const selectedStatus = selectedCategory.toUpperCase().trim();
      if (taskStatus !== selectedStatus) return false;
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

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
            tintColor={colors.primary}
          />
        }
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
              }
            ]}
            placeholder={t('Search tasks...')}
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
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }
            ]}
            onPress={toggleFilterDropdown}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterButtonText, { color: colors.text }]}>
              {getStatusFilterLabel(selectedCategory)}
            </Text>
            <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
              <Feather name="chevron-down" size={20} color={colors.primary} />
            </Animated.View>
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.filterDropdown,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                maxHeight: dropdownHeight,
                opacity: dropdownOpacity,
              },
            ]}
          >
            <ScrollView
              style={styles.filterDropdownContent}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: selectedCategory === 'All' ? colors.primary + '15' : 'transparent',
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => handleStatusSelect('All')}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    { color: colors.text },
                    selectedCategory === 'All' && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {t('All')}
                </Text>
                {selectedCategory === 'All' && (
                  <Feather name="check" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>

              {getAllStatuses().map((status, index, array) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: selectedCategory === status ? colors.primary + '15' : 'transparent',
                      borderBottomColor: index < array.length - 1 ? colors.border : 'transparent',
                    },
                  ]}
                  onPress={() => handleStatusSelect(status)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: colors.text },
                      selectedCategory === status && { color: colors.primary, fontWeight: '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {getStatusLabel(status)}
                  </Text>
                  {selectedCategory === status && (
                    <Feather name="check" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={80} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('No tasks found')}
            </Text>
          </View>
        ) : (
          <View style={styles.tasksContainer}>
            {filteredTasks.map((task) => {
              // Safely access taskType with fallback
              const taskType = task.taskType || { nameEn: 'Task', nameAr: 'مهمة' };
              const taskName = i18n.language === 'ar' ? taskType.nameAr : taskType.nameEn;
              const statusColor = getStatusColor(task.status);
              const bidsCount = task.bidsCount ?? task.bidCount ?? 0;
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={() => onTaskPress(task)}
                  activeOpacity={0.7}
                >
                  {/* Row 1: Request #id + Status badge (same as web) */}
                  <View style={[
                    styles.cardHeaderRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' }
                  ]}>
                    <Text style={[styles.taskIdText, { color: colors.textSecondary }]}>
                      #{task.id}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {getStatusLabel(task.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={[
                    styles.taskHeader,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' }
                  ]}>
                    <Text style={[
                      styles.taskTitle, 
                      { 
                        color: colors.text,
                        textAlign: isRTL ? 'right' : 'left',
                      }
                    ]} numberOfLines={1}>
                      {taskName}
                    </Text>
                    {task.amount != null && task.amount > 0 && (
                      <View style={[
                        styles.priceContainer,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' }
                      ]}>
                        <ExpoImage
                          source={riyalLogo}
                          style={styles.riyalLogo}
                          contentFit="contain"
                        />
                        <Text style={[styles.priceText, { color: colors.primary }]}>
                          {formatBudget(task.amount)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {task.userName ? (
                    <Text style={[
                      styles.userNameText,
                      { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }
                    ]} numberOfLines={1}>
                      {task.userName}
                    </Text>
                  ) : null}

                  <Text style={[
                    styles.taskDescription, 
                    { 
                      color: colors.textSecondary,
                      textAlign: isRTL ? 'right' : 'left',
                    }
                  ]} numberOfLines={2}>
                    {task.description}
                  </Text>
                  <View style={[
                    styles.taskFooter,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' }
                  ]}>
                    <View style={[
                      styles.taskMeta,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' }
                    ]}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={[
                        styles.taskMetaText, 
                        { 
                          color: colors.textSecondary,
                          textAlign: isRTL ? 'right' : 'left',
                        }
                      ]} numberOfLines={1}>
                        {task.address || t('No address')}
                      </Text>
                    </View>
                    <View style={[
                      styles.cardInfoRow,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' }
                    ]}>
                      <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.cardInfoText, { color: colors.textSecondary }]}>
                        {formatDate(task.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <View style={[
                    styles.bidCountRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' }
                  ]}>
                    <Ionicons name="hand-left-outline" size={14} color={colors.primary} />
                    <Text style={[styles.bidCountText, { color: colors.primary }]}>
                      {bidsCount} {t('Bids')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
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
  tasksContainer: {
    gap: 12,
  },
  taskCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  taskIdText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  priceContainer: {
    alignItems: 'center',
    gap: 4,
  },
  riyalLogo: {
    width: 14,
    height: 14,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
  },
  taskDescription: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  userNameText: {
    fontSize: 12,
    marginBottom: 4,
  },
  taskFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskMeta: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  taskMetaText: {
    fontSize: 12,
    flex: 1,
  },
  cardInfoRow: {
    alignItems: 'center',
    gap: 4,
  },
  cardInfoText: {
    fontSize: 12,
  },
  bidCountRow: {
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  bidCountContainer: {
    alignItems: 'center',
    gap: 4,
  },
  bidCountText: {
    fontSize: 12,
    fontWeight: '600',
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  filterDropdownContent: {
    paddingVertical: 4,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
});
