import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTourGuide } from '@wrack/react-native-tour-guide';
import AppTourTooltip from '../../components/AppTourTooltip';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useFontFamily } from '../../context/FontContext';
import { LinearGradient } from 'expo-linear-gradient';
import StaggeredAppearView from '../../components/StaggeredAppearView';
import PressableScaleView from '../../components/PressableScaleView';
import BonyadLogo from '../../components/BonyadLogo';
import ChatbotFab, { chatbotFabBottomOffset } from '../../components/ChatbotFab';
import RialIcon from '../../components/RialIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { storage } from '../../utils/storage';
import { getAppTopBarPaddingTop } from '../../utils/statusBarHelper';
import { getAvailableRequests } from '../../services/SmallTaskService';
import type { SmallTaskRequest } from '../../types/smallTasks';
import FlowingBorderCard from '../../components/FlowingBorderCard';
import { getMyTickets } from '../../services/SupportTicketService';
import type { SupportTicket } from '../../types/chat';
import ContractViewerModal from '../ContractViewerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Cached Intl formatters (avoid re-creating inside render loops)
const numberFormatterEn = new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 });
const numberFormatterAr = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 });
/** Extra space below the status / safe area so the home top bar sits lower (technician home tab). */
const TECH_HOME_TOP_BAR_EXTRA_INSET = 14;
const H_PADDING = 20;
// Banner pages are full SCREEN_WIDTH (negative margin on wrapper, H_PADDING on each page)
const SECTION_GAP = 16;
const CARD_GAP = 12;
const CARD_RADIUS = 18;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - CARD_GAP) / 2;

// Design tokens
const COLORS = {
  background: '#F5F7FA',
  title: '#111111',
  sectionTitle: '#111111',
  gray: '#64748B',
  blue: '#2563EB',
  blueLight: '#E0F2FE',
  blueLightText: '#0369A1',
  blueBorder: '#BFDBFE',
  orange: '#EA580C',
  orangePillBg: '#FFF7ED',
  orangePill: 'المزايدة', // Bidding - localized in render
  green: '#16A34A',
  greenCircleBg: 'rgba(22, 163, 74, 0.15)',
  yellow: '#FBBF24',
  yellowBorder: '#FDE68A',
  projectCardGradient: ['#EFF6FF', '#DBEAFE'] as const,
  smallTaskCardGradient: ['#FFFBEB', '#FEF3C7'] as const,
  // Card dark mode
  projectCardGradientDark: ['#1A2744', '#243B5C'] as const,
  smallTaskCardGradientDark: ['#2D2A1E', '#3D3828'] as const,
  // Banner (light)
  bannerGradient: ['#F0FDF4', '#DCFCE7', '#BBF7D0'] as const,
  bannerTitle: '#166534',
  bannerSubtitle: '#15803D',
  bannerButtonGradient: ['#16A34A', '#22C55E'] as const,
  dotInactive: '#CBD5E1',
  // Banner dark mode (matches iOS)
  bannerGradientDark: ['#1B2D1B', '#2D4A2D', '#1E3A1E'] as const,
  bannerTitleDark: '#86EFAC',
  bannerSubtitleDark: 'rgba(255,255,255,0.85)',
  bannerButtonGradientDark: ['#15803D', '#16A34A'] as const,
  // Quick actions
  quickActionPurple: '#E9D5FF',
  quickActionOrange: '#FED7AA',
  quickActionGreen: '#BBF7D0',
  quickActionLabel: '#374151',
};

// 5 feature banners matching iOS AdvertisementComponent (PNG images)
const BANNER_IMAGES = [
  require('../../../assets/banner1.png'),
  require('../../../assets/banner2.png'),
  require('../../../assets/banner3.png'),
  require('../../../assets/banner4.png'),
  require('../../../assets/banner5.png'),
];

type ProjectStatus =
  | 'approved'
  | 'pending'
  | 'in_progress'
  | 'bid_received'
  | 'direct'
  | 'small_tasks';

interface ApiProject {
  id: number;
  description?: string;
  budget?: number | null;
  budgetUnspecified?: boolean;
  address?: string;
  status?: string;
  userName?: string;
  user?: { username?: string; name?: string };
  ownerName?: string;
  serviceNameEn?: string;
  serviceNameAr?: string;
  [key: string]: unknown;
}

const IOS_PRIMARY = '#00A5F4';
const IOS_CHAT = '#4C9AD5';

interface TechnicalHomeScreenProps {
  userName?: string;
  unreadNotificationCount?: number;
  onPressChat?: () => void;
  onPressNotifications?: () => void;
  onPressAvailableProject?: (status: ProjectStatus) => void;
  onPressTaskCategory?: (status: ProjectStatus) => void;
  onPressSmallTask?: (task: SmallTaskRequest) => void;
  onPressProject?: (project: ApiProject) => void;
  onPressReferAndEarn?: () => void;
  onPressFab?: () => void;
  onPressChatbot?: () => void;
  onPressPortfolio?: () => void;
  onPressSchedule?: () => void;
  onPressAnalytics?: () => void;
  onPressSupport?: () => void;
  onPressMyContracts?: () => void;
  onPressContract?: (contractId: number) => void;
  onPressSupportTickets?: () => void;
  onPressSupportTicket?: (ticketId: number) => void;
  onPressCreateSupportTicket?: () => void;
  /** Ref to the bottom tab bar — passed from the shell for tour guide highlighting */
  tabBarRef?: React.RefObject<View | null>;
  /** Per-tab refs for individual tour steps — keyed by tab id */
  tabRefs?: Record<string, React.RefObject<View | null>>;
}

