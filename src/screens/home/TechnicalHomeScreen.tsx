import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

type ProjectStatus =
  | 'approved'
  | 'pending'
  | 'in_progress'
  | 'bid_received'
  | 'direct'
  | 'small_tasks';

interface TechnicalHomeScreenProps {
  onPressAvailableProject?: (status: ProjectStatus) => void;
  onPressTaskCategory?: (status: ProjectStatus) => void;
  onPressNotifications?: () => void;
  onPressMessages?: () => void;
  onPressInfo?: () => void;
  onPressReferAndEarn?: () => void;
  onPressFab?: () => void;
}

const colors = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  purple: '#7c3aed',
  purpleDark: '#5b21b6',
  purpleLight: '#f3e8ff',
  purpleLighter: '#e9d5ff',
  green: '#10b981',
  greenDark: '#059669',
  greenLight: '#d1fae5',
  red: '#ef4444',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e5e7eb',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#6b7280',
  gray900: '#1f2937',
  amber50: '#fef3c7',
  amber400: '#f59e0b',
  amber900: '#92400e',
  blue50: '#dbeafe',
  white: '#ffffff',
  black: '#000000',
};

const typography = {
  logoTitle: { fontSize: 24, fontWeight: '600' as const },
  logoSubtitle: { fontSize: 16, fontWeight: '500' as const },
  h1: { fontSize: 22, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, fontWeight: '600' as const },
  bodyMedium: { fontSize: 14, fontWeight: '600' as const },
  bodySmall: { fontSize: 12, fontWeight: '400' as const },
  badge: { fontSize: 10, fontWeight: 'bold' as const },
  badgeMedium: { fontSize: 12, fontWeight: 'bold' as const },
};

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
  full: 50,
};

const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};

