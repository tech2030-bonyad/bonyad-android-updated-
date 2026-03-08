import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../../context/ThemeContext';
import { AnimatedStatTicker } from '../../components/AnimatedStatTicker';
import { useTranslation } from 'react-i18next';
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import { getCategories, ServiceCategory } from '../../services/ServiceService';
import { resolveServiceImage, shouldRenderSvg } from '../../services/ServiceIconUtils';
import { getServerBaseUrl, buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { storage } from '../../utils/storage';
import { LinearGradient } from 'expo-linear-gradient';

// Walkthroughable component with proper layout handling
const WalkableView = walkthroughable((props: any) => (
  <View {...props} collapsable={false} />
));

const { width: screenWidth } = Dimensions.get('window');
const IS_SMALL_SCREEN = screenWidth < 375;

type ProjectStatus = 'pending' | 'running' | 'completed';

interface Project {
  id: number;
  description: string;
  status: string;
  budget: number;
  address?: string;
  createdAt: string;
  serviceName?: string;
  serviceNameAr?: string;
}

export interface CategoryInfo {
  id: number;
  nameEn: string;
  nameAr?: string;
}

interface UserHomeScreenProps {
  userName?: string;
  onPressSearch?: (query: string) => void;
  onPressOpenServices?: () => void;
  onPressServiceProvidersAll?: () => void;
  onPressMyProjects?: () => void;
  onPressProject?: (projectId: number) => void;
  onPressMyTasks?: () => void;
  onPressPremiumUpgrade?: () => void;
  onPressNotifications?: () => void;
  onPressMessages?: () => void;
  onPressInfo?: () => void;
  onPressFab?: () => void;
  onPressProjectStatus?: (status: ProjectStatus) => void;
  onPressCategory?: (category: CategoryInfo) => void;
  onPressChatbot?: () => void;
  onShowServiceProviders?: () => void;
}

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 24,
  full: 50,
};

function resolveCategoryImage(cat: ServiceCategory) {
  // Return regular image URL for non-SVG services
  if (cat.useSvg || cat.svgUrl) {
    return null; // SVGs handled separately
  }
  return resolveServiceImage(cat);
}

function getSvgUrl(cat: ServiceCategory): string | null {
  if (cat.svgUrl) {
    return cat.svgUrl.startsWith('http') ? cat.svgUrl : `${getServerBaseUrl()}${cat.svgUrl}`;
  }
  return null;
}

function shouldShowSvg(cat: ServiceCategory) {
  return shouldRenderSvg(cat);
}

// Get appropriate icon based on service name
function getServiceIcon(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('construction')) return 'hammer';
  if (nameLower.includes('design')) return 'pencil-ruler';
  if (nameLower.includes('consult')) return 'account-tie';
  if (nameLower.includes('electric')) return 'lightning-bolt';
  if (nameLower.includes('plumb')) return 'water-pump';
  if (nameLower.includes('paint')) return 'format-paint';
  if (nameLower.includes('clean')) return 'broom';
  if (nameLower.includes('garden') || nameLower.includes('landscape')) return 'flower';
  if (nameLower.includes('security')) return 'shield-check';
  if (nameLower.includes('move')) return 'truck';
  if (nameLower.includes('repair')) return 'tools';
  if (nameLower.includes('roof')) return 'home-roof';
  if (nameLower.includes('floor')) return 'floor-plan';
  if (nameLower.includes('air') || nameLower.includes('hvac')) return 'air-conditioner';
  if (nameLower.includes('finance')) return 'cash-multiple';
  if (nameLower.includes('insurance')) return 'shield-home';
  if (nameLower.includes('dispute')) return 'scale-balance';
  if (nameLower.includes('supervis')) return 'account-supervisor';
  if (nameLower.includes('market')) return 'bullhorn';
  if (nameLower.includes('logistic')) return 'truck-delivery';
  if (nameLower.includes('project')) return 'clipboard-check';
  return 'briefcase-outline';
}

