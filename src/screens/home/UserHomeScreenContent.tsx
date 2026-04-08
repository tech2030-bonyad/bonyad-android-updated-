import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  Image,
  I18nManager,
  Keyboard,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useFontFamily } from '../../context/FontContext';
import { LinearGradient } from 'expo-linear-gradient';
import StaggeredAppearView from '../../components/StaggeredAppearView';
import PressableScaleView from '../../components/PressableScaleView';
import BonyadLogo from '../../components/BonyadLogo';
import ChatbotFab, { chatbotFabBottomOffset } from '../../components/ChatbotFab';
import { SvgUriImage } from '../../components/SvgUriImage';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { storage } from '../../utils/storage';
import { getMyRequests } from '../../services/SmallTaskService';
import { getCategories, getSubcategories, getDisplayIconFullUrl, type ServiceCategory, type ServiceSubcategory } from '../../services/ServiceService';
import type { SmallTaskRequest } from '../../types/smallTasks';
import {
  unifiedSearch,
  debounce,
  getCachedRegions,
  EMPTY_SCORED_RESULTS,
  SEARCH_DEBOUNCE_MS,
} from '../../utils/searchService';
import type { ScoredSearchResults, Region } from '../../utils/searchService';
import SearchResultsDropdown from '../../components/SearchResultsDropdown';
import type { CategoryInfo } from '../CategorySubcategoryScreen';
import FlowingBorderCard from '../../components/FlowingBorderCard';
import { useTour, type TourStepDef } from '../../components/tour/TourProvider';
import { getMyTickets } from '../../services/SupportTicketService';
import type { SupportTicket } from '../../types/chat';

export type { CategoryInfo };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 20;
const SECTION_SPACING = 20;
const SEARCH_RADIUS = 14;
const CARD_RADIUS = 12;
const IOS_PRIMARY = '#00A5F4';
const IOS_CHAT = '#4C9AD5';
const CARD_WIDTH = 160;
const CATEGORY_CARD_SIZE = 140;
const SUBCATEGORY_CARD_WIDTH = 150;
const SUBCATEGORY_CARD_HEIGHT = 140;
const SUBCATEGORY_STAGGER_MS = 45;
const INLINE_SLIDE_DURATION = 220;

/** Subcategory card with stagger appear animation (web-style: icon area + title + description) */
function StaggeredSubcategoryCard({
  index,
  sub,
  isArabic,
  colors,
  primaryColor,
  iconBg,
  iconFg,
  resolveServiceImage,
  getSubcategoryIconName,
  fontStyle,
  onPress,
}: {
  index: number;
  sub: ServiceSubcategory;
  isArabic: boolean;
  colors: { cardBackground: string; text: string; textSecondary: string; border: string };
  primaryColor: string;
  iconBg: string;
  iconFg: string;
  resolveServiceImage: (item: ServiceSubcategory) => { uri: string; isSvg?: boolean } | null;
  getSubcategoryIconName: (name: string) => keyof typeof Ionicons.glyphMap;
  fontStyle: object;
  onPress: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-24)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, index * SUBCATEGORY_STAGGER_MS);
    return () => clearTimeout(t);
  }, [index, opacity, translateX]);
  const subName = isArabic && sub.nameAr ? sub.nameAr : sub.nameEn;
  const subDesc = isArabic && sub.descriptionAr ? sub.descriptionAr : (sub.descriptionEn || sub.description || '');
  const subImg = resolveServiceImage(sub);
  const iconName = getSubcategoryIconName(sub.nameEn);
  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <PressableScaleView
        style={[styles.subcategoryCardWeb, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={onPress}
      >
        <View style={[styles.subcategoryCardWebIconWrap, { backgroundColor: iconBg }]}>
          {subImg ? (
            subImg.isSvg ? (
              <SvgUriImage
                uri={subImg.uri}
                width={36}
                height={36}
                style={styles.subcategoryCardWebImage}
                fallbackColor={iconFg}
              />
            ) : (
              <Image source={subImg} style={styles.subcategoryCardWebImage} resizeMode="contain" />
            )
          ) : (
            <View style={styles.subcategoryCardWebIconFallback}>
              <Ionicons name={iconName} size={36} color={iconFg} />
            </View>
          )}
        </View>
        <Text style={[styles.subcategoryCardTitleWeb, { color: colors.text }, fontStyle]} numberOfLines={2}>{subName}</Text>
        {subDesc ? (
          <Text style={[styles.subcategoryCardDescWeb, { color: colors.textSecondary }, fontStyle]} numberOfLines={2}>{subDesc}</Text>
        ) : null}
      </PressableScaleView>
    </Animated.View>
  );
}

export interface ApiProject {
  id: number;
  status?: string;
  description?: string;
  address?: string;
  budget?: number | null;
  serviceNameEn?: string;
  serviceNameAr?: string;
  serviceId?: number;
  createdAt?: string;
  timeRequiredDays?: number;
  [key: string]: unknown;
}

// Feature banners matching iOS AdvertisementComponent (5 PNG images)
const BANNER_IMAGES = [
  require('../../../assets/banner1.png'),
  require('../../../assets/banner2.png'),
  require('../../../assets/banner3.png'),
  require('../../../assets/banner4.png'),
  require('../../../assets/banner5.png'),
];

export interface UserHomeScreenContentProps {
  userName?: string;
  onPressSearch?: (query: string) => void;
  onPressOpenServices?: () => void;
  onPressServiceProvidersAll?: () => void;
  onPressMyProjects?: () => void;
  onPressMyTasks?: () => void;
  onPressPremiumUpgrade?: () => void;
  onPressNotifications?: () => void;
  onPressMessages?: () => void;
  onPressInfo?: () => void;
  onPressFab?: () => void;
  onPressProjectStatus?: (status: 'pending' | 'running' | 'completed') => void;
  onPressCategory?: (category: CategoryInfo) => void;
  /** Search dropdown category click (web behavior: show technicians for the whole category) */
  onPressSearchCategory?: (category: CategoryInfo) => void;
  onPressTechnician?: (technicianId: number) => void;
  /** When user selects a subcategory from the categories modal – e.g. open service technicians */
  onPressSubcategory?: (subcategory: ServiceSubcategory) => void;
  /** Open manual project form with this category pre-selected (no subcategory) */
  onPressCategoryForManual?: (category: ServiceCategory) => void;
  /** Open manual project form with this category and subcategory pre-selected */
  onPressSubcategoryForManual?: (category: ServiceCategory, subcategory: ServiceSubcategory) => void;
  onPressChatbot?: () => void;
  onPressProject?: (project: ApiProject) => void;
  onPressCreateProject?: (serviceId: number) => void;
  onPressCreateSmallTask?: (taskTypeId: number) => void;
  onPressMySmallTasks?: () => void;
  onPressSmallTask?: (task: SmallTaskRequest) => void;
  onPressAppointments?: () => void;
  onPressMyContracts?: () => void;
  onPressContract?: (contractId: number) => void;
  onPressSupportTickets?: () => void;
  onPressSupportTicket?: (ticketId: number) => void;
  onPressCreateSupportTicket?: () => void;
  unreadNotificationCount?: number;
  onExposeControl?: (ctrl: { startTour: () => void }) => void;
}

