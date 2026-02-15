/**
 * SmallTasksListScreen - Displays a list of small tasks with filtering and search capabilities
 * 
 * Features:
 * - Displays tasks based on filter: 'available', 'my-bids', 'in-progress', 'completed'
 * - Search functionality to filter tasks by name, description, or address
 * - Status filter dropdown to filter by task status (Pending, In Progress, Completed, etc.)
 * - Pull-to-refresh to reload tasks
 * - Handles both user and technician views
 * - Safe taskType access with fallback values
 * 
 * Filter Behavior:
 * - 'available': Shows PENDING or BID_RECEIVED tasks (for technicians)
 * - 'my-bids': Shows tasks where technician has submitted bids
 * - 'in-progress': Shows IN_PROGRESS or ACCEPTED tasks
 * - 'completed': Shows COMPLETED tasks
 * 
 * For users: Shows their own created requests
 * For technicians: Shows available tasks or their bids based on filter
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
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';

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
  amount?: number;
}

interface SmallTasksListScreenProps {
  onBack?: () => void;
  onTaskPress: (task: SmallTaskRequest) => void;
  filter?: 'available' | 'my-bids' | 'in-progress' | 'completed';
  refreshTrigger?: number;
}

export default function SmallTasksListScreen({
  onBack,
  onTaskPress,
  filter = 'available',
  refreshTrigger,
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
  }, [filter, refreshTrigger]);

  // Filter Dropdown Animation
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

  // Get unique task statuses from tasks
  const getUniqueStatuses = () => {
    const statuses = new Set<string>();
    tasks.forEach(task => {
      const status = (task.status || '').trim().toUpperCase();
      if (status) {
        statuses.add(status);
      }
    });
    return Array.from(statuses).sort();
  };

  const handleStatusSelect = (statusValue: string) => {
    if (statusValue === 'All') {
      setSelectedCategory('All');
    } else {
      setSelectedCategory(statusValue);
    }
    setShowFilterDropdown(false);
  };

  const getStatusFilterLabel = (statusValue: string) => {
    if (statusValue === 'All') {
      return t('All');
    }
    return getStatusLabel(statusValue);
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

  // Calculate dropdown height based on number of status options
  const getDropdownHeight = () => {
    const uniqueStatuses = getUniqueStatuses();
    const optionCount = 1 + uniqueStatuses.length; // "All" + statuses
    return Math.min(optionCount * 48, 240); // 48px per option, max 240px (5 items visible)
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
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔄 [SmallTasksListScreen] Loading small tasks...');
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      const role = await storage.getUserRole();
      const isTechnician = role?.toUpperCase() === 'TECHNICIAN';

      console.log('📋 [SmallTasksListScreen] Filter:', filter);
      console.log('👤 [SmallTasksListScreen] User Role:', role);
      console.log('🔧 [SmallTasksListScreen] Is Technician:', isTechnician);
      console.log('🔑 [SmallTasksListScreen] Has Token:', !!token);

      // Token is required for authenticated endpoints
      if (!token) {
        console.error('❌ [SmallTasksListScreen] No authentication token found');
        setTasks([]);
        setIsLoading(false);
        return;
      }

      let url: string;
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Always include token from async storage
      };

      if (filter === 'available' && isTechnician) {
        // Technicians see available tasks
        url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.REQUESTS_AVAILABLE);
        console.log('📡 [SmallTasksListScreen] Endpoint: REQUESTS_AVAILABLE (Technician)');
      } else if (filter === 'my-bids' && isTechnician) {
        // Technicians see their bids
        url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.MY_BIDS);
        console.log('📡 [SmallTasksListScreen] Endpoint: MY_BIDS (Technician)');
      } else if (!isTechnician) {
        // Users see their own created requests - requires token
        url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.MY_REQUESTS);
        console.log('📡 [SmallTasksListScreen] Endpoint: MY_REQUESTS (User)');
      } else {
        // Default: available endpoint
        url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.REQUESTS_AVAILABLE);
        console.log('📡 [SmallTasksListScreen] Endpoint: REQUESTS_AVAILABLE (Default)');
      }

      console.log('🌐 [SmallTasksListScreen] URL:', url);
      console.log('📤 [SmallTasksListScreen] Method: GET');
      console.log('📤 [SmallTasksListScreen] Headers:', {
        'Content-Type': headers['Content-Type'],
        'Authorization': `Bearer ${token.substring(0, 20)}...`,
      });

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      console.log('📥 [SmallTasksListScreen] Response Status:', response.status);
      console.log('📥 [SmallTasksListScreen] Response OK:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('📦 [SmallTasksListScreen] Response Data:', JSON.stringify(data, null, 2));
        
        let allTasks: SmallTaskRequest[] = [];
        
        if (filter === 'my-bids') {
          console.log('🔄 [SmallTasksListScreen] Transforming bids to requests...');
          console.log('📊 [SmallTasksListScreen] Bids Count:', data.bids?.length || 0);
          
          // Transform bids to requests
          allTasks = data.bids?.map((bid: any) => ({
            id: bid.smallTaskRequestId || bid.requestId,
            taskType: bid.request?.taskType || bid.taskType || { nameEn: 'Task', nameAr: 'مهمة' },
            description: bid.request?.description || bid.description || '',
            address: bid.request?.address || '',
            latitude: bid.request?.latitude || 0,
            longitude: bid.request?.longitude || 0,
            status: bid.request?.status || bid.status || 'PENDING',
            createdAt: bid.createdAt || '',
            bidCount: 0,
            amount: bid.price || bid.amount,
            estimatedDuration: bid.estimatedDuration,
          })) || [];
          
          console.log('✅ [SmallTasksListScreen] Transformed Tasks Count:', allTasks.length);
        } else {
          console.log('🔄 [SmallTasksListScreen] Processing requests...');
          console.log('📊 [SmallTasksListScreen] Requests Count:', data.requests?.length || data.count || 0);
          
          // Ensure all tasks have a valid taskType
          allTasks = (data.requests || []).map((task: any) => ({
            ...task,
            taskType: task.taskType || { nameEn: 'Task', nameAr: 'مهمة' },
          }));
          
          console.log('✅ [SmallTasksListScreen] Processed Tasks Count:', allTasks.length);
        }

        // Log task statuses before filtering
        const statusCounts: { [key: string]: number } = {};
        allTasks.forEach(task => {
          const status = (task.status || 'UNKNOWN').toUpperCase();
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        console.log('📊 [SmallTasksListScreen] Task Status Distribution:', statusCounts);

        // Filter by status based on filter prop
        // Note: We load all tasks and let the dropdown handle status filtering
        // This ensures that when a user selects a specific status from dropdown, 
        // all tasks of that status are available to be shown
        let filteredByStatus = allTasks;
        if (filter === 'in-progress') {
          // For in-progress filter, show tasks that are actively being worked on
          // But include all statuses so dropdown can filter them
          filteredByStatus = allTasks.filter(task => {
            const status = (task.status || '').toUpperCase();
            // Include all active statuses, not just IN_PROGRESS
            return status === 'IN_PROGRESS' || status === 'ACCEPTED' || 
                   status === 'ASSIGNED' || status === 'PENDING' || 
                   status === 'BID_RECEIVED';
          });
          console.log('🔍 [SmallTasksListScreen] Filtered (in-progress):', filteredByStatus.length);
        } else if (filter === 'completed') {
          // For completed filter, only show completed tasks
          filteredByStatus = allTasks.filter(task => {
            const status = (task.status || '').toUpperCase();
            return status === 'COMPLETED';
          });
          console.log('🔍 [SmallTasksListScreen] Filtered (completed):', filteredByStatus.length);
        } else if (filter === 'available') {
          // For available filter, load ALL non-completed tasks
          // This ensures ACCEPTED/ASSIGNED tasks are available when selected from dropdown
          filteredByStatus = allTasks.filter(task => {
            const status = (task.status || '').toUpperCase();
            // Include all statuses except COMPLETED and CANCELLED
            return status !== 'COMPLETED' && status !== 'CANCELLED';
          });
          console.log('🔍 [SmallTasksListScreen] Filtered (available):', filteredByStatus.length);
        } else if (filter === 'my-bids') {
          // For my-bids, show all bids regardless of status (dropdown will filter)
          filteredByStatus = allTasks;
          console.log('🔍 [SmallTasksListScreen] Filtered (my-bids):', filteredByStatus.length);
        } else {
          // Default: show all tasks, let dropdown handle filtering
          filteredByStatus = allTasks;
          console.log('🔍 [SmallTasksListScreen] No status filter applied - showing all tasks');
        }

        console.log('✅ [SmallTasksListScreen] Final Tasks Count:', filteredByStatus.length);
        console.log('📋 [SmallTasksListScreen] Tasks:', filteredByStatus.map(t => ({
          id: t.id,
          taskType: t.taskType?.nameEn || 'Unknown',
          status: t.status,
        })));

        setTasks(filteredByStatus);
        console.log('✅ [SmallTasksListScreen] Tasks loaded successfully');
      } else {
        const errorText = await response.text().catch(() => 'Unable to read error');
        console.error('❌ [SmallTasksListScreen] Response not OK:', response.status);
        console.error('❌ [SmallTasksListScreen] Error Response:', errorText);
        setTasks([]);
      }
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

  const filteredTasks = tasks.filter(task => {
    // Filter by status
    if (selectedCategory !== 'All') {
      const taskStatus = (task.status || '').trim().toUpperCase();
      const selectedStatus = selectedCategory.toUpperCase().trim();
      if (taskStatus !== selectedStatus) {
        return false;
      }
    }

    // Filter by search query
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    // Safely access taskType with fallback
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
              <Feather 
                name="chevron-down" 
                size={20} 
                color={colors.primary} 
              />
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
              {/* All Option */}
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedCategory === 'All' && styles.filterOptionActive,
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

              {/* Task Statuses */}
              {getUniqueStatuses().map((status, index, array) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterOption,
                    selectedCategory === status && styles.filterOptionActive,
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
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={() => onTaskPress(task)}
                  activeOpacity={0.7}
                >
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
                    {task.amount && (
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
                        {task.address}
                      </Text>
                    </View>
                    {task.bidCount !== undefined && (
                      <View style={[
                        styles.bidCountContainer,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' }
                      ]}>
                        <Ionicons name="people-outline" size={14} color={colors.primary} />
                        <Text style={[styles.bidCountText, { color: colors.primary }]}>
                          {task.bidCount} {t('bids')}
                        </Text>
                      </View>
                    )}
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
  filterOptionActive: {
    // Active state handled by backgroundColor
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
});
