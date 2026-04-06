import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildApiUrl, API_ENDPOINTS, getServerBaseUrl } from '../config/api';
import { storage } from '../utils/storage';

const { width: screenWidth } = Dimensions.get('window');

interface Technician {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  profileImage?: string;
  serviceName?: string;
  serviceNameAr?: string;
  regions?: Array<{ id: number; nameEn: string; nameAr: string }>;
  averageRating?: number;
  completedProjects?: number;
  hourlyRate?: number;
  status?: string;
}

interface ServiceProvidersScreenProps {
  onBack: () => void;
  onNavigateToProfile: (technicianId: number) => void;
  onBook?: (technicianId: number, technicianName: string) => void;
}

export default function ServiceProvidersScreen({
  onBack,
  onNavigateToProfile,
  onBook,
}: ServiceProvidersScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const isRTL = i18n.language === 'ar';

  const [providers, setProviders] = useState<Technician[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [regions, setRegions] = useState<Array<{ id: number; nameEn: string; nameAr: string }>>([]);

  const colorsConfig = {
    primary: isDarkMode ? '#60a5fa' : '#005DAC',
    primaryDark: isDarkMode ? '#3b82f6' : '#003867',
    primaryLight: isDarkMode ? 'rgba(96, 165, 250, 0.1)' : '#E6EFF7',
    text: isDarkMode ? colors.text : '#1F2937',
    textSecondary: isDarkMode ? colors.textSecondary : '#6B7280',
    background: isDarkMode ? colors.background : '#FFFFFF',
    cardBackground: isDarkMode ? colors.cardBackground : '#FFFFFF',
    border: isDarkMode ? colors.border : '#E5E7EB',
  };

  // Fetch providers
  useEffect(() => {
    fetchProviders();
  }, []);

  // Filter providers
  useEffect(() => {
    filterProviders();
  }, [searchText, selectedRegion, selectedRating, providers]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const token = await storage.getAuthToken();
      
      // Fetch technicians - try both LIST and SEARCH endpoints
      let response = await fetch(
        buildApiUrl(API_ENDPOINTS.TECHNICIANS.LIST),
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Try search endpoint as fallback
        response = await fetch(
          `${buildApiUrl(API_ENDPOINTS.TECHNICIANS.SEARCH)}?query=`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      if (response.ok) {
        const data = await response.json();
        const technicianList = Array.isArray(data) ? data : (data.technicians || data || []);
        setProviders(technicianList);

        // Extract unique regions
        const uniqueRegions = new Set();
        technicianList.forEach((tech: Technician) => {
          if (tech.regions) {
            tech.regions.forEach((region) => uniqueRegions.add(JSON.stringify(region)));
          }
        });
        setRegions(Array.from(uniqueRegions).map(r => JSON.parse(r as string)));
      } else {
        console.error('Failed to fetch providers:', response.status);
        setProviders([]);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProviders = useCallback(() => {
    let filtered = [...providers];

    // Filter by search text
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (provider) =>
          provider.name?.toLowerCase().includes(searchLower) ||
          provider.serviceName?.toLowerCase().includes(searchLower) ||
          provider.serviceNameAr?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by region
    if (selectedRegion !== 'all') {
      filtered = filtered.filter((provider) =>
        provider.regions?.some((region) => region.id.toString() === selectedRegion)
      );
    }

    // Filter by rating
    if (selectedRating !== 'all') {
      const minRating = parseInt(selectedRating);
      filtered = filtered.filter(
        (provider) => (provider.averageRating || 0) >= minRating
      );
    }

    setFilteredProviders(filtered);
  }, [searchText, selectedRegion, selectedRating, providers]);

  const renderTechnicianCard = ({ item }: { item: Technician }) => {
    const avatarUrl = item.avatar || item.profileImage
      ? (item.avatar || item.profileImage).startsWith('http')
        ? item.avatar || item.profileImage
        : `${getServerBaseUrl()}${item.avatar || item.profileImage}`
      : null;

    const serviceName = isRTL && item.serviceNameAr ? item.serviceNameAr : (item.serviceName || t('Professional'));

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colorsConfig.cardBackground, borderColor: colorsConfig.border }]}
        onPress={() => onNavigateToProfile(item.id)}
        activeOpacity={0.7}
      >
        {/* Profile Image */}
        <View style={styles.cardHeader}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colorsConfig.primaryLight }]}>
              <Ionicons name="person" size={32} color={colorsConfig.primary} />
            </View>
          )}
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.status === 'APPROVED' ? '#10b981' : '#fbbf24' }
              ]}
            />
            <Text style={[styles.statusText, { color: colorsConfig.textSecondary }]}>
              {item.status === 'APPROVED' ? t('Available') : t('Pending')}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={[styles.name, { color: colorsConfig.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.service, { color: colorsConfig.textSecondary }]} numberOfLines={1}>
            {serviceName}
          </Text>

          {/* Rating */}
          {item.averageRating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#fbbf24" />
              <Text style={[styles.ratingText, { color: colorsConfig.text }]}>
                {item.averageRating.toFixed(1)}
              </Text>
              {item.completedProjects && (
                <Text style={[styles.projectsText, { color: colorsConfig.textSecondary }]}>
                  {' '}({item.completedProjects} {t('projects')})
                </Text>
              )}
            </View>
          )}

          {/* Regions */}
          {item.regions && item.regions.length > 0 && (
            <View style={styles.regionsContainer}>
              <MaterialCommunityIcons name="map-marker-outline" size={12} color={colorsConfig.textSecondary} />
              <Text style={[styles.regionsText, { color: colorsConfig.textSecondary }]} numberOfLines={1}>
                {item.regions.slice(0, 2).map(r => isRTL ? r.nameAr : r.nameEn).join(', ')}
                {item.regions.length > 2 && ` +${item.regions.length - 2}`}
              </Text>
            </View>
          )}

          {/* Hourly Rate */}
          {item.hourlyRate && (
            <View style={styles.rateContainer}>
              <Text style={[styles.rateText, { color: colorsConfig.primary }]}>
                {item.hourlyRate} SAR/hr
              </Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.bookButton, { backgroundColor: colorsConfig.primary }]}
          onPress={() => onBook?.(item.id, item.name)}
          activeOpacity={0.8}
        >
          <Text style={styles.bookButtonText}>{t('View Profile')}</Text>
          <Feather name="chevron-right" size={16} color="#fff" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderFilterOption = (
    label: string,
    value: string,
    currentValue: string,
    onSelect: (value: string) => void
  ) => (
    <TouchableOpacity
      style={[
        styles.filterOption,
        { backgroundColor: currentValue === value ? colorsConfig.primaryLight : colorsConfig.cardBackground, borderColor: currentValue === value ? colorsConfig.primary : colorsConfig.border }
      ]}
      onPress={() => onSelect(value)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.filterOptionText,
        { color: currentValue === value ? colorsConfig.primary : colorsConfig.text }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colorsConfig.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: colorsConfig.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <BackArrowIonicons variant="chevron" size={24} color={colorsConfig.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colorsConfig.text }]}>{t('Service Providers')}</Text>
          <Text style={[styles.subtitle, { color: colorsConfig.textSecondary }]}>
            {filteredProviders.length} {t('providers found')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.filterButton, { backgroundColor: showFilters ? colorsConfig.primaryLight : colorsConfig.border }]}
        >
          <Ionicons name="options-outline" size={20} color={showFilters ? colorsConfig.primary : colorsConfig.text} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={[styles.filtersContainer, { backgroundColor: colorsConfig.cardBackground, borderBottomColor: colorsConfig.border }]}>
          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? colors.gray100 : '#f3f4f6' }]}>
            <Ionicons name="search" size={20} color={colorsConfig.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colorsConfig.text }]}
              placeholder={t('Search providers...')}
              placeholderTextColor={colorsConfig.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color={colorsConfig.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Region Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colorsConfig.text }]}>
              {t('Region')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {renderFilterOption(t('All Regions'), 'all', selectedRegion, setSelectedRegion)}
              {regions.map((region) =>
                renderFilterOption(
                  isRTL ? region.nameAr : region.nameEn,
                  region.id.toString(),
                  selectedRegion,
                  setSelectedRegion
                )
              )}
            </ScrollView>
          </View>

          {/* Rating Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colorsConfig.text }]}>
              {t('Minimum Rating')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {renderFilterOption(t('All Ratings'), 'all', selectedRating, setSelectedRating)}
              {renderFilterOption('4+ ⭐', '4', selectedRating, setSelectedRating)}
              {renderFilterOption('3+ ⭐', '3', selectedRating, setSelectedRating)}
              {renderFilterOption('2+ ⭐', '2', selectedRating, setSelectedRating)}
              {renderFilterOption('1+ ⭐', '1', selectedRating, setSelectedRating)}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Providers List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorsConfig.primary} />
          <Text style={[styles.loadingText, { color: colorsConfig.textSecondary }]}>
            {t('Loading providers...')}
          </Text>
        </View>
      ) : filteredProviders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={colorsConfig.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colorsConfig.text }]}>
            {t('No providers found')}
          </Text>
          <Text style={[styles.emptyText, { color: colorsConfig.textSecondary }]}>
            {t('Try adjusting your filters')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          renderItem={renderTechnicianCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 20 }
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterSection: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '500',
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
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  service: {
    fontSize: 13,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  projectsText: {
    fontSize: 12,
  },
  regionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  regionsText: {
    fontSize: 12,
    flex: 1,
  },
  rateContainer: {
    marginTop: 2,
  },
  rateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

