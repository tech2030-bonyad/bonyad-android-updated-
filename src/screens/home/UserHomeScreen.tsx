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
import ChatbotFab from '../../components/ChatbotFab';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { storage } from '../../utils/storage';
import { getMyRequests } from '../../services/SmallTaskService';
import { getCategories, getSubcategories, getDisplayIconFullUrl, type ServiceCategory, type ServiceSubcategory } from '../../services/ServiceService';
import type { SmallTaskRequest } from '../../types/smallTasks';
import type { CategoryInfo } from '../CategorySubcategoryScreen';

export type { CategoryInfo };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 16;
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
  isRTL,
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
  isRTL: boolean;
  colors: { cardBackground: string; text: string; textSecondary: string; border: string };
  primaryColor: string;
  iconBg: string;
  iconFg: string;
  resolveServiceImage: (item: ServiceSubcategory) => { uri: string } | null;
  getSubcategoryIconName: (name: string) => keyof typeof Ionicons.glyphMap;
  fontStyle: object;
  onPress: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(isRTL ? 24 : -24)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }, index * SUBCATEGORY_STAGGER_MS);
    return () => clearTimeout(t);
  }, [index, opacity, translateX, isRTL]);
  const subName = isRTL && sub.nameAr ? sub.nameAr : sub.nameEn;
  const subDesc = isRTL && sub.descriptionAr ? sub.descriptionAr : (sub.descriptionEn || sub.description || '');
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
            <Image source={subImg} style={styles.subcategoryCardWebImage} resizeMode="contain" />
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
}

