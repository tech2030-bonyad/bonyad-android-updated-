import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useFontFamily } from '../../context/FontContext';
import { AnimatedStatTicker } from '../../components/AnimatedStatTicker';
import { LinearGradient } from 'expo-linear-gradient';
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import {
  getCategories,
  getSubcategories,
  ServiceCategory,
  ServiceSubcategory,
} from '../../services/ServiceService';
import { getServerBaseUrl, buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { storage } from '../../utils/storage';
import { getSmallTaskTypes, getMyRequests, SmallTaskRequestApi } from '../../services/SmallTaskService';


const WalkableView = walkthroughable((props: any) => <View {...props} collapsable={false} />);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PAD = 16;
const BANNER_W = SCREEN_WIDTH - H_PAD * 2;
const CARD_HALF = (SCREEN_WIDTH - H_PAD * 2 - 12) / 2;
const CARD_SCROLL_WIDTH = Math.min(280, SCREEN_WIDTH * 0.78);
const CARD_GAP = 12;

// ─── Icon helpers ──────────────────────────────────────────────────────────────
type MCIcon = keyof typeof MaterialCommunityIcons.glyphMap;

function getServiceIcon(nameEn: string): MCIcon {
  const n = nameEn.toLowerCase();
  if (n.includes('construct') || n.includes('build')) return 'hammer';
  if (n.includes('design')) return 'pencil-ruler';
  if (n.includes('consult')) return 'account-tie';
  if (n.includes('electric')) return 'lightning-bolt';
  if (n.includes('plumb') || n.includes('water')) return 'water-pump';
  if (n.includes('paint')) return 'format-paint';
  if (n.includes('clean')) return 'broom';
  if (n.includes('garden') || n.includes('landscape')) return 'flower';
  if (n.includes('security')) return 'shield-check';
  if (n.includes('move') || n.includes('transport')) return 'truck';
  if (n.includes('repair') || n.includes('fix')) return 'tools';
  if (n.includes('roof')) return 'home-roof';
  if (n.includes('floor')) return 'floor-plan';
  if (n.includes('air') || n.includes('hvac') || n.includes('ac')) return 'air-conditioner';
  if (n.includes('finance')) return 'cash-multiple';
  if (n.includes('supervis')) return 'account-supervisor';
  return 'briefcase-outline';
}

function getTaskIcon(nameEn = '', nameAr = ''): MCIcon {
  const n = (nameEn + ' ' + nameAr).toLowerCase();
  if (n.includes('ac') || n.includes('air') || n.includes('مكيف')) return 'air-conditioner';
  if (n.includes('drill') || n.includes('حفر')) return 'hammer-wrench';
  if (n.includes('plumb') || n.includes('سباك')) return 'water-pump';
  if (n.includes('electric') || n.includes('كهرب')) return 'lightning-bolt';
  if (n.includes('paint') || n.includes('دهان')) return 'format-paint';
  if (n.includes('clean') || n.includes('تنظيف')) return 'broom';
  if (n.includes('design') || n.includes('3d') || n.includes('تصميم')) return 'pencil-ruler';
  if (n.includes('construct') || n.includes('build') || n.includes('بناء')) return 'hammer';
  return 'hammer-wrench';
}

function resolveSvgUrl(item: { svgUrl?: string | null }): string | null {
  if (!item.svgUrl) return null;
  return item.svgUrl.startsWith('http') ? item.svgUrl : `${getServerBaseUrl()}${item.svgUrl}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type ProjectStatus = 'pending' | 'running' | 'completed';

interface Project {
  id: number;
  description: string;
  status: string;
  budget: number;
  budgetUnspecified?: boolean;
  address?: string;
  createdAt: string;
  serviceName?: string;
  serviceNameAr?: string;
  userName?: string;
}

interface TaskType {
  id: number;
  nameEn: string;
  nameAr?: string;
  svgUrl?: string | null;
  imageUrl?: string | null;
  useSvg?: boolean;
}

export interface CategoryInfo {
  id: number;
  nameEn: string;
  nameAr?: string;
}

export interface UserHomeScreenProps {
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
  onPressCreateProject?: (serviceId?: number) => void;
  onPressCreateSmallTask?: (taskTypeId?: number) => void;
  onPressMySmallTasks?: () => void;
}

// ─── Banner slides ─────────────────────────────────────────────────────────────
const BANNERS = [
  {
    key: 'technicians',
    titleKey: 'Find Expert Technicians',
    subtitleKey: 'Browse verified professionals for all your construction needs',
    gradient: ['#EFF6FF', '#DBEAFE', '#BFDBFE'] as const,
    iconName: 'account-group' as MCIcon,
    iconGrad: ['#2563EB', '#3B82F6'] as const,
    titleColor: '#1E3A8A',
    subtitleColor: '#1D4ED8',
  },
  {
    key: 'project',
    titleKey: 'Post your project',
    subtitleKey: 'Get competitive offers from qualified technicians',
    gradient: ['#F0FDF4', '#DCFCE7', '#BBF7D0'] as const,
    iconName: 'briefcase' as MCIcon,
    iconGrad: ['#16A34A', '#22C55E'] as const,
    titleColor: '#166534',
    subtitleColor: '#15803D',
  },
  {
    key: 'smalltask',
    titleKey: 'Quick Services',
    subtitleKey: 'Browse small tasks by type',
    gradient: ['#FFFBEB', '#FEF3C7', '#FDE68A'] as const,
    iconName: 'lightning-bolt' as MCIcon,
    iconGrad: ['#D97706', '#F59E0B'] as const,
    titleColor: '#92400E',
    subtitleColor: '#B45309',
  },
];

// ──────────────────────────────────────────────────────────────────────────────
const UserHomeScreen: React.FC<UserHomeScreenProps> = ({
  userName,
  onPressOpenServices,
  onPressMyProjects,
  onPressProject,
  onPressMyTasks,
  onPressFab,
  onPressProjectStatus,
  onPressCategory,
  onPressChatbot,
  onPressCreateProject,
  onPressCreateSmallTask,
}) => {
  const { t, i18n } = useTranslation();
  const { colors: themeColors, theme } = useTheme();
  const { fontFamily, boldFontFamily } = useFontFamily();
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';

  const fs = { fontFamily: fontFamily || undefined };
  const fsB = { fontFamily: boldFontFamily || fontFamily || undefined };

  // ─── Colours ───────────────────────────────────────────────────────────────
  const dc = {
    primary: themeColors.primary,
    primaryDark: themeColors.primaryDark,
    purple: isDarkMode ? '#a78bfa' : '#7c3aed',
    green: isDarkMode ? '#34d399' : '#16a34a',
    amber: isDarkMode ? '#fbbf24' : '#f59e0b',
    gray100: isDarkMode ? '#1e293b' : '#f1f5f9',
    gray400: isDarkMode ? '#94a3b8' : '#94a3b8',
    gray500: isDarkMode ? '#64748b' : '#64748b',
    background: themeColors.background,
    card: themeColors.cardBackground,
    text: themeColors.text,
    textSec: themeColors.textSecondary,
    border: (themeColors as any).border || '#e5e7eb',
    white: themeColors.white ?? '#FFFFFF',
  };

  // ─── State ─────────────────────────────────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [subcatsMap, setSubcatsMap] = useState<Record<number, ServiceSubcategory[]>>({});
  const [loadingSubcat, setLoadingSubcat] = useState<number | null>(null);
  const [selectedCat, setSelectedCat] = useState<ServiceCategory | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current;

  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projLoading, setProjLoading] = useState(true);
  const [myTasks, setMyTasks] = useState<SmallTaskRequestApi[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const [activeBanner, setActiveBanner] = useState(0);
  const bannerRef = useRef<ScrollView>(null);
  const bannerIdxRef = useRef(0);

  // ─── Auto-scroll banner ────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (bannerIdxRef.current + 1) % BANNERS.length;
      bannerIdxRef.current = next;
      bannerRef.current?.scrollTo({ x: next * BANNER_W, animated: true });
      setActiveBanner(next);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // ─── Fetch categories ──────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    getCategories()
      .then(list => { if (alive) setCategories(list); })
      .catch(() => {})
      .finally(() => { if (alive) setCatsLoading(false); });
    return () => { alive = false; };
  }, []);

  // ─── Fetch task types ──────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    getSmallTaskTypes()
      .then(types => { if (alive) setTaskTypes(types as TaskType[]); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // ─── Fetch user projects ───────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await storage.getAuthToken();
        if (!token) { if (alive) { setProjects([]); setProjLoading(false); } return; }
        const res = await fetch(buildApiUrl(API_ENDPOINTS.PROJECTS.MY_PROJECTS), {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const raw = await res.json();
          const arr = Array.isArray(raw) ? raw : (raw?.projects ?? raw?.data ?? []);
          if (alive) setProjects(arr.slice(0, 6));
        } else if (alive) { setProjects([]); }
      } catch { if (alive) setProjects([]); }
      finally { if (alive) setProjLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  // ─── Fetch user's small task requests ─────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getMyRequests();
        if (alive) setMyTasks(Array.isArray(list) ? list.slice(0, 6) : []);
      } catch { if (alive) setMyTasks([]); }
      finally { if (alive) setTasksLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  // ─── Fetch subcategories (cached) ─────────────────────────────────────────
  const fetchSubcats = useCallback(async (catId: number) => {
    if (subcatsMap[catId] !== undefined) return;
    setLoadingSubcat(catId);
    try {
      const subs = await getSubcategories(catId);
      setSubcatsMap(prev => ({ ...prev, [catId]: subs }));
    } catch {
      setSubcatsMap(prev => ({ ...prev, [catId]: [] }));
    } finally {
      setLoadingSubcat(null);
    }
  }, [subcatsMap]);

  // ─── Open / close subcategory modal ───────────────────────────────────────
  const openCatModal = useCallback((cat: ServiceCategory) => {
    setSelectedCat(cat);
    setModalVisible(true);
    modalAnim.setValue(0);
    Animated.spring(modalAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    fetchSubcats(cat.id);
  }, [fetchSubcats, modalAnim]);

  const closeCatModal = useCallback(() => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedCat(null);
    });
  }, [modalAnim]);

  // ─── Search ────────────────────────────────────────────────────────────────
  const searchTimer = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) { setShowSearch(false); setSearchResults([]); return; }
    searchTimer.current = setTimeout(() => {
      setSearchLoading(true);
      setShowSearch(true);
      const q = text.toLowerCase();
      const results = [
        ...categories
          .filter(c => c.nameEn?.toLowerCase().includes(q) || c.nameAr?.toLowerCase().includes(q))
          .map(c => ({ ...c, sType: 'service' })),
        ...taskTypes
          .filter(tt => tt.nameEn?.toLowerCase().includes(q) || tt.nameAr?.toLowerCase().includes(q))
          .map(tt => ({ ...tt, sType: 'task' })),
      ];
      setSearchResults(results);
      setSearchLoading(false);
    }, 400);
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const statusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return { bg: '#FFFBEB', tc: '#D97706', label: t('Pending') };
      case 'bid_received': return { bg: '#F5F3FF', tc: '#7C3AED', label: t('Bid Received') };
      case 'running':
      case 'in_progress': return { bg: '#EFF6FF', tc: '#2563EB', label: t('In Progress') };
      case 'approved': return { bg: '#F0FDF4', tc: '#16A34A', label: t('Approved') };
      case 'completed': return { bg: '#F0FDF4', tc: '#16A34A', label: t('Completed') };
      case 'cancelled': return { bg: '#FEF2F2', tc: '#EF4444', label: t('Cancelled') };
      default: return { bg: dc.gray100, tc: dc.gray500, label: status?.replace(/_/g, ' ') || t('Unknown') };
    }
  };

  const fmtDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const name = (en?: string, ar?: string) => isRTL && ar ? ar : (en ?? '');

  // Project count stats for ticker
  const pCounts = {
    pending: projects.filter(p => ['pending', 'bid_received'].includes(p.status?.toLowerCase())).length,
    running: projects.filter(p => ['running', 'in_progress', 'approved'].includes(p.status?.toLowerCase())).length,
    completed: projects.filter(p => p.status?.toLowerCase() === 'completed').length,
  };

  // Quick Build items: first 6 task types + first 6 categories
  const quickItems: Array<(TaskType & { itype: 'task' }) | (ServiceCategory & { itype: 'cat' })> = [
    ...taskTypes.slice(0, 6).map(tt => ({ ...tt, itype: 'task' as const })),
    ...categories.slice(0, 6).map(c => ({ ...c, itype: 'cat' as const })),
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: dc.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} nestedScrollEnabled>

        {/* ════ HERO: search + stats ════ */}
        <LinearGradient
          colors={isDarkMode ? [dc.primary, '#1a365d'] : ['#ffffff', '#3b82f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          {/* Stat ticker */}
          <View style={{ marginBottom: 14 }}>
            <AnimatedStatTicker stats={[
              { label: t('Welcome back'), value: userName || t('User'), icon: 'account', color: '#fff', bgColor: 'rgba(255,255,255,0.2)' },
              { label: t('Pending'), value: String(pCounts.pending), icon: 'clock-outline', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.2)' },
              { label: t('Running'), value: String(pCounts.running), icon: 'hammer-wrench', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.2)' },
              { label: t('Completed'), value: String(pCounts.completed), icon: 'check-circle-outline', color: '#34d399', bgColor: 'rgba(52,211,153,0.2)' },
            ]} />
          </View>

          {/* Search bar */}
          <View style={s.searchWrap}>
            <View style={[s.searchBar, isRTL && s.rowRev]}>
              <Feather name="search" size={18} color={dc.gray400} />
              <TextInput
                style={[s.searchInput, fs, { color: dc.text }, isRTL && { textAlign: 'right' }]}
                placeholder={t('Search services, tasks, providers...')}
                placeholderTextColor={dc.gray400}
                value={searchText}
                onChangeText={handleSearchChange}
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchText(''); setShowSearch(false); }}>
                  <Ionicons name="close-circle" size={18} color={dc.gray400} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search dropdown */}
            {showSearch && (
              <View style={[s.searchDrop, { backgroundColor: dc.card }]}>
                {searchLoading ? (
                  <ActivityIndicator size="small" color={dc.primary} style={{ padding: 16 }} />
                ) : searchResults.length === 0 ? (
                  <Text style={[s.searchEmpty, fs, { color: dc.textSec }]}>{t('No results found')}</Text>
                ) : searchResults.slice(0, 6).map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[s.searchRow, { borderBottomColor: dc.border }, isRTL && s.rowRev]}
                    onPress={() => {
                      setShowSearch(false); setSearchText('');
                      if (item.sType === 'service') onPressCategory?.({ id: item.id, nameEn: item.nameEn, nameAr: item.nameAr });
                      else onPressCreateSmallTask?.(item.id);
                    }}
                  >
                    <View style={[s.searchIcon, { backgroundColor: dc.primary + '15' }]}>
                      <Ionicons name={item.sType === 'task' ? 'hammer-outline' : 'briefcase-outline'} size={16} color={dc.primary} />
                    </View>
                    <Text style={[s.searchRowText, fs, { color: dc.text }]} numberOfLines={1}>
                      {name(item.nameEn, item.nameAr)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </LinearGradient>

        {/* ════ BANNER CAROUSEL ════ */}
        <View style={[s.section, { paddingHorizontal: H_PAD }]}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            snapToInterval={BANNER_W}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
              bannerIdxRef.current = idx;
              setActiveBanner(idx);
            }}
          >
            {BANNERS.map(b => (
              <TouchableOpacity key={b.key} activeOpacity={0.95} style={{ width: BANNER_W }}>
                <LinearGradient colors={b.gradient} style={s.bannerCard}>
                  <View style={[s.bannerRow, isRTL && s.rowRev]}>
                    <LinearGradient colors={b.iconGrad} style={s.bannerIcon}>
                      <MaterialCommunityIcons name={b.iconName} size={28} color="#fff" />
                    </LinearGradient>
                    <View style={[s.bannerTexts, isRTL && { alignItems: 'flex-end' }]}>
                      <Text style={[s.bannerTitle, fsB, { color: b.titleColor }]}>{t(b.titleKey)}</Text>
                      <Text style={[s.bannerSub, fs, { color: b.subtitleColor }]}>{t(b.subtitleKey)}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Pagination dots */}
          <View style={s.dots}>
            {BANNERS.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => {
                bannerIdxRef.current = i;
                setActiveBanner(i);
                bannerRef.current?.scrollTo({ x: i * BANNER_W, animated: true });
              }}>
                <View style={[
                  s.dot,
                  i === activeBanner
                    ? [s.dotActive, { backgroundColor: dc.primary }]
                    : s.dotInactive,
                ]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ════ QUICK CREATE ════ */}
        <View style={s.section}>
          <View style={[s.secHead, isRTL && s.rowRev]}>
            <View style={[s.secTitleRow, isRTL && s.rowRev]}>
              <View style={[s.secIcon, { backgroundColor: dc.primary + '18' }]}>
                <MaterialCommunityIcons name="lightning-bolt-outline" size={20} color={dc.primary} />
              </View>
              <Text style={[s.secHeading, fsB, { color: dc.text }]}>{t('Quick Create')}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[s.qScroll, isRTL && { flexDirection: 'row-reverse' }]}
          >
            {quickItems.map(item => {
              const isTask = item.itype === 'task';
              const label = name(item.nameEn, item.nameAr);
              const iconName = isTask ? getTaskIcon(item.nameEn, item.nameAr) : getServiceIcon(item.nameEn);
              const svgUrl = resolveSvgUrl(item);
              const iconColor = isTask ? dc.amber : dc.primary;

              return (
                <TouchableOpacity
                  key={`${isTask ? 't' : 'c'}-${item.id}`}
                  style={s.qItem}
                  activeOpacity={0.8}
                  onPress={() => isTask ? onPressCreateSmallTask?.(item.id) : onPressCreateProject?.(item.id)}
                >
                  <View style={[s.qCircle, { backgroundColor: dc.white }]}>
                    {svgUrl
                      ? <SvgUri width={28} height={28} uri={svgUrl} fill={iconColor} />
                      : <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
                    }
                  </View>
                  <Text style={[s.qLabel, fs, { color: dc.text }]} numberOfLines={2}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ════ SERVICE CATEGORIES (horizontal scroll → modal) ════ */}
        <View style={s.section}>
          <View style={[s.secHead, isRTL && s.rowRev]}>
            <View style={[s.secTitleRow, isRTL && s.rowRev]}>
              <View style={[s.secIcon, { backgroundColor: dc.purple + '18' }]}>
                <MaterialCommunityIcons name="view-grid-outline" size={20} color={dc.purple} />
              </View>
              <Text style={[s.secHeading, fsB, { color: dc.text }]}>{t('Service Categories')}</Text>
            </View>
            <TouchableOpacity
              style={[s.viewAll, { backgroundColor: dc.purple + '12' }]}
              onPress={onPressOpenServices}
              activeOpacity={0.8}
            >
              <Text style={[s.viewAllTxt, fs, { color: dc.purple }]}>
                {isRTL ? `❯ ${t('View All')}` : `${t('View All')} ❯`}
              </Text>
            </TouchableOpacity>
          </View>

          {catsLoading ? (
            <ActivityIndicator size="small" color={dc.primary} style={{ marginTop: 16, alignSelf: 'center' }} />
          ) : (
            <CopilotStep key="availableServices" text={t('coachMark.availableServices')} order={2} name="availableServices">
              <WalkableView>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[s.qScroll, isRTL && { flexDirection: 'row-reverse' }]}
                >
                  {categories.map(cat => {
                    const svgUrl = resolveSvgUrl(cat);
                    const iconName = getServiceIcon(cat.nameEn);
                    const label = name(cat.nameEn, cat.nameAr);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={s.qItem}
                        onPress={() => openCatModal(cat)}
                        activeOpacity={0.8}
                      >
                        <View style={[s.qCircle, { backgroundColor: dc.white }]}>
                          {svgUrl
                            ? <SvgUri width={28} height={28} uri={svgUrl} fill={dc.purple} />
                            : <MaterialCommunityIcons name={iconName} size={24} color={dc.purple} />
                          }
                        </View>
                        <Text style={[s.qLabel, fs, { color: dc.text }]} numberOfLines={2}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </WalkableView>
            </CopilotStep>
          )}
        </View>

        {/* ════ QUICK SERVICES (small task types) ════ */}
        <View style={s.section}>
          <View style={[s.secHead, isRTL && s.rowRev]}>
            <View style={[s.secTitleRow, isRTL && s.rowRev]}>
              <View style={[s.secIcon, { backgroundColor: dc.amber + '22' }]}>
                <Ionicons name="flash-outline" size={20} color={dc.amber} />
              </View>
              <Text style={[s.secHeading, fsB, { color: dc.text }]}>{t('Quick Services')}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[s.qScroll, isRTL && { flexDirection: 'row-reverse' }]}
          >
            {/* Chatbot entry point */}
            <TouchableOpacity style={s.qItem} onPress={onPressChatbot} activeOpacity={0.8}>
              <View style={[s.qCircle, { backgroundColor: dc.white }]}>
                <MaterialCommunityIcons name="robot" size={26} color={dc.primary} />
              </View>
              <Text style={[s.qLabel, fs, { color: dc.text }]}>AI</Text>
            </TouchableOpacity>

            {taskTypes.map(tt => {
              const label = name(tt.nameEn, tt.nameAr);
              const iconName = getTaskIcon(tt.nameEn, tt.nameAr);
              const svgUrl = resolveSvgUrl(tt);
              return (
                <TouchableOpacity
                  key={tt.id}
                  style={s.qItem}
                  onPress={() => onPressCreateSmallTask?.(tt.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.qCircle, { backgroundColor: dc.white }]}>
                    {svgUrl
                      ? <SvgUri width={26} height={26} uri={svgUrl} fill={dc.amber} />
                      : <MaterialCommunityIcons name={iconName} size={24} color={dc.amber} />
                    }
                  </View>
                  <Text style={[s.qLabel, fs, { color: dc.text }]} numberOfLines={2}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ════ MY PROJECTS ════ */}
        <View style={s.section}>
          <View style={[s.secHead, isRTL && s.rowRev]}>
            <View style={[s.secTitleRow, isRTL && s.rowRev]}>
              <View style={[s.secIcon, { backgroundColor: dc.purple + '18' }]}>
                <Feather name="folder" size={20} color={dc.purple} />
              </View>
              <Text style={[s.secHeading, fsB, { color: dc.text }]}>{t('My Projects')}</Text>
            </View>
            <TouchableOpacity
              style={[s.viewAll, { backgroundColor: dc.purple + '12' }]}
              onPress={onPressMyProjects}
              activeOpacity={0.8}
            >
              <Text style={[s.viewAllTxt, fs, { color: dc.purple }]}>
                {isRTL ? `❯ ${t('View All')}` : `${t('View All')} ❯`}
              </Text>
            </TouchableOpacity>
          </View>

          {projLoading ? (
            <ActivityIndicator size="small" color={dc.purple} style={{ marginTop: 16, alignSelf: 'center' }} />
          ) : projects.length === 0 ? (
            <TouchableOpacity
              style={[s.emptyCard, { backgroundColor: dc.card, marginHorizontal: H_PAD }]}
              onPress={onPressFab}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={38} color={dc.purple} />
              <Text style={[s.emptyTitle, fsB, { color: dc.text }]}>{t('Start Your First Project')}</Text>
              <Text style={[s.emptyBody, fs, { color: dc.textSec }]}>
                {t('Create a new project and get connected with professional service providers')}
              </Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[s.scrollCardsContent, isRTL && { flexDirection: 'row-reverse' }]}
            >
              {projects.map(proj => {
                const ss = statusStyle(proj.status);
                return (
                  <TouchableOpacity
                    key={proj.id}
                    style={[s.scrollCard, { backgroundColor: dc.card }]}
                    onPress={() => onPressProject?.(proj.id)}
                    activeOpacity={0.9}
                  >
                    <LinearGradient colors={['#FFF7ED', '#FFEDD5']} style={s.gradWrap}>
                      {/* Top row */}
                      <View style={[s.cardTop, isRTL && s.rowRev]}>
                        <Text style={[s.cardNum, fs, { color: dc.gray400 }]}>#{proj.id}</Text>
                        <View style={[s.pill, { backgroundColor: ss.bg }]}>
                          <View style={[s.pillDot, { backgroundColor: ss.tc }]} />
                          <Text style={[s.pillTxt, fs, { color: ss.tc }]}>{ss.label}</Text>
                        </View>
                      </View>
                      {/* Title */}
                      <Text style={[s.cardTitle, fsB, { color: dc.text }]} numberOfLines={2}>
                        {proj.description || t('No description')}
                      </Text>
                      {/* Budget */}
                      <View style={[s.cardBudget, isRTL && s.rowRev]}>
                        <View style={s.riyalCircle}>
                          <Text style={s.riyalTxt}>﷼</Text>
                        </View>
                        <Text style={[s.budgetTxt, fsB]}>
                          {proj.budgetUnspecified || !proj.budget ? t('Flexible') : proj.budget.toLocaleString()}
                        </Text>
                      </View>
                      {/* Service name */}
                      {(proj.serviceName || proj.serviceNameAr) && (
                        <Text style={[s.cardUser, fs, { color: dc.gray500 }]} numberOfLines={1}>
                          {name(proj.serviceName, proj.serviceNameAr)}
                        </Text>
                      )}
                      {/* Date */}
                      <View style={[s.cardMeta, isRTL && s.rowRev]}>
                        <Feather name="calendar" size={11} color={dc.gray400} />
                        <Text style={[s.cardMetaTxt, fs, { color: dc.gray400 }]}>{fmtDate(proj.createdAt)}</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ════ MY SMALL TASKS ════ */}
        <View style={[s.section, { marginBottom: 80 }]}>
          <View style={[s.secHead, isRTL && s.rowRev]}>
            <View style={[s.secTitleRow, isRTL && s.rowRev]}>
              <View style={[s.secIcon, { backgroundColor: dc.amber + '22' }]}>
                <Ionicons name="list-outline" size={20} color={dc.amber} />
              </View>
              <Text style={[s.secHeading, fsB, { color: dc.text }]}>{t('My Small Tasks')}</Text>
            </View>
            <TouchableOpacity
              style={[s.viewAll, { backgroundColor: '#FFF7ED' }]}
              onPress={onPressMyTasks}
              activeOpacity={0.8}
            >
              <Text style={[s.viewAllTxt, fs, { color: '#EA580C' }]}>
                {isRTL ? `❯ ${t('View All')}` : `${t('View All')} ❯`}
              </Text>
            </TouchableOpacity>
          </View>

          {tasksLoading ? (
            <ActivityIndicator size="small" color={dc.amber} style={{ marginTop: 16, alignSelf: 'center' }} />
          ) : myTasks.length === 0 ? (
            <TouchableOpacity
              style={[s.emptyCard, { backgroundColor: dc.card, marginHorizontal: H_PAD }]}
              onPress={() => onPressCreateSmallTask?.()}
              activeOpacity={0.85}
            >
              <Ionicons name="flash-outline" size={38} color={dc.amber} />
              <Text style={[s.emptyTitle, fsB, { color: dc.text }]}>
                {t('No small tasks yet. Create one to get started!')}
              </Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[s.scrollCardsContent, isRTL && { flexDirection: 'row-reverse' }]}
            >
              {myTasks.map(task => {
                const ss = statusStyle(task.status);
                const taskName = name(task.taskTypeNameEn ?? task.description, task.taskTypeNameAr ?? task.description);
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[s.scrollCard, { backgroundColor: dc.card }]}
                    activeOpacity={0.9}
                  >
                    <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={s.gradWrap}>
                      {/* Top row */}
                      <View style={[s.cardTop, isRTL && s.rowRev]}>
                        <View style={[s.cardTop, isRTL && s.rowRev, { gap: 3, flexShrink: 1 }]}>
                          <Ionicons name="people-outline" size={13} color={dc.gray400} />
                          <Text style={[s.cardNum, fs, { color: dc.gray400 }]}>{task.bidsCount ?? 0}</Text>
                        </View>
                        <View style={[s.pill, { backgroundColor: ss.bg }]}>
                          <View style={[s.pillDot, { backgroundColor: ss.tc }]} />
                          <Text style={[s.pillTxt, fs, { color: ss.tc }]}>{ss.label}</Text>
                        </View>
                      </View>
                      {/* Title */}
                      <Text style={[s.cardTitle, fsB, { color: dc.text }]} numberOfLines={2}>
                        {taskName || '—'}
                      </Text>
                      {/* Username */}
                      {task.userName && (
                        <Text style={[s.cardUser, fs, { color: dc.gray500 }]} numberOfLines={1}>
                          {task.userName}
                        </Text>
                      )}
                      {/* Date */}
                      <View style={[s.cardMeta, isRTL && s.rowRev]}>
                        <Feather name="calendar" size={11} color={dc.gray400} />
                        <Text style={[s.cardMetaTxt, fs, { color: dc.gray400 }]}>{fmtDate(task.createdAt)}</Text>
                      </View>
                      {/* Address */}
                      {!!task.address && (
                        <View style={[s.cardMeta, isRTL && s.rowRev]}>
                          <Ionicons name="information-circle" size={11} color={dc.primary} />
                          <Text style={[s.cardMetaTxt, fs, { color: dc.gray400 }]} numberOfLines={1}>{task.address}</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

      </ScrollView>

      {/* ════ FAB ════ */}
      <TouchableOpacity
        style={[s.fab, { [isRTL ? 'left' : 'right']: 20, backgroundColor: dc.primary }]}
        activeOpacity={0.9}
        onPress={onPressFab}
      >
        <MaterialCommunityIcons name="robot" size={26} color="#fff" />
      </TouchableOpacity>

      {/* ════ SUBCATEGORY MODAL ════ */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={closeCatModal}
        statusBarTranslucent
      >
        <Pressable style={s.modalOverlay} onPress={closeCatModal}>
          <Animated.View
            style={[
              s.modalSheet,
              { backgroundColor: dc.card },
              {
                transform: [{
                  translateY: modalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [500, 0],
                  }),
                }],
                opacity: modalAnim,
              },
            ]}
          >
            <Pressable onPress={() => {}}>
              {/* Handle bar */}
              <View style={[s.modalHandle, { backgroundColor: dc.border }]} />

              {/* Header */}
              {selectedCat && (
                <View style={[s.modalHeader, isRTL && s.rowRev]}>
                  <View style={[s.modalTitleRow, isRTL && s.rowRev]}>
                    <View style={[s.modalIconCircle, { backgroundColor: dc.purple + '15' }]}>
                      {resolveSvgUrl(selectedCat)
                        ? <SvgUri width={22} height={22} uri={resolveSvgUrl(selectedCat)!} fill={dc.purple} />
                        : <MaterialCommunityIcons name={getServiceIcon(selectedCat.nameEn)} size={20} color={dc.purple} />
                      }
                    </View>
                    <Text style={[s.modalTitle, fsB, { color: dc.text }]}>
                      {name(selectedCat.nameEn, selectedCat.nameAr)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeCatModal} style={s.modalCloseBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={20} color={dc.gray400} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Subcategory grid */}
              <ScrollView
                style={{ maxHeight: 380 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.modalGrid}
              >
                {selectedCat && loadingSubcat === selectedCat.id ? (
                  <ActivityIndicator size="large" color={dc.purple} style={{ marginVertical: 40, alignSelf: 'center' }} />
                ) : selectedCat && (subcatsMap[selectedCat.id] || []).length === 0 ? (
                  <Text style={[s.subcatEmpty, fs, { color: dc.textSec, textAlign: 'center', marginVertical: 32 }]}>
                    {t('No subcategories')}
                  </Text>
                ) : (
                  <View style={[s.subcatGrid, isRTL && { flexDirection: 'row-reverse' }]}>
                    {(selectedCat ? (subcatsMap[selectedCat.id] || []) : []).map(sub => {
                      const subSvg = resolveSvgUrl(sub);
                      const subIcon = getServiceIcon(sub.nameEn);
                      const subLabel = name(sub.nameEn, sub.nameAr);
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          style={[s.subcatItem, { backgroundColor: isDarkMode ? dc.border : '#F8FAFC' }]}
                          onPress={() => {
                            closeCatModal();
                            setTimeout(() => {
                              onPressCategory?.({ id: sub.id, nameEn: sub.nameEn, nameAr: sub.nameAr });
                            }, 250);
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={[s.subcatCircle, { backgroundColor: dc.white }]}>
                            {subSvg
                              ? <SvgUri width={22} height={22} uri={subSvg} fill={dc.primary} />
                              : <MaterialCommunityIcons name={subIcon} size={20} color={dc.primary} />
                            }
                          </View>
                          <Text style={[s.subcatLabel, fs, { color: dc.text }]} numberOfLines={2}>{subLabel}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default UserHomeScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_R = 16;
const SUB_COL = (SCREEN_WIDTH - H_PAD * 2 - 44) / 3;

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },
  rowRev: { flexDirection: 'row-reverse' },

  // ── Hero
  hero: {
    paddingTop: Platform.OS === 'ios' ? 10 : 14,
    paddingBottom: 22,
    paddingHorizontal: H_PAD,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  searchWrap: { position: 'relative', zIndex: 1000 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  searchDrop: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    borderRadius: 14,
    paddingVertical: 4,
    zIndex: 9999,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  searchEmpty: { padding: 16, textAlign: 'center', fontSize: 14 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  searchRowText: { flex: 1, fontSize: 14, fontWeight: '500' },

  // ── Section shared
  section: { marginTop: 20 },
  secHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    marginBottom: 14,
  },
  secTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  secIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secHeading: { fontSize: 16, fontWeight: '700' },
  viewAll: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  viewAllTxt: { fontSize: 13, fontWeight: '600' },

  // ── Banner
  bannerCard: {
    borderRadius: 18,
    padding: 18,
    minHeight: 90,
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bannerIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  bannerTexts: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  bannerSub: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 6 },
  dot: { borderRadius: 4, height: 8 },
  dotActive: { width: 22 },
  dotInactive: { width: 8, backgroundColor: '#CBD5E1' },

  // ── Quick scroll items
  qScroll: { paddingHorizontal: H_PAD, paddingRight: H_PAD + 8, gap: 12 },
  qItem: { width: 72, alignItems: 'center', gap: 6 },
  qCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 5 },
      android: { elevation: 2 },
    }),
  },
  qLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 14 },

  // ── Subcategory grid (inside modal)
  subcatEmpty: { textAlign: 'center', padding: 12, fontSize: 13 },
  subcatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subcatItem: {
    width: SUB_COL,
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    gap: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  subcatCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  subcatLabel: { fontSize: 11, textAlign: 'center', fontWeight: '500', lineHeight: 14 },

  // ── Subcategory modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 20 },
    }),
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  modalIconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  modalGrid: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  // ── Horizontal scroll cards (My Projects / My Small Tasks)
  scrollCardsContent: {
    paddingHorizontal: H_PAD,
    paddingVertical: 4,
    paddingEnd: H_PAD,
  },
  scrollCard: {
    width: CARD_SCROLL_WIDTH,
    marginEnd: CARD_GAP,
    borderRadius: CARD_R,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },

  // ── Grid cards (legacy / modal)
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: {
    width: CARD_HALF,
    borderRadius: CARD_R,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  gradWrap: { padding: 12, minHeight: 148 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 4 },
  cardNum: { fontSize: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    flexShrink: 1,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillTxt: { fontSize: 10, fontWeight: '600' },
  cardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 7, lineHeight: 17, minHeight: 34 },
  cardBudget: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  riyalCircle: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(22,163,74,0.15)', alignItems: 'center', justifyContent: 'center' },
  riyalTxt: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
  budgetTxt: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  cardUser: { fontSize: 11, marginBottom: 3 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardMetaTxt: { fontSize: 10, flex: 1 },

  // ── Empty state
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // ── FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
});