const TechnicalHomeScreen: React.FC<TechnicalHomeScreenProps> = ({
  onPressAvailableProject,
  onPressTaskCategory,
  onPressNotifications,
  onPressMessages,
  onPressInfo,
  onPressReferAndEarn,
  onPressFab,
}) => {
  const { colors: themeColors, theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Dynamic colors based on theme
  const dynamicColors = {
    primary: themeColors.primary,
    primaryDark: themeColors.primaryDark,
    purple: isDarkMode ? '#9d7af0' : '#7c3aed',
    purpleDark: isDarkMode ? '#7c3aed' : '#5b21b6',
    purpleLight: isDarkMode ? '#2d1b4e' : '#f3e8ff',
    purpleLighter: isDarkMode ? '#3d2b5e' : '#e9d5ff',
    green: isDarkMode ? '#34d399' : '#10b981',
    greenDark: isDarkMode ? '#10b981' : '#059669',
    greenLight: isDarkMode ? '#064e3b' : '#d1fae5',
    red: themeColors.error,
    gray50: isDarkMode ? themeColors.background : '#f8fafc',
    gray100: isDarkMode ? themeColors.gray100 : '#f1f5f9',
    gray200: isDarkMode ? themeColors.gray200 : '#e5e7eb',
    gray300: isDarkMode ? themeColors.gray300 : '#cbd5e1',
    gray400: isDarkMode ? themeColors.gray400 : '#94a3b8',
    gray500: isDarkMode ? themeColors.gray500 : '#64748b',
    gray600: isDarkMode ? themeColors.textSecondary : '#6b7280',
    gray900: isDarkMode ? themeColors.text : '#1f2937',
    amber50: isDarkMode ? '#78350f' : '#fef3c7',
    amber400: isDarkMode ? '#fbbf24' : '#f59e0b',
    amber900: isDarkMode ? '#fef3c7' : '#92400e',
    blue50: isDarkMode ? '#1e3a5f' : '#dbeafe',
    white: themeColors.white,
    black: themeColors.black,
    background: themeColors.background,
    cardBackground: themeColors.cardBackground,
    text: themeColors.text,
    textSecondary: themeColors.textSecondary,
  };

  return (
    <View style={[styles.root, { backgroundColor: dynamicColors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[styles.portfolioCard, {
            backgroundColor: dynamicColors.purpleLight,
            borderColor: dynamicColors.purple,
          }]}
          activeOpacity={0.8}
        >
          <View style={styles.portfolioLeft}>
            <View style={styles.portfolioIcon}>
              <Feather name="briefcase" size={32} color={dynamicColors.purple} />
            </View>
            <View>
              <Text style={[styles.portfolioTitle, { color: dynamicColors.text }]}>Create Portfolio</Text>
              <Text style={[styles.portfolioSubtitle, { color: dynamicColors.textSecondary }]}>Showcase your work</Text>
            </View>
          </View>
          <View style={styles.portfolioRight}>
            <View style={[styles.newBadge, { backgroundColor: dynamicColors.purpleDark }]}>
              <Text style={styles.newBadgeText}>NEW!</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>Available Projects</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[styles.sectionLink, { color: dynamicColors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.projectsScrollContent}
        >
          <TouchableOpacity
            style={[styles.projectCard, {
              backgroundColor: dynamicColors.cardBackground,
            }]}
            activeOpacity={0.8}
            onPress={() => onPressAvailableProject?.('approved')}
          >
            <View style={[styles.projectImagePlaceholder, { backgroundColor: dynamicColors.gray100 }]}>
              <Feather
                name="image"
                size={24}
                color={dynamicColors.gray300}
              />
            </View>
            <View style={styles.projectTextContainer}>
              <Text style={[styles.projectTitle, { color: dynamicColors.text }]}>Design Services (A...</Text>
              <Text style={[styles.projectPrice, { color: dynamicColors.text }]}>﷼ 4,500,000</Text>
              <View style={[styles.statusBadge, { backgroundColor: dynamicColors.gray200 }]}>
                <Text style={[styles.statusBadgeApprovedText, { color: dynamicColors.textSecondary }]}>APPROVED</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.projectCard, {
              backgroundColor: dynamicColors.cardBackground,
            }]}
            activeOpacity={0.8}
            onPress={() => onPressAvailableProject?.('approved')}
          >
            <View style={[styles.projectImagePlaceholder, { backgroundColor: dynamicColors.gray100 }]}>
              <Feather
                name="image"
                size={24}
                color={dynamicColors.gray300}
              />
            </View>
            <View style={styles.projectTextContainer}>
              <Text style={[styles.projectTitle, { color: dynamicColors.text }]}>Design Services (A...</Text>
              <Text style={[styles.projectPrice, { color: dynamicColors.text }]}>﷼ 30,000</Text>
              <View style={[styles.statusBadge, { backgroundColor: dynamicColors.gray200 }]}>
                <Text style={[styles.statusBadgeApprovedText, { color: dynamicColors.textSecondary }]}>APPROVED</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.projectCard, {
              backgroundColor: dynamicColors.cardBackground,
            }]}
            activeOpacity={0.8}
            onPress={() => onPressAvailableProject?.('pending')}
          >
            <View style={[styles.projectImagePlaceholder, { backgroundColor: dynamicColors.gray100 }]}>
              <Feather
                name="image"
                size={24}
                color={dynamicColors.gray300}
              />
            </View>
            <View style={styles.projectTextContainer}>
              <Text style={[styles.projectTitle, { color: dynamicColors.text }]}>Desi...</Text>
              <Text style={[styles.projectPrice, { color: dynamicColors.text }]}>﷼ 2,0...</Text>
              <View style={[styles.statusBadge, { backgroundColor: dynamicColors.blue50 }]}>
                <Text style={[styles.statusBadgeInProgressText, { color: dynamicColors.primary }]}>CON...</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>Available Task Requests</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[styles.sectionLinkGreen, { color: dynamicColors.green }]}>My Bids</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.errorContainer, { backgroundColor: dynamicColors.amber50 }]}>
          <View style={styles.errorIconWrapper}>
            <Feather
              name="alert-triangle"
              size={20}
              color={dynamicColors.amber400}
            />
          </View>
          <Text style={[styles.errorText, { color: dynamicColors.amber900 }]}>
            The operation couldn't be completed.
            {'\n'}
            (NSURLErrorDomain error -1011.)
          </Text>
        </View>

        <View style={styles.tasksGrid}>
          <TouchableOpacity
            style={[styles.taskCard, { backgroundColor: dynamicColors.cardBackground }]}
            activeOpacity={0.8}
            onPress={() => onPressTaskCategory?.('approved')}
          >
            <Feather name="search" size={40} color={dynamicColors.primary} />
            <Text style={[styles.taskTitle, { color: dynamicColors.text }]}>Tendered Projects</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.taskCard, { backgroundColor: dynamicColors.cardBackground }]}
            activeOpacity={0.8}
            onPress={() => onPressTaskCategory?.('direct')}
          >
            <MaterialCommunityIcons
              name="hand-wave"
              size={40}
              color={dynamicColors.primary}
            />
            <Text style={[styles.taskTitle, { color: dynamicColors.text }]}>Direct</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.taskCard, { backgroundColor: dynamicColors.cardBackground }]}
            activeOpacity={0.8}
            onPress={() => onPressTaskCategory?.('in_progress')}
          >
            <Feather name="file-text" size={40} color={dynamicColors.primary} />
            <Text style={[styles.taskTitle, { color: dynamicColors.text }]}>Active Projects</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.taskCard, { backgroundColor: dynamicColors.cardBackground }]}
            activeOpacity={0.8}
            onPress={() => onPressTaskCategory?.('bid_received')}
          >
            <MaterialCommunityIcons
              name="text-box-check"
              size={40}
              color={dynamicColors.primary}
            />
            <Text style={[styles.taskTitle, { color: dynamicColors.text }]}>Bidded Projects</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.taskCard, styles.taskCardFullWidth, { backgroundColor: dynamicColors.cardBackground }]}
            activeOpacity={0.8}
            onPress={() => onPressTaskCategory?.('small_tasks')}
          >
            <MaterialCommunityIcons
              name="format-list-checks"
              size={40}
              color={dynamicColors.primary}
            />
            <Text style={[styles.taskTitle, { color: dynamicColors.text }]}>My Small Tasks</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.referCard, { backgroundColor: dynamicColors.green }]}
          activeOpacity={0.9}
          onPress={onPressReferAndEarn}
        >
          <View style={styles.referLeft}>
            <View style={styles.referCircle}>
              <Feather name="users" size={32} color={dynamicColors.white} />
            </View>
          </View>
          <View style={styles.referRight}>
            <Text style={styles.referTitle}>Refer &amp; Earn</Text>
            <Text style={styles.referSubtitle}>SAR 100 per referral</Text>
            <Text style={[styles.referDescription, { color: dynamicColors.greenLight }]}>
              Invite friends and earn cash rewards
            </Text>
            <View style={styles.referButtonRow}>
              <View style={styles.referButton}>
                <Text style={styles.referButtonText}>Invite Now</Text>
                <Feather
                  name="arrow-right"
                  size={16}
                  color={dynamicColors.white}
                />
              </View>
            </View>
            <View style={styles.referDotsRow}>
              <View style={styles.referDotActive} />
              <View style={styles.referDot} />
              <View style={styles.referDot} />
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, shadows.medium, { backgroundColor: dynamicColors.primary }]}
        activeOpacity={0.8}
        onPress={onPressFab}
      >
        <MaterialCommunityIcons
          name="robot"
          size={28}
          color={dynamicColors.white}
        />
      </TouchableOpacity>
    </View>
  );
};