// Responsive card dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH < 380 ? 120 : SCREEN_WIDTH < 414 ? 140 : 160;
const CARD_GAP = 10;

const UserHomeScreen: React.FC<UserHomeScreenProps> = ({
  userName,
  onPressSearch,
  onPressOpenServices,
  onPressServiceProvidersAll,
  onPressMyProjects,
  onPressProject,
  onPressMyTasks,
  onPressPremiumUpgrade,
  onPressNotifications,
  onPressMessages,
  onPressInfo,
  onPressFab,
  onPressProjectStatus,
  onPressCategory,
  onPressChatbot,
  onShowServiceProviders,
}) => {
  /* ═══ Interfaces ═══ */
  interface TaskType {
    id: number;
    nameAr: string;
    nameEn: string;
    descriptionAr?: string;
    descriptionEn?: string;
    icon?: string;
    imageUrl?: string;
    svgUrl?: string;
    useSvg?: boolean;
    isActive?: boolean;
  }

  const { t, i18n } = useTranslation();
  const { colors: themeColors, theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const riyalLogo = isDarkMode
    ? require('../../../assets/saudi_riyal_logo_dark.svg')
    : require('../../../assets/saudi_riyal_logo.svg');

  const [searchText, setSearchText] = React.useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Fetch Services
  useEffect(() => {
    let mounted = true;
    getCategories()
      .then((list) => { if (mounted) setCategories(list); })
      .catch(() => { if (mounted) setCategories([]); })
      .finally(() => { if (mounted) setCategoriesLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Fetch Small Task Types
  useEffect(() => {
    let mounted = true;
    const loadTaskTypes = async () => {
      try {
        const response = await fetch(buildApiUrl(API_ENDPOINTS.SMALL_TASKS.TYPES));
        if (response.ok) {
          const data = await response.json();
          if (mounted) setTaskTypes(data.taskTypes || []);
        }
      } catch (error) {
        console.error('Error fetching task types:', error);
      }
    };
    loadTaskTypes();
    return () => { mounted = false; };
  }, []);

  // Fetch user's projects
  useEffect(() => {
    let mounted = true;
    const loadProjects = async () => {
      try {
        setProjectsLoading(true);
        const token = await storage.getAuthToken();
        if (!token) {
          setProjects([]);
          return;
        }
        const projectsUrl = buildApiUrl(API_ENDPOINTS.PROJECTS.MY_PROJECTS);
        const response = await fetch(projectsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (mounted) setProjects(data.slice(0, 5));
        } else {
          if (mounted) setProjects([]);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        if (mounted) setProjects([]);
      } finally {
        if (mounted) setProjectsLoading(false);
      }
    };
    loadProjects();
    return () => { mounted = false; };
  }, []);

  // Dynamic colors based on theme
  const dc = {
    primary: themeColors.primary,
    primaryDark: themeColors.primaryDark,
    purple: isDarkMode ? '#a78bfa' : '#7c3aed',
    purpleDark: isDarkMode ? '#7c3aed' : '#5b21b6',
    purpleLight: isDarkMode ? '#2d1b4e' : '#f5f0ff',
    green: isDarkMode ? '#34d399' : '#10b981',
    greenDark: isDarkMode ? '#10b981' : '#059669',
    greenLight: isDarkMode ? '#064e3b' : '#ecfdf5',
    orange: isDarkMode ? '#fb923c' : '#f97316',
    orangeLight: isDarkMode ? '#78350f' : '#fff7ed',
    red: themeColors.error,
    gray50: isDarkMode ? themeColors.background : '#f8fafc',
    gray100: isDarkMode ? themeColors.gray100 : '#f1f5f9',
    gray200: isDarkMode ? themeColors.gray200 : '#e2e8f0',
    gray300: isDarkMode ? themeColors.gray300 : '#cbd5e1',
    gray400: isDarkMode ? themeColors.gray400 : '#94a3b8',
    gray500: isDarkMode ? themeColors.gray500 : '#64748b',
    gray600: isDarkMode ? themeColors.textSecondary : '#475569',
    gray900: isDarkMode ? themeColors.text : '#0f172a',
    amber50: isDarkMode ? '#78350f' : '#fffbeb',
    amber400: isDarkMode ? '#fbbf24' : '#f59e0b',
    amber900: isDarkMode ? '#fef3c7' : '#92400e',
    blue50: isDarkMode ? '#1e3a5f' : '#eff6ff',
    white: themeColors.white,
    black: themeColors.black,
    background: themeColors.background,
    cardBackground: themeColors.cardBackground,
    text: themeColors.text,
    textSecondary: themeColors.textSecondary,
  };

  const handleSearchSubmit = useCallback(async () => {
    const query = searchText.trim();
    if (!query) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    setShowSearchResults(true);
    let allResults: any[] = [];
    const searchLower = query.toLowerCase();

    try {
      // 1. Services
      const filteredCategories = categories.filter(cat => {
        const nameEn = cat.nameEn?.toLowerCase() || '';
        const nameAr = cat.nameAr?.toLowerCase() || '';
        return nameEn.includes(searchLower) || nameAr.includes(searchLower);
      });
      allResults = allResults.concat(filteredCategories.map(c => ({ ...c, searchItemType: 'service' })));

      // 2. Tasks
      const filteredTasks = taskTypes.filter(task => {
        const nameEn = task.nameEn?.toLowerCase() || '';
        const nameAr = task.nameAr?.toLowerCase() || '';
        return nameEn.includes(searchLower) || nameAr.includes(searchLower);
      });
      allResults = allResults.concat(filteredTasks.map(t => ({ ...t, searchItemType: 'task' })));

      // 3. Providers
      try {
        const token = await storage.getAuthToken();
        if (token) {
          const response = await fetch(
            `${buildApiUrl(API_ENDPOINTS.TECHNICIANS.SEARCH)}?query=${encodeURIComponent(query)}`,
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
          );
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              allResults = allResults.concat(data.map((p: any) => ({ ...p, searchItemType: 'provider' })));
            }
          }
        }
      } catch (err) {
        console.error('Provider search error:', err);
      }

      setSearchResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchText, categories, taskTypes]);

  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchText.trim() === '') {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      handleSearchSubmit();
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchText, handleSearchSubmit]);

  const handleClearSearch = () => {
    setSearchText('');
    setShowSearchResults(false);
    setSearchResults([]);
  };


  // Status helpers
  const getStatusColors = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return { bg: dc.amber50, text: dc.amber400, label: t('Pending') };
      case 'running': case 'in_progress': return { bg: dc.blue50, text: dc.primary, label: t('In Progress') };
      case 'completed': return { bg: dc.greenLight, text: dc.green, label: t('Completed') };
      case 'approved': return { bg: dc.greenLight, text: dc.greenDark, label: t('Approved') };
      case 'cancelled': return { bg: '#fee2e2', text: '#ef4444', label: t('Cancelled') };
      case 'bid_received': return { bg: dc.purpleLight, text: dc.purple, label: t('Bid Received') };
      default: return { bg: dc.gray100, text: dc.gray500, label: status?.replace(/_/g, ' ') || t('Unknown') };
    }
  };

  const getProjectIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'clock-outline';
      case 'running': case 'in_progress': return 'hammer-wrench';
      case 'completed': return 'check-circle-outline';
      case 'approved': return 'thumb-up-outline';
      case 'bid_received': return 'hand-extended-outline';
      default: return 'folder-outline';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return t('Today');
    if (diffDays === 2) return t('Yesterday');
    if (diffDays <= 7) return t('{{days}} days ago', { days: diffDays });
    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
  };

  // Project count stats
  const projectCounts = {
    pending: projects.filter(p => p.status?.toLowerCase() === 'pending' || p.status?.toLowerCase() === 'bid_received').length,
    running: projects.filter(p => p.status?.toLowerCase() === 'running' || p.status?.toLowerCase() === 'in_progress' || p.status?.toLowerCase() === 'approved').length,
    completed: projects.filter(p => p.status?.toLowerCase() === 'completed').length,
  };

  return (
    <View style={[styles.root, { backgroundColor: dc.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* ═══ Hero Section with Gradient ═══ */}
        <LinearGradient
          colors={isDarkMode ? [dc.primary, '#1a365d'] : ['#ffffff', '#3b82f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >


          {/* Search Bar */}
          <View style={[styles.heroSearchContainer, { marginTop: 16 }]}>
            <View style={styles.heroSearchBar}>
              <Feather name="search" size={18} color={dc.gray400} />
              <TextInput
                style={[styles.heroSearchInput, { color: dc.gray900 }]}
                placeholder={t('Search services, tasks, providers...')}
                placeholderTextColor={dc.gray400}
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch}>
                  <Ionicons name="close-circle" size={18} color={dc.gray400} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Results connected to search bar */}
            {showSearchResults && (
              <View style={[styles.searchResultsContainer, { backgroundColor: dc.cardBackground }]}>
                <View style={styles.searchResultsHeader}>
                  <Text style={[styles.searchResultsTitle, { color: dc.text }]}>
                    {t('Search Results')}
                    {searchResults.length > 0 && ` (${searchResults.length})`}
                  </Text>
                  <TouchableOpacity onPress={handleClearSearch}>
                    <Text style={[styles.closeResultsText, { color: dc.primary }]}>{t('Close')}</Text>
                  </TouchableOpacity>
                </View>
                {searchLoading ? (
                  <ActivityIndicator size="small" color={dc.primary} style={{ paddingVertical: 20 }} />
                ) : searchResults.length === 0 ? (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={40} color={dc.gray300} />
                    <Text style={[styles.noResultsText, { color: dc.gray400 }]}>{t('No results found')}</Text>
                  </View>
                ) : (
                  <View style={styles.searchResultsList}>
                    {searchResults.map((item, index) => (
                      <TouchableOpacity
                        key={item.id?.toString() || index.toString()}
                        style={[styles.searchResultItem, { borderBottomColor: dc.gray100 }]}
                        onPress={() => {
                          if (item.searchItemType === 'service') {
                            onPressCategory?.({ id: item.id, nameEn: item.nameEn || item.name, nameAr: item.nameAr });
                          } else if (item.searchItemType === 'task') {
                            console.log('Task selected:', item);
                          } else {
                            onPressServiceProvidersAll?.();
                          }
                          setShowSearchResults(false);
                        }}
                      >
                        <View style={[styles.resultIconContainer, { backgroundColor: dc.primary + '12' }]}>
                          <Ionicons
                            name={
                              item.searchItemType === 'service' ? 'briefcase-outline' :
                                item.searchItemType === 'task' ? 'hammer-outline' :
                                  'person-outline'
                            }
                            size={18} color={dc.primary}
                          />
                        </View>
                        <View style={styles.resultTextContainer}>
                          <Text style={[styles.resultTitle, { color: dc.text }]}>
                            {item.searchItemType === 'service' || item.searchItemType === 'task'
                              ? (i18n.language === 'ar' && item.nameAr ? item.nameAr : (item.nameEn || item.name))
                              : (item.name || item.fullName || item.username || t('Unknown'))
                            }
                          </Text>
                          {item.searchItemType && (
                            <Text style={[styles.resultSubtitle, { color: dc.gray400 }]}>
                              {item.searchItemType === 'service' ? t('Service') :
                                item.searchItemType === 'task' ? t('Small Task') :
                                  (item.serviceName || t('Provider'))}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={dc.gray300} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Animated Stats Ticker */}
          <View style={{ marginTop: 10, marginBottom: 15 }}>
            <AnimatedStatTicker
              stats={[
                { label: t('Welcome back'), value: userName || t('User'), icon: 'account', color: '#fff', bgColor: 'rgba(255, 255, 255, 0.2)' },
                { label: t('Pending'), value: projectCounts.pending?.toString() || '0', icon: 'clock-outline', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.2)' },
                { label: t('Running'), value: projectCounts.running?.toString() || '0', icon: 'hammer-wrench', color: '#60a5fa', bgColor: 'rgba(96, 165, 250, 0.2)' },
                { label: t('Completed'), value: projectCounts.completed?.toString() || '0', icon: 'check-circle-outline', color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.2)' },
              ]}
            />
          </View>
        </LinearGradient>



        {/* ═══ Available Services Section ═══ */}
        <View style={styles.sectionWrapper}>
          <CopilotStep key="availableServices" text={t('coachMark.availableServices')} order={2} name="availableServices">
            <WalkableView style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrapper}>
                <View style={[styles.sectionIcon, { backgroundColor: dc.primary + '12' }]}>
                  <MaterialCommunityIcons name="apps" size={18} color={dc.primary} />
                </View>
                <Text style={[styles.sectionHeading, { color: dc.text }]}>{t('Available Services')}</Text>
              </View>
              <TouchableOpacity style={styles.seeAllBtn} onPress={onPressOpenServices}>
                <Text style={[styles.seeAllText, { color: dc.primary }]}>{t('See All')}</Text>
                <Feather name="chevron-right" size={14} color={dc.primary} />
              </TouchableOpacity>
            </WalkableView>
          </CopilotStep>

          {categoriesLoading ? (
            <View style={[styles.categoriesLoader, { backgroundColor: dc.cardBackground }]}>
              <ActivityIndicator size="small" color={dc.primary} />
              <Text style={[styles.loaderText, { color: dc.textSecondary }]}>{t('Loading categories...')}</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              decelerationRate="fast"
              snapToAlignment="start"
            >
              {categories.map((cat, index) => {
                const imgSrc = resolveCategoryImage(cat);
                const svgUrl = getSvgUrl(cat);
                const name = i18n.language === 'ar' && cat.nameAr ? cat.nameAr : cat.nameEn;
                const hasImage = !!imgSrc;
                const hasSvg = !!svgUrl;
                
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.serviceCard, { backgroundColor: dc.cardBackground }, index === 0 && { marginLeft: 20 }]}
                    activeOpacity={0.9}
                    onPress={() => onPressCategory ? onPressCategory({ id: cat.id, nameEn: cat.nameEn, nameAr: cat.nameAr }) : onPressProjectStatus?.('pending')}
                  >
                    {/* Image Container with Gradient Background */}
                    <View style={styles.serviceCardImageWrapper}>
                      <LinearGradient
                        colors={hasImage || hasSvg ? [dc.primary + '15', dc.primary + '05'] : [dc.primary + '25', dc.primary + '15']}
                        style={styles.serviceCardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {hasSvg ? (
                          <View style={styles.svgContainer}>
                            <SvgUri
                              width={CARD_WIDTH * 0.4}
                              height={CARD_WIDTH * 0.4}
                              uri={svgUrl}
                              fill={dc.primary}
                            />
                          </View>
                        ) : hasImage ? (
                          <Image 
                            source={imgSrc} 
                            style={styles.serviceCardImage} 
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.serviceIconContainer}>
                            <MaterialCommunityIcons 
                              name={getServiceIcon(cat.nameEn) as any} 
                              size={32} 
                              color={dc.primary} 
                            />
                          </View>
                        )}
                      </LinearGradient>
                      
                    </View>
                    
                    {/* Content */}
                    <View style={styles.serviceCardContent}>
                      <Text style={[styles.serviceCardTitle, { color: dc.text }]} numberOfLines={2}>
                        {name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ═══ Service Providers Section ═══ */}
        <CopilotStep key="serviceProviders" text={t('coachMark.serviceProviders')} order={3} name="serviceProviders">
          <WalkableView style={[styles.serviceProvidersBanner, { backgroundColor: dc.cardBackground }]}>
            <View style={styles.spBannerContent}>
              <View style={[styles.spBannerIcon, { backgroundColor: dc.primary + '12' }]}>
                <Ionicons name="people" size={24} color={dc.primary} />
              </View>
              <View style={styles.spBannerTextContainer}>
                <Text style={[styles.spBannerTitle, { color: dc.text }]}>{t('Service Providers')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.spBannerButton, { backgroundColor: dc.primary }]}
              activeOpacity={0.8}
              onPress={onPressServiceProvidersAll}
            >
              <Text style={styles.spBannerButtonText}>{t('Browse')}</Text>
              <Feather name="arrow-right" size={14} color="#fff" />
            </TouchableOpacity>
          </WalkableView>
        </CopilotStep>

        {/* ═══ My Projects Section ═══ */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrapper}>
              <View style={[styles.sectionIcon, { backgroundColor: dc.purple + '12' }]}>
                <MaterialCommunityIcons name="folder-outline" size={18} color={dc.purple} />
              </View>
              <Text style={[styles.sectionHeading, { color: dc.text }]}>{t('My Projects')}</Text>
            </View>
            {projects.length > 0 && (
              <TouchableOpacity style={styles.seeAllBtn} onPress={onPressMyProjects}>
                <Text style={[styles.seeAllText, { color: dc.purple }]}>{t('View All')}</Text>
                <Feather name="chevron-right" size={14} color={dc.purple} />
              </TouchableOpacity>
            )}
          </View>

          {projectsLoading ? (
            <View style={[styles.projectsLoadingCard, { backgroundColor: dc.cardBackground }]}>
              <ActivityIndicator size="large" color={dc.primary} />
              <Text style={[styles.loadingText, { color: dc.textSecondary }]}>{t('Loading projects...')}</Text>
            </View>
          ) : projects.length > 0 ? (
            <View style={styles.projectsListContainer}>
              {projects.map((project, index) => {
                const sc = getStatusColors(project.status);
                return (
                  <TouchableOpacity
                    key={project.id}
                    style={[styles.projectListCard, { backgroundColor: dc.cardBackground }]}
                    activeOpacity={0.9}
                    onPress={() => onPressProject?.(project.id)}
                  >
                    {/* Left accent bar */}
                    <View style={[styles.projectAccent, { backgroundColor: sc.text }]} />

                    <View style={styles.projectListContent}>
                      {/* Top row: icon + title + status */}
                      <View style={styles.projectListTop}>
                        <View style={[styles.projectListIconBox, { backgroundColor: sc.bg }]}>
                          <MaterialCommunityIcons name={getProjectIcon(project.status)} size={20} color={sc.text} />
                        </View>
                        <View style={styles.projectListInfo}>
                          <Text style={[styles.projectListTitle, { color: dc.text }]} numberOfLines={1}>
                            {project.description || t('No description')}
                          </Text>
                          <View style={styles.projectListMeta}>
                            {project.serviceName && (
                              <View style={styles.projectListServiceTag}>
                                <Ionicons name="briefcase-outline" size={10} color={dc.gray500} />
                                <Text style={[styles.projectListServiceText, { color: dc.gray500 }]} numberOfLines={1}>
                                  {i18n.language === 'ar' && project.serviceNameAr ? project.serviceNameAr : project.serviceName}
                                </Text>
                              </View>
                            )}
                            <Text style={[styles.projectListDate, { color: dc.gray400 }]}>
                              {formatDate(project.createdAt)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Bottom row: budget + status badge + arrow */}
                      <View style={styles.projectListBottom}>
                        <View style={{ flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
                          <ExpoImage source={riyalLogo} style={{ width: 14, height: 14 }} contentFit="contain" />
                          <Text style={[styles.projectListBudget, { color: dc.text }]}>
                            {project.budget?.toLocaleString() || '0'}
                          </Text>
                        </View>
                        <View style={[styles.projectListStatusBadge, { backgroundColor: sc.bg }]}>
                          <View style={[styles.projectListStatusDot, { backgroundColor: sc.text }]} />
                          <Text style={[styles.projectListStatusText, { color: sc.text }]}>{sc.label}</Text>
                        </View>
                        <Feather name="chevron-right" size={16} color={dc.gray300} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.emptyStateCard, { backgroundColor: dc.cardBackground }]}
              activeOpacity={0.8}
              onPress={onPressMyProjects}
            >
              <LinearGradient
                colors={isDarkMode ? [dc.purpleLight, '#1a1033'] : ['#f5f0ff', '#ede9fe']}
                style={styles.emptyStateIconContainer}
              >
                <MaterialCommunityIcons name="plus" size={32} color={dc.purple} />
              </LinearGradient>
              <Text style={[styles.emptyStateTitle, { color: dc.text }]}>{t('Start Your First Project')}</Text>
              <Text style={[styles.emptyStateDescription, { color: dc.gray400 }]}>
                {t('Create a new project and get connected with professional service providers')}
              </Text>
              <View style={[styles.createProjectBtn, { backgroundColor: dc.purple }]}>
                <Text style={styles.createProjectBtnText}>{t('Create Project')}</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══ Quick Actions Grid ═══ */}
        <View style={styles.sectionWrapper}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrapper}>
              <View style={[styles.sectionIcon, { backgroundColor: dc.green + '12' }]}>
                <Feather name="grid" size={16} color={dc.green} />
              </View>
              <Text style={[styles.sectionHeading, { color: dc.text }]}>{t('Quick Actions')}</Text>
            </View>
          </View>

          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.quickActionCard, { backgroundColor: dc.cardBackground }]}
              activeOpacity={0.9}
              onPress={onPressMyTasks}
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: dc.orangeLight }]}>
                <MaterialCommunityIcons name="clipboard-list-outline" size={24} color={dc.orange} />
              </View>
              <Text style={[styles.quickActionTitle, { color: dc.text }]}>{t('My Task Requests')}</Text>
              <Text style={[styles.quickActionSubtitle, { color: dc.textSecondary }]}>{t('View tasks')}</Text>
            </TouchableOpacity>

            {/* Messages button removed */}
          </View>
        </View>

        {/* ═══ Premium Banner ═══ */}
        <TouchableOpacity
          style={styles.premiumCard}
          activeOpacity={0.9}
          onPress={onPressPremiumUpgrade}
        >
          <LinearGradient
            colors={isDarkMode ? ['#7c3aed', '#4c1d95'] : ['#7c3aed', '#5b21b6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumGradient}
          >
            <View style={styles.premiumContent}>
              <View style={styles.premiumLeft}>
                <View style={styles.premiumCircle}>
                  <MaterialCommunityIcons name="crown" size={28} color="#fbbf24" />
                </View>
              </View>
              <View style={styles.premiumRight}>
                <View style={styles.premiumOfferRow}>
                  <View style={styles.premiumOfferBadge}>
                    <Text style={styles.premiumOfferText}>{t('50% OFF')}</Text>
                  </View>
                </View>
                <Text style={styles.premiumTitle}>{t('Premium Subscription')}</Text>
                <Text style={styles.premiumSubtitle}>{t('Get 3 months FREE')}</Text>
                <Text style={styles.premiumDescription}>
                  {t('Unlock unlimited bids and priority support')}
                </Text>
                <View style={styles.premiumButton}>
                  <Text style={styles.premiumButtonText}>{t('Upgrade Now')}</Text>
                  <Feather name="arrow-right" size={14} color="#fff" />
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ═══ FAB ═══ */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={onPressFab}
      >
        <LinearGradient
          colors={[dc.primary, dc.primaryDark]}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="robot" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ═══ CHATBOT BUTTON (Bottom Right) ═══ */}
      {onPressChatbot && (
        <TouchableOpacity
          style={[styles.chatFab, { backgroundColor: dc.primary }]}
          onPress={onPressChatbot}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="robot" size={28} color="#fff" />
          <View style={styles.chatFabBadge}>
            <Text style={styles.chatFabBadgeText}>AI</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default UserHomeScreen;

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { paddingBottom: 80 },

  // ═══ Hero Section ═══
  heroGradient: {
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroSearchContainer: {
    // Relative positioned to anchor absolute search results
    position: 'relative',
    zIndex: 1000,
  },
  heroSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  heroSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
  },
  heroFilterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroChips: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroChipActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  heroChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  heroChipTextActive: {
    color: '#fff',
  },

  // Quick Stats
  quickStatsRow: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  quickStatBox: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  quickStatIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },

  // ═══ Search Results ═══
  searchResultsContainer: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    zIndex: 9999,
    borderRadius: 16,
    padding: 16,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultsTitle: { fontSize: 15, fontWeight: '600' },
  closeResultsText: { fontSize: 13, fontWeight: '600' },
  noResultsContainer: { alignItems: 'center', paddingVertical: 24 },
  noResultsText: { marginTop: 10, fontSize: 14, fontWeight: '500' },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  resultIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultTextContainer: { flex: 1 },
  resultTitle: { fontSize: 14, fontWeight: '600' },
  resultSubtitle: { fontSize: 12, fontWeight: '400', marginTop: 2 },

  // ═══ Section Shared ═══
  sectionWrapper: { marginTop: 28 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { fontSize: 18, fontWeight: '700' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 13, fontWeight: '600' },

  // ═══ Service Cards ═══
  categoriesScroll: { 
    paddingRight: 20, 
    paddingVertical: 8,
    gap: CARD_GAP,
  },
  categoriesLoader: { 
    marginHorizontal: 20, 
    paddingVertical: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  loaderText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  serviceCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  serviceCardImageWrapper: {
    width: '100%',
    height: CARD_WIDTH * 0.7,
    position: 'relative',
    overflow: 'hidden',
  },
  serviceCardGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCardImage: { 
    width: '80%', 
    height: '80%',
    borderRadius: 12,
  },
  serviceIconContainer: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  svgContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  serviceCardContent: { 
    padding: 10,
    paddingBottom: 12,
  },
  serviceCardTitle: { 
    fontSize: 13, 
    fontWeight: '600', 
    lineHeight: 18, 
    textAlign: 'center',
  },

  // ═══ Service Providers Banner ═══
  serviceProvidersBanner: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  spBannerContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  spBannerIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  spBannerTextContainer: { flex: 1, justifyContent: 'center' },
  spBannerTitle: { fontSize: 15, fontWeight: '700' },
  spBannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  spBannerButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // ═══ Project List Cards ═══
  projectsLoadingCard: {
    marginHorizontal: 20,
    paddingVertical: 40,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  projectsListContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  projectListCard: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  projectAccent: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  projectListContent: {
    flex: 1,
    padding: 14,
    gap: 12,
  },
  projectListTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectListIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectListInfo: { flex: 1 },
  projectListTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  projectListMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  projectListServiceTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  projectListServiceText: { fontSize: 11, fontWeight: '500', maxWidth: 120 },
  projectListDate: { fontSize: 11, fontWeight: '400' },
  projectListBottom: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectListBudget: { fontSize: 17, fontWeight: '700', flex: 1 },
  projectListStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 8,
  },
  projectListStatusDot: { width: 5, height: 5, borderRadius: 3 },
  projectListStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' as any },

  // Empty State
  emptyStateCard: {
    marginHorizontal: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyStateDescription: { fontSize: 14, textAlign: 'center' as any, lineHeight: 20, marginBottom: 20 },
  createProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createProjectBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // ═══ Quick Actions Grid ═══
  quickActionsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  quickActionSubtitle: { fontSize: 12, fontWeight: '400' },

  // ═══ Premium Card ═══
  premiumCard: {
    marginHorizontal: 20,
    marginTop: 28,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  premiumGradient: {
    padding: 20,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumLeft: { marginRight: 16 },
  premiumCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumRight: { flex: 1 },
  premiumOfferRow: { flexDirection: 'row', marginBottom: 8 },
  premiumOfferBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  premiumOfferText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  premiumTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  premiumSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', marginTop: 2 },
  premiumDescription: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6, lineHeight: 18 },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start' as any,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  premiumButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // ═══ FAB ═══
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ═══ Fixed Chat FAB (Bottom Left) ═══
  chatFab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' as any,
      },
    }),
  },
  chatFabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatFabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
