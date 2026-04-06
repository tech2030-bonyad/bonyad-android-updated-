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
import ScreenTourOverlay from '../../components/tour/ScreenTourOverlay';
import type { CategoryInfo } from '../CategorySubcategoryScreen';
import { coachMarksStorage } from '../../utils/coachMarks';

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

// Feature banners matching iOS AdvertisementComponent (5 items) – light and dark gradients
const FEATURE_BANNERS = [
  { icon: 'people' as const, titleKey: 'Find experts', descKey: 'Connect with verified technicians', colors: ['#FFFFFF', '#E3F2FD', '#BBDEFB'] as const, colorsDark: ['#1A1A2E', '#16213E', '#0F3460'] as const },
  { icon: 'hammer' as const, titleKey: 'Post project', descKey: 'Get competitive offers', colors: ['#FFFFFF', '#E8F5E9', '#C8E6C9'] as const, colorsDark: ['#1B2D1B', '#2D4A2D', '#1E3A1E'] as const },
  { icon: 'calendar' as const, titleKey: 'Book appointments', descKey: 'Schedule visits easily', colors: ['#FFFFFF', '#FFF3E0', '#FFE0B2'] as const, colorsDark: ['#2D2416', '#3D2E1A', '#4A3822'] as const },
  { icon: 'shield-checkmark' as const, titleKey: 'Verified', descKey: 'Trusted professionals', colors: ['#FFFFFF', '#F3E5F5', '#E1BEE7'] as const, colorsDark: ['#2A1B2E', '#3D2A42', '#2E1F33'] as const },
  { icon: 'sparkles' as const, titleKey: 'AI assistant', descKey: 'Smart recommendations', colors: ['#FFFFFF', '#E0F7FA', '#B2EBF2'] as const, colorsDark: ['#0D2137', '#143250', '#1A4060'] as const },
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
  onPressNotifications,
  onPressMessages,
  onPressInfo,
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

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<ServiceCategory | null>(null);
  const [subcategoriesForModal, setSubcategoriesForModal] = useState<ServiceSubcategory[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  const fontStyle = { fontFamily: fontFamily || undefined };
  const boldStyle = { fontFamily: boldFontFamily || fontFamily || undefined };

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

  useEffect(() => {
    loadProjects();
    loadSmallTasks();
  }, [loadProjects, loadSmallTasks]);

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

  // ─── Web-style tour guide ──────────────────────────────────────────────────
  const TOUR_STEPS = React.useMemo(() => [
    { id: 'topNavLogo',          order: 1,  name: 'topNavLogo' as const },
    { id: 'topNavMessages',      order: 2,  name: 'topNavMessages' as const },
    { id: 'topNavInfo',          order: 3,  name: 'topNavInfo' as const },
    { id: 'topNavNotifications', order: 4,  name: 'topNavNotifications' as const },
    { id: 'search',              order: 5,  name: 'search' as const },
    { id: 'newProject',          order: 6,  name: 'newProject' as const },
    { id: 'smallTask',           order: 7,  name: 'smallTask' as const },
    { id: 'appointments',        order: 8,  name: 'appointments' as const },
    { id: 'services',            order: 9,  name: 'services' as const },
    { id: 'serviceCategories',   order: 10, name: 'serviceCategories' as const },
    { id: 'projectsSection',     order: 11, name: 'projectsSection' as const },
    { id: 'smallTasksSection',   order: 12, name: 'smallTasksSection' as const },
    { id: 'chatbot',             order: 13, name: 'chatbot' as const },
    { id: 'bottomNavHome',       order: 14, name: 'bottomNavHome' as const },
    { id: 'bottomNavProjects',   order: 15, name: 'bottomNavProjects' as const },
    { id: 'bottomNavNew',        order: 16, name: 'bottomNavNew' as const },
    { id: 'bottomNavChat',       order: 17, name: 'bottomNavChat' as const },
    { id: 'bottomNavProfile',    order: 18, name: 'bottomNavProfile' as const },
  ], []);

  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [stepRect, setStepRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const stepViewRefs = useRef<{ [k: string]: View | null }>({});

  const measureStep = useCallback((stepName: string) => {
    const ref = stepViewRefs.current[stepName];
    if (!ref) { setStepRect(null); return; }
    ref.measure((_fx, _fy, width, height, pageX, pageY) => {
      const PAD = 8;
      setStepRect({ x: pageX - PAD, y: pageY - PAD, w: width + PAD * 2, h: height + PAD * 2 });
    });
  }, []);

  const scrollAndMeasure = useCallback((stepName: string) => {
    const sv = mainListScrollRef.current;
    const ref = stepViewRefs.current[stepName];

    // Bottom nav tabs: computed from screen dimensions (GlassTabBar is outside UserHomeScreenContent)
    if (stepName.startsWith('bottomNav')) {
      sv?.scrollToEnd({ animated: false });
      setTimeout(() => {
        const { height: SH, width: SW } = Dimensions.get('window');
        // GlassTabBar: outer paddingTop=6, row paddingVertical=8, tabSlot height=52, paddingBottom=max(inset,10)
        const outerH = 6 + 8 * 2 + 52 + Math.max(insets.bottom, 10);
        const pillY = SH - outerH + 6; // pill top on screen
        const rowY = pillY + 8;        // row inner top
        const tabH = 52;
        const PAD = 6;
        // Slot widths mirror GlassTabBar indicator calc: slotW = (barWidth - 8) / 5
        const barW = SW - 32; // outer paddingHorizontal=16 each side
        const slotW = (barW - 8) / 5; // row paddingHorizontal=4 each side
        const rowX = 16 + 4; // outer padding + row padding
        const tabIndex: Record<string, number> = {
          bottomNavHome: 0,
          bottomNavProjects: 1,
          bottomNavNew: 2,
          bottomNavChat: 3,
          bottomNavProfile: 4,
        };
        const idx = tabIndex[stepName] ?? 0;
        const slotX = rowX + idx * slotW;
        setStepRect({ x: slotX - PAD, y: rowY - PAD, w: slotW + PAD * 2, h: tabH + PAD * 2 });
      }, 250);
      return;
    }

    if (!ref) { setStepRect(null); return; }

    // Top bar icons and search: scroll to top, then measure directly
    if (stepName.startsWith('topNav') || stepName === 'search') {
      sv?.scrollTo({ y: 0, animated: false });
      setTimeout(() => measureStep(stepName), 150);
      return;
    }

    // chatbot FAB: scroll to end first, then measure
    if (stepName === 'chatbot') {
      sv?.scrollToEnd({ animated: false });
      setTimeout(() => measureStep(stepName), 250);
      return;
    }

    // Content inside ScrollView: use measureLayout for accurate scroll-to
    if (sv) {
      const scrollContent = (sv as ScrollView & { getInnerViewRef?: () => unknown }).getInnerViewRef?.();
      if (scrollContent && typeof (ref as any).measureLayout === 'function') {
        (ref as any).measureLayout(
          scrollContent,
          (_x: number, y: number) => {
            sv.scrollTo({ y: Math.max(0, y - 100), animated: false });
            setTimeout(() => measureStep(stepName), 200);
          },
          () => { measureStep(stepName); },
        );
        return;
      }
    }
    measureStep(stepName);
  }, [measureStep, insets.bottom]);

  useEffect(() => {
    if (!tourActive) { setStepRect(null); return; }
    const name = TOUR_STEPS[tourStep]?.name;
    if (!name) return;
    requestAnimationFrame(() => requestAnimationFrame(() => scrollAndMeasure(name)));
  }, [tourActive, tourStep, TOUR_STEPS, scrollAndMeasure]);

  const handleTourEnd = useCallback(async () => {
    setTourActive(false);
    setTourStep(0);
    setStepRect(null);
    await coachMarksStorage.markTutorialComplete('userHome');
  }, []);

  // Expose start function to parent
  useEffect(() => {
    onExposeControl?.({
      startTour: () => {
        setTourStep(0);
        setTourActive(true);
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (index >= 0 && index < FEATURE_BANNERS.length) setBannerIndex(index);
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
          <View ref={(el) => { stepViewRefs.current['topNavLogo'] = el; }} collapsable={false} style={styles.iosTopBarLogo}>
            <BonyadLogo size="small" responsive={false} variant={isDark ? 'light' : 'dark'} />
          </View>
          <View style={styles.iosTopBarIcons}>
            <View
              ref={(el) => { stepViewRefs.current['topNavMessages'] = el; }}
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
              ref={(el) => { stepViewRefs.current['topNavInfo'] = el; }}
              collapsable={false}
              style={styles.iosTopBarIconBtn}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                onPress={onPressInfo}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="information-circle-outline" size={24} color={primaryColor} />
                </View>
              </TouchableOpacity>
            </View>
            <View
              ref={(el) => { stepViewRefs.current['topNavNotifications'] = el; }}
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
          ref={(el) => { stepViewRefs.current['search'] = el; }}
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

      {/* 2. Advertisement / feature banners carousel (iOS height 140, capsule dots) */}
      <StaggeredAppearView index={1} style={{ marginTop: SECTION_SPACING }}>
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleBannerScroll}
          style={[styles.bannerScroll, { height: 160 }]}
          contentContainerStyle={styles.bannerContent}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
        >
          {FEATURE_BANNERS.map((banner, i) => (
            <View key={i} style={[styles.bannerPage, { width: SCREEN_WIDTH }]}>
              <LinearGradient colors={isDark ? [...banner.colorsDark] : [...banner.colors]} style={styles.bannerCard}>
                <View style={styles.bannerRow}>
                  <View style={[styles.bannerIconCircle, { backgroundColor: isDark ? `${primaryColor}40` : `${primaryColor}20` }]}>
                    <Ionicons name={banner.icon} size={28} color={primaryColor} />
                  </View>
                  <View style={styles.bannerTextWrap}>
                    <Text style={[styles.bannerTitle, { color: colors.text }, boldStyle]}>{t(banner.titleKey)}</Text>
                    <Text style={[styles.bannerDesc, { color: colors.textSecondary }, fontStyle]}>{t(banner.descKey)}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {FEATURE_BANNERS.map((_, i) => (
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
      <View style={{ marginTop: SECTION_SPACING }}>
        <View style={styles.quickActions}>
          <View ref={(el) => { stepViewRefs.current['newProject'] = el; }} collapsable={false}>
            <PressableScaleView style={styles.quickActionItem} onPress={() => onPressCreateProject?.(0)}>
              <View style={[styles.quickActionCircle, { backgroundColor: `${primaryColor}18` }]}>
                <Feather name="folder-plus" size={24} color={primaryColor} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('New project')}</Text>
            </PressableScaleView>
          </View>
          <View ref={(el) => { stepViewRefs.current['smallTask'] = el; }} collapsable={false}>
            <PressableScaleView style={styles.quickActionItem} onPress={() => onPressCreateSmallTask?.(0)}>
              <View style={[styles.quickActionCircle, { backgroundColor: 'rgba(255,149,0,0.18)' }]}>
                <Ionicons name="flash" size={24} color="#FF9500" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('Small task')}</Text>
            </PressableScaleView>
          </View>
          <View ref={(el) => { stepViewRefs.current['appointments'] = el; }} collapsable={false}>
            <PressableScaleView style={styles.quickActionItem} onPress={() => { onPressAppointments ? onPressAppointments() : onPressProjectStatus?.('running'); }}>
              <View style={[styles.quickActionCircle, { backgroundColor: 'rgba(52,199,89,0.18)' }]}>
                <Ionicons name="calendar" size={24} color="#34C759" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('Appointments')}</Text>
            </PressableScaleView>
          </View>
          <View ref={(el) => { stepViewRefs.current['services'] = el; }} collapsable={false}>
            <PressableScaleView style={styles.quickActionItem} onPress={() => onPressOpenServices?.()}>
              <View style={[styles.quickActionCircle, { backgroundColor: 'rgba(175,82,222,0.18)' }]}>
                <Feather name="grid" size={24} color="#AF52DE" />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('Services')}</Text>
            </PressableScaleView>
          </View>
        </View>
      </View>

      {/* 4. Service Categories – web-style: horizontal scroll, square cards, image area + title + chevron when selected */}
      <View
        ref={(el) => { stepViewRefs.current['serviceCategories'] = el; }}
        collapsable={false}
        style={{ marginTop: SECTION_SPACING }}
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
      <View
        ref={(el) => { stepViewRefs.current['projectsSection'] = el; }}
        collapsable={false}
        style={{ marginTop: SECTION_SPACING }}
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

      {/* 6. My Small Tasks section - horizontal strip with real cards (iOS press scale) */}
      <View
        ref={(el) => { stepViewRefs.current['smallTasksSection'] = el; }}
        collapsable={false}
        style={{ marginTop: SECTION_SPACING }}
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

      </ScrollView>
      {/* iOS-style Chatbot FAB: fixed bottom-left, wave rings + white circle + robot */}
      {onPressChatbot && (
        <View ref={(el) => { stepViewRefs.current['chatbot'] = el; }} collapsable={false} style={{ position: 'absolute', bottom: chatbotFabBottomOffset(insets.bottom), left: I18nManager.isRTL ? undefined : 20, right: I18nManager.isRTL ? 20 : undefined, width: 67, height: 67 }} pointerEvents="box-none">
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

      <ScreenTourOverlay
        visible={tourActive}
        tourStep={tourStep}
        stepRect={stepRect}
        totalSteps={TOUR_STEPS.length}
        stepOrder={TOUR_STEPS[tourStep]?.order ?? 1}
        stepText={TOUR_STEPS[tourStep] ? t(`tutorial.home.user.${TOUR_STEPS[tourStep].name}`) : ''}
        isFirst={tourStep === 0}
        isLast={tourStep === TOUR_STEPS.length - 1}
        primaryColor={primaryColor}
        textColor={colors.text}
        secondaryTextColor={colors.textSecondary}
        bgColor={colors.cardBackground}
        isRTL={isArabic || I18nManager.isRTL}
        fontFamily={fontFamily}
        boldFontFamily={boldFontFamily}
        onNext={() => setTourStep((s) => s + 1)}
        onPrev={() => setTourStep((s) => s - 1)}
        onSkip={handleTourEnd}
        onFinish={handleTourEnd}
        t={t}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchBarWrap: {
    marginHorizontal: 16,
    alignSelf: 'stretch',
  },
  tourBackdrop: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  tourHighlight: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
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
  bannerPage: { paddingHorizontal: H_PADDING, width: SCREEN_WIDTH, height: 160 },
  bannerCard: {
    borderRadius: 16,
    padding: 20,
    minHeight: 140,
    justifyContent: 'center',
  },
  bannerRow: { flexDirection: 'row', alignItems: 'center' },
  bannerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 24,
  },
  bannerTextWrap: { flex: 1 },
  bannerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  bannerDesc: { fontSize: 13 },
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
