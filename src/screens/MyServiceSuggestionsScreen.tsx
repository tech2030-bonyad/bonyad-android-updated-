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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { ServiceSuggestion } from '../types/smallTasks';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import { getTopPadding } from '../utils/statusBarHelper';

interface MyServiceSuggestionsScreenProps {
  onBack: () => void;
  onAddNew?: () => void;
}

function SuggestionCard({
  item,
  index,
  colors,
  fonts,
  language,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  formatDate,
  t,
}: {
  item: ServiceSuggestion;
  index: number;
  colors: Record<string, string>;
  fonts: ReturnType<typeof useFontFamily>['fonts'];
  language: string;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => string;
  getStatusLabel: (status: string) => string;
  formatDate: (dateString: string) => string;
  t: (key: string, options?: any) => string;
}) {
  const serviceName = language === 'ar' ? item.nameAr : item.nameEn;
  const cardAnim = useRef(new Animated.Value(1)).current;
  const cardSlide = useRef(new Animated.Value(0)).current;

  return (
    <Animated.View
      style={{
        opacity: cardAnim,
        transform: [{ translateY: cardSlide }],
      }}
    >
      <View style={[styles.suggestionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={[styles.cardHeader, { flexDirection: 'row' }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="bulb" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.serviceName, { color: colors.text, fontFamily: fonts.primaryBold }]} numberOfLines={1}>
              {serviceName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Ionicons name={getStatusIcon(item.status) as any} size={12} color={getStatusColor(item.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status), fontFamily: fonts.button }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.description,
            {
              color: colors.textSecondary,
              fontFamily: fonts.body,
              textAlign: 'left',
            },
          ]}
          numberOfLines={2}
        >
          {item.description}
        </Text>

        <View style={[styles.categoryRow, { flexDirection: 'row' }]}>
          <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.categoryText, { color: colors.textSecondary, fontFamily: fonts.body }]}>
            {t(item.category)}
          </Text>
        </View>

        {item.adminNotes && (
          <View style={[styles.adminNotesContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.adminNotesHeader, { flexDirection: 'row' }]}>
              <Ionicons name="chatbox-ellipses-outline" size={14} color={colors.primary} />
              <Text style={[styles.adminNotesLabel, { color: colors.primary, fontFamily: fonts.button }]}>
                {t('Admin Notes')}:
              </Text>
            </View>
            <Text
              style={[
                styles.adminNotesText,
                {
                  color: colors.text,
                  fontFamily: fonts.body,
                  textAlign: 'left',
                },
              ]}
            >
              {item.adminNotes}
            </Text>
          </View>
        )}

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.dateText, { color: colors.textSecondary, fontFamily: fonts.body }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function MyServiceSuggestionsScreen({
  onBack,
  onAddNew,
}: MyServiceSuggestionsScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fonts } = useFontFamily();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';

  const [suggestions, setSuggestions] = useState<ServiceSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<ServiceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const { alertState, showError, hideAlert } = useAlertPopup();

  // Animation values (Android only)
  const headerAnim = useRef(new Animated.Value(1)).current;
  const statsAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchSuggestions();
  }, []);

  useEffect(() => {
    filterSuggestions();
  }, [suggestions, selectedFilter]);

  const fetchSuggestions = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'), t('Error'));
        setIsLoading(false);
        return;
      }

      const url = buildApiUrl(API_ENDPOINTS.SERVICE_SUGGESTIONS.MY_REQUESTS);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const suggestionsList = data.requests || data || [];
        setSuggestions(suggestionsList);
        setFilteredSuggestions(suggestionsList);
      } else {
        showError(t('Failed to load suggestions'), t('Error'));
      }
    } catch (error) {
      showError(t('Error loading suggestions'), t('Error'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filterSuggestions = () => {
    if (selectedFilter === 'ALL') {
      setFilteredSuggestions(suggestions);
    } else {
      setFilteredSuggestions(suggestions.filter(s => s.status === selectedFilter));
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSuggestions();
  };

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#FFB703';
      case 'APPROVED':
        return '#4CAF50';
      case 'REJECTED':
        return '#F44336';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'time-outline';
      case 'APPROVED':
        return 'checkmark-circle';
      case 'REJECTED':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'PENDING': t('Pending Review'),
      'APPROVED': t('Approved'),
      'REJECTED': t('Rejected'),
    };
    return statusMap[status.toUpperCase()] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStats = () => {
    return {
      total: suggestions.length,
      pending: suggestions.filter(s => s.status === 'PENDING').length,
      approved: suggestions.filter(s => s.status === 'APPROVED').length,
      rejected: suggestions.filter(s => s.status === 'REJECTED').length,
    };
  };

  const renderSuggestion = ({ item, index }: { item: ServiceSuggestion; index: number }) => (
    <SuggestionCard
      item={item}
      index={index}
      colors={colors}
      fonts={fonts}
      language={i18n.language}
      getStatusColor={getStatusColor}
      getStatusIcon={getStatusIcon}
      getStatusLabel={getStatusLabel}
      formatDate={formatDate}
      t={t}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bulb-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: fonts.button }]}>
        {selectedFilter === 'ALL' 
          ? t('No service suggestions yet') 
          : t('No {{filter}} suggestions', { filter: selectedFilter.toLowerCase() })}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontFamily: fonts.body }]}>
        {t('Suggest services you can provide to expand the platform')}
      </Text>
      {onAddNew && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={onAddNew}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={[styles.addButtonText, { fontFamily: fonts.button }]}>
            {t('Suggest Service')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFilterButton = (filter: typeof selectedFilter, label: string) => (
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
      <Text
        style={[
          styles.filterButtonText,
          {
            color: selectedFilter === filter ? '#fff' : colors.text,
            fontFamily: fonts.button,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderStats = () => {
    const stats = getStats();
    return (
      <Animated.View
        style={[
          styles.statsContainer,
          {
            opacity: statsAnim,
            transform: [
              {
                translateY: statsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text, fontFamily: fonts.primaryBold }]}>
            {stats.total}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: fonts.body }]}>
            {t('Total')}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#FFB703', fontFamily: fonts.primaryBold }]}>
            {stats.pending}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: fonts.body }]}>
            {t('Pending')}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#4CAF50', fontFamily: fonts.primaryBold }]}>
            {stats.approved}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: fonts.body }]}>
            {t('Approved')}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#F44336', fontFamily: fonts.primaryBold }]}>
            {stats.rejected}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: fonts.body }]}>
            {t('Rejected')}
          </Text>
        </View>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: fonts.body }]}>
            {t('Loading suggestions...')}
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
            paddingTop: getTopPadding(insets),
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
          <BackArrowIonicons variant="arrow" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: fonts.primaryBold }]}>
            {t('My Service Suggestions')}
          </Text>
        </View>
        {onAddNew && (
          <TouchableOpacity onPress={onAddNew} style={styles.addHeaderButton}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Stats Cards */}
      {suggestions.length > 0 && renderStats()}

      {/* Filter Buttons */}
      <View style={[styles.filterContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {renderFilterButton('ALL', t('All'))}
        {renderFilterButton('PENDING', t('Pending'))}
        {renderFilterButton('APPROVED', t('Approved'))}
        {renderFilterButton('REJECTED', t('Rejected'))}
      </View>

      {/* Suggestions List */}
      <FlatList
        data={filteredSuggestions}
        renderItem={renderSuggestion}
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
  addHeaderButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  suggestionCard: {
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
        elevation: 2,
      },
    }),
  },
  cardHeader: {
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
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 4,
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 13,
  },
  adminNotesContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  adminNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  adminNotesLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  adminNotesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  dateText: {
    fontSize: 12,
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
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
