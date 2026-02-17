import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getCategories, ServiceCategory } from '../../services/ServiceService';
import { getServerBaseUrl } from '../../config/api';

type ProjectStatus = 'pending' | 'running' | 'completed';

export interface CategoryInfo {
  id: number;
  nameEn: string;
  nameAr?: string;
}

interface UserHomeScreenProps {
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
  onPressProjectStatus?: (status: ProjectStatus) => void;
  onPressCategory?: (category: CategoryInfo) => void;
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

function resolveCategoryImage(cat: ServiceCategory) {
  const c = cat.imageUrl || (cat as any).image;
  if (!c || typeof c !== 'string') return null;
  const s = c.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return { uri: s };
  const base = getServerBaseUrl();
  return { uri: `${base}${s.startsWith('/') ? s : '/' + s}` };
}

const UserHomeScreen: React.FC<UserHomeScreenProps> = ({
  onPressSearch,
  onPressOpenServices,
  onPressServiceProvidersAll,
  onPressMyProjects,
  onPressMyTasks,
  onPressPremiumUpgrade,
  onPressNotifications,
  onPressMessages,
  onPressInfo,
  onPressFab,
  onPressProjectStatus,
  onPressCategory,
}) => {
  const { t, i18n } = useTranslation();
  const { colors: themeColors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [searchText, setSearchText] = React.useState('');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getCategories()
      .then((list) => { if (mounted) setCategories(list); })
      .catch(() => { if (mounted) setCategories([]); })
      .finally(() => { if (mounted) setCategoriesLoading(false); });
    return () => { mounted = false; };
  }, []);

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

  const handleSearchSubmit = () => {
    if (onPressSearch) {
      onPressSearch(searchText.trim());
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: dynamicColors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.searchSection, { backgroundColor: dynamicColors.cardBackground }]}>
          <View style={styles.searchInputWrapper}>
            <View style={[styles.searchInputInner, { backgroundColor: dynamicColors.gray100 }]}>
              <Feather
                name="search"
                size={20}
                color={dynamicColors.gray400}
                style={styles.searchIcon}
              />
              <TextInput
                style={[styles.searchInput, { color: dynamicColors.text }]}
                placeholder="Search services..."
                placeholderTextColor={dynamicColors.gray400}
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.servicesButton, { backgroundColor: dynamicColors.primary }]}
            activeOpacity={0.8}
            onPress={onPressOpenServices}
          >
            <MaterialCommunityIcons
              name="view-grid"
              size={18}
              color={dynamicColors.white}
            />
            <Text style={styles.servicesButtonText}>Services</Text>
            <Feather
              name="chevron-down"
              size={18}
              color={dynamicColors.white}
            />
          </TouchableOpacity>
        </View>

        {/* Available Services - Category cards */}
        <View style={styles.sectionHeaderSimple}>
          <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>{t('Available Services')}</Text>
        </View>

        {categoriesLoading ? (
          <View style={[styles.categoriesLoader, { backgroundColor: dynamicColors.cardBackground }]}>
            <ActivityIndicator size="small" color={dynamicColors.primary} />
            <Text style={[styles.loaderText, { color: dynamicColors.textSecondary }]}>{t('Loading categories...')}</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.providersScrollContent}
          >
            {categories.map((cat) => {
              const imgSrc = resolveCategoryImage(cat);
              const name = i18n.language === 'ar' && cat.nameAr ? cat.nameAr : cat.nameEn;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryCard, { backgroundColor: dynamicColors.cardBackground }]}
                  activeOpacity={0.8}
                  onPress={() => onPressCategory ? onPressCategory({ id: cat.id, nameEn: cat.nameEn, nameAr: cat.nameAr }) : onPressProjectStatus?.('pending')}
                >
                  <View style={[styles.categoryCardImageWrap, { backgroundColor: dynamicColors.primary + '15' }]}>
                    {imgSrc ? (
                      <Image source={imgSrc} style={styles.categoryCardImage} resizeMode="cover" />
                    ) : (
                      <MaterialCommunityIcons
                        name="briefcase-outline"
                        size={40}
                        color={dynamicColors.primary}
                      />
                    )}
                  </View>
                  <Text style={[styles.categoryCardTitle, { color: dynamicColors.text }]} numberOfLines={2}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>{t('Service Providers')}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPressServiceProvidersAll}
          >
            <Text style={[styles.sectionLink, { color: dynamicColors.primary }]}>{t('All services')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.providersScrollContent}
        >
          <TouchableOpacity
            style={[styles.providerCard, { backgroundColor: dynamicColors.cardBackground }]}
            activeOpacity={0.8}
            onPress={() => onPressProjectStatus?.('pending')}
          >
            <View style={[styles.providerCircle, { backgroundColor: dynamicColors.primary }]}>
              <MaterialCommunityIcons
                name="compass-outline"
                size={40}
                color={dynamicColors.white}
              />
            </View>
            <Text style={[styles.providerTitle, { color: dynamicColors.text }]}>
              {t('Design Services')}{'\n'}(Architectural / Inte
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.providerCard, { backgroundColor: dynamicColors.cardBackground }]}
            activeOpacity={0.8}
            onPress={() => onPressProjectStatus?.('running')}
          >
            <View style={[styles.providerCircle, { backgroundColor: dynamicColors.primary }]}>
              <MaterialCommunityIcons
                name="shield"
                size={40}
                color={dynamicColors.white}
              />
            </View>
            <Text style={[styles.providerTitle, { color: dynamicColors.text }]}>
              {t('Technical /')}{'\n'}ineering Consult...
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.sectionHeaderSimple}>
          <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>My Projects</Text>
        </View>

        <TouchableOpacity
          style={[styles.emptyProjectsCard, { backgroundColor: dynamicColors.cardBackground }]}
          activeOpacity={0.8}
          onPress={onPressMyProjects}
        >
          <MaterialCommunityIcons
            name="folder-open-outline"
            size={40}
            color={dynamicColors.gray300}
          />
          <Text style={[styles.emptyProjectsText, { color: dynamicColors.gray400 }]}>No projects yet</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeaderSimple}>
          <Text style={[styles.sectionTitle, { color: dynamicColors.text }]}>My Task Requests</Text>
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

        <TouchableOpacity
          style={[styles.premiumCard, { backgroundColor: dynamicColors.purpleDark }]}
          activeOpacity={0.9}
          onPress={onPressPremiumUpgrade}
        >
          <View style={styles.premiumLeft}>
            <View style={styles.premiumCircle}>
              <MaterialCommunityIcons
                name="crown"
                size={40}
                color={dynamicColors.white}
              />
            </View>
          </View>
          <View style={styles.premiumRight}>
            <Text style={styles.premiumTitle}>Premium Subscripti...</Text>
            <Text style={styles.premiumSubtitle}>Get 3 months FREE</Text>
            <Text style={[styles.premiumDescription, { color: dynamicColors.purpleLighter }]}>
              Unlock unlimited bids and priority...
            </Text>
            <View style={styles.premiumBadgeRow}>
              <View style={[styles.premiumOfferBadge, { backgroundColor: dynamicColors.red }]}>
                <Text style={styles.premiumOfferText}>50% OFF</Text>
              </View>
            </View>
            <View style={styles.premiumButtonRow}>
              <View style={styles.premiumButton}>
                <Text style={styles.premiumButtonText}>Upgrade Now</Text>
                <Feather
                  name="arrow-right"
                  size={16}
                  color={dynamicColors.white}
                />
              </View>
            </View>
            <View style={styles.premiumDotsRow}>
              <View style={styles.premiumDotActive} />
              <View style={styles.premiumDot} />
              <View style={styles.premiumDot} />
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