export default function TechnicalHomeScreen({
  onPressAvailableProject,
  onPressTaskCategory,
  onPressSmallTask,
  onPressProject,
  onPressFab,
  onPressChatbot,
  onPressPortfolio,
  onPressSchedule,
  onPressAnalytics,
  onPressSupport,
  onPressMyContracts,
  onPressContract,
  onPressSupportTickets,
  onPressSupportTicket,
  onPressCreateSupportTicket,
  onPressChat,
  onPressNotifications,
  unreadNotificationCount = 0,
  tabBarRef,
  tabRefs,
}: TechnicalHomeScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors: themeColors, theme } = useTheme();
  const { fontFamily, boldFontFamily, scaledSize } = useFontFamily();
  const isArabic = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';
  const primaryColor = isDarkMode ? themeColors.primary : IOS_PRIMARY;

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [smallTasks, setSmallTasks] = useState<SmallTaskRequest[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  // Contracts & support
  interface HomeContract { id: number; projectId?: number; type?: string; status?: string; otherPartyName?: string; description?: string; signedDocumentUrl?: string | null; createdAt?: string; amount?: number; budget?: number; startDate?: string; projectTitle?: string; }
  const [contracts, setContracts] = useState<HomeContract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [selectedContractProjectId, setSelectedContractProjectId] = useState<number | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);
  const [escrowModalVisible, setEscrowModalVisible] = useState(false);
  const escrowFadeAnim = useRef(new Animated.Value(0)).current;
  const escrowScaleAnim = useRef(new Animated.Value(0.9)).current;
  const mainScrollRef = useRef<ScrollView>(null);
  const mainScrollY = useRef(0);

  // Tour guide refs
  const tourLogoRef = useRef<View>(null);
  const tourTopBarIconsRef = useRef<View>(null);
  const tourBannerRef = useRef<View>(null);
  const tourProjectsRef = useRef<View>(null);
  const tourSmallTasksRef = useRef<View>(null);
  const tourContractsRef = useRef<View>(null);
  const tourSupportRef = useRef<View>(null);
  const tourChatbotRef = useRef<View>(null);

  const { startTour } = useTourGuide();

  // Memoize renderTooltip to prevent unnecessary re-renders during tour transitions
  const renderTooltip = useCallback((props: any) => (
    <AppTourTooltip
      {...props}
      primaryColor={primaryColor}
      isDark={isDarkMode}
    />
  ), [primaryColor, isDarkMode]);

  const handleStartTour = useCallback(() => {
    startTour([
      {
        id: 'tech-logo',
        targetRef: tourLogoRef,
        title: t('Bonyad'),
        description: t('Your platform for connecting with trusted service providers and qualified experts.'),
        tooltipPosition: 'bottom',
        targetStyle: { borderRadius: 8 },
        spotlightPadding: 12,
      },
      {
        id: 'tech-topbar',
        targetRef: tourTopBarIconsRef,
        title: t('App Navigation'),
        description: t('Use these icons to open chats with clients and view your notifications.'),
        tooltipPosition: 'bottom',
        targetStyle: { borderRadius: 8 },
      },
      {
        id: 'tech-banner',
        targetRef: tourBannerRef,
        title: t('Opportunities & Promotions'),
        description: t('Swipe through banners to discover new project opportunities and platform announcements.'),
        tooltipPosition: 'bottom',
        targetStyle: { borderRadius: 16 },
        scrollToTarget: { scrollRef: mainScrollRef, offset: -20, animated: false, getCurrentScrollOffset: () => mainScrollY.current },
      },
      {
        id: 'tech-projects',
        targetRef: tourProjectsRef,
        title: t('Available Projects'),
        description: t('Browse and bid on active projects posted by clients. Tap "View All" to see every opportunity.'),
        tooltipPosition: 'bottom',
        targetStyle: { borderRadius: 20 },
        scrollToTarget: { scrollRef: mainScrollRef, offset: -20, animated: false, getCurrentScrollOffset: () => mainScrollY.current },
      },
      {
        id: 'tech-small-tasks',
        targetRef: tourSmallTasksRef,
        title: t('Small Tasks'),
        description: t('Quick job requests from clients. Complete small tasks to build your reputation and earn fast.'),
        tooltipPosition: 'auto',
        targetStyle: { borderRadius: 20 },
        scrollToTarget: { scrollRef: mainScrollRef, offset: -20, animated: false, getCurrentScrollOffset: () => mainScrollY.current },
      },
      {
        id: 'tech-contracts',
        targetRef: tourContractsRef,
        title: t('My Contracts'),
        description: t('View and manage all your contracts with service providers. Tap any contract to see details.'),
        tooltipPosition: 'auto',
        targetStyle: { borderRadius: 20 },
        scrollToTarget: { scrollRef: mainScrollRef, offset: -20, animated: false, getCurrentScrollOffset: () => mainScrollY.current },
      },
      {
        id: 'tech-support',
        targetRef: tourSupportRef,
        title: t('Support'),
        description: t('Get help from our support team. Open a ticket and track its status right here.'),
        tooltipPosition: 'auto',
        targetStyle: { borderRadius: 20 },
        scrollToTarget: { scrollRef: mainScrollRef, offset: -20, animated: false, getCurrentScrollOffset: () => mainScrollY.current },
      },
      {
        id: 'tech-chatbot',
        targetRef: tourChatbotRef,
        title: t('AI Assistant'),
        description: t('Chat with our AI assistant for instant answers about services, pricing, and platform features.'),
        tooltipPosition: 'top',
        targetStyle: { borderRadius: 34 },
        spotlightPadding: 8,
        active: !!onPressChatbot,
      },
      {
        id: 'tech-tab-home',
        targetRef: tabRefs?.['home'],
        title: t('Home Tab'),
        description: t('Your home screen — see your recent activity, contracts, and quick actions.'),
        tooltipPosition: 'top',
        targetStyle: { borderRadius: 16 },
        spotlightPadding: 4,
        active: !!(tabRefs?.['home']),
      },
      {
        id: 'tech-tab-projects',
        targetRef: tabRefs?.['projects'],
        title: t('Projects Tab'),
        description: t('View and manage all your posted projects and track their progress.'),
        tooltipPosition: 'top',
        targetStyle: { borderRadius: 16 },
        spotlightPadding: 4,
        active: !!(tabRefs?.['projects']),
      },
      {
        id: 'tech-tab-wallet',
        targetRef: tabRefs?.['wallet'],
        title: t('Wallet Tab'),
        description: t('Track your earnings, view payment history, and manage your finances.'),
        tooltipPosition: 'top',
        targetStyle: { borderRadius: 16 },
        spotlightPadding: 4,
        active: !!(tabRefs?.['wallet']),
      },
      {
        id: 'tech-tab-profile',
        targetRef: tabRefs?.['profile'],
        title: t('Profile Tab'),
        description: t('Manage your account, settings, subscription, and personal information.'),
        tooltipPosition: 'top',
        targetStyle: { borderRadius: 16 },
        spotlightPadding: 4,
        active: !!(tabRefs?.['profile']),
      },
    ], {
      autoPositionTooltip: true,
      animationDuration: 150,
      nextButtonText: t('Next'),
      prevButtonText: t('Back'),
      skipButtonText: t('Skip'),
      doneButtonText: t('Done'),
      renderTooltip,
    });
  }, [startTour, t, mainScrollRef, tabBarRef, tabRefs, primaryColor, isDarkMode, onPressChatbot, renderTooltip]);

  const fontStyle = useMemo(() => ({ fontFamily: fontFamily || undefined }), [fontFamily]);
  const boldFontStyle = useMemo(() => ({ fontFamily: boldFontFamily || fontFamily || undefined }), [boldFontFamily, fontFamily]);

  const handleBannerPress = useCallback((index: number) => {
    switch (index) {
      case 0:
        // "Your opportunity – connect to trusted projects & ready clients"
        // Technician: go browse available projects to bid on
        onPressAvailableProject?.('approved');
        break;
      case 1:
        // "Hundreds of projects launch monthly – are you ready?"
        // Technician: open available projects
        onPressAvailableProject?.('approved');
        break;
      case 2:
        // "For every ambitious service provider – your gateway to growth"
        // Technician: see their in-progress work (active earnings)
        onPressAvailableProject?.('in_progress');
        break;
      case 3:
        // "Escrow – secure payment" → coming soon modal
        escrowFadeAnim.setValue(0);
        escrowScaleAnim.setValue(0.9);
        setEscrowModalVisible(true);
        Animated.parallel([
          Animated.timing(escrowFadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.spring(escrowScaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        ]).start();
        break;
      case 4:
        // "Strict criteria for trusted service providers"
        // Technician: browse available projects (proves they qualify to bid)
        onPressAvailableProject?.('approved');
        break;
    }
  }, [isArabic, onPressAvailableProject, escrowFadeAnim, escrowScaleAnim]);

  const loadProjects = useCallback(async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        setProjects([]);
        return;
      }
      const url = buildApiUrl(API_ENDPOINTS.PROJECTS.LIST);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        setProjects([]);
        return;
      }
      const data = await response.json();
      const rawList = Array.isArray(data)
        ? data
        : (data?.projects ?? data?.data ?? []);
      setProjects(Array.isArray(rawList) ? rawList.slice(0, 4) : []);
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadSmallTasks = useCallback(async () => {
    try {
      const list = await getAvailableRequests();
      const mapped: SmallTaskRequest[] = (list || []).slice(0, 4).map((r: any) => ({
        id: r.id,
        taskTypeId: r.taskTypeId,
        taskTypeNameAr: r.taskTypeNameAr,
        taskTypeNameEn: r.taskTypeNameEn,
        description: r.description ?? '',
        address: r.address ?? '',
        status: r.status ?? 'PENDING',
        bidsCount: r.bidsCount ?? 0,
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
      const url = buildApiUrl(API_ENDPOINTS.CONTRACTS.TECHNICIAN_MY);
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
      const tickets = await getMyTickets();
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

  const formatBudget = (budget: number | null | undefined, budgetUnspecified?: boolean) => {
    if (budgetUnspecified || budget == null) return t('Flexible');
    return Number(budget).toLocaleString('en-SA');
  };

  const getProjectUsername = (p: ApiProject) =>
    p.userName ?? p.user?.username ?? p.user?.name ?? p.ownerName ?? '—';

  const getTaskTypeName = (task: SmallTaskRequest) =>
    isArabic ? (task.taskTypeNameAr ?? task.taskType?.nameAr ?? task.taskTypeNameEn) : (task.taskTypeNameEn ?? task.taskType?.nameEn ?? task.taskTypeNameAr);

  const projectCards = projects.slice(0, 2);
  const taskCards = smallTasks.slice(0, 2);

  const insets = useSafeAreaInsets();
  const topSpacing = getAppTopBarPaddingTop(insets);

  const onBannerScroll = (e: { nativeEvent: { contentOffset: { x: number }; layoutMeasurement: { width: number } } }) => {
    const x = e.nativeEvent.contentOffset.x;
    const w = e.nativeEvent.layoutMeasurement.width || SCREEN_WIDTH;
    const index = Math.round(x / w);
    if (index >= 0 && index < BANNER_IMAGES.length) setBannerIndex(index);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % BANNER_IMAGES.length;
        bannerScrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);


  return (
    <View style={[styles.container, styles.wrapper, { backgroundColor: isDarkMode ? themeColors.background : COLORS.background }]}>
      {/* iOS-style: single ScrollView, top bar first child so whole page scrolls */}
      <ScrollView
        ref={mainScrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContentWrap,
          { paddingBottom: Math.max(insets.bottom, 24) + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        onScroll={(e) => { mainScrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        nestedScrollEnabled={true}
      >
        {/* Top bar — first item in scroll (matches iOS TechnicianHomeContentView) */}
        <View style={[styles.iosTopBar, { paddingTop: topSpacing + 14, backgroundColor: isDarkMode ? themeColors.background : COLORS.background }]}>
          <View ref={tourLogoRef} collapsable={false} style={styles.iosTopBarLogo}>
            <BonyadLogo size="small" responsive={false} variant={isDarkMode ? 'light' : 'dark'} />
          </View>
          <View ref={tourTopBarIconsRef} collapsable={false} style={styles.iosTopBarIcons}>
            <TouchableOpacity style={styles.iosTopBarIconBtn} onPress={handleStartTour} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="map-outline" size={24} color={primaryColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iosTopBarIconBtn} onPress={onPressChat} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chatbubbles-outline" size={24} color={primaryColor} />
            </TouchableOpacity>
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

        {/* Main content — same horizontal padding as iOS */}
        <View style={styles.content}>
      {/* Section 1: Horizontal banner carousel (5 cards, swipe left/right — matches iOS AdvertisementComponent) */}
      <View ref={tourBannerRef} collapsable={false}>
      <StaggeredAppearView index={0} style={{ marginBottom: SECTION_GAP, marginHorizontal: -H_PADDING }}>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onBannerScroll}
            onScroll={onBannerScroll}
            scrollEventThrottle={32}
            contentContainerStyle={styles.bannerScrollContent}
            decelerationRate="fast"
          >
            {BANNER_IMAGES.map((img, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.bannerPage, { width: SCREEN_WIDTH }]}
                onPress={() => handleBannerPress(index)}
                activeOpacity={0.92}
              >
                <View style={[styles.bannerCard, { backgroundColor: isDarkMode ? '#1A1A2E' : '#FFFFFF' }]}>
                  <Image source={img} style={styles.bannerImage} resizeMode="stretch" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.paginationDots}>
            {BANNER_IMAGES.map((_, i) => (
              <View
                key={i}
                style={[
                  i === bannerIndex ? styles.paginationDotActive : styles.paginationDotInactive,
                  i === bannerIndex && { backgroundColor: COLORS.blue },
                  !isDarkMode && i !== bannerIndex && { backgroundColor: COLORS.dotInactive },
                  isDarkMode && i !== bannerIndex && { backgroundColor: 'rgba(255,255,255,0.3)' },
                ]}
              />
            ))}
          </View>
      </StaggeredAppearView>
      </View>

      {/* Section 2: Title "Available Opportunities" */}
      <StaggeredAppearView index={1}>
      <Text
        style={[
          styles.mainTitle,
          { color: isDarkMode ? themeColors.text : COLORS.title },
          { fontSize: scaledSize(22), ...boldFontStyle },
        ]}
      >
        {t('Available Opportunities')}
      </Text>
      </StaggeredAppearView>

      {/* Section 2: Available Projects */}
      <View ref={tourProjectsRef} collapsable={false}>
      <StaggeredAppearView index={2}>
      <FlowingBorderCard
        accent="#00A5F4"
        cornerRadius={20}
        cardBackground={isDarkMode ? themeColors.cardBackground : COLORS.background}
      >
      <View style={[styles.section, { paddingVertical: 8 }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
              <Feather name="folder" size={18} color={COLORS.blue} />
            </View>
            <Text style={[styles.sectionHeading, { color: isDarkMode ? themeColors.text : COLORS.sectionTitle }, boldFontStyle]}>
              {t('Look for Offers')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.viewAllBtn, { backgroundColor: isDarkMode ? themeColors.cardBackground : COLORS.blueLight, borderWidth: isDarkMode ? 1 : 0, borderColor: isDarkMode ? themeColors.border : 'transparent' }]}
            onPress={() => onPressAvailableProject?.('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewAllText, { color: isDarkMode ? themeColors.text : COLORS.blueLightText }, fontStyle]}>
              {t('View All')} ←
            </Text>
          </TouchableOpacity>
        </View>

        {loadingProjects ? (
          <View style={styles.cardsRow}>
            <ActivityIndicator size="small" color={isDarkMode ? themeColors.primary : COLORS.blue} />
          </View>
        ) : projectCards.length === 0 ? (
          <Text style={[styles.emptyText, { color: isDarkMode ? themeColors.textSecondary : COLORS.gray }, fontStyle]}>
            {t('No projects found')}
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {projectCards.map((project) => (
              <PressableScaleView key={project.id} style={styles.cardWrapper} onPress={() => onPressProject?.(project)}>
                <LinearGradient
                  colors={isDarkMode ? [...COLORS.projectCardGradientDark] : COLORS.projectCardGradient}
                  style={[styles.projectCard, isDarkMode && styles.cardBorderDark]}
                >
                  <View style={[styles.cardBorder, { borderColor: isDarkMode ? themeColors.border : COLORS.blueBorder }]} />
                  <View style={styles.cardInner}>
                    <View style={styles.cardTopRow}>
                      <Text style={[styles.projectNumber, { color: isDarkMode ? themeColors.text : COLORS.sectionTitle }, fontStyle]}>
                        #{project.id}
                      </Text>
                      <View style={[styles.orangePill, isDarkMode && { backgroundColor: 'rgba(234, 88, 12, 0.25)' }]}>
                        <Text style={[styles.orangePillText, fontStyle, isDarkMode && { color: '#F97316' }]}>{t('Bidding')} 🟠</Text>
                      </View>
                    </View>
                    <View style={styles.budgetRow}>
                      <View style={[styles.greenCircle, isDarkMode && { backgroundColor: 'rgba(34, 197, 94, 0.25)' }]}>
                        <RialIcon size={14} variant={isDarkMode ? 'light' : 'dark'} />
                      </View>
                      <Text style={[styles.budgetText, boldFontStyle, isDarkMode && { color: '#4ADE80' }]}>{formatBudget(project.budget, project.budgetUnspecified)}</Text>
                    </View>
                    <Text style={[styles.username, { color: isDarkMode ? themeColors.textSecondary : COLORS.gray }, fontStyle]} numberOfLines={1}>
                      {getProjectUsername(project)}
                    </Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="information-circle" size={14} color={isDarkMode ? themeColors.primary : COLORS.blue} />
                      <Text style={[styles.locationText, { color: isDarkMode ? themeColors.textSecondary : COLORS.gray }, fontStyle]} numberOfLines={1}>
                        {project.address || '—'}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </PressableScaleView>
            ))}
          </ScrollView>
        )}
      </View>
      </FlowingBorderCard>
      </StaggeredAppearView>
      </View>

      {/* Section 3: Small Tasks */}
      <View ref={tourSmallTasksRef} collapsable={false}>
      <StaggeredAppearView index={3}>
      <FlowingBorderCard
        accent="#FF9500"
        cornerRadius={20}
        cardBackground={isDarkMode ? themeColors.cardBackground : COLORS.background}
      >
      <View style={[styles.section, { paddingVertical: 8 }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(251, 191, 36, 0.25)' }]}>
              <Ionicons name="flash" size={18} color={COLORS.yellow} />
            </View>
            <Text style={[styles.sectionHeading, { color: isDarkMode ? themeColors.text : COLORS.sectionTitle }, boldFontStyle]}>
              {t('Available Small Tasks')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.viewAllBtn, { backgroundColor: isDarkMode ? themeColors.cardBackground : COLORS.orangePillBg, borderWidth: isDarkMode ? 1 : 0, borderColor: isDarkMode ? themeColors.border : 'transparent' }]}
            onPress={() => onPressTaskCategory?.('small_tasks')}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewAllText, { color: isDarkMode ? themeColors.text : COLORS.orange }, fontStyle]}>
              {t('View All')} ←
            </Text>
          </TouchableOpacity>
        </View>

        {loadingTasks ? (
          <View style={styles.cardsRow}>
            <ActivityIndicator size="small" color={isDarkMode ? themeColors.warning : COLORS.orange} />
          </View>
        ) : taskCards.length === 0 ? (
          <Text style={[styles.emptyText, { color: isDarkMode ? themeColors.textSecondary : COLORS.gray }, fontStyle]}>
            {t('No available small tasks at the moment.')}
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
            {taskCards.map((task) => (
              <PressableScaleView key={task.id} style={styles.cardWrapper} onPress={() => onPressSmallTask?.(task)}>
                <LinearGradient
                  colors={isDarkMode ? [...COLORS.smallTaskCardGradientDark] : COLORS.smallTaskCardGradient}
                  style={[styles.smallTaskCard, isDarkMode && styles.cardBorderDark]}
                >
                  <View style={[styles.cardBorder, { borderColor: isDarkMode ? themeColors.border : COLORS.yellowBorder }]} />
                  <View style={styles.cardInner}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.peopleCountRow}>
                        <Ionicons name="people-outline" size={14} color={isDarkMode ? themeColors.textSecondary : COLORS.gray} />
                        <Text style={[styles.peopleCount, { color: isDarkMode ? themeColors.textSecondary : COLORS.gray }, fontStyle]}>
                          {task.bidsCount ?? task.bidCount ?? 0}
                        </Text>
                      </View>
                      <View style={[styles.orangePill, isDarkMode && { backgroundColor: 'rgba(234, 88, 12, 0.25)' }]}>
                        <Text style={[styles.orangePillText, fontStyle, isDarkMode && { color: '#F97316' }]}>⚡ {t('Quick task')}</Text>
                      </View>
                    </View>
                    <Text style={[styles.taskTitle, { color: isDarkMode ? themeColors.text : COLORS.sectionTitle }, boldFontStyle]} numberOfLines={2}>
                      {getTaskTypeName(task) || task.description || '—'}
                    </Text>
                    <View style={styles.budgetRow}>
                      <View style={[styles.greenCircle, isDarkMode && { backgroundColor: 'rgba(34, 197, 94, 0.25)' }]}>
                        <RialIcon size={14} variant={isDarkMode ? 'light' : 'dark'} />
                      </View>
                      <Text style={[styles.budgetTextSmallTask, fontStyle, isDarkMode && { color: themeColors.textSecondary }]}>{t('Flexible')}</Text>
                    </View>
                    <Text style={[styles.username, { color: isDarkMode ? themeColors.textSecondary : COLORS.gray }, fontStyle]} numberOfLines={1}>
                      {task.userName ?? '—'}
                    </Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="warning" size={14} color={isDarkMode ? '#F97316' : COLORS.orange} />
                      <Text style={[styles.locationText, { color: isDarkMode ? themeColors.textSecondary : COLORS.gray }, fontStyle]} numberOfLines={1}>
                        {task.address || '—'}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </PressableScaleView>
            ))}
          </ScrollView>
        )}
      </View>
      </FlowingBorderCard>
      </StaggeredAppearView>
      </View>

      {/* Section 5: Quick Action Cards */}
      <StaggeredAppearView index={4}>
      <FlowingBorderCard
        accent="#007AFF"
        cornerRadius={18}
        cardBackground={isDarkMode ? themeColors.cardBackground : COLORS.background}
        style={{ marginBottom: SECTION_GAP }}
      >
      <View style={[styles.section, { paddingVertical: 8 }]}>
        <View style={styles.quickActionsRow}>
          <PressableScaleView style={[styles.quickActionCard, isDarkMode && { backgroundColor: themeColors.cardBackground, borderWidth: 1, borderColor: themeColors.border }]} onPress={() => onPressPortfolio?.()}>
            <View style={[styles.quickActionIconWrap, { backgroundColor: isDarkMode ? 'rgba(124, 58, 237, 0.3)' : COLORS.quickActionPurple }]}>
              <Feather name="folder" size={22} color={isDarkMode ? '#A78BFA' : '#7C3AED'} />
            </View>
            <Text style={[styles.quickActionLabel, fontStyle, isDarkMode && { color: themeColors.text }]} numberOfLines={1}>
              {t('Business gallery')}
            </Text>
          </PressableScaleView>
          <PressableScaleView style={[styles.quickActionCard, isDarkMode && { backgroundColor: themeColors.cardBackground, borderWidth: 1, borderColor: themeColors.border }]} onPress={() => onPressAvailableProject?.('in_progress')}>
            <View style={[styles.quickActionIconWrap, { backgroundColor: isDarkMode ? 'rgba(234, 88, 12, 0.3)' : COLORS.quickActionOrange }]}>
              <Feather name="briefcase" size={22} color={isDarkMode ? '#FB923C' : COLORS.orange} />
            </View>
            <Text style={[styles.quickActionLabel, fontStyle, isDarkMode && { color: themeColors.text }]} numberOfLines={1}>
              {t('In Progress')}
            </Text>
          </PressableScaleView>
        </View>
      </View>
      </FlowingBorderCard>
      </StaggeredAppearView>

      {/* Section 6: My Contracts */}
      <View ref={tourContractsRef} collapsable={false}>
      <FlowingBorderCard
        accent="#5856D6"
        cornerRadius={20}
        cardBackground={isDarkMode ? themeColors.cardBackground : COLORS.background}
        style={{ marginBottom: SECTION_GAP }}
      >
        <View style={[styles.section, { paddingVertical: 8 }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(88,86,214,0.12)' }]}>
                <Ionicons name="document-text" size={18} color="#5856D6" />
              </View>
              <Text style={[styles.sectionHeading, { color: isDarkMode ? themeColors.text : COLORS.sectionTitle }, boldFontStyle]}>
                {t('My Contracts')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.viewAllBtn, { backgroundColor: isDarkMode ? themeColors.cardBackground : 'rgba(88,86,214,0.1)', borderWidth: isDarkMode ? 1 : 0, borderColor: isDarkMode ? themeColors.border : 'transparent' }]}
              onPress={() => onPressMyContracts?.()}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewAllText, { color: isDarkMode ? themeColors.text : '#5856D6' }, fontStyle]}>{t('View All')} ←</Text>
            </TouchableOpacity>
          </View>
          {loadingContracts ? (
            <View style={styles.cardsRow}><ActivityIndicator size="small" color="#5856D6" /></View>
          ) : contracts.length === 0 ? (
            <Text style={[styles.emptyText, { color: isDarkMode ? themeColors.textSecondary : COLORS.gray }, fontStyle]}>{t('No contracts yet')}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {contracts.slice(0, 2).map((c) => {
                const contractAmount = c.amount ?? c.budget;
                const formattedAmount = contractAmount
                  ? (isArabic ? numberFormatterAr : numberFormatterEn).format(contractAmount)
                  : null;
                const dateStr = c.createdAt
                  ? new Date(c.createdAt).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })
                  : null;
                return (
                  <PressableScaleView key={c.id} style={styles.cardWrapper} onPress={() => {
                    const projectId = c.projectId ?? c.id;
                    if (onPressContract) {
                      onPressContract(projectId);
                    } else {
                      setSelectedContractProjectId(projectId);
                    }
                  }}>
                    <LinearGradient
                      colors={isDarkMode ? ['#1E1B3A', '#2D2A4E'] : ['#F0EEFF', '#E8E5FF']}
                      style={[styles.projectCard, isDarkMode && styles.cardBorderDark]}
                    >
                      <View style={[styles.cardBorder, { borderColor: isDarkMode ? themeColors.border : '#C5C0FF' }]} />
                      <View style={styles.cardInner}>
                        <View style={styles.cardTopRow}>
                          <Text style={[styles.projectNumber, { color: isDarkMode ? themeColors.text : COLORS.sectionTitle }, fontStyle]}>#{c.id}</Text>
                          {c.signedDocumentUrl ? (
                            <View style={[styles.orangePill, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                              <Text style={[styles.orangePillText, fontStyle, { color: '#34C759' }]}>{t('Signed')}</Text>
                            </View>
                          ) : (
                            <View style={[styles.orangePill, { backgroundColor: 'rgba(255,149,0,0.15)' }]}>
                              <Text style={[styles.orangePillText, fontStyle, { color: '#FF9500' }]}>{t(c.status || 'Pending')}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.username, { color: isDarkMode ? themeColors.textSecondary : COLORS.gray }, fontStyle]} numberOfLines={2}>
                          {c.projectTitle || c.description || c.otherPartyName || t('Contract')}
                        </Text>
                        {formattedAmount ? (
                          <Text style={[styles.budgetText, { color: '#5856D6', fontWeight: '700' }, fontStyle]}>{formattedAmount} {t('SAR')}</Text>
                        ) : (
                          <Text style={[styles.budgetText, { color: '#5856D6' }, fontStyle]}>{c.status ?? c.type ?? '—'}</Text>
                        )}
                        {dateStr && (
                          <Text style={[{ color: isDarkMode ? themeColors.textTertiary : COLORS.gray, fontSize: 11, marginTop: 2 }, fontStyle]}>{dateStr}</Text>
                        )}
                      </View>
                    </LinearGradient>
                  </PressableScaleView>
                );
              })}
            </ScrollView>
          )}
        </View>
      </FlowingBorderCard>
      </View>

      {/* Section 7: Support */}
      <View ref={tourSupportRef} collapsable={false}>
      <FlowingBorderCard
        accent="#34C759"
        cornerRadius={20}
        cardBackground={isDarkMode ? themeColors.cardBackground : COLORS.background}
        style={{ marginBottom: SECTION_GAP }}
      >
        <View style={[styles.section, { paddingVertical: 8 }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(52,199,89,0.12)' }]}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#34C759" />
              </View>
              <Text style={[styles.sectionHeading, { color: isDarkMode ? themeColors.text : COLORS.sectionTitle }, boldFontStyle]}>
                {t('Support')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.viewAllBtn, { backgroundColor: isDarkMode ? themeColors.cardBackground : 'rgba(52,199,89,0.1)', borderWidth: isDarkMode ? 1 : 0, borderColor: isDarkMode ? themeColors.border : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 4 }]}
              onPress={() => onPressSupportTickets?.()}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewAllText, { color: isDarkMode ? themeColors.text : '#34C759' }, fontStyle]}>{t('View All')}</Text>
              <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={14} color={isDarkMode ? themeColors.text : '#34C759'} />
            </TouchableOpacity>
          </View>
          {loadingTickets ? (
            <View style={styles.cardsRow}><ActivityIndicator size="small" color="#34C759" /></View>
          ) : supportTickets.length === 0 ? (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}
              onPress={onPressCreateSupportTicket}
              activeOpacity={0.8}
            >
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#34C759" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 14, fontWeight: '600' }, { color: isDarkMode ? themeColors.text : COLORS.sectionTitle }, boldFontStyle]}>{t('Open Support Ticket')}</Text>
                <Text style={[{ fontSize: 12, marginTop: 2 }, { color: isDarkMode ? themeColors.textSecondary : COLORS.gray }, fontStyle]}>{t('Get help from our team')}</Text>
              </View>
              <Ionicons name={isArabic ? 'chevron-back' : 'chevron-forward'} size={18} color={isDarkMode ? themeColors.textSecondary : COLORS.gray} />
            </TouchableOpacity>
          ) : (
            <View style={{ paddingHorizontal: 8 }}>
              {supportTickets.map((ticket, idx) => {
                const statusColor = ticket.status === 'OPEN' || ticket.status === 'PENDING' ? '#FF9500' : ticket.status === 'IN_PROGRESS' ? '#007AFF' : '#8E8E93';
                return (
                  <TouchableOpacity
                    key={ticket.id}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderTopWidth: idx > 0 ? StyleSheet.hairlineWidth : 0, borderTopColor: isDarkMode ? themeColors.border : COLORS.dotInactive }}
                    onPress={() => onPressSupportTicket?.(ticket.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.sectionIcon, { backgroundColor: `${statusColor}20` }]}>
                      <Ionicons name="ticket" size={16} color={statusColor} />
                    </View>
                    <Text style={[{ flex: 1, fontSize: 13, fontWeight: '600' }, { color: isDarkMode ? themeColors.text : COLORS.sectionTitle }, boldFontStyle]} numberOfLines={1}>{ticket.subject}</Text>
                    <View style={{ backgroundColor: `${statusColor}20`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                      <Text style={[{ fontSize: 10, fontWeight: '700', color: statusColor }, fontStyle]}>{ticket.status}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </FlowingBorderCard>
      </View>

        </View>
      </ScrollView>
      {/* iOS-style Chatbot FAB when provided; otherwise legacy FAB for small tasks */}
      {onPressChatbot ? (
        <View
          ref={tourChatbotRef}
          collapsable={false}
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            bottom: chatbotFabBottomOffset(insets.bottom),
            left: isArabic ? undefined : 20,
            right: isArabic ? 20 : undefined,
            width: 67,
            height: 67,
          }}
        >
          <ChatbotFab
            embedInParent
            onPress={onPressChatbot}
            primaryColor={primaryColor}
            primaryDark={themeColors.primary}
            bottomOffset={0}
          />
        </View>
      ) : onPressFab ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: themeColors.primary }, styles.fabLTR]}
          onPress={onPressFab}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="robot" size={26} color="#fff" />
        </TouchableOpacity>
      ) : null}

      {/* Escrow Coming Soon Modal */}
      <Modal visible={escrowModalVisible} transparent animationType="none" onRequestClose={() => setEscrowModalVisible(false)} statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setEscrowModalVisible(false)}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: escrowFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, isDarkMode ? 0.8 : 0.55] }) }]} />
        </TouchableWithoutFeedback>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <TouchableWithoutFeedback>
            <Animated.View style={[escrowModalStyles.card, { backgroundColor: isDarkMode ? themeColors.cardBackground : '#FFFFFF', borderColor: themeColors.border, opacity: escrowFadeAnim, transform: [{ scale: escrowScaleAnim }] }]}>
              <TouchableOpacity style={escrowModalStyles.closeBtn} onPress={() => setEscrowModalVisible(false)}>
                <Ionicons name="close" size={22} color={themeColors.textSecondary} />
              </TouchableOpacity>
              <View style={[escrowModalStyles.iconCircle, { backgroundColor: '#007AFF18' }]}>
                <Ionicons name="shield-checkmark-outline" size={46} color="#007AFF" />
              </View>
              <Text style={[escrowModalStyles.title, { color: themeColors.text, fontFamily: boldFontFamily }]}>
                {isArabic ? 'حساب الضمان' : 'Escrow Account'}
              </Text>
              <Text style={[escrowModalStyles.message, { color: themeColors.textSecondary }]}>
                {isArabic
                  ? 'هذه الخدمة قادمة قريباً!\nسيتمكن كل من العميل والمقاول من الدفع والاستلام بأمان تام.'
                  : 'This feature is coming soon!\nClients and technicians will be able to pay and receive funds securely.'}
              </Text>
              <TouchableOpacity style={[escrowModalStyles.okBtn, { backgroundColor: '#007AFF' }]} onPress={() => setEscrowModalVisible(false)}>
                <Text style={[escrowModalStyles.okText, { fontFamily: boldFontFamily }]}>
                  {isArabic ? 'حسناً' : 'Got it'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      {/* Contract PDF Viewer — opened from home screen contract cards */}
      <ContractViewerModal
        visible={selectedContractProjectId !== null}
        projectId={selectedContractProjectId ?? 0}
        onClose={() => setSelectedContractProjectId(null)}
        isTechnician
      />
    </View>
  );
}

const styles = StyleSheet.create({
  copilotSectionWrap: {
    alignSelf: 'stretch',
    width: '100%',
  },
  container: { flex: 1 },
  wrapper: { flex: 1 },
  scroll: { flex: 1 },
  scrollContentWrap: {},
  content: {
    paddingHorizontal: H_PADDING,
    paddingTop: 16,
    paddingBottom: 24,
  },
  iosTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: H_PADDING,
    marginBottom: 16,
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
  // Banner carousel
  bannerScrollContent: {
    flexDirection: 'row',
  },
  bannerPage: {
    paddingHorizontal: H_PADDING,
    justifyContent: 'center',
  },
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
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  paginationDotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.dotInactive,
  },
  paginationDotActive: {
    width: 22,
    height: 8,
    borderRadius: 4,
  },
  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.quickActionLabel,
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: SECTION_GAP,
  },
  section: {
    marginBottom: SECTION_GAP,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  hScroll: {
    paddingRight: 8,
    gap: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  projectCard: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    minHeight: 140,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  smallTaskCard: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    minHeight: 140,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderRadius: CARD_RADIUS,
    pointerEvents: 'none',
  },
  cardBorderDark: {
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardInner: {
    padding: 12,
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  projectNumber: {
    fontSize: 13,
  },
  orangePill: {
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  orangePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.orange,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  greenCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.greenCircleBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dollarSign: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.green,
  },
  budgetText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.green,
  },
  budgetTextSmallTask: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  username: {
    fontSize: 12,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    flex: 1,
  },
  peopleCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  peopleCount: {
    fontSize: 12,
  },
  taskTitle: {
    fontSize: 14,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    paddingVertical: 24,
    width: '100%',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  fabLTR: {
    right: 20,
  },
});

const escrowModalStyles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  okBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  okText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
