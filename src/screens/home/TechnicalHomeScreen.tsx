import React, { useState, useEffect, useCallback } from 'react';
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
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { storage } from '../../utils/storage';
import { getAvailableRequests } from '../../services/SmallTaskService';
import type { SmallTaskRequest } from '../../types/smallTasks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 16;
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
  // Banner
  bannerGradient: ['#F0FDF4', '#DCFCE7', '#BBF7D0'] as const,
  bannerTitle: '#166534',
  bannerSubtitle: '#15803D',
  bannerButtonGradient: ['#16A34A', '#22C55E'] as const,
  dotInactive: '#CBD5E1',
  // Quick actions
  quickActionPurple: '#E9D5FF',
  quickActionOrange: '#FED7AA',
  quickActionGreen: '#BBF7D0',
  quickActionLabel: '#374151',
};

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

interface TechnicalHomeScreenProps {
  userName?: string;
  onPressAvailableProject?: (status: ProjectStatus) => void;
  onPressTaskCategory?: (status: ProjectStatus) => void;
  onPressReferAndEarn?: () => void;
  onPressFab?: () => void;
  onPressChatbot?: () => void;
  onPressInfo?: () => void;
  onPressPortfolio?: () => void;
  onPressSchedule?: () => void;
  onPressAnalytics?: () => void;
  onPressSupport?: () => void;
}

export default function TechnicalHomeScreen({
  onPressAvailableProject,
  onPressTaskCategory,
  onPressFab,
  onPressPortfolio,
  onPressSchedule,
  onPressAnalytics,
  onPressSupport,
}: TechnicalHomeScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors: themeColors, theme } = useTheme();
  const { fontFamily, boldFontFamily, scaledSize } = useFontFamily();
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [smallTasks, setSmallTasks] = useState<SmallTaskRequest[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);

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
  const bannerActiveIndex = 3; // 4th dot active (0-based)

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDarkMode ? themeColors.background : COLORS.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Section 1: Banner Card "انشر مشروعك" */}
      <View style={[styles.section, { marginBottom: 8 }]}>
        <TouchableOpacity activeOpacity={0.95} style={styles.bannerTouchable}>
          <LinearGradient
            colors={COLORS.bannerGradient}
            style={styles.bannerCard}
          >
            <View style={[styles.bannerContent, isRTL && styles.bannerContentRTL]}>
              <View style={styles.bannerIconWrap}>
                <LinearGradient
                  colors={COLORS.bannerButtonGradient}
                  style={styles.bannerIconGradient}
                >
                  <MaterialCommunityIcons name="hammer" size={26} color="#fff" />
                </LinearGradient>
              </View>
              <View style={[styles.bannerTextWrap, isRTL && styles.bannerTextWrapRTL]}>
                <Text style={[styles.bannerTitle, fontStyle]} numberOfLines={1}>
                  {t('Post your project')}
                </Text>
                <Text style={[styles.bannerSubtitle, fontStyle]} numberOfLines={2}>
                  {t('Get competitive offers from qualified technicians')}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.paginationDots}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                i === bannerActiveIndex ? styles.paginationDotActive : styles.paginationDotInactive,
                i === bannerActiveIndex && { backgroundColor: COLORS.blue },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Section 2: Title "Available Opportunities" */}
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

      {/* Section 2: Available Projects */}
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
                <TouchableOpacity
                  key={project.id}
                  style={styles.cardWrapper}
                  onPress={() => onPressAvailableProject?.('pending')}
                  activeOpacity={0.9}
                >
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
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      {/* Section 3: Small Tasks */}
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
                <TouchableOpacity
                  key={task.id}
                  style={styles.cardWrapper}
                  onPress={() => onPressTaskCategory?.('small_tasks')}
                  activeOpacity={0.9}
                >
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
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      {/* Section 5: Quick Action Cards */}
      <View style={[styles.section, { marginBottom: SECTION_GAP }]}>
        <View style={[styles.quickActionsRow, isRTL && styles.quickActionsRowRTL]}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => onPressPortfolio?.()} activeOpacity={0.85}>
            <View style={[styles.quickActionIconWrap, { backgroundColor: COLORS.quickActionPurple }]}>
              <Feather name="folder" size={22} color="#7C3AED" />
            </View>
            <Text style={[styles.quickActionLabel, fontStyle]} numberOfLines={1}>
              {t('Business gallery')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => onPressAvailableProject?.('in_progress')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: COLORS.quickActionOrange }]}>
              <Feather name="briefcase" size={22} color={COLORS.orange} />
            </View>
            <Text style={[styles.quickActionLabel, fontStyle]} numberOfLines={1}>
              {t('In Progress')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => onPressSchedule?.()} activeOpacity={0.85}>
            <View style={[styles.quickActionIconWrap, { backgroundColor: COLORS.quickActionGreen }]}>
              <Feather name="calendar" size={22} color={COLORS.green} />
            </View>
            <Text style={[styles.quickActionLabel, fontStyle]} numberOfLines={1}>
              {t('My appointments')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FAB - Small Tasks */}
      {onPressFab && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: themeColors.primary },
            isRTL ? styles.fabRTL : styles.fabLTR,
          ]}
          onPress={onPressFab}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="robot" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: H_PADDING,
    paddingTop: 12,
    paddingBottom: 24,
  },
  textRight: {
    textAlign: 'right',
  },
  // Banner
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