export default function UserHomeScreenContent({
  onPressSearch,
  onPressOpenServices,
  onPressMyProjects,
  onPressMyTasks,
  onPressFab,
  onPressProjectStatus,
  onPressCategory,
  onPressSearchCategory,
  onPressTechnician,
  onPressSubcategory,
  onPressCategoryForManual,
  onPressSubcategoryForManual,
  onPressChatbot,
  onPressProject,
  onPressCreateProject,
  onPressCreateSmallTask,
  onPressMySmallTasks,
  onPressSmallTask,
  onPressAppointments,
  onPressMyContracts,
  onPressContract,
  onPressSupportTickets,
  onPressSupportTicket,
  onPressCreateSupportTicket,
  onPressNotifications,
  onPressMessages,
  unreadNotificationCount = 0,
  onExposeControl,
}: UserHomeScreenContentProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { fontFamily, boldFontFamily, scaledSize } = useFontFamily();
  const isArabic = i18n.language === 'ar';
  const isDark = theme === 'dark';

  const [searchText, setSearchText] = useState('');

  // ─── Unified search state ──────────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState<ScoredSearchResults>(EMPTY_SCORED_RESULTS);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | undefined>(undefined);
  const [searchBarPageY, setSearchBarPageY] = useState(0);
  const searchBarRef = useRef<View>(null);
  const searchRequestId = useRef(0); // guards against stale API responses

  const measureSearchBar = useCallback(() => {
    searchBarRef.current?.measure((_x, _y, _w, h, _px, pageY) => {
      setSearchBarPageY(pageY + h + 4);
    });
  }, []);

  useEffect(() => {
    getCachedRegions().then(setRegions).catch(() => {});
  }, []);

  const performSearch = useCallback(async (query: string, regionId?: number) => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults(EMPTY_SCORED_RESULTS);
      setSearchLoading(false);
      setShowSearchResults(q.length > 0);
      return;
    }
    const reqId = ++searchRequestId.current;
    setSearchLoading(true);
    setShowSearchResults(true);
    try {
      const results = await unifiedSearch(q, regionId, i18n.language);
      // Only apply if this is still the latest search request (prevents stale overwrites)
      if (reqId !== searchRequestId.current) return;
      setSearchResults(results);
    } catch {
      if (reqId !== searchRequestId.current) return;
      setSearchResults(EMPTY_SCORED_RESULTS);
    } finally {
      if (reqId === searchRequestId.current) {
        setSearchLoading(false);
      }
    }
  }, [i18n.language]);

  // Use a ref so the debounced function always calls the latest performSearch
  const performSearchRef = useRef(performSearch);
  useEffect(() => { performSearchRef.current = performSearch; }, [performSearch]);

  const debouncedSearchRef = useRef<ReturnType<typeof debounce<(q: string, r?: number) => void>> | null>(null);
  if (!debouncedSearchRef.current) {
    debouncedSearchRef.current = debounce((q: string, r?: number) => performSearchRef.current(q, r), SEARCH_DEBOUNCE_MS);
  }

  useEffect(() => {
    if (searchText.trim().length >= 2) {
      performSearch(searchText, selectedRegionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegionId]);

  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);
  const mainListScrollRef = useRef<ScrollView>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [smallTasks, setSmallTasks] = useState<SmallTaskRequest[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Contracts
  interface HomeContract { id: number; projectId?: number; type?: string; status?: string; otherPartyName?: string; description?: string; signedDocumentUrl?: string | null; createdAt?: string; amount?: number; budget?: number; startDate?: string; projectTitle?: string; }
  const [contracts, setContracts] = useState<HomeContract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  // Support tickets
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<ServiceCategory | null>(null);
  const [subcategoriesForModal, setSubcategoriesForModal] = useState<ServiceSubcategory[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  const fontStyle = { fontFamily: fontFamily || undefined };
  const boldStyle = { fontFamily: boldFontFamily || fontFamily || undefined };

  // ─── Tour guide (new context-based system) ─────────────────────────────
  const { tourRef, startTour } = useTour();

  const homeTourSteps: TourStepDef[] = [
    { spotId: 'logo', text: t('tutorial.home.user.topNavLogo') },
    { spotId: 'messagesBtn', text: t('tutorial.home.user.topNavMessages') },
    { spotId: 'infoBtn', text: t('tutorial.home.user.topNavInfo') },
    { spotId: 'notificationsBtn', text: t('tutorial.home.user.topNavNotifications') },
    { spotId: 'searchBar', text: t('tutorial.home.user.search') },
    { spotId: 'newProject', text: t('tutorial.home.user.newProject') },
    { spotId: 'smallTask', text: t('tutorial.home.user.smallTask') },
    { spotId: 'appointments', text: t('tutorial.home.user.appointments') },
    { spotId: 'services', text: t('tutorial.home.user.services') },
    { spotId: 'categories', text: t('tutorial.home.user.serviceCategories') },
    { spotId: 'projectsSection', text: t('tutorial.home.user.projectsSection') },
    { spotId: 'smallTasksSection', text: t('tutorial.home.user.smallTasksSection') },
    { spotId: 'contractsSection', text: t('tutorial.home.user.contractsSection') },
    { spotId: 'supportSection', text: t('tutorial.home.user.supportSection') },
    { spotId: 'chatbot', text: t('tutorial.home.user.chatbot') },
  ];

  const lastScrollY = useRef(0);
  const handleTourScroll = useCallback((stepIndex: number, spotId: string, scrollDelta?: number): boolean => {
    // Corrective scroll: adjust current position by delta
    if (scrollDelta !== undefined) {
      const newY = Math.max(0, lastScrollY.current + scrollDelta);
      mainListScrollRef.current?.scrollTo({ y: newY, animated: false });
      lastScrollY.current = newY;
      return true;
    }

    const fixedElements = ['logo', 'messagesBtn', 'infoBtn', 'notificationsBtn', 'searchBar'];
    if (fixedElements.includes(spotId)) {
      if (lastScrollY.current !== 0) {
        mainListScrollRef.current?.scrollTo({ y: 0, animated: false });
        lastScrollY.current = 0;
        return true;
      }
      return false;
    }
    const scrollMap: Record<string, number> = {
      newProject: 0, smallTask: 0, appointments: 0, services: 0,
      categories: 200, projectsSection: 450, smallTasksSection: 750,
      contractsSection: 1050, supportSection: 1350, chatbot: 0,
    };
    const targetY = scrollMap[spotId];
    if (targetY !== undefined) {
      const needsScroll = Math.abs(lastScrollY.current - targetY) > 30;
      mainListScrollRef.current?.scrollTo({ y: targetY, animated: false });
      lastScrollY.current = targetY;
      return needsScroll;
    }
    return false;
  }, []);

  const handleStartTour = useCallback(() => {
    startTour({
      steps: homeTourSteps,
      screenKey: 'userHome',
      onScrollToStep: handleTourScroll,
    });
  }, [startTour, homeTourSteps, handleTourScroll]);

  const loadProjects = useCallback(async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        setProjects([]);
        return;
      }
      const url = buildApiUrl(API_ENDPOINTS.PROJECTS.MY_PROJECTS);
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        setProjects([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.projects ?? data?.data ?? []);
      setProjects(Array.isArray(list) ? list.slice(0, 6) : []);
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadSmallTasks = useCallback(async () => {
    try {
      const list = await getMyRequests();
      const mapped: SmallTaskRequest[] = (list || []).slice(0, 6).map((r: any) => ({
        id: r.id,
        taskTypeId: r.taskTypeId,
        taskTypeNameAr: r.taskTypeNameAr,
        taskTypeNameEn: r.taskTypeNameEn,
        description: r.description ?? '',
        address: r.address ?? '',
        status: (r.status ?? 'PENDING') as SmallTaskRequest['status'],
        bidsCount: r.bidsCount ?? 0,
        bidCount: r.bidCount ?? 0,
        userName: r.userName,
        createdAt: r.createdAt ?? '',
      }));
      setSmallTasks(mapped);
    } catch {
      setSmallTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const loadContracts = useCallback(async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) { setContracts([]); return; }
      const url = buildApiUrl(API_ENDPOINTS.CONTRACTS.MY);
      const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!res.ok) { setContracts([]); return; }
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.contracts ?? data?.data ?? []);
      setContracts(Array.isArray(list) ? list.slice(0, 6) : []);
    } catch { setContracts([]); }
    finally { setLoadingContracts(false); }
  }, []);

  const loadSupportTickets = useCallback(async () => {
    try {
      const tickets = await getMyTickets('OPEN');
      setSupportTickets(tickets.slice(0, 3));
    } catch { setSupportTickets([]); }
    finally { setLoadingTickets(false); }
  }, []);

  useEffect(() => {
    loadProjects();
    loadSmallTasks();
    loadContracts();
    loadSupportTickets();
  }, [loadProjects, loadSmallTasks, loadContracts, loadSupportTickets]);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const list = await getCategories();
      setCategories(list);
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const inlineSubcatOpacity = useRef(new Animated.Value(0)).current;
  const inlineSubcatTranslateX = useRef(new Animated.Value(-80)).current;

  const handleCategoryPress = useCallback(async (category: ServiceCategory) => {
    if (onPressCategoryForManual) {
      onPressCategoryForManual(category);
      return;
    }
    if (selectedCategoryForModal?.id === category.id) {
      Animated.parallel([
        Animated.timing(inlineSubcatOpacity, {
          toValue: 0,
          duration: INLINE_SLIDE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(inlineSubcatTranslateX, {
          toValue: -80,
          duration: INLINE_SLIDE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSelectedCategoryForModal(null);
        setSubcategoriesForModal([]);
        inlineSubcatTranslateX.setValue(-80);
      });
      return;
    }
    setSelectedCategoryForModal(category);
    setLoadingSubcategories(true);
    setSubcategoriesForModal([]);
    inlineSubcatOpacity.setValue(0);
    inlineSubcatTranslateX.setValue(-80);
    try {
      const subs = await getSubcategories(category.id);
      setSubcategoriesForModal(subs);
    } catch {
      setSubcategoriesForModal([]);
    } finally {
      setLoadingSubcategories(false);
      Animated.parallel([
        Animated.timing(inlineSubcatOpacity, {
          toValue: 1,
          duration: INLINE_SLIDE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(inlineSubcatTranslateX, {
          toValue: 0,
          duration: INLINE_SLIDE_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [onPressCategoryForManual, selectedCategoryForModal?.id, inlineSubcatOpacity, inlineSubcatTranslateX]);

  const closeSubcategoriesModal = useCallback(() => {
    if (!selectedCategoryForModal) return;
    Animated.parallel([
      Animated.timing(inlineSubcatOpacity, {
        toValue: 0,
        duration: INLINE_SLIDE_DURATION,
        useNativeDriver: true,
      }),
        Animated.timing(inlineSubcatTranslateX, {
          toValue: -80,
          duration: INLINE_SLIDE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSelectedCategoryForModal(null);
        setSubcategoriesForModal([]);
        inlineSubcatTranslateX.setValue(-80);
      });
  }, [selectedCategoryForModal, inlineSubcatOpacity, inlineSubcatTranslateX]);

  const handleSubcategoryPress = useCallback(
    (sub: ServiceSubcategory) => {
      if (onPressSubcategoryForManual && selectedCategoryForModal) {
        onPressSubcategoryForManual(selectedCategoryForModal, sub);
        closeSubcategoriesModal();
        return;
      }
      closeSubcategoriesModal();
      onPressSubcategory?.(sub);
    },
    [onPressSubcategory, onPressSubcategoryForManual, selectedCategoryForModal, closeSubcategoriesModal]
  );

  /**
   * Resolve service icon URL. Returns both raster and SVG URLs.
   * For SVG, the URL will be used with SvgUriImage component.
   */
  const resolveServiceImage = (item: ServiceCategory | ServiceSubcategory): { uri: string; isSvg?: boolean } | null => {
    const url = getDisplayIconFullUrl(item);
    if (!url) return null;
    const isSvg = url.toLowerCase().endsWith('.svg');
    return { uri: url, isSvg };
  };

  /** Web-style category icon fallback by name */
  const getCategoryIconName = (nameEn: string): keyof typeof Ionicons.glyphMap => {
    const n = (nameEn || '').toLowerCase();
    if (n.includes('plumb')) return 'water-outline';
    if (n.includes('electric')) return 'flash-outline';
    if (n.includes('ac') || n.includes('hvac') || n.includes('air')) return 'snow-outline';
    if (n.includes('paint')) return 'color-palette-outline';
    if (n.includes('carpent') || n.includes('wood')) return 'hammer-outline';
    if (n.includes('clean')) return 'sparkles-outline';
    if (n.includes('construct') || n.includes('build')) return 'construct-outline';
    if (n.includes('design')) return 'brush-outline';
    if (n.includes('garden') || n.includes('landscape')) return 'leaf-outline';
    if (n.includes('security')) return 'shield-checkmark-outline';
    if (n.includes('move') || n.includes('transport')) return 'car-outline';
    if (n.includes('repair')) return 'build-outline';
    return 'grid-outline';
  };

  const getSubcategoryIconName = (nameEn: string): keyof typeof Ionicons.glyphMap => getCategoryIconName(nameEn);

  const iconBg = isDark ? '#000000' : '#FFFFFF';
  const iconFg = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)';

  const getTaskTypeName = (task: SmallTaskRequest) =>
    isArabic ? (task.taskTypeNameAr ?? task.taskType?.nameAr ?? task.taskTypeNameEn) : (task.taskTypeNameEn ?? task.taskType?.nameEn ?? task.taskTypeNameAr);
  const topSpacing = Platform.OS === 'android' ? Math.max(insets.top, 50) : Math.max(insets.top, 12);


  // Expose start function to parent
  useEffect(() => {
    onExposeControl?.({
      startTour: handleStartTour,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleStartTour]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchText(query);
    if (query.trim().length === 0) {
      setShowSearchResults(false);
      setSearchResults(EMPTY_SCORED_RESULTS);
      return;
    }
    setShowSearchResults(true);
    setSearchLoading(true);
    debouncedSearchRef.current?.[0](query, selectedRegionId);
  }, [selectedRegionId]);

  const handleSearchSubmit = useCallback(() => {
    debouncedSearchRef.current?.[1](); // cancel debounce
    performSearch(searchText, selectedRegionId);
  }, [searchText, selectedRegionId, performSearch]);

  const handleBannerScroll = (e: { nativeEvent: { contentOffset: { x: number }; layoutMeasurement: { width: number } } }) => {
    const x = e.nativeEvent.contentOffset.x;
    const w = e.nativeEvent.layoutMeasurement.width;
    const index = Math.round(x / w);
    if (index >= 0 && index < BANNER_IMAGES.length) setBannerIndex(index);
  };

  const primaryColor = isDark ? colors.primary : IOS_PRIMARY;

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    debouncedSearchRef.current?.[1](); // cancel any pending debounce
    setShowSearchResults(false);
    setSearchText('');
    setSearchResults(EMPTY_SCORED_RESULTS);
  }, []);

  return (
    <View style={[styles.container, styles.wrapper, { backgroundColor: colors.background }]}>
      {/* Header: top bar + search bar */}
      <View style={{ paddingTop: topSpacing, zIndex: 200, backgroundColor: colors.background }}>
        {/* Top bar */}
        <View collapsable={false} style={styles.iosTopBar}>
          <View ref={tourRef('logo')} collapsable={false} style={styles.iosTopBarLogo}>
            <BonyadLogo size="small" responsive={false} variant={isDark ? 'light' : 'dark'} />
          </View>
          <View style={styles.iosTopBarIcons}>
            <View
              ref={tourRef('messagesBtn')}
              collapsable={false}
              style={styles.iosTopBarIconBtn}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                onPress={onPressMessages}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="chatbubbles-outline" size={24} color={primaryColor} />
                </View>
              </TouchableOpacity>
            </View>
            <View
              ref={tourRef('infoBtn')}
              collapsable={false}
              style={styles.iosTopBarIconBtn}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                onPress={handleStartTour}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="information-circle-outline" size={24} color={primaryColor} />
                </View>
              </TouchableOpacity>
            </View>
            <View
              ref={tourRef('notificationsBtn')}
              collapsable={false}
              style={styles.iosTopBarIconBtn}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                onPress={onPressNotifications}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ position: 'relative' }}>
                    <Ionicons name="notifications-outline" size={24} color={primaryColor} />
                    {unreadNotificationCount > 0 && (
                      <View style={[styles.iosNotificationBadge, { backgroundColor: '#FF3B30' }]} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Search bar */}
        <View
          ref={tourRef('searchBar')}
          collapsable={false}
          style={styles.searchBarWrap}
        >
          <View
            ref={searchBarRef}
            collapsable={false}
            style={[styles.searchWrap, { backgroundColor: isDark ? colors.cardBackground : 'rgba(255,255,255,0.9)', borderColor: `${primaryColor}26` }, isDark ? undefined : styles.searchShadow, isArabic && { flexDirection: 'row-reverse' }]}
          >
            <Ionicons name="search" size={18} color={primaryColor} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, textAlign: isArabic ? 'right' : 'left' }, fontStyle]}
              placeholder={t('Search services or providers')}
              placeholderTextColor={colors.textTertiary}
              value={searchText}
              onChangeText={handleSearchChange}
              onSubmitEditing={handleSearchSubmit}
              onFocus={measureSearchBar}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={closeSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

      </View>

      <ScrollView
        ref={mainListScrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          styles.contentScroll,
          { paddingBottom: Math.max(insets.bottom, 24) + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        nestedScrollEnabled={true}
        directionalLockEnabled={true}
        keyboardShouldPersistTaps="handled"
      >

      {/* 2. Advertisement / feature banners carousel (iOS AdvertisementComponent) */}
      <StaggeredAppearView index={1} style={{ marginTop: SECTION_SPACING }}>
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleBannerScroll}
          style={styles.bannerScroll}
          contentContainerStyle={styles.bannerContent}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
        >
          {BANNER_IMAGES.map((img, i) => (
            <View key={i} style={[styles.bannerPage, { width: SCREEN_WIDTH }]}>
              <View style={[styles.bannerCard, { backgroundColor: isDark ? colors.cardBackground : '#FFFFFF' }]}>
                <Image source={img} style={styles.bannerImage} resizeMode="stretch" />
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {BANNER_IMAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === bannerIndex && styles.dotActive,
                i === bannerIndex && { backgroundColor: primaryColor },
                i !== bannerIndex && { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' },
              ]}
            />
          ))}
        </View>
      </StaggeredAppearView>

      {/* 3. Quick actions - circular icons (iOS QuickActionsSection) with press scale */}
      <FlowingBorderCard
        accent="#007AFF"
        cornerRadius={18}
        cardBackground={isDark ? colors.cardBackground : colors.background}
        style={{ marginTop: SECTION_SPACING }}
      >
        <View style={[styles.quickActions, { paddingVertical: 8 }]}>
          <View ref={tourRef('newProject')} collapsable={false}>
            <PressableScaleView style={styles.quickActionItem} onPress={() => onPressCreateProject?.(0)}>
              <View style={[styles.quickActionCircle, { backgroundColor: `${primaryColor}18` }]}>
                <Feather name="folder-plus" size={24} color={primaryColor} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('New project')}</Text>
            </PressableScaleView>
          </View>
          <View ref={tourRef('smallTask')} collapsable={false}>
            <PressableScaleView style={styles.quickActionItem} onPress={() => onPressCreateSmallTask?.(0)}>
              <View style={[styles.quickActionCircle, { backgroundColor: 'rgba(255,149,0,0.18)' }]}>
                <Ionicons name="flash" size={24} color="#FF9500" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('Small task')}</Text>
            </PressableScaleView>
          </View>
          <View ref={tourRef('appointments')} collapsable={false}>
            <PressableScaleView style={styles.quickActionItem} onPress={() => { onPressAppointments ? onPressAppointments() : onPressProjectStatus?.('running'); }}>
              <View style={[styles.quickActionCircle, { backgroundColor: 'rgba(52,199,89,0.18)' }]}>
                <Ionicons name="calendar" size={24} color="#34C759" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('Appointments')}</Text>
            </PressableScaleView>
          </View>
          <View ref={tourRef('services')} collapsable={false}>
            <PressableScaleView style={styles.quickActionItem} onPress={() => onPressOpenServices?.()}>
              <View style={[styles.quickActionCircle, { backgroundColor: 'rgba(175,82,222,0.18)' }]}>
                <Feather name="grid" size={24} color="#AF52DE" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('Services')}</Text>
            </PressableScaleView>
          </View>
        </View>
      </FlowingBorderCard>

      {/* 4. Service Categories – web-style: horizontal scroll, square cards, image area + title + chevron when selected */}
      <FlowingBorderCard
        accent="#00A5F4"
        cornerRadius={18}
        cardBackground={isDark ? colors.cardBackground : colors.background}
        style={{ marginTop: SECTION_SPACING }}
      >
        <View
          ref={tourRef('categories')}
          collapsable={false}
          style={{ paddingVertical: 8 }}
        >
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }, { fontSize: scaledSize(18) }, boldStyle]}>{t('Service Categories')}</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }, fontStyle]}>{t('Browse services by category')}</Text>
            </View>
          </View>
          {loadingCategories ? (
            <View style={[styles.categoriesLoadingWrap, { backgroundColor: colors.cardBackground }]}>
              <ActivityIndicator size="small" color={primaryColor} />
              <Text style={[styles.categoriesLoadingText, { color: colors.textSecondary }, fontStyle]}>{t('Loading categories...')}</Text>
            </View>
          ) : categories.length === 0 ? (
            <View style={[styles.categoriesEmptyWrap, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="grid-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.categoriesEmptyText, { color: colors.textSecondary }, fontStyle]}>{t('No categories available')}</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesRowContent}
            >
              {categories.map((cat) => {
                const name = isArabic && cat.nameAr ? cat.nameAr : cat.nameEn;
                const imgSrc = resolveServiceImage(cat);
                const isSelected = selectedCategoryForModal?.id === cat.id;
                return (
                  <PressableScaleView
                    key={cat.id}
                    style={[
                      styles.categoryCardWeb,
                      { backgroundColor: colors.cardBackground, borderColor: isSelected ? primaryColor : colors.border, borderWidth: isSelected ? 2 : 1 },
                    ]}
                    onPress={() => handleCategoryPress(cat)}
                  >
                    <View style={[styles.categoryCardWebImageWrap, { backgroundColor: iconBg }]}>
                      {imgSrc ? (
                        imgSrc.isSvg ? (
                          <SvgUriImage
                            uri={imgSrc.uri}
                            width={36}
                            height={36}
                            style={styles.categoryCardImage}
                            fallbackColor={iconFg}
                          />
                        ) : (
                          <Image source={imgSrc} style={styles.categoryCardImage} resizeMode="contain" />
                        )
                      ) : (
                        <Ionicons name={getCategoryIconName(cat.nameEn)} size={36} color={iconFg} />
                      )}
                    </View>
                    <View style={styles.categoryCardWebContent}>
                      <Text style={[styles.categoryCardTitleWeb, { color: colors.text }, fontStyle]}>{name}</Text>
                    </View>
                  </PressableScaleView>
                );
              })}
            </ScrollView>
          )}
        </View>
      </FlowingBorderCard>

      {/* Inline subcategories – same as web: slide in from side, "Subcategories – [Name]", gradient line, horizontal cards with stagger */}
      {selectedCategoryForModal && (
        <Animated.View
          style={[
            styles.inlineSubcategoriesWrap,
            {
              opacity: inlineSubcatOpacity,
              transform: [{ translateX: inlineSubcatTranslateX }],
            },
          ]}
        >
          <View style={styles.inlineSubcatLineWrap}>
            <LinearGradient
              colors={[primaryColor, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.inlineSubcatLine}
            />
          </View>
          <View style={styles.inlineSubcatHeader}>
            <Text style={[styles.inlineSubcatTitle, { color: colors.text }, boldStyle]}>
              {t('Subcategories')}
              <Text style={[styles.inlineSubcatTitleDash, { color: colors.text }]}>
                {isArabic && selectedCategoryForModal.nameAr ? ` – ${selectedCategoryForModal.nameAr}` : ` – ${selectedCategoryForModal.nameEn}`}
              </Text>
            </Text>
            {onPressCategoryForManual && (
              <TouchableOpacity
                onPress={() => onPressCategoryForManual(selectedCategoryForModal)}
                style={[styles.inlineSubcatCreateBtn, { backgroundColor: primaryColor }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.inlineSubcatCreateBtnText, fontStyle]}>{t('Create project')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={closeSubcategoriesModal} hitSlop={12} style={[styles.inlineSubcatCloseBtn, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.inlineSubcatSpacer} />
          {loadingSubcategories ? (
            <View style={[styles.subcategoryLoadingWrap, { backgroundColor: colors.cardBackground }]}>
              <ActivityIndicator size="small" color={primaryColor} />
              <Text style={[styles.modalLoadingText, { color: colors.textSecondary }, fontStyle]}>{t('Loading...')}</Text>
            </View>
          ) : subcategoriesForModal.length === 0 ? (
            <View style={[styles.subcategoryEmptyWrap, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="grid-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.modalEmptyText, { color: colors.textSecondary }, fontStyle]}>{t('No subcategories available')}</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.inlineSubcatScrollContent}
            >
              {subcategoriesForModal.map((sub, idx) => (
                <StaggeredSubcategoryCard
                  key={sub.id}
                  index={idx}
                  sub={sub}
                  isArabic={isArabic}
                  colors={colors}
                  primaryColor={primaryColor}
                  iconBg={iconBg}
                  iconFg={iconFg}
                  resolveServiceImage={resolveServiceImage}
                  getSubcategoryIconName={getSubcategoryIconName}
                  fontStyle={fontStyle}
                  onPress={() => handleSubcategoryPress(sub)}
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>
      )}

      {/* 5. My Projects section - horizontal strip with real cards (iOS press scale) */}
      <FlowingBorderCard
        accent="#00A5F4"
        cornerRadius={20}
        cardBackground={isDark ? colors.cardBackground : colors.background}
        style={{ marginTop: SECTION_SPACING }}
      >
        <View
          ref={tourRef('projectsSection')}
          collapsable={false}
          style={{ paddingVertical: 8 }}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }, { fontSize: scaledSize(18) }, boldStyle]}>{t('My Projects')}</Text>
            <TouchableOpacity onPress={onPressMyProjects} activeOpacity={0.8}>
              <Text style={[styles.viewAll, { color: primaryColor }, fontStyle]}>{t('View All')} ←</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {loadingProjects ? (
              <View style={[styles.homeCard, { backgroundColor: colors.cardBackground, width: CARD_WIDTH, minHeight: 100, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="small" color={primaryColor} />
              </View>
            ) : projects.length === 0 ? (
              <PressableScaleView style={[styles.homeCard, { backgroundColor: colors.cardBackground, width: CARD_WIDTH }]} onPress={() => onPressMyProjects?.()}>
                <Ionicons name="folder-open-outline" size={32} color={primaryColor} />
                <Text style={[styles.placeholderLabel, { color: colors.textSecondary }, fontStyle]}>{t('View your projects')}</Text>
              </PressableScaleView>
            ) : (
              projects.map((project) => (
                <PressableScaleView
                  key={project.id}
                  style={[styles.homeCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => onPressProject?.(project)}
                >
                  <View style={styles.homeCardRow}>
                    <View style={[styles.homeCardIconWrap, { backgroundColor: `${primaryColor}18` }]}>
                      <Ionicons name="folder-open" size={20} color={primaryColor} />
                    </View>
                    <Text style={[styles.homeCardTitle, { color: colors.text }, boldStyle]} numberOfLines={1}>#{project.id}</Text>
                  </View>
                  <Text style={[styles.homeCardSub, { color: colors.textSecondary }, fontStyle]} numberOfLines={2}>
                    {(project.description || project.address || '').trim() || t('Project')}
                  </Text>
                  <Text style={[styles.homeCardStatus, { color: primaryColor }, fontStyle]}>
                    {project.status ?? '—'}
                  </Text>
                </PressableScaleView>
              ))
            )}
          </ScrollView>
        </View>
      </FlowingBorderCard>

      {/* 6. My Small Tasks section - horizontal strip with real cards (iOS press scale) */}
      <FlowingBorderCard
        accent="#FF9500"
        cornerRadius={20}
        cardBackground={isDark ? colors.cardBackground : colors.background}
        style={{ marginTop: SECTION_SPACING }}
      >
        <View
          ref={tourRef('smallTasksSection')}
          collapsable={false}
          style={{ paddingVertical: 8 }}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }, { fontSize: scaledSize(18) }, boldStyle]}>{t('My Small Tasks')}</Text>
            <TouchableOpacity onPress={onPressMySmallTasks} activeOpacity={0.8}>
              <Text style={[styles.viewAll, { color: primaryColor }, fontStyle]}>{t('View All')} ←</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {loadingTasks ? (
              <View style={[styles.homeCard, { backgroundColor: colors.cardBackground, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="small" color="#FF9500" />
              </View>
            ) : smallTasks.length === 0 ? (
              <PressableScaleView style={[styles.homeCard, { backgroundColor: colors.cardBackground, width: CARD_WIDTH }]} onPress={() => onPressMySmallTasks?.()}>
                <Ionicons name="flash-outline" size={32} color="#FF9500" />
                <Text style={[styles.placeholderLabel, { color: colors.textSecondary }, fontStyle]}>{t('View your small tasks')}</Text>
              </PressableScaleView>
            ) : (
              smallTasks.map((task) => (
                <PressableScaleView
                  key={task.id}
                  style={[styles.homeCard, { backgroundColor: colors.cardBackground }]}
                  onPress={() => onPressSmallTask ? onPressSmallTask(task) : onPressMySmallTasks?.()}
                >
                  <View style={[styles.homeCardIconWrap, { backgroundColor: 'rgba(255,149,0,0.18)', marginBottom: 8 }]}>
                    <Ionicons name="flash" size={20} color="#FF9500" />
                  </View>
                  <Text style={[styles.homeCardTitle, { color: colors.text }, boldStyle]}>
                    {getTaskTypeName(task) || `#${task.id}`}
                  </Text>
                  <Text style={[styles.homeCardSub, { color: colors.textSecondary }, fontStyle]}>
                    {task.description?.trim() || task.address || '—'}
                  </Text>
                  <Text style={[styles.homeCardStatus, { color: '#FF9500' }, fontStyle]}>
                    {task.status ?? '—'}
                  </Text>
                </PressableScaleView>
              ))
            )}
          </ScrollView>
        </View>
      </FlowingBorderCard>

      {/* 7. My Contracts section (iOS HomeContractsSection) */}
      <FlowingBorderCard
        accent="#5856D6"
        cornerRadius={20}
        cardBackground={isDark ? colors.cardBackground : colors.background}
        style={{ marginTop: SECTION_SPACING }}
      >
        <View ref={tourRef('contractsSection')} collapsable={false} style={{ paddingVertical: 8 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }, { fontSize: scaledSize(18) }, boldStyle]}>{t('My Contracts')}</Text>
            <TouchableOpacity onPress={onPressMyContracts} activeOpacity={0.8}>
              <Text style={[styles.viewAll, { color: '#5856D6' }, fontStyle]}>{t('View All')} ←</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {loadingContracts ? (
              <View style={[styles.homeCard, { backgroundColor: colors.cardBackground, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="small" color="#5856D6" />
              </View>
            ) : contracts.length === 0 ? (
              <PressableScaleView style={[styles.homeCard, { backgroundColor: colors.cardBackground, width: CARD_WIDTH }]} onPress={() => onPressMyContracts?.()}>
                <Ionicons name="document-text-outline" size={32} color="#5856D6" />
                <Text style={[styles.placeholderLabel, { color: colors.textSecondary }, fontStyle]}>{t('No contracts yet')}</Text>
              </PressableScaleView>
            ) : (
              contracts.map((c) => {
                const contractAmount = c.amount ?? c.budget;
                const formattedAmount = contractAmount
                  ? new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-SA', { maximumFractionDigits: 0 }).format(contractAmount)
                  : null;
                const dateStr = c.createdAt
                  ? new Date(c.createdAt).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })
                  : null;
                return (
                  <PressableScaleView
                    key={c.id}
                    style={[styles.homeCard, { backgroundColor: colors.cardBackground, height: 180 }]}
                    onPress={() => onPressContract?.(c.id)}
                  >
                    <View style={styles.homeCardRow}>
                      <View style={[styles.homeCardIconWrap, { backgroundColor: 'rgba(88,86,214,0.15)' }]}>
                        <Ionicons name="document-text" size={20} color="#5856D6" />
                      </View>
                      <Text style={[styles.homeCardTitle, { color: colors.text }, boldStyle]} numberOfLines={1}>#{c.id}</Text>
                    </View>
                    {c.signedDocumentUrl ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759' }} />
                        <Text style={[{ color: '#34C759', fontSize: 11, fontWeight: '600' }, fontStyle]}>{t('Signed')}</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF9500' }} />
                        <Text style={[{ color: '#FF9500', fontSize: 11, fontWeight: '600' }, fontStyle]}>{t(c.status || 'Pending')}</Text>
                      </View>
                    )}
                    <Text style={[styles.homeCardSub, { color: colors.textSecondary, marginTop: 6 }, fontStyle]} numberOfLines={2}>
                      {c.projectTitle || c.description || c.otherPartyName || t('Contract')}
                    </Text>
                    {formattedAmount && (
                      <Text style={[{ color: '#5856D6', fontSize: 14, fontWeight: '700', marginTop: 4 }, boldStyle]} numberOfLines={1}>
                        {formattedAmount} {t('SAR')}
                      </Text>
                    )}
                    {dateStr && (
                      <Text style={[{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }, fontStyle]}>
                        {dateStr}
                      </Text>
                    )}
                  </PressableScaleView>
                );
              })
            )}
          </ScrollView>
        </View>
      </FlowingBorderCard>

      {/* 8. Support Tickets section (iOS HomeSupportSection) */}
      <FlowingBorderCard
        accent="#34C759"
        cornerRadius={20}
        cardBackground={isDark ? colors.cardBackground : colors.background}
        style={{ marginTop: SECTION_SPACING }}
      >
        <View ref={tourRef('supportSection')} collapsable={false} style={{ paddingVertical: 8 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }, { fontSize: scaledSize(18) }, boldStyle]}>{t('Support')}</Text>
            <TouchableOpacity onPress={onPressSupportTickets} activeOpacity={0.8}>
              <Text style={[styles.viewAll, { color: '#34C759' }, fontStyle]}>{t('View All')} ←</Text>
            </TouchableOpacity>
          </View>
          {loadingTickets ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#34C759" />
            </View>
          ) : supportTickets.length === 0 ? (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}
              onPress={onPressCreateSupportTicket}
              activeOpacity={0.8}
            >
              <View style={[styles.homeCardIconWrap, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#34C759" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 15, fontWeight: '600' }, { color: colors.text }, boldStyle]}>{t('Open Support Ticket')}</Text>
                <Text style={[{ fontSize: 12, marginTop: 2 }, { color: colors.textSecondary }, fontStyle]}>{t('Get help from our team')}</Text>
              </View>
              <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={{ paddingHorizontal: 12 }}>
              {supportTickets.map((ticket, idx) => {
                const statusColor = ticket.status === 'OPEN' || ticket.status === 'PENDING' ? '#FF9500' : ticket.status === 'IN_PROGRESS' ? '#007AFF' : '#8E8E93';
                return (
                  <TouchableOpacity
                    key={ticket.id}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderTopWidth: idx > 0 ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.border }}
                    onPress={() => onPressSupportTicket?.(ticket.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.homeCardIconWrap, { backgroundColor: `${statusColor}20` }]}>
                      <Ionicons name="ticket" size={18} color={statusColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[{ fontSize: 14, fontWeight: '600' }, { color: colors.text }, boldStyle]} numberOfLines={1}>{ticket.subject}</Text>
                    </View>
                    <View style={{ backgroundColor: `${statusColor}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                      <Text style={[{ fontSize: 10, fontWeight: '700', color: statusColor }, fontStyle]}>{ticket.status}</Text>
                    </View>
                    <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}
                onPress={onPressCreateSupportTicket}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={18} color="#34C759" />
                <Text style={[{ fontSize: 13, fontWeight: '600', color: '#34C759' }, fontStyle]}>{t('New Ticket')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </FlowingBorderCard>

      </ScrollView>
      {/* iOS-style Chatbot FAB: fixed bottom-left, wave rings + white circle + robot */}
      {onPressChatbot && (
        <View ref={tourRef('chatbot')} collapsable={false} style={{ position: 'absolute', bottom: chatbotFabBottomOffset(insets.bottom), left: I18nManager.isRTL ? undefined : 20, right: I18nManager.isRTL ? 20 : undefined, width: 67, height: 67 }} pointerEvents="box-none">
          <ChatbotFab
            embedInParent
            onPress={onPressChatbot}
            primaryColor={primaryColor}
            primaryDark={isDark ? colors.primary : '#0078E0'}
            bottomOffset={0}
          />
        </View>
      )}

      {/* Search dropdown — rendered at root level with absolute positioning (no Modal) */}
      <SearchResultsDropdown
        visible={showSearchResults}
        anchorPageY={searchBarPageY}
        results={searchResults}
        loading={searchLoading}
        query={searchText}
        regions={regions}
        selectedRegionId={selectedRegionId}
        onRegionChange={setSelectedRegionId}
        onClose={closeSearch}
        onCategoryPress={(cat) => {
          closeSearch();
          // Web behavior: category search result shows technicians for the whole category.
          // Fallback to regular category navigation if parent doesn't handle this.
          const payload = { id: cat.id, nameEn: cat.nameEn, nameAr: cat.nameAr };
          if (onPressSearchCategory) onPressSearchCategory(payload);
          else onPressCategory?.(payload);
        }}
        onSubcategoryPress={(sub) => {
          closeSearch();
          // Subcategory search results should behave like selecting a service:
          // open technicians / next step (wired by parent via onPressSubcategory).
          onPressSubcategory?.(sub as unknown as ServiceSubcategory);
        }}
        onTechnicianPress={(technicianId) => {
          closeSearch();
          onPressTechnician?.(technicianId);
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  searchBarWrap: {
    marginHorizontal: 16,
    alignSelf: 'stretch',
  },
  container: { flex: 1 },
  wrapper: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: H_PADDING, paddingBottom: 24 },
  contentScroll: { flexGrow: 1 },
  iosTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: H_PADDING,
    marginBottom: 8,
  },
  iosTopBarLogo: {},
  iosTopBarIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iosTopBarIconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iosNotificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: SEARCH_RADIUS,
    borderWidth: 1,
    gap: 12,
  },
  searchShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#00A5F4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  bannerScroll: { marginHorizontal: -H_PADDING },
  bannerContent: {},
  bannerPage: { paddingHorizontal: H_PADDING, width: SCREEN_WIDTH, justifyContent: 'center' },
  bannerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,165,244,0.15)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  bannerImage: {
    width: '100%',
    height: 160,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24, height: 8, borderRadius: 4 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  quickActionItem: { alignItems: 'center', minWidth: 72 },
  quickActionCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionLabel: { fontSize: 12, maxWidth: 80, textAlign: 'center' },
  sectionCard: { borderRadius: CARD_RADIUS, padding: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  sectionCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionCardTitle: { flex: 1, fontSize: 16 },
  categoriesLoadingWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, borderRadius: CARD_RADIUS },
  categoriesLoadingText: { fontSize: 14 },
  categoriesEmptyWrap: { alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: CARD_RADIUS },
  categoriesEmptyText: { marginTop: 8, fontSize: 14 },
  categoriesRowContent: { paddingRight: H_PADDING, gap: 12, paddingVertical: 4 },
  sectionSubtitle: { fontSize: 13, marginTop: 4 },
  categoryCardWeb: {
    width: CATEGORY_CARD_SIZE,
    height: CATEGORY_CARD_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  categoryCardWebImageWrap: { width: '100%', height: CATEGORY_CARD_SIZE * 0.55, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  categoryCardImage: { width: 56, height: 56 },
  categoryCardWebContent: { height: CATEGORY_CARD_SIZE * 0.45, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  categoryCardTitleWeb: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  inlineSubcategoriesWrap: { marginTop: 24, paddingHorizontal: 0, overflow: 'hidden' },
  inlineSubcatLineWrap: { position: 'absolute', top: -20, left: '10%', width: '80%', height: 2, overflow: 'hidden', borderRadius: 1 },
  inlineSubcatLine: { flex: 1, width: '100%' },
  inlineSubcatHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  inlineSubcatTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
  inlineSubcatTitleDash: { fontWeight: '700' },
  inlineSubcatCloseBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  inlineSubcatCreateBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, justifyContent: 'center' },
  inlineSubcatCreateBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  inlineSubcatSpacer: { height: 16 },
  subcategoryLoadingWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, borderRadius: CARD_RADIUS },
  subcategoryEmptyWrap: { alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: CARD_RADIUS },
  modalLoadingText: { marginTop: 12, fontSize: 14 },
  modalEmptyText: { marginTop: 12, fontSize: 14 },
  inlineSubcatScrollContent: { paddingRight: H_PADDING, gap: 12, paddingVertical: 4 },
  subcategoryCardWeb: {
    width: SUBCATEGORY_CARD_WIDTH,
    minHeight: SUBCATEGORY_CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  subcategoryCardWebIconWrap: { width: '100%', height: SUBCATEGORY_CARD_HEIGHT * 0.4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' as const },
  subcategoryCardWebImage: { width: 48, height: 48 },
  subcategoryCardWebIconFallback: { alignItems: 'center', justifyContent: 'center' },
  subcategoryCardTitleWeb: { fontSize: 14, fontWeight: '700', paddingHorizontal: 10, paddingTop: 8 },
  subcategoryCardDescWeb: { fontSize: 11, paddingHorizontal: 10, paddingTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontWeight: '700' },
  viewAll: { fontSize: 14, fontWeight: '600' },
  hScroll: { paddingRight: H_PADDING, gap: 12 },
  homeCard: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: CARD_RADIUS,
    padding: 12,
    overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 2 } }),
  },
  homeCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  homeCardIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  homeCardTitle: { fontSize: 14, marginBottom: 4 },
  homeCardSub: { fontSize: 12, marginBottom: 4 },
  homeCardStatus: { fontSize: 11, textTransform: 'capitalize' },
  placeholderCard: {
    width: CARD_WIDTH,
    minHeight: 100,
    borderRadius: CARD_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 2 } }),
  },
  placeholderLabel: { fontSize: 13, marginTop: 8, textAlign: 'center' },
});
