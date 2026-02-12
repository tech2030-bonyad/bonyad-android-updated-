import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import SmallTaskCard from '../components/SmallTaskCard';
import { SmallTaskRequest } from '../types/smallTasks';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';

interface AvailableSmallTasksScreenProps {
  onBack: () => void;
  onTaskPress: (task: SmallTaskRequest) => void;
}

export default function AvailableSmallTasksScreen({
  onBack,
  onTaskPress,
}: AvailableSmallTasksScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, fonts, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';

  const [tasks, setTasks] = useState<SmallTaskRequest[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<SmallTaskRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PENDING' | 'LOW_BIDS'>('ALL');

  const { alertState, showError, hideAlert } = useAlertPopup();

  // Animation values (Android only)
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'android') {
      Animated.sequence([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(searchAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      headerAnim.setValue(1);
      searchAnim.setValue(1);
    }

    fetchAvailableTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchQuery, selectedFilter]);

  const fetchAvailableTasks = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'), t('Error'));
        setIsLoading(false);
        return;
      }

      const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.REQUESTS_AVAILABLE);
      console.log('🔍 Fetching available tasks:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded tasks:', data.requests?.length || data.length || 0);
        const tasksList = data.requests || data || [];
        setTasks(tasksList);
        setFilteredTasks(tasksList);
      } else {
        console.error('❌ Failed to fetch tasks:', response.status);
        const errorText = await response.text();
        console.error('Error:', errorText);
        showError(t('Failed to load tasks'), t('Error'));
      }
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      showError(t('Error loading tasks'), t('Error'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    // Apply status filter
    if (selectedFilter === 'PENDING') {
      filtered = filtered.filter(task => task.status === 'PENDING');
    } else if (selectedFilter === 'LOW_BIDS') {
      filtered = filtered.filter(task => (task.bidCount || 0) < 3);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => {
        const taskName = (task.taskType
          ? (isRTL ? task.taskType?.nameAr : task.taskType?.nameEn) || ''
          : '').toLowerCase();
        const description = task.description.toLowerCase();
        const address = task.address.toLowerCase();
        return taskName.includes(query) || description.includes(query) || address.includes(query);
      });
    }

    setFilteredTasks(filtered);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAvailableTasks();
  };

  const renderTask = ({ item, index }: { item: SmallTaskRequest; index: number }) => (
    <SmallTaskCard task={item} onPress={() => onTaskPress(item)} index={index} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="briefcase-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
        {searchQuery ? t('No tasks match your search') : t('No available tasks at the moment')}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily }]}>
        {t('Check back later for new opportunities')}
      </Text>
    </View>
  );

  const renderFilterButton = (filter: typeof selectedFilter, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        {
          backgroundColor: selectedFilter === filter ? colors.primary : colors.cardBackground,
          borderColor: selectedFilter === filter ? colors.primary : colors.border,
        },
      ]}
      onPress={() => setSelectedFilter(filter)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={selectedFilter === filter ? '#fff' : colors.text}
      />
      <Text
        style={[
          styles.filterButtonText,
          {
            color: selectedFilter === filter ? '#fff' : colors.text,
            fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600',
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily }]}>
            {t('Loading tasks...')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 20),
            borderBottomColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
            {t('Available Tasks')}
          </Text>
          {tasks.length > 0 && (
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily }]}>
              {filteredTasks.length} {t('tasks available')}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Search Bar */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: searchAnim,
            transform: [
              {
                translateY: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.searchBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: colors.text,
                fontFamily: fonts?.body || fontFamily,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            placeholder={t('Search tasks...')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Buttons */}
        <View style={[styles.filterContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {renderFilterButton('ALL', t('All'), 'grid-outline')}
          {renderFilterButton('PENDING', t('Pending'), 'time-outline')}
          {renderFilterButton('LOW_BIDS', t('Low Bids'), 'trending-down-outline')}
        </View>
      </Animated.View>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
