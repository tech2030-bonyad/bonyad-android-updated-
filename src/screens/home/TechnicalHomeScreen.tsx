import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useFontFamily } from '../../context/FontContext';
import { LinearGradient } from 'expo-linear-gradient';
import StaggeredAppearView from '../../components/StaggeredAppearView';
import PressableScaleView from '../../components/PressableScaleView';
import BonyadLogo from '../../components/BonyadLogo';
import ChatbotFab from '../../components/ChatbotFab';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { storage } from '../../utils/storage';
import { getAvailableRequests } from '../../services/SmallTaskService';
import type { SmallTaskRequest } from '../../types/smallTasks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 16;
const BANNER_PAGE_WIDTH = SCREEN_WIDTH - H_PADDING * 2;
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

// 5 feature banners (matches iOS AdvertisementComponent)
const BANNERS: Array<{
  icon: string;
  titleKey: string;
  descKey: string;
  gradientLight: readonly [string, string, ...string[]];
  gradientDark: readonly [string, string, ...string[]];
}> = [
  { icon: 'account-group', titleKey: 'banner_find_experts_title', descKey: 'banner_find_experts_desc', gradientLight: ['#FFFFFF', '#E3F2FD', '#BBDEFB'], gradientDark: ['#1A1A2E', '#16213E', '#0F3460'] },
  { icon: 'hammer', titleKey: 'banner_post_projects_title', descKey: 'banner_post_projects_desc', gradientLight: ['#FFFFFF', '#E8F5E9', '#C8E6C9'], gradientDark: ['#1B2D1B', '#2D4A2D', '#1E3A1E'] },
  { icon: 'calendar-clock', titleKey: 'banner_book_appointments_title', descKey: 'banner_book_appointments_desc', gradientLight: ['#FFFFFF', '#FFF3E0', '#FFE0B2'], gradientDark: ['#2D2416', '#3D2E1A', '#4A3822'] },
  { icon: 'shield-check', titleKey: 'banner_verified_technicians_title', descKey: 'banner_verified_technicians_desc', gradientLight: ['#FFFFFF', '#F3E5F5', '#E1BEE7'], gradientDark: ['#2A1B2E', '#3D2A42', '#2E1F33'] },
  { icon: 'robot', titleKey: 'banner_ai_assistant_title', descKey: 'banner_ai_assistant_desc', gradientLight: ['#FFFFFF', '#E0F7FA', '#B2EBF2'], gradientDark: ['#0D2137', '#143250', '#1A4060'] },
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
  onPressInfo?: () => void;
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
  onPressChat,
  onPressNotifications,
  onPressInfo,
  unreadNotificationCount = 0,
}: TechnicalHomeScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors: themeColors, theme } = useTheme();
  const { fontFamily, boldFontFamily, scaledSize } = useFontFamily();
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';
  const primaryColor = isDarkMode ? themeColors.primary : IOS_PRIMARY;

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [smallTasks, setSmallTasks] = useState<SmallTaskRequest[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);

  const fontStyle = { fontFamily: fontFamily || undefined };
  const boldFontStyle = { fontFamily: boldFontFamily || fontFamily || undefined };

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

  useEffect(() => {
    loadProjects();
    loadSmallTasks();
  }, [loadProjects, loadSmallTasks]);

  const formatBudget = (budget: number | null | undefined, budgetUnspecified?: boolean) => {
    if (budgetUnspecified || budget == null) return t('Flexible');
    return `SR ${Number(budget).toLocaleString('en-SA')}`;
  };

  const getProjectUsername = (p: ApiProject) =>
    p.userName ?? p.user?.username ?? p.user?.name ?? p.ownerName ?? '—';

  const getTaskTypeName = (task: SmallTaskRequest) =>
    isRTL ? (task.taskTypeNameAr ?? task.taskType?.nameAr ?? task.taskTypeNameEn) : (task.taskTypeNameEn ?? task.taskType?.nameEn ?? task.taskTypeNameAr);

  const projectCards = projects.slice(0, 2);
  const taskCards = smallTasks.slice(0, 2);

  const insets = useSafeAreaInsets();

  const onBannerScroll = (e: { nativeEvent: { contentOffset: { x: number }; layoutMeasurement: { width: number } } }) => {
    const x = e.nativeEvent.contentOffset.x;
    const w = e.nativeEvent.layoutMeasurement.width || BANNER_PAGE_WIDTH;
    const index = Math.round(x / w);
    if (index >= 0 && index < BANNERS.length) setBannerIndex(index);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => {
        const next = (prev + 1) % BANNERS.length;
        bannerScrollRef.current?.scrollTo({ x: next * BANNER_PAGE_WIDTH, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={[styles.container, styles.wrapper, { backgroundColor: isDarkMode ? themeColors.background : COLORS.background }]}>
      {/* iOS-style: single ScrollView, top bar first child so whole page scrolls */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContentWrap,
          { paddingBottom: Math.max(insets.bottom, 24) + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        nestedScrollEnabled={true}
      >
        {/* Top bar — first item in scroll (matches iOS TechnicianHomeContentView) */}
        <View style={[styles.iosTopBar, isRTL && styles.iosTopBarRTL, { paddingTop: Math.max(insets.top, 12), backgroundColor: isDarkMode ? themeColors.background : COLORS.background }]}>
          <View style={styles.iosTopBarLogo}>
            <BonyadLogo size="small" responsive={false} variant={isDarkMode ? 'light' : 'dark'} />
          </View>
          <View style={[styles.iosTopBarIcons, isRTL && styles.iosTopBarIconsRTL]}>
            <TouchableOpacity style={styles.iosTopBarIconBtn} onPress={onPressChat} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chatbubbles-outline" size={24} color={primaryColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iosTopBarIconBtn} onPress={onPressInfo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="information-circle-outline" size={24} color={primaryColor} />
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
      <StaggeredAppearView index={0}>
        <View style={[styles.section, { marginBottom: SECTION_GAP }]}>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onBannerScroll}
            onScroll={onBannerScroll}
            scrollEventThrottle={32}
            style={styles.bannerScroll}
            contentContainerStyle={styles.bannerScrollContent}
            decelerationRate="fast"
          >
            {BANNERS.map((banner, index) => (
              <View key={index} style={[styles.bannerPage, { width: BANNER_PAGE_WIDTH }]}>
                <TouchableOpacity activeOpacity={0.95} style={styles.bannerTouchable}>
                  <LinearGradient
                    colors={isDarkMode ? [...banner.gradientDark] : [...banner.gradientLight]}
                    style={styles.bannerCard}
                  >
                    <View style={[styles.bannerContent, isRTL && styles.bannerContentRTL]}>
                      <View style={styles.bannerIconWrap}>
                        <View style={[styles.bannerIconGradient, { backgroundColor: isDarkMode ? 'rgba(0,165,244,0.25)' : 'rgba(0,165,244,0.15)' }]}>
                          <MaterialCommunityIcons name={banner.icon as any} size={26} color={IOS_PRIMARY} />
                        </View>
                      </View>
                      <View style={[styles.bannerTextWrap, isRTL && styles.bannerTextWrapRTL]}>
                        <Text style={[styles.bannerTitle, fontStyle, isDarkMode && { color: COLORS.bannerTitleDark }]} numberOfLines={1}>
                          {t(banner.titleKey)}
                        </Text>
                        <Text style={[styles.bannerSubtitle, fontStyle, isDarkMode && { color: COLORS.bannerSubtitleDark }]} numberOfLines={2}>
                          {t(banner.descKey)}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <View style={styles.paginationDots}>
            {BANNERS.map((_, i) => (
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
        </View>
      </StaggeredAppearView>

      {/* Section 2: Title "Available Opportunities" */}
      <StaggeredAppearView index={1}>
      <Text
        style={[
          styles.mainTitle,
          { color: isDarkMode ? themeColors.text : COLORS.title },
          { fontSize: scaledSize(22), ...boldFontStyle },
          isRTL && styles.textRight,
        ]}
      >
        {t('Available Opportunities')}
      </Text>
      </StaggeredAppearView>

      {/* Section 2: Available Projects */}
      <StaggeredAppearView index={2}>
      <View style={styles.section}>
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          <View style={[styles.sectionTitleRow, isRTL && styles.sectionTitleRowRTL]}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
              <Feather name="folder" size={18} color={COLORS.blue} />
            </View>
            <Text style={[styles.sectionHeading, { color: isDarkMode ? themeColors.text : COLORS.sectionTitle }, boldFontStyle, isRTL && styles.sectionHeadingRTL]}>
              {t('Look for Offers')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.viewAllBtn, { backgroundColor: COLORS.blueLight }, isRTL && styles.viewAllBtnRTL]}
            onPress={() => onPressAvailableProject?.('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewAllText, { color: COLORS.blueLightText }, fontStyle]}>
              {isRTL ? `❯ ${t('View All')}` : `${t('View All')} ❯`}
            </Text>
          </TouchableOpacity>
        </View>

        {loadingProjects ? (
          <View style={styles.cardsRow}>
            <ActivityIndicator size="small" color={COLORS.blue} />
          </View>
        ) : (
          <View style={[styles.cardsRow, isRTL && styles.cardsRowRTL]}>
            {projectCards.length === 0 ? (
              <Text style={[styles.emptyText, { color: COLORS.gray }, fontStyle]}>
                {t('No projects found')}
              </Text>
            ) : (
              projectCards.map((project) => (
                <PressableScaleView key={project.id} style={styles.cardWrapper} onPress={() => onPressProject?.(project)}>
                  <LinearGradient
                    colors={COLORS.projectCardGradient}
                    style={[styles.projectCard, isDarkMode && styles.cardBorderDark]}
                  >
                    <View style={[styles.cardBorder, { borderColor: COLORS.blueBorder }]} />
                    <View style={[styles.cardInner, isRTL && styles.cardInnerRTL]}>
                      <View style={styles.cardTopRow}>
                        {isRTL ? (
                          <>
                            <View style={styles.orangePill}>
                              <Text style={[styles.orangePillText, fontStyle]}>{t('Bidding')} 🟠</Text>
                            </View>
                            <Text style={[styles.projectNumber, { color: COLORS.sectionTitle }, fontStyle]}>
                              #{project.id}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text style={[styles.projectNumber, { color: COLORS.sectionTitle }, fontStyle]}>
                              #{project.id}
                            </Text>
                            <View style={styles.orangePill}>
                              <Text style={[styles.orangePillText, fontStyle]}>{t('Bidding')} 🟠</Text>
                            </View>
                          </>
                        )}
                      </View>
                      <View style={[styles.budgetRow, isRTL && styles.budgetRowRTL]}>
                        <View style={styles.greenCircle}>
                          <Text style={styles.dollarSign}>$</Text>
                        </View>
                        <Text style={[styles.budgetText, boldFontStyle]}>{formatBudget(project.budget, project.budgetUnspecified)}</Text>
                      </View>
                      <Text style={[styles.username, { color: COLORS.gray }, fontStyle]} numberOfLines={1}>
                        {getProjectUsername(project)}
                      </Text>
                      <View style={[styles.locationRow, isRTL && styles.locationRowRTL]}>
                        <Ionicons name="information-circle" size={14} color={COLORS.blue} />
                        <Text style={[styles.locationText, { color: COLORS.gray }, fontStyle]} numberOfLines={1}>
                          {project.address || '—'}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </PressableScaleView>
              ))
            )}
          </View>
        )}
      </View>
      </StaggeredAppearView>

      {/* Section 3: Small Tasks */}
      <StaggeredAppearView index={3}>
      <View style={styles.section}>
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          <View style={[styles.sectionTitleRow, isRTL && styles.sectionTitleRowRTL]}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(251, 191, 36, 0.25)' }]}>
              <Ionicons name="flash" size={18} color={COLORS.yellow} />
            </View>
            <Text style={[styles.sectionHeading, { color: isDarkMode ? themeColors.text : COLORS.sectionTitle }, boldFontStyle, isRTL && styles.sectionHeadingRTL]}>
              {t('Available Small Tasks')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.viewAllBtn, { backgroundColor: COLORS.orangePillBg }, isRTL && styles.viewAllBtnRTL]}
            onPress={() => onPressTaskCategory?.('small_tasks')}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewAllText, { color: COLORS.orange }, fontStyle]}>
              {isRTL ? `❯ ${t('View All')}` : `${t('View All')} ❯`}
            </Text>
          </TouchableOpacity>
        </View>

        {loadingTasks ? (
          <View style={styles.cardsRow}>
            <ActivityIndicator size="small" color={COLORS.orange} />
          </View>
        ) : (
          <View style={[styles.cardsRow, isRTL && styles.cardsRowRTL]}>
            {taskCards.length === 0 ? (
              <Text style={[styles.emptyText, { color: COLORS.gray }, fontStyle]}>
                {t('No available small tasks at the moment.')}
              </Text>
            ) : (
              taskCards.map((task) => (
                <PressableScaleView key={task.id} style={styles.cardWrapper} onPress={() => onPressSmallTask?.(task)}>
                  <LinearGradient
                    colors={COLORS.smallTaskCardGradient}
                    style={[styles.smallTaskCard, isDarkMode && styles.cardBorderDark]}
                  >
                    <View style={[styles.cardBorder, { borderColor: COLORS.yellowBorder }]} />
                    <View style={[styles.cardInner, isRTL && styles.cardInnerRTL]}>
                      <View style={styles.cardTopRow}>
                        {isRTL ? (
                          <>
                            <View style={styles.orangePill}>
                              <Text style={[styles.orangePillText, fontStyle]}>⚡ {t('Quick task')}</Text>
                            </View>
                            <View style={[styles.peopleCountRow, isRTL && styles.peopleCountRowRTL]}>
                              <Ionicons name="people-outline" size={14} color={COLORS.gray} />
                              <Text style={[styles.peopleCount, { color: COLORS.gray }, fontStyle]}>
                                {task.bidsCount ?? task.bidCount ?? 0}
                              </Text>
                            </View>
                          </>
                        ) : (
                          <>
                            <View style={[styles.peopleCountRow, isRTL && styles.peopleCountRowRTL]}>
                              <Ionicons name="people-outline" size={14} color={COLORS.gray} />
                              <Text style={[styles.peopleCount, { color: COLORS.gray }, fontStyle]}>
                                {task.bidsCount ?? task.bidCount ?? 0}
                              </Text>
                            </View>
                            <View style={styles.orangePill}>
                              <Text style={[styles.orangePillText, fontStyle]}>⚡ {t('Quick task')}</Text>
                            </View>
                          </>
                        )}
                      </View>
                      <Text style={[styles.taskTitle, { color: COLORS.sectionTitle }, boldFontStyle]} numberOfLines={2}>
                        {getTaskTypeName(task) || task.description || '—'}
                      </Text>
                      <View style={[styles.budgetRow, isRTL && styles.budgetRowRTL]}>
                        <View style={styles.greenCircle}>
                          <Text style={styles.dollarSign}>$</Text>
                        </View>
                        <Text style={[styles.budgetTextSmallTask, fontStyle]}>{t('Flexible')}</Text>
                      </View>
                      <Text style={[styles.username, { color: COLORS.gray }, fontStyle]} numberOfLines={1}>
                        {task.userName ?? '—'}
                      </Text>
                      <View style={[styles.locationRow, isRTL && styles.locationRowRTL]}>
                        <Ionicons name="warning" size={14} color={COLORS.orange} />
                        <Text style={[styles.locationText, { color: COLORS.gray }, fontStyle]} numberOfLines={1}>
                          {task.address || '—'}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </PressableScaleView>
              ))
            )}
          </View>
        )}
      </View>
      </StaggeredAppearView>

      {/* Section 5: Quick Action Cards */}
      <StaggeredAppearView index={4}>
      <View style={[styles.section, { marginBottom: SECTION_GAP }]}>
        <View style={[styles.quickActionsRow, isRTL && styles.quickActionsRowRTL]}>
          <PressableScaleView style={styles.quickActionCard} onPress={() => onPressPortfolio?.()}>
            <View style={[styles.quickActionIconWrap, { backgroundColor: COLORS.quickActionPurple }]}>
              <Feather name="folder" size={22} color="#7C3AED" />
            </View>
            <Text style={[styles.quickActionLabel, fontStyle]} numberOfLines={1}>
              {t('Business gallery')}
            </Text>
          </PressableScaleView>
          <PressableScaleView style={styles.quickActionCard} onPress={() => onPressAvailableProject?.('in_progress')}>
            <View style={[styles.quickActionIconWrap, { backgroundColor: COLORS.quickActionOrange }]}>
              <Feather name="briefcase" size={22} color={COLORS.orange} />
            </View>
            <Text style={[styles.quickActionLabel, fontStyle]} numberOfLines={1}>
              {t('In Progress')}
            </Text>
          </PressableScaleView>
          <PressableScaleView style={styles.quickActionCard} onPress={() => onPressSchedule?.()}>
            <View style={[styles.quickActionIconWrap, { backgroundColor: COLORS.quickActionGreen }]}>
              <Feather name="calendar" size={22} color={COLORS.green} />
            </View>
            <Text style={[styles.quickActionLabel, fontStyle]} numberOfLines={1}>
              {t('My appointments')}
            </Text>
          </PressableScaleView>
        </View>
      </View>
      </StaggeredAppearView>

        </View>
      </ScrollView>
      {/* iOS-style Chatbot FAB when provided; otherwise legacy FAB for small tasks */}
      {onPressChatbot ? (
        <ChatbotFab onPress={onPressChatbot} primaryColor={primaryColor} primaryDark={themeColors.primary} />
      ) : onPressFab ? (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: themeColors.primary }, isRTL ? styles.fabRTL : styles.fabLTR]}
          onPress={onPressFab}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="robot" size={26} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrapper: { flex: 1 },
  scroll: { flex: 1 },
  scrollContentWrap: {},
  content: {
    paddingHorizontal: H_PADDING,
    paddingTop: 8,
    paddingBottom: 24,
  },
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
  textRight: {
    textAlign: 'right',
  },
  // Banner carousel
  bannerScroll: {
    width: BANNER_PAGE_WIDTH,
    alignSelf: 'center',
  },
  bannerScrollContent: {
    flexDirection: 'row',
  },
  bannerPage: {
    paddingHorizontal: 0,
  },
  bannerTouchable: {
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  bannerCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerContentRTL: {
    flexDirection: 'row-reverse',
  },
  bannerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  bannerIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextWrap: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  bannerTextWrapRTL: {
    marginLeft: 0,
    marginRight: 16,
    alignItems: 'flex-end',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.bannerTitle,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.bannerSubtitle,
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
  quickActionsRowRTL: {
    flexDirection: 'row-reverse',
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
    textAlign: 'right',
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
  sectionHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitleRowRTL: {
    flexDirection: 'row-reverse',
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
  sectionHeadingRTL: {
    textAlign: 'right',
  },
  viewAllBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewAllBtnRTL: {
    flexDirection: 'row-reverse',
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
  cardsRowRTL: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap-reverse',
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
  cardInnerRTL: {
    alignItems: 'flex-end',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTopRowRTL: {
    flexDirection: 'row-reverse',
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
  budgetRowRTL: {
    flexDirection: 'row-reverse',
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
  locationRowRTL: {
    flexDirection: 'row-reverse',
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
  peopleCountRowRTL: {
    flexDirection: 'row-reverse',
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
  fabRTL: {
    left: 20,
  },
});