export default function UserHomeScreenContent({
  onPressSearch,
  onPressOpenServices,
  onPressMyProjects,
  onPressMyTasks,
  onPressFab,
  onPressProjectStatus,
  onPressCategory,
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
}: UserHomeScreenContentProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { fontFamily, boldFontFamily, scaledSize } = useFontFamily();
  const isRTL = i18n.language === 'ar';
  const isDark = theme === 'dark';

  const [searchText, setSearchText] = useState('');
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);
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
  const inlineSubcatTranslateX = useRef(new Animated.Value(isRTL ? 80 : -80)).current;

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
          toValue: isRTL ? 80 : -80,
          duration: INLINE_SLIDE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSelectedCategoryForModal(null);
        setSubcategoriesForModal([]);
        inlineSubcatTranslateX.setValue(isRTL ? 80 : -80);
      });
      return;
    }
    setSelectedCategoryForModal(category);
    setLoadingSubcategories(true);
    setSubcategoriesForModal([]);
    inlineSubcatOpacity.setValue(0);
    inlineSubcatTranslateX.setValue(isRTL ? 80 : -80);
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
  }, [onPressCategoryForManual, selectedCategoryForModal?.id, isRTL, inlineSubcatOpacity, inlineSubcatTranslateX]);

  const closeSubcategoriesModal = useCallback(() => {
    if (!selectedCategoryForModal) return;
    Animated.parallel([
      Animated.timing(inlineSubcatOpacity, {
        toValue: 0,
        duration: INLINE_SLIDE_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(inlineSubcatTranslateX, {
        toValue: isRTL ? 80 : -80,
        duration: INLINE_SLIDE_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedCategoryForModal(null);
      setSubcategoriesForModal([]);
      inlineSubcatTranslateX.setValue(isRTL ? 80 : -80);
    });
  }, [selectedCategoryForModal, isRTL, inlineSubcatOpacity, inlineSubcatTranslateX]);

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

  /** Same as web: getDisplayIconFullUrl (useSvg→svgUrl, else imageUrl, else iconUrl). RN Image cannot show SVG so we return null for .svg and show fallback icon. */
  const resolveServiceImage = (item: ServiceCategory | ServiceSubcategory): { uri: string } | null => {
    const url = getDisplayIconFullUrl(item);
    if (!url) return null;
    if (item.useSvg || url.toLowerCase().endsWith('.svg')) return null;
    return { uri: url };
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
    isRTL ? (task.taskTypeNameAr ?? task.taskType?.nameAr ?? task.taskTypeNameEn) : (task.taskTypeNameEn ?? task.taskType?.nameEn ?? task.taskTypeNameAr);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    onPressSearch?.(text);
  };

  const handleBannerScroll = (e: { nativeEvent: { contentOffset: { x: number }; layoutMeasurement: { width: number } } }) => {
    const x = e.nativeEvent.contentOffset.x;
    const w = e.nativeEvent.layoutMeasurement.width;
    const index = Math.round(x / w);
    if (index >= 0 && index < FEATURE_BANNERS.length) setBannerIndex(index);
  };

  const primaryColor = isDark ? colors.primary : IOS_PRIMARY;

  return (
    <View style={[styles.container, styles.wrapper, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          styles.contentScroll,
          { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 24) + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        nestedScrollEnabled={true}
        directionalLockEnabled={true}
      >
      {/* Top bar — same button order & icons as the non-home top bar: Chat | Info | Notifications */}
      <View style={[styles.iosTopBar, isRTL && styles.iosTopBarRTL]}>
        <View style={styles.iosTopBarLogo}>
          <BonyadLogo size="small" responsive={false} variant={isDark ? 'light' : 'dark'} />
        </View>
        <View style={[styles.iosTopBarIcons, isRTL && styles.iosTopBarIconsRTL]}>
          {/* Chat — same as non-home bar setActiveTab('chat') */}
          <TouchableOpacity style={styles.iosTopBarIconBtn} onPress={onPressMessages} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chatbubbles-outline" size={24} color={primaryColor} />
          </TouchableOpacity>
          {/* Info / Coach tour — same as non-home bar handleRestartCoachTour */}
          <TouchableOpacity style={styles.iosTopBarIconBtn} onPress={onPressInfo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="information-circle-outline" size={24} color={primaryColor} />
          </TouchableOpacity>
          {/* Notifications — same as non-home bar setActiveTab('notifications') */}
          <TouchableOpacity style={styles.iosTopBarIconBtn} onPress={onPressNotifications} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <View>
              <Ionicons name="notifications-outline" size={24} color={primaryColor} />
              {unreadNotificationCount > 0 && (
                <View style={[styles.iosNotificationBadge, { backgroundColor: '#FF3B30' }]} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 1. Search bar - frosted style (iOS): cornerRadius 14, shadow radius 10, y 4 */}
      <StaggeredAppearView index={0}>
        <View style={[styles.searchWrap, { backgroundColor: isDark ? colors.cardBackground : 'rgba(255,255,255,0.9)', borderColor: `${primaryColor}26` }, isDark ? undefined : styles.searchShadow]}>
          <Ionicons name="search" size={18} color={primaryColor} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }, fontStyle]}
            placeholder={t('Search services or providers')}
            placeholderTextColor={colors.textTertiary}
            value={searchText}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchText(''); onPressSearch?.(''); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </StaggeredAppearView>

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
                <View style={[styles.bannerRow, isRTL && styles.bannerRowRTL]}>
                  <View style={[styles.bannerIconCircle, { backgroundColor: isDark ? `${primaryColor}40` : `${primaryColor}20` }]}>
                    <Ionicons name={banner.icon} size={28} color={primaryColor} />
                  </View>
                  <View style={[styles.bannerTextWrap, isRTL && styles.bannerTextWrapRTL]}>
                    <Text style={[styles.bannerTitle, { color: colors.text }, boldStyle]}>{t(banner.titleKey)}</Text>
                    <Text style={[styles.bannerDesc, { color: colors.textSecondary }, fontStyle]}>{t(banner.descKey)}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ))}
        </ScrollView>
        <View style={[styles.dots, isRTL && styles.dotsRTL]}>
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
      <StaggeredAppearView index={2} style={{ marginTop: SECTION_SPACING }}>
        <View style={[styles.quickActions, isRTL && styles.quickActionsRTL]}>
          <PressableScaleView style={styles.quickActionItem} onPress={() => onPressCreateProject?.(0)}>
            <View style={[styles.quickActionCircle, { backgroundColor: `${primaryColor}18` }]}>
              <Feather name="folder-plus" size={24} color={primaryColor} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('New project')}</Text>
          </PressableScaleView>
          <PressableScaleView style={styles.quickActionItem} onPress={() => onPressCreateSmallTask?.(0)}>
            <View style={[styles.quickActionCircle, { backgroundColor: 'rgba(255,149,0,0.18)' }]}>
              <Ionicons name="flash" size={24} color="#FF9500" />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('Small task')}</Text>
          </PressableScaleView>
          <PressableScaleView style={styles.quickActionItem} onPress={() => { onPressAppointments ? onPressAppointments() : onPressProjectStatus?.('running'); }}>
            <View style={[styles.quickActionCircle, { backgroundColor: 'rgba(52,199,89,0.18)' }]}>
              <Ionicons name="calendar" size={24} color="#34C759" />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('Appointments')}</Text>
          </PressableScaleView>
          <PressableScaleView style={styles.quickActionItem} onPress={() => onPressOpenServices?.()}>
            <View style={[styles.quickActionCircle, { backgroundColor: 'rgba(175,82,222,0.18)' }]}>
              <Feather name="grid" size={24} color="#AF52DE" />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }, fontStyle]} numberOfLines={1}>{t('Services')}</Text>
          </PressableScaleView>
        </View>
      </StaggeredAppearView>

      {/* 4. Service Categories – web-style: horizontal scroll, square cards, image area + title + chevron when selected */}
      <StaggeredAppearView index={3} style={{ marginTop: SECTION_SPACING }}>
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
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
            contentContainerStyle={[styles.categoriesRowContent, isRTL && styles.hScrollRTL]}
          >
            {categories.map((cat) => {
              const name = isRTL && cat.nameAr ? cat.nameAr : cat.nameEn;
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
                      <Image source={imgSrc} style={styles.categoryCardImage} resizeMode="contain" />
                    ) : (
                      <Ionicons name={getCategoryIconName(cat.nameEn)} size={36} color={iconFg} />
                    )}
                  </View>
                  <View style={[styles.categoryCardWebContent, isRTL && styles.categoryCardWebContentRTL]}>
                    <Text style={[styles.categoryCardTitleWeb, { color: colors.text }, fontStyle]} numberOfLines={2}>{name}</Text>
                    <View style={[styles.categoryCardChevronWrap, isSelected && { backgroundColor: primaryColor }]}>
                      <Ionicons name="chevron-up" size={18} color={isSelected ? '#FFF' : primaryColor} />
                    </View>
                  </View>
                </PressableScaleView>
              );
            })}
          </ScrollView>
        )}
      </StaggeredAppearView>

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
          <View style={[styles.inlineSubcatLineWrap, isRTL && styles.inlineSubcatLineWrapRTL]}>
            <LinearGradient
              colors={[primaryColor, 'transparent']}
              start={isRTL ? { x: 1, y: 0 } : { x: 0, y: 0 }}
              end={isRTL ? { x: 0, y: 0 } : { x: 1, y: 0 }}
              style={styles.inlineSubcatLine}
            />
          </View>
          <View style={[styles.inlineSubcatHeader, isRTL && styles.inlineSubcatHeaderRTL]}>
            <Text style={[styles.inlineSubcatTitle, { color: colors.text }, boldStyle]}>
              {t('Subcategories')}
              <Text style={[styles.inlineSubcatTitleDash, { color: colors.text }]}>
                {isRTL && selectedCategoryForModal.nameAr ? ` – ${selectedCategoryForModal.nameAr}` : ` – ${selectedCategoryForModal.nameEn}`}
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
              contentContainerStyle={[styles.inlineSubcatScrollContent, isRTL && styles.hScrollRTL]}
            >
              {subcategoriesForModal.map((sub, idx) => (
                <StaggeredSubcategoryCard
                  key={sub.id}
                  index={idx}
                  sub={sub}
                  isRTL={isRTL}
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
      <StaggeredAppearView index={4} style={{ marginTop: SECTION_SPACING }}>
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, { fontSize: scaledSize(18) }, boldStyle]}>{t('My Projects')}</Text>
          <TouchableOpacity onPress={onPressMyProjects} activeOpacity={0.8}>
            <Text style={[styles.viewAll, { color: primaryColor }, fontStyle]}>{t('View All')} →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.hScroll, isRTL && styles.hScrollRTL]}>
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
                <View style={[styles.homeCardRow, isRTL && styles.homeCardRowRTL]}>
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
      </StaggeredAppearView>

      {/* 6. My Small Tasks section - horizontal strip with real cards (iOS press scale) */}
      <StaggeredAppearView index={5} style={{ marginTop: SECTION_SPACING }}>
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, { fontSize: scaledSize(18) }, boldStyle]}>{t('My Small Tasks')}</Text>
          <TouchableOpacity onPress={onPressMySmallTasks} activeOpacity={0.8}>
            <Text style={[styles.viewAll, { color: primaryColor }, fontStyle]}>{t('View All')} →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.hScroll, isRTL && styles.hScrollRTL]}>
          {loadingTasks ? (
            <View style={[styles.homeCard, { backgroundColor: colors.cardBackground, width: CARD_WIDTH, minHeight: 100, justifyContent: 'center', alignItems: 'center' }]}>
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
                <View style={[styles.homeCardRow, isRTL && styles.homeCardRowRTL]}>
                  <View style={[styles.homeCardIconWrap, { backgroundColor: 'rgba(255,149,0,0.18)' }]}>
                    <Ionicons name="flash" size={20} color="#FF9500" />
                  </View>
                  <Text style={[styles.homeCardTitle, { color: colors.text }, boldStyle]} numberOfLines={1}>
                    {getTaskTypeName(task) || `#${task.id}`}
                  </Text>
                </View>
                <Text style={[styles.homeCardSub, { color: colors.textSecondary }, fontStyle]} numberOfLines={2}>
                  {task.description?.trim() || task.address || '—'}
                </Text>
                <Text style={[styles.homeCardStatus, { color: '#FF9500' }, fontStyle]}>
                  {task.status ?? '—'}
                </Text>
              </PressableScaleView>
            ))
          )}
        </ScrollView>
      </StaggeredAppearView>

      </ScrollView>
      {/* iOS-style Chatbot FAB: fixed bottom-left, wave rings + white circle + robot */}
      {onPressChatbot && (
        <ChatbotFab onPress={onPressChatbot} primaryColor={primaryColor} primaryDark={isDark ? colors.primary : '#0078E0'} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  iosTopBarRTL: { flexDirection: 'row-reverse' },
  iosTopBarLogo: {},
  iosTopBarIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iosTopBarIconsRTL: { flexDirection: 'row-reverse' },
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
  bannerRowRTL: { flexDirection: 'row-reverse' },
  bannerIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  bannerTextWrap: { flex: 1, marginLeft: 16 },
  bannerTextWrapRTL: { marginLeft: 0, marginRight: 16 },
  bannerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  bannerDesc: { fontSize: 13 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 8 },
  dotsRTL: { flexDirection: 'row-reverse' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24, height: 8, borderRadius: 4 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  quickActionsRTL: { flexDirection: 'row-reverse' },
  quickActionItem: { alignItems: 'center', minWidth: 72 },
  quickActionCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickActionLabel: { fontSize: 12, maxWidth: 80, textAlign: 'center' },
  sectionCard: { borderRadius: CARD_RADIUS, padding: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }) },
  sectionCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionCardRowRTL: { flexDirection: 'row-reverse' },
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
    minHeight: CATEGORY_CARD_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  categoryCardWebImageWrap: { width: '100%', height: CATEGORY_CARD_SIZE * 0.4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  categoryCardImage: { width: 56, height: 56 },
  categoryCardWebContent: { flex: 1, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  categoryCardWebContentRTL: { flexDirection: 'row-reverse' },
  categoryCardTitleWeb: { flex: 1, fontSize: 14, fontWeight: '600' },
  categoryCardChevronWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  inlineSubcategoriesWrap: { marginTop: 24, paddingHorizontal: 0, overflow: 'hidden' },
  inlineSubcatLineWrap: { position: 'absolute', top: -20, left: '10%', width: '80%', height: 2, overflow: 'hidden', borderRadius: 1 },
  inlineSubcatLineWrapRTL: { left: undefined, right: '10%' },
  inlineSubcatLine: { flex: 1, width: '100%' },
  inlineSubcatHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  inlineSubcatHeaderRTL: { flexDirection: 'row-reverse' },
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
  sectionHeaderRTL: { flexDirection: 'row-reverse' },
  sectionTitle: { fontWeight: '700' },
  viewAll: { fontSize: 14, fontWeight: '600' },
  hScroll: { paddingRight: H_PADDING, gap: 12 },
  hScrollRTL: { flexDirection: 'row-reverse', paddingRight: 0, paddingLeft: H_PADDING },
  homeCard: {
    width: CARD_WIDTH,
    minHeight: 100,
    borderRadius: CARD_RADIUS,
    padding: 12,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 2 } }),
  },
  homeCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  homeCardRowRTL: { flexDirection: 'row-reverse' },
  homeCardIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  homeCardTitle: { flex: 1, fontSize: 14 },
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
