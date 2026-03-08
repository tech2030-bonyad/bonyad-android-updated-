import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AnimatedStatTicker } from '../../components/AnimatedStatTicker';
import { LinearGradient } from 'expo-linear-gradient';
import { CopilotStep, walkthroughable } from 'react-native-copilot';

// Walkthroughable component for coach guide
const WalkableView = walkthroughable((props: any) => (
  <View {...props} collapsable={false} />
));

const { width: screenWidth } = Dimensions.get('window');

type ProjectStatus =
  | 'approved'
  | 'pending'
  | 'in_progress'
  | 'bid_received'
  | 'direct'
  | 'small_tasks';

interface TechnicalHomeScreenProps {
  userName?: string;
  onPressAvailableProject?: (status: ProjectStatus) => void;
  onPressTaskCategory?: (status: ProjectStatus) => void;
  onPressReferAndEarn?: () => void;
  onPressFab?: () => void;
  onPressChatbot?: () => void;
  onPressInfo?: () => void;
  // Quick action handlers
  onPressPortfolio?: () => void;
  onPressSchedule?: () => void;
  onPressAnalytics?: () => void;
  onPressSupport?: () => void;
}

export default function TechnicalHomeScreen({
  userName,
  onPressAvailableProject,
  onPressTaskCategory,
  onPressReferAndEarn,
  onPressFab,
  onPressChatbot,
  onPressInfo,
  onPressPortfolio,
  onPressSchedule,
  onPressAnalytics,
  onPressSupport,
}: TechnicalHomeScreenProps) {
  const { t } = useTranslation();
  const { colors: themeColors, theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const dc = {
    primary: themeColors.primary,
    primaryDark: themeColors.primaryDark,
    purple: isDarkMode ? '#a78bfa' : '#7c3aed',
    purpleDark: isDarkMode ? '#7c3aed' : '#5b21b6',
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
    white: themeColors.white,
    background: themeColors.background,
    cardBackground: themeColors.cardBackground,
    text: themeColors.text,
    textSecondary: themeColors.textSecondary,
  };

  // Stats data for ticker - Includes Welcome message as first item
  const stats = [
    { label: t('Welcome back'), value: userName || t('Technician'), icon: 'account', color: '#fff', bgColor: 'rgba(255, 255, 255, 0.2)' },
    { label: t('Earnings'), value: '12,500', icon: 'wallet', color: '#fff', bgColor: '#ffffff' },
    { label: t('Projects'), value: '24', icon: 'briefcase', color: '#fff', bgColor: '#ffffff' },
    { label: t('Rating'), value: '4.8', icon: 'star', color: '#fff', bgColor: '#ffffff' },
  ];

  // Quick actions with handlers
  const quickActions = [
    { label: t('Portfolio'), icon: 'folder-open', color: dc.purple, bgColor: dc.purple + '12', onPress: onPressPortfolio },
    { label: t('Schedule'), icon: 'calendar', color: dc.primary, bgColor: dc.primary + '12', onPress: onPressSchedule },
    { label: t('Analytics'), icon: 'chart-line', color: dc.green, bgColor: dc.green + '12', onPress: onPressAnalytics },
    { label: t('Support'), icon: 'headset', color: dc.orange, bgColor: dc.orangeLight, onPress: onPressSupport },
  ];

  // Dummy project data
  const projects = [
    {
      id: 1,
      title: t('Apartment Painting - 3 Bedrooms'),
      status: 'approved',
      statusLabel: t('Approved'),
      price: '﷼ 2,500',
      location: t('Riyadh, Al Olaya'),
    },
    {
      id: 2,
      title: t('Bathroom Renovation'),
      status: 'pending',
      statusLabel: t('Pending'),
      price: '﷼ 4,200',
      location: t('Jeddah, Al Hamra'),
    },
    {
      id: 3,
      title: t('Kitchen Cabinet Installation'),
      status: 'in_progress',
      statusLabel: t('In Progress'),
      price: '﷼ 3,800',
      location: t('Dammam, Al Faisaliah'),
    },
    {
      id: 4,
      title: t('Flooring - Vinyl Planks'),
      status: 'approved',
      statusLabel: t('Approved'),
      price: '﷼ 5,500',
      location: t('Riyadh, Al Nakheel'),
    },
  ];

  // Task categories with dummy data
  const taskCategories = [
    { 
      id: 'small_tasks', 
      label: t('Small Tasks'), 
      icon: 'hammer', 
      color: dc.primary, 
      bgColor: dc.primary + '12',
      count: 12,
      description: t('Quick jobs under 2 hours')
    },
    { 
      id: 'direct', 
      label: t('Direct Offers'), 
      icon: 'flash', 
      color: dc.green, 
      bgColor: dc.greenLight,
      count: 5,
      description: t('Direct client requests')
    },
    { 
      id: 'bid_received', 
      label: t('My Bids'), 
      icon: 'gavel', 
      color: dc.orange, 
      bgColor: dc.orangeLight,
      count: 8,
      description: t('Pending bid responses')
    },
    { 
      id: 'in_progress', 
      label: t('Active Work'), 
      icon: 'progress-wrench', 
      color: dc.purple, 
      bgColor: dc.purple + '12',
      count: 3,
      description: t('Ongoing projects')
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return dc.green;
      case 'in_progress': return dc.primary;
      case 'pending': return dc.orange;
      default: return dc.gray400;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'approved': return dc.greenLight;
      case 'in_progress': return dc.primary + '12';
      case 'pending': return dc.orangeLight;
      default: return dc.gray100;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: dc.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ═══ Professional Header with Gradient ═══ */}
      <LinearGradient
        colors={isDarkMode ? ['#1e40af', '#3b82f6'] : ['#2563eb', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          {/* Stats Ticker - Icons moved to top bar */}
          <View style={{ marginTop: 10, marginBottom: 5, width: '100%' }}>
            <AnimatedStatTicker stats={stats} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Quick Actions Grid ═══ */}
        <CopilotStep key="quickActions" text={t('coachMark.quickActions', 'Access your portfolio, schedule, analytics, and support')} order={1} name="quickActions">
          <WalkableView style={[styles.quickActionsCard, { backgroundColor: dc.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: dc.text }]}>{t('Quick Actions')}</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.quickActionItem} 
                  onPress={action.onPress || (() => {})}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.bgColor }]}>
                    <FontAwesome5 name={action.icon as any} size={20} color={action.color} />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: dc.text }]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </WalkableView>
        </CopilotStep>

        {/* ═══ Available Projects Section ═══ */}
        <CopilotStep key="availableProjects" text={t('coachMark.availableProjects', 'Browse and bid on available projects in your area')} order={2} name="availableProjects">
          <WalkableView style={styles.sectionWrapper}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrapper}>
                <View style={[styles.sectionIcon, { backgroundColor: dc.primary + '12' }]}>
                  <Feather name="folder" size={16} color={dc.primary} />
                </View>
                <Text style={[styles.sectionHeading, { color: dc.text }]}>
                  {t('Available Projects')}
                </Text>
              </View>
              <TouchableOpacity style={styles.seeAllBtn} onPress={() => onPressAvailableProject?.('pending')}>
                <Text style={[styles.seeAllText, { color: dc.primary }]}>{t('View All')}</Text>
                <Feather name="chevron-right" size={14} color={dc.primary} />
              </TouchableOpacity>
            </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.projectsScroll}
          >
            {projects.map((project, index) => {
              const statusColor = getStatusColor(project.status);
              const statusBg = getStatusBg(project.status);
              return (
                <TouchableOpacity
                  key={project.id}
                  style={[
                    styles.projectCard,
                    { backgroundColor: dc.cardBackground },
                    index === 0 && { marginLeft: 20 }
                  ]}
                  activeOpacity={0.9}
                  onPress={() => onPressAvailableProject?.(project.status as ProjectStatus)}
                >
                  {/* Status badge */}
                  <View style={[styles.projectStatusBadge, { backgroundColor: statusBg }]}>
                    <View style={[styles.projectStatusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.projectStatusLabel, { color: statusColor }]}>
                      {project.statusLabel}
                    </Text>
                  </View>

                  {/* Title */}
                  <Text style={[styles.projectTitle, { color: dc.text }]} numberOfLines={2}>
                    {project.title}
                  </Text>

                  {/* Location */}
                  <View style={styles.projectLocationRow}>
                    <Ionicons name="location-outline" size={12} color={dc.textSecondary} />
                    <Text style={[styles.projectLocation, { color: dc.textSecondary }]}>
                      {project.location}
                    </Text>
                  </View>

                  {/* Footer */}
                  <View style={styles.projectFooter}>
                    <Text style={[styles.projectPrice, { color: dc.primary }]}>{project.price}</Text>
                    <TouchableOpacity style={[styles.bidButton, { backgroundColor: dc.primary }]}>
                      <Text style={styles.bidButtonText}>{t('Bid')}</Text>
                      <Feather name="arrow-right" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </WalkableView>
        </CopilotStep>

        {/* ═══ Small Tasks Section ═══ */}
        <CopilotStep key="taskCategories" text={t('coachMark.taskCategories', 'Find quick jobs and manage your bids')} order={3} name="taskCategories">
          <WalkableView style={styles.sectionWrapper}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrapper}>
                <View style={[styles.sectionIcon, { backgroundColor: dc.green + '12' }]}>
                  <Feather name="check-circle" size={16} color={dc.green} />
                </View>
                <Text style={[styles.sectionHeading, { color: dc.text }]}>
                  {t('Task Categories')}
                </Text>
              </View>
              <TouchableOpacity style={styles.seeAllBtn} onPress={() => onPressTaskCategory?.('small_tasks')}>
                <Text style={[styles.seeAllText, { color: dc.green }]}>{t('View All')}</Text>
                <Feather name="chevron-right" size={14} color={dc.green} />
              </TouchableOpacity>
            </View>

            <View style={styles.tasksGrid}>
              {taskCategories.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, { backgroundColor: dc.cardBackground }]}
                  activeOpacity={0.9}
                  onPress={() => onPressTaskCategory?.(task.id as ProjectStatus)}
                >
                  <View style={styles.taskTopRow}>
                    <View style={[styles.taskIconContainer, { backgroundColor: task.bgColor }]}>
                      <MaterialCommunityIcons name={task.icon as any} size={22} color={task.color} />
                    </View>
                    {task.count > 0 && (
                      <View style={[styles.taskBadge, { backgroundColor: task.color }]}>
                        <Text style={styles.taskBadgeText}>{task.count}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.taskLabel, { color: dc.text }]}>{task.label}</Text>
                  <Text style={[styles.taskHint, { color: dc.textSecondary }]}>{task.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </WalkableView>
        </CopilotStep>

        {/* ═══ Refer & Earn Banner ═══ */}
        <CopilotStep key="referAndEarn" text={t('coachMark.referAndEarn', 'Pay commission fees and earn rewards')} order={4} name="referAndEarn">
          <WalkableView>
            <TouchableOpacity
              style={styles.referCard}
              activeOpacity={0.9}
              onPress={onPressReferAndEarn}
            >
          <LinearGradient
            colors={isDarkMode ? ['#7c3aed', '#4c1d95'] : ['#7c3aed', '#6d28d9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.referGradient}
          >
            <View style={styles.referContent}>
              <View style={styles.referLeft}>
                <View style={styles.referIconContainer}>
                  <Feather name="users" size={24} color="#fff" />
                </View>
              </View>
              <View style={styles.referRight}>
                <View style={styles.referOfferRow}>
                  <View style={styles.referOfferBadge}>
                    <Text style={styles.referOfferText}>﷼ 100 {t('per referral')}</Text>
                  </View>
                </View>
                <Text style={styles.referTitle}>{t('Refer & Earn')}</Text>
                <Text style={styles.referDescription}>
                  {t('Invite friends and earn cash rewards instantly')}
                </Text>
                <View style={styles.referButton}>
                  <Text style={styles.referButtonText}>{t('Invite Now')}</Text>
                  <Feather name="arrow-right" size={14} color="#fff" />
                </View>
              </View>
            </View>
          </LinearGradient>
          </TouchableOpacity>
        </WalkableView>
        </CopilotStep>

        {/* Bottom spacer - increased for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ═══ AI Assistant FAB ═══ */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { paddingBottom: 100 },
  
  // Header
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    paddingHorizontal: 20,
  },

  // Quick Actions
  quickActionsCard: {
    margin: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    width: '23%',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Sections
  sectionWrapper: {
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Projects
  projectsScroll: {
    paddingRight: 20,
    paddingBottom: 8,
  },
  projectCard: {
    width: 280,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  projectStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  projectStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  projectStatusLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 8,
    minHeight: 44,
  },
  projectLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  projectLocation: {
    fontSize: 12,
  },
  projectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  projectPrice: {
    fontSize: 16,
    fontWeight: '800',
  },
  bidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  bidButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Task Categories
  tasksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  taskCard: {
    width: (screenWidth - 52) / 2,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  taskBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  taskLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  taskHint: {
    fontSize: 12,
  },

  // Refer Card
  referCard: {
    marginHorizontal: 20,
    marginTop: 28,
    borderRadius: 20,
    overflow: 'hidden',
  },
  referGradient: {
    padding: 20,
  },
  referContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referLeft: {
    marginRight: 16,
  },
  referIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referRight: {
    flex: 1,
  },
  referOfferRow: {
    marginBottom: 8,
  },
  referOfferBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  referOfferText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  referTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  referDescription: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginBottom: 14,
    lineHeight: 20,
  },
  referButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  referButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