export default TechnicalHomeScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl * 2,
  },
  portfolioCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  portfolioIcon: {
    marginRight: spacing.md,
  },
  portfolioTitle: {
    ...typography.h2,
  },
  portfolioSubtitle: {
    marginTop: spacing.xs,
    ...typography.bodyMedium,
    fontWeight: '400',
  },
  portfolioRight: {},
  newBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  newBadgeText: {
    color: colors.white,
    ...typography.badgeMedium,
  },
  sectionHeader: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h2,
  },
  sectionLink: {
    ...typography.bodyMedium,
  },
  sectionLinkGreen: {
    ...typography.bodyMedium,
  },
  projectsScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  projectCard: {
    width: 160,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.md,
    ...shadows.small,
  },
  projectImagePlaceholder: {
    height: 100,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  projectTextContainer: {},
  projectTitle: {
    ...typography.bodyMedium,
  },
  projectPrice: {
    marginTop: spacing.xs,
    ...typography.bodyMedium,
  },
  statusBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeApprovedText: {
    ...typography.badge,
  },
  statusBadgeInProgressText: {
    ...typography.badge,
  },
  errorContainer: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorIconWrapper: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  errorText: {
    flex: 1,
    ...typography.bodySmall,
  },
  tasksGrid: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  taskCard: {
    width: '47%',
    minHeight: 120,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    marginBottom: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  taskCardFullWidth: {
    width: '100%',
  },
  taskTitle: {
    marginTop: spacing.md,
    ...typography.bodyMedium,
  },
  referCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.xxxl,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    flexDirection: 'row',
  },
  referLeft: {
    marginRight: spacing.xl,
    justifyContent: 'center',
  },
  referCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referRight: {
    flex: 1,
  },
  referTitle: {
    color: colors.white,
    ...typography.h1,
  },
  referSubtitle: {
    marginTop: spacing.xs,
    color: colors.white,
    ...typography.bodyLarge,
  },
  referDescription: {
    marginTop: spacing.sm,
    ...typography.bodySmall,
  },
  referButtonRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
  },
  referButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  referButtonText: {
    marginRight: spacing.sm,
    color: colors.white,
    ...typography.bodyMedium,
  },
  referDotsRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  referDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
    marginRight: spacing.xs,
  },
  referDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginRight: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