export default UserHomeScreen;

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
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInputWrapper: {
    flex: 1,
    marginRight: spacing.md,
  },
  searchInputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
  },
  servicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
  },
  servicesButtonText: {
    marginHorizontal: spacing.xs,
    color: colors.white,
    ...typography.bodyMedium,
  },
  sectionHeader: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderSimple: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
  },
  sectionLink: {
    ...typography.bodyMedium,
  },
  providersScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  providerCard: {
    width: 180,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginRight: spacing.md,
    alignItems: 'center',
    ...shadows.small,
  },
  providerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  providerCircleImage: {
    width: '100%',
    height: '100%',
  },
  categoryCard: {
    width: 180,
    height: 220,
    borderRadius: borderRadius.lg,
    padding: 0,
    marginRight: spacing.md,
    overflow: 'hidden',
    ...shadows.small,
  },
  categoryCardImageWrap: {
    width: '100%',
    height: '70%',
    minHeight: 154,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  categoryCardImage: {
    width: '100%',
    height: '100%',
  },
  categoryCardTitle: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    textAlign: 'center',
    ...typography.bodyMedium,
    flex: 1,
  },
  categoriesLoader: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.xxl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: spacing.sm,
    ...typography.bodySmall,
  },
  providerTitle: {
    textAlign: 'center',
    ...typography.bodyMedium,
  },
  emptyProjectsCard: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    ...shadows.small,
  },
  emptyProjectsText: {
    marginTop: spacing.sm,
    ...typography.bodyMedium,
    fontWeight: '400',
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
  premiumCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.xxxl,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    flexDirection: 'row',
  },
  premiumLeft: {
    marginRight: spacing.xl,
    justifyContent: 'center',
  },
  premiumCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumRight: {
    flex: 1,
  },
  premiumTitle: {
    color: colors.white,
    ...typography.h2,
  },
  premiumSubtitle: {
    marginTop: spacing.xs,
    color: colors.white,
    ...typography.bodyLarge,
  },
  premiumDescription: {
    marginTop: spacing.sm,
    ...typography.bodySmall,
  },
  premiumBadgeRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
  },
  premiumOfferBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumOfferText: {
    color: colors.white,
    ...typography.badgeMedium,
  },
  premiumButtonRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  premiumButtonText: {
    marginRight: spacing.sm,
    color: colors.white,
    ...typography.bodyMedium,
  },
  premiumDotsRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
    marginRight: spacing.xs,
  },
  premiumDot: {
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

