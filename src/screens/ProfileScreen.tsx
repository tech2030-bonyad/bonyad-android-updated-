import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useRTL } from '../hooks/useRTL';
import { getUserProfile, uploadProfileImage, deleteAccount, updateProfile, verifyWathq } from '../services/ProfileService';
import CompanyRegistrationModal from '../components/CompanyRegistrationModal';
import { storage } from '../utils/storage';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import AnimatedLoadingScreen from '../components/AnimatedLoadingScreen';
import { useTourGuide } from '@wrack/react-native-tour-guide';
import AppTourTooltip from '../components/AppTourTooltip';
// Figma Design Colors
const FIGMA_COLORS = {
  primary: '#005DAC',
  primaryDark: '#003867',
  primaryLight: '#E6EFF7',
  purple: '#6A0DAD',
  purpleLight: '#EFE6F5',
  greenSuccess: '#1A9F78',
  greenLight: '#E6F5EC',
  textBody: '#383838',
  textSecondary: '#999999',
  textGray: '#A3A3A3',
  divider: '#D9D9D9',
  white: '#FFFFFF',
  iconBg: '#E6EFF7',
};

interface ProfileScreenProps {
  onLogout: () => void;
  onBack?: () => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToPortfolio?: () => void;
  onNavigateToSubscription?: () => void;
  onNavigateToServices?: () => void;
  onNavigateToAvailability?: () => void;
  onNavigateToRegions?: () => void;
  onNavigateToSmallTaskTypes?: () => void;
  onNavigateToPaymentHistory?: () => void;
  onNavigateToSupportTickets?: () => void;
  onNavigateToOnboarding?: () => void;
}

interface UserDetails {
  id: number;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  avatar?: string;
  profileImage?: string;
  role: string;
  status?: string;
  regions?: Array<{ id: number; nameEn: string; nameAr: string }>;
  yearsOfExperience?: number;
  hasPortfolio?: boolean;
  certificates?: Array<any>;
  description?: string;
  bio?: string;
  address?: string;
  services?: Array<any>;
  averageRating?: number;
  subscriptionCategory?: {
    id: number;
    nameEn: string;
    nameAr: string;
    price: number;
    durationDays: number;
  };
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  propertiesCount?: number;
  appointmentsCount?: number;
  ticketsCount?: number;
  isCompany?: boolean;
  companyName?: string;
  crNumber?: string;
  nationalId?: string;
}

export default function ProfileScreen({
  onLogout,
  onBack,
  onNavigateToEditProfile,
  onNavigateToPortfolio,
  onNavigateToSubscription,
  onNavigateToServices,
  onNavigateToAvailability,
  onNavigateToRegions,
  onNavigateToSmallTaskTypes,
  onNavigateToPaymentHistory,
  onNavigateToSupportTickets,
  onNavigateToOnboarding,
}: ProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme, toggleTheme } = useTheme();
  const { fontFamily, boldFontFamily, fontSizeScale, setFontSizeScale, scaledSize } = useFontFamily();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [language, setLanguage] = useState(i18n.language);
  const [isCompanyMode, setIsCompanyMode] = useState(false);
  const [isSwitchingCompany, setIsSwitchingCompany] = useState(false);
  const [showCompanySheet, setShowCompanySheet] = useState(false);
  const isDarkMode = theme === 'dark';
  const isArabic = i18n.language === 'ar';
  const { isRTL } = useRTL();
  // In AR, menu arrows point left (chevron-back); in LTR they point right (chevron-forward)
  const menuChevron = isRTL ? 'chevron-back' : 'chevron-forward';

  const isTechnicianRole = userDetails?.role?.toUpperCase() === 'TECHNICIAN';

  // Derive primaryColor early so tour tooltip can use it
  const primaryColor = isDarkMode ? colors.primary : FIGMA_COLORS.primary;

  const profileScrollRef = useRef<ScrollView>(null);
  const profileScrollY = useRef(0);

  // Tour guide refs
  const tourHeaderRef = useRef<View>(null);
  const tourMyInfoRef = useRef<View>(null);
  const tourPortfolioRef = useRef<View>(null);
  const tourSubscriptionRef = useRef<View>(null);
  const tourServicesRef = useRef<View>(null);
  const tourSettingsRef = useRef<View>(null);
  const tourDeleteRef = useRef<View>(null);
  const tourLogoutRef = useRef<View>(null);

  const { startTour } = useTourGuide();

  const renderTooltip = useCallback((props: any) => (
    <AppTourTooltip
      {...props}
      primaryColor={primaryColor}
      isDark={isDarkMode}
    />
  ), [primaryColor, isDarkMode]);

  const handleStartProfileTour = useCallback(() => {
    startTour([
      {
        id: 'profile-header',
        targetRef: tourHeaderRef,
        title: t('profile.myProfile'),
        description: t('profile.tour.header'),
        tooltipPosition: 'bottom',
        targetStyle: { borderRadius: 12 },
        spotlightPadding: 8,
        // Scroll to absolute top (y=0) before measuring the header
        scrollToTarget: { scrollRef: profileScrollRef, offset: 0, animated: false, absolute: true, getCurrentScrollOffset: () => profileScrollY.current },
      },
      {
        id: 'profile-myinfo',
        targetRef: tourMyInfoRef,
        title: t('profile.myInfo'),
        description: t('profile.tour.myinfo'),
        tooltipPosition: 'bottom',
        targetStyle: { borderRadius: 8 },
        scrollToTarget: { scrollRef: profileScrollRef, offset: -20, animated: false, getCurrentScrollOffset: () => profileScrollY.current },
      },
      ...(isTechnicianRole ? [
        {
          id: 'profile-portfolio',
          targetRef: tourPortfolioRef,
          title: t('profile.myPortfolio'),
          description: t('profile.tour.portfolio'),
          tooltipPosition: 'bottom' as const,
          targetStyle: { borderRadius: 12 },
          scrollToTarget: { scrollRef: profileScrollRef, offset: -20, animated: false, getCurrentScrollOffset: () => profileScrollY.current },
        },
        {
          id: 'profile-subscription',
          targetRef: tourSubscriptionRef,
          title: t('profile.mySubscription'),
          description: t('profile.tour.subscription'),
          tooltipPosition: 'bottom' as const,
          targetStyle: { borderRadius: 12 },
          scrollToTarget: { scrollRef: profileScrollRef, offset: -20, animated: false, getCurrentScrollOffset: () => profileScrollY.current },
        },
        {
          id: 'profile-services',
          targetRef: tourServicesRef,
          title: t('profile.services'),
          description: t('profile.tour.services'),
          tooltipPosition: 'bottom' as const,
          targetStyle: { borderRadius: 12 },
          scrollToTarget: { scrollRef: profileScrollRef, offset: -20, animated: false, getCurrentScrollOffset: () => profileScrollY.current },
        },
      ] : []),
      {
        id: 'profile-settings',
        targetRef: tourSettingsRef,
        title: t('profile.language'),
        description: t('profile.tour.settings'),
        tooltipPosition: 'bottom',
        targetStyle: { borderRadius: 8 },
        scrollToTarget: { scrollRef: profileScrollRef, offset: -80, animated: false, getCurrentScrollOffset: () => profileScrollY.current },
      },
      {
        id: 'profile-delete',
        targetRef: tourDeleteRef,
        title: t('profile.deleteAccount'),
        description: t('profile.tour.deleteAccount'),
        tooltipPosition: 'top',
        targetStyle: { borderRadius: 8 },
        scrollToTarget: { scrollRef: profileScrollRef, offset: -200, animated: false, getCurrentScrollOffset: () => profileScrollY.current },
      },
      {
        id: 'profile-logout',
        targetRef: tourLogoutRef,
        title: t('profile.logout'),
        description: t('profile.tour.logout'),
        tooltipPosition: 'top',
        targetStyle: { borderRadius: 8 },
        scrollToTarget: { scrollRef: profileScrollRef, offset: -200, animated: false, getCurrentScrollOffset: () => profileScrollY.current },
      },
    ], {
      autoPositionTooltip: true,
      animationDuration: 250,
      nextButtonText: t('Next'),
      prevButtonText: t('Back'),
      skipButtonText: t('Skip'),
      doneButtonText: t('Done'),
      renderTooltip,
    });
  }, [startTour, t, isTechnicianRole, renderTooltip]);

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showLogoutConfirmation, showConfirmation, hideConfirmation } = useConfirmationPopup();

  // Watch for language changes and force re-render
  useEffect(() => {
    setLanguage(i18n.language);
    
    const handleLanguageChange = (lng: string) => {
      setLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      setUserDetails(profile);
      setIsCompanyMode(profile?.isCompany ?? false);
    } catch (error) {
      showError(t('Failed to load profile'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCompanyMode = () => {
    if (isSwitchingCompany) return;
    if (isCompanyMode) {
      // Switch back to individual – no Wathq needed
      switchToIndividual();
    } else {
      // Show company registration sheet for CR + name
      setShowCompanySheet(true);
    }
  };

  const switchToIndividual = async () => {
    setIsSwitchingCompany(true);
    try {
      await updateProfile({ isCompany: false });
      setIsCompanyMode(false);
      await fetchUserProfile();
    } catch (error: any) {
      showError(error.message || t('Failed to update profile'), t('Error'));
    } finally {
      setIsSwitchingCompany(false);
    }
  };

  const handleCompanyConfirm = async (companyName: string, crNumber: string) => {
    setShowCompanySheet(false);
    const nationalId = userDetails?.nationalId ?? '';
    if (!nationalId) {
      showError(t('National ID is required for company verification'), t('Error'));
      return;
    }
    setIsSwitchingCompany(true);
    try {
      // Step 1: Verify via Wathq
      const result = await verifyWathq(nationalId, crNumber);
      if (!result.authorized) {
        showError(result.message || t('Wathq verification failed. Your National ID is not authorized for this CR.'), t('Verification Failed'));
        return;
      }
      // Step 2: Update profile to company mode
      await updateProfile({ isCompany: true, companyName, crNumber, nationalId });
      setIsCompanyMode(true);
      await fetchUserProfile();
    } catch (error: any) {
      showError(error.message || t('Failed to verify company'), t('Error'));
    } finally {
      setIsSwitchingCompany(false);
    }
  };

  const handleChangeProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError(t('Permission to access photos is required'), t('Error'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setIsUploadingImage(true);
      const { profileImage } = await uploadProfileImage(result.assets[0]);
      if (userDetails) {
        setUserDetails({ ...userDetails, avatar: profileImage, profileImage });
      }
      showSuccess(t('Profile photo updated'), t('Success'));
    } catch (error: any) {
      showError(error.message || t('Failed to upload photo'), t('Error'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteAccount = () => {
    showConfirmation(
      t('Delete Account'),
      t('Are you sure you want to permanently delete your account? This action cannot be undone.'),
      async () => {
        try {
          await deleteAccount();
          await storage.clearAuthData();
          showSuccess(t('Account deleted successfully'), t('Success'));
          setTimeout(() => onLogout(), 1500);
        } catch (error: any) {
          showError(error.message || t('Failed to delete account'), t('Error'));
        }
      },
      { confirmText: t('Yes, Delete'), confirmStyle: 'destructive' }
    );
  };

  const handleLogout = () => {
    showLogoutConfirmation(
      t('profile.logout'),
      t('profile.confirmLogout'),
      onLogout
    );
  };

  const toggleLanguage = async () => {
    const currentLang = i18n.language;
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    await storage.saveLanguage(newLang);
    try {
      await i18n.changeLanguage(newLang);
      setLanguage(newLang);
    } catch {
      // silently handle language change error
    }
  };

  const cycleFontSize = () => {
    const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(fontSizeScale);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setFontSizeScale(sizes[nextIndex]);
  };

  const getFontSizeLabel = () => {
    switch (fontSizeScale) {
      case 'small': return t('profile.fontSizeS');
      case 'medium': return t('profile.fontSizeM');
      case 'large': return t('profile.fontSizeL');
      default: return t('profile.fontSizeM');
    }
  };

  const handleToggleDarkMode = () => {
    toggleTheme();
  };

  // Theme-aware colors (memoized to avoid recalculation on every render)
  const themeColors = useMemo(() => ({
    bg: isDarkMode ? colors.background : FIGMA_COLORS.white,
    cardBg: isDarkMode ? colors.cardBackground : FIGMA_COLORS.white,
    text: isDarkMode ? colors.text : FIGMA_COLORS.textBody,
    headerText: isDarkMode ? colors.text : FIGMA_COLORS.primaryDark,
    secondaryText: isDarkMode ? colors.textSecondary : FIGMA_COLORS.textSecondary,
    divider: isDarkMode ? colors.border : FIGMA_COLORS.divider,
    primary: isDarkMode ? colors.primary : FIGMA_COLORS.primary,
    iconBg: isDarkMode ? colors.surface : FIGMA_COLORS.iconBg,
    statBg: isDarkMode ? colors.surface : FIGMA_COLORS.purpleLight,
    statBorder: isDarkMode ? colors.border : FIGMA_COLORS.purple,
    success: isDarkMode ? colors.success : FIGMA_COLORS.greenSuccess,
    successBg: isDarkMode ? 'rgba(26, 159, 120, 0.15)' : FIGMA_COLORS.greenLight,
    avatarBg: isDarkMode ? colors.surface : FIGMA_COLORS.primaryLight,
  }), [isDarkMode, colors]);
  const bgColor = themeColors.bg;
  const cardBgColor = themeColors.cardBg;
  const textColor = themeColors.text;
  const headerTextColor = themeColors.headerText;
  const secondaryTextColor = themeColors.secondaryText;
  const dividerColor = themeColors.divider;
  const iconBgColor = themeColors.iconBg;
  const statBgColor = themeColors.statBg;
  const statBorderColor = themeColors.statBorder;
  const successColor = themeColors.success;
  const successBgColor = themeColors.successBg;
  const avatarBgColor = themeColors.avatarBg;

  const technicianCertificateUrls = useMemo(() => {
    const c = userDetails?.certificates;
    if (!Array.isArray(c)) return [];
    return c.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  }, [userDetails?.certificates]);

  if (isLoading) {
    return <AnimatedLoadingScreen showMessage={false} />;
  }

  const user = userDetails;
  const isTechnician = isTechnicianRole;
  const isVerified = user?.status === 'APPROVED' || user?.status === 'VERIFIED';

  const technicianBioText = ((user?.description || user?.bio) ?? '').trim();
  const technicianAddressText = (user?.address ?? '').trim();

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Top Navigation Bar */}
      <View style={[styles.topNavBar, { backgroundColor: bgColor, borderBottomColor: dividerColor }]}>
        <Text style={[styles.pageTitle, { color: headerTextColor, fontFamily, fontSize: scaledSize(20) }]}>{t('profile.myProfile')}</Text>
        <TouchableOpacity
          onPress={handleStartProfileTour}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.tourIconBtn}
        >
          <Ionicons name="map-outline" size={24} color={primaryColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={profileScrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 120), paddingTop: 16 }}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => { profileScrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >

        {/* Main Profile Card */}
        <View
          ref={tourHeaderRef}
          collapsable={false}
          style={[styles.mainCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
        >
          {/* User Welcome Section - Clickable to open settings */}
          <TouchableOpacity
            style={styles.userWelcomeSection}
            onPress={() => onNavigateToEditProfile?.()}
          >
            <TouchableOpacity
              onPress={handleChangeProfileImage}
              disabled={isUploadingImage}
              style={[styles.profileImageContainer, { backgroundColor: avatarBgColor }]}
            >
              {isUploadingImage ? (
                <ActivityIndicator size="small" color={primaryColor} />
              ) : user?.avatar || user?.profileImage ? (
                <Image source={{ uri: user?.avatar || user?.profileImage }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person" size={24} color={primaryColor} />
              )}
            </TouchableOpacity>
            <View style={styles.userWelcomeText}>
              <Text style={[styles.welcomeLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                {t('profile.welcome')}
              </Text>
              <Text style={[styles.userName, { color: headerTextColor, fontFamily, fontSize: scaledSize(16) }]}>
                {user?.name || t('profile.usernamePlaceholder')}
              </Text>
            </View>
            <Ionicons 
              name={menuChevron} 
              size={24} 
              color={primaryColor} 
            />
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.cardDivider, { backgroundColor: dividerColor }]} />

          {/* My Info Section */}
          <View ref={tourMyInfoRef} collapsable={false} style={styles.myInfoSection}>
            <View style={styles.myInfoHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.myInfoTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                  {t('profile.myInfo')}
                </Text>
                <Text style={[styles.myInfoSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                  {isTechnician ? t('profile.technicianAccount') : t('profile.userAccount')}
                </Text>
            </View>
          </View>

            {/* Info Rows */}
            <View style={styles.infoRows}>
              {/* Account Status */}
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                  {t('profile.accountStatus')}
                </Text>
                <View style={[styles.verifiedBadge, { backgroundColor: successBgColor, borderColor: successColor }]}>
                  <Ionicons name="checkmark-circle" size={10} color={successColor} />
                  <Text style={[styles.verifiedText, { color: successColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {isVerified ? t('profile.verified') : t('profile.pending')}
                  </Text>
                </View>
              </View>

              {/* Email */}
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                  {t('profile.email')}
                </Text>
                <Text style={[styles.infoValue, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>
                  {user?.email || '-'}
                </Text>
              </View>

              {/* Phone Number */}
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                  {t('profile.phoneNumber')}
                </Text>
                <Text style={[styles.infoValue, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>
                  {user?.phone || user?.phoneNumber || '-'}
                </Text>
              </View>

              {isTechnician && !!technicianBioText && (
                <View style={[styles.infoRow, styles.infoRowMultiline]}>
                  <Text style={[styles.infoLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {t('Bio / Description')}
                  </Text>
                  <Text style={[styles.infoValue, styles.infoValueMultiline, { color: textColor, fontFamily, fontSize: scaledSize(14), textAlign: isRTL ? 'left' : 'right' }]}>
                    {technicianBioText}
                  </Text>
                </View>
              )}
              {isTechnician && !!technicianAddressText && (
                <View style={[styles.infoRow, styles.infoRowMultiline]}>
                  <Text style={[styles.infoLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {t('Address')}
                  </Text>
                  <Text style={[styles.infoValue, styles.infoValueMultiline, { color: textColor, fontFamily, fontSize: scaledSize(14), textAlign: isRTL ? 'left' : 'right' }]}>
                    {technicianAddressText}
                  </Text>
                </View>
              )}
              {isTechnician && user?.yearsOfExperience != null && user.yearsOfExperience >= 0 && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {t('Years of Experience')}
                  </Text>
                  <Text style={[styles.infoValue, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {String(user.yearsOfExperience)}
                  </Text>
                </View>
              )}
              {isTechnician && technicianCertificateUrls.length > 0 && (
                <View style={styles.certificatesPreviewBlock}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                      {t('profile.certificatesUploaded')}
                    </Text>
                    <Text style={[styles.infoValue, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>
                      {String(technicianCertificateUrls.length)}
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.certificatesPreviewScroll}
                  >
                    {technicianCertificateUrls.map((uri, i) => (
                      <TouchableOpacity
                        key={`${i}-${uri.slice(-48)}`}
                        activeOpacity={0.85}
                        onPress={() => Linking.openURL(uri)}
                      >
                        <Image
                          source={{ uri }}
                          style={[
                            styles.certificateThumb,
                            { borderColor: dividerColor, backgroundColor: isDarkMode ? colors.surface : FIGMA_COLORS.iconBg },
                          ]}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
                </View>
                </View>

          {/* Stats — property/user metrics; less relevant on technician home profile */}
          {!isTechnician && (
            <View collapsable={false} style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: statBgColor, borderColor: statBorderColor }]}>
              <Text style={[styles.statNumber, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{user?.propertiesCount ?? 0}</Text>
              <Text style={[styles.statLabel, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{t('profile.properties')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: statBgColor, borderColor: statBorderColor }]}>
              <Text style={[styles.statNumber, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{user?.appointmentsCount ?? 0}</Text>
              <Text style={[styles.statLabel, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{t('profile.appointments')}</Text>
                  </View>
            <View style={[styles.statCard, { backgroundColor: statBgColor, borderColor: statBorderColor }]}>
              <Text style={[styles.statNumber, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{user?.ticketsCount ?? 0}</Text>
              <Text style={[styles.statLabel, { color: textColor, fontFamily, fontSize: scaledSize(14) }]}>{t('profile.ticket')}</Text>
                    </View>
                  </View>
          )}
                  </View>

        {/* Account Type Toggle — Company / Individual (matches iOS CompanyModeToggleView) */}
        <View
          collapsable={false}
          style={[styles.companyToggleCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
        >
          <View style={styles.companyToggleRow}>
            <View style={[styles.companyToggleIcon, { backgroundColor: isCompanyMode ? 'rgba(52,199,89,0.15)' : 'rgba(255,149,0,0.12)' }]}>
              <Ionicons
                name={isCompanyMode ? 'business' : 'person'}
                size={18}
                color={isCompanyMode ? '#34C759' : '#FF9500'}
              />
            </View>
            <View style={styles.companyToggleText}>
              <Text style={[styles.companyToggleTitle, { color: textColor, fontFamily: boldFontFamily, fontSize: scaledSize(16) }]}>
                {t('Account Type')}
              </Text>
              <Text style={[styles.companyToggleSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(12) }]}>
                {isCompanyMode ? t('Company Account') : t('Individual Account')}
              </Text>
            </View>
            {isSwitchingCompany ? (
              <ActivityIndicator size="small" color={primaryColor} />
            ) : (
              <TouchableOpacity onPress={handleToggleCompanyMode} activeOpacity={0.8}>
                <View style={[styles.companyToggleCapsule, { backgroundColor: isCompanyMode ? '#34C759' : '#FF9500' }]}>
                  <Ionicons
                    name={isCompanyMode ? 'business' : 'person'}
                    size={11}
                    color="#FFFFFF"
                  />
                  <Text style={[styles.companyToggleCapsuleText, { fontFamily: boldFontFamily }]}>
                    {isCompanyMode ? t('Company') : t('Individual')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
          {isCompanyMode && userDetails?.companyName ? (
            <>
              <View style={[styles.companyToggleDivider, { backgroundColor: dividerColor }]} />
              <View style={styles.companyInfoRow}>
                <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                <View style={styles.companyInfoText}>
                  <Text style={[{ color: textColor, fontFamily: boldFontFamily, fontSize: scaledSize(14) }]}>
                    {userDetails.companyName}
                  </Text>
                  {userDetails.crNumber ? (
                    <Text style={[{ color: secondaryTextColor, fontFamily, fontSize: scaledSize(12) }]}>
                      CR: {userDetails.crNumber}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.companyVerifiedBadge}>
                  <Text style={[styles.companyVerifiedText, { fontFamily: boldFontFamily }]}>
                    {t('Verified')}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Technician Menu Items – same order as web: Portfolio, Subscription, Services, Small Task Types, Working Areas */}
        {isTechnician && (
          <>
            {/* My Portfolio */}
            <View
              ref={tourPortfolioRef}
              collapsable={false}
              style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => onNavigateToPortfolio?.()}
                activeOpacity={0.7}
              >
                <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
                  <Ionicons name="briefcase-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                    {t('profile.myPortfolio')}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {t('profile.addYourWorksHere')}
                  </Text>
                </View>
                <Ionicons name={menuChevron} size={24} color={primaryColor} />
              </TouchableOpacity>
            </View>

            {/* My Subscription */}
            <View
              ref={tourSubscriptionRef}
              collapsable={false}
              style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => onNavigateToSubscription?.()}
                activeOpacity={0.7}
              >
                <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
                  <Ionicons name="card-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                    {t('profile.mySubscription')}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {t('profile.manageYourSubscriptions')}
                  </Text>
                </View>
                <Ionicons name={menuChevron} size={24} color={primaryColor} />
              </TouchableOpacity>
            </View>

            {/* Services */}
            <View
              ref={tourServicesRef}
              collapsable={false}
              style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => onNavigateToServices?.()}
                activeOpacity={0.7}
              >
                <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
                  <Ionicons name="construct-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                    {t('profile.services')}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {t('profile.manageYourServices')}
                  </Text>
                </View>
                <Ionicons name={menuChevron} size={24} color={primaryColor} />
              </TouchableOpacity>
            </View>

            {/* Small Task Types / Availability – ensure clickable with explicit handler and hitSlop */}
            <View
              style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  if (onNavigateToSmallTaskTypes) onNavigateToSmallTaskTypes();
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
                  <Ionicons name="list-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                    {t('profile.smallTaskTypes')}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {t('profile.manageSubscribedTaskTypes')}
                  </Text>
                </View>
                <Ionicons name={menuChevron} size={24} color={primaryColor} />
              </TouchableOpacity>
            </View>

            {/* Working Areas / Regions – ensure clickable with hitSlop and explicit handler */}
            <View
              style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  if (onNavigateToRegions) onNavigateToRegions();
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
                  <Ionicons name="location-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                    {t('Working Areas')}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {t('profile.addRegionsWhereYouOfferServices')}
                  </Text>
                </View>
                <Ionicons
                  name={menuChevron}
                  size={24}
                  color={primaryColor}
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* User Menu Items */}
        {!isTechnician && (
          <View
            collapsable={false}
            style={[styles.userMenuCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
          >
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => onNavigateToEditProfile?.()}
            >
              <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
                <Ionicons name="person-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                  {t('profile.myData')}
                </Text>
                <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                  {t('profile.editPersonalInfo')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Support Center Card */}
        <View
          collapsable={false}
          style={[styles.userMenuCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
        >
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => onNavigateToSupportTickets?.()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name="headset-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                {t('profile.supportCenter')}
              </Text>
              <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                {t('profile.supportCenterDesc')}
              </Text>
            </View>
            <Ionicons 
              name={menuChevron} 
              size={24} 
              color={primaryColor} 
            />
          </TouchableOpacity>
        </View>

        {/* Transactions (Payment History) – same as web label */}
        <View
          collapsable={false}
          style={[styles.userMenuCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
        >
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => onNavigateToPaymentHistory?.()}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name="receipt-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                {t('profile.transactions')}
              </Text>
              <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                {t('profile.viewTransactionsAndRefunds')}
              </Text>
            </View>
            <Ionicons 
              name={menuChevron} 
              size={24} 
              color={primaryColor} 
            />
          </TouchableOpacity>
        </View>

        {/* App Walkthrough Card */}
        <View style={[styles.userMenuCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => onNavigateToOnboarding?.()}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name="play-circle-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                {t('profile.appWalkthrough', { defaultValue: 'App Walkthrough' })}
              </Text>
              <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                {t('profile.appWalkthroughDesc', { defaultValue: 'Replay the app introduction' })}
              </Text>
            </View>
            <Ionicons name={menuChevron} size={24} color={primaryColor} />
          </TouchableOpacity>
        </View>

        <View
          ref={tourSettingsRef}
          collapsable={false}
          style={[styles.settingsCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
        >
          {/* Language */}
          <View collapsable={false}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={toggleLanguage}
            >
            <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name="globe-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                {t('profile.language')}
              </Text>
              <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                {t('profile.appLanguage')}
              </Text>
            </View>
            <View style={[styles.languageBadge, { backgroundColor: iconBgColor }]}>
              <Text style={[styles.languageBadgeText, { color: isDarkMode ? colors.text : '#666666', fontFamily, fontSize: scaledSize(14) }]}>
              {language === 'en' ? t('profile.langEn') : t('profile.langAr')}
            </Text>
            </View>
            </TouchableOpacity>
          </View>

          {/* Font Size */}
          <View collapsable={false}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={cycleFontSize}
            >
            <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name="text-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                {t('profile.fontSize')}
              </Text>
              <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                {t('profile.textSize')}
              </Text>
            </View>
            <View style={styles.fontSizeSelector}>
              <TouchableOpacity 
                style={[
                  styles.fontSizeOption, 
                  { backgroundColor: fontSizeScale === 'small' ? primaryColor : iconBgColor }
                ]}
                onPress={() => setFontSizeScale('small')}
              >
                <Text style={[
                  styles.fontSizeOptionText, 
                  { 
                    color: fontSizeScale === 'small' ? FIGMA_COLORS.white : (isDarkMode ? colors.text : '#666666'),
                    fontFamily,
                    fontSize: 12,
                  }
                ]}>
                  {t('profile.fontSizeS')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.fontSizeOption, 
                  { backgroundColor: fontSizeScale === 'medium' ? primaryColor : iconBgColor }
                ]}
                onPress={() => setFontSizeScale('medium')}
              >
                <Text style={[
                  styles.fontSizeOptionText, 
                  { 
                    color: fontSizeScale === 'medium' ? FIGMA_COLORS.white : (isDarkMode ? colors.text : '#666666'),
                    fontFamily,
                    fontSize: 14,
                  }
                ]}>
                  {t('profile.fontSizeM')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.fontSizeOption, 
                  { backgroundColor: fontSizeScale === 'large' ? primaryColor : iconBgColor }
                ]}
                onPress={() => setFontSizeScale('large')}
              >
                <Text style={[
                  styles.fontSizeOptionText, 
                  { 
                    color: fontSizeScale === 'large' ? FIGMA_COLORS.white : (isDarkMode ? colors.text : '#666666'),
                    fontFamily,
                    fontSize: 16,
                  }
                ]}>
                  {t('profile.fontSizeL')}
                </Text>
              </TouchableOpacity>
            </View>
            </TouchableOpacity>
          </View>

          {/* Dark Mode */}
          <View  collapsable={false}>
            <View style={styles.settingItem}>
            <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
              <Ionicons name="moon-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                {t('profile.darkMode')}
              </Text>
              <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                {isDarkMode ? t('profile.on') : t('profile.off')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleToggleDarkMode} activeOpacity={0.7}>
              <View style={[
                styles.toggleSwitch,
                { backgroundColor: isDarkMode ? primaryColor : 'rgba(153, 153, 153, 0.5)' },
              ]}>
                <View style={[
                  styles.toggleThumb,
                  isRTL
                    ? (isDarkMode ? styles.toggleThumbLeft : styles.toggleThumbRight)
                    : (isDarkMode ? styles.toggleThumbRight : styles.toggleThumbLeft),
                ]} />
              </View>
            </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* Delete Account Card */}
        <View
          ref={tourDeleteRef}
          collapsable={false}
          style={[styles.userMenuCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
        >
          <TouchableOpacity 
            style={styles.deleteAccountItem}
            onPress={handleDeleteAccount}
          >
            <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(212, 24, 61, 0.15)' }]}>
              <Ionicons name="trash-outline" size={24} color="#D4183D" />
            </View>
            <Text style={[styles.deleteAccountText, { fontFamily, fontSize: scaledSize(16) }]}>
              {t('profile.deleteAccount')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logout Card */}
        <View
          ref={tourLogoutRef}
          collapsable={false}
          style={[styles.logoutCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}
        >
        <TouchableOpacity 
          style={styles.logoutItem}
          onPress={handleLogout}
        >
          <View style={styles.logoutIconContainer}>
              <Ionicons name="log-out-outline" size={24} color={FIGMA_COLORS.purple} />
          </View>
            <Text style={[styles.logoutText, { fontFamily, fontSize: scaledSize(16) }]}>{t('profile.logout')}</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      
      {/* Confirmation Popup */}
      <ConfirmationPopup
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmStyle={confirmState.confirmStyle}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirmation}
      />

      {/* Company Registration Sheet (Wathq verification) */}
      <CompanyRegistrationModal
        visible={showCompanySheet}
        nationalId={userDetails?.nationalId ?? ''}
        onConfirm={handleCompanyConfirm}
        onCancel={() => setShowCompanySheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },

  // Top Navigation Bar
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  tourIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Page Title
  pageTitleContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '400',
  },

  // Main Card
  mainCard: {
    marginHorizontal: 16,
    borderRadius: 6,
    borderWidth: 0.5,
    paddingVertical: 16,
  },

  // User Welcome Section
  userWelcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 24,
  },
  profileImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userWelcomeText: {
    flex: 1,
    gap: 6,
  },
  welcomeLabel: {
    fontSize: 14,
    fontWeight: '300',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Card Divider
  cardDivider: {
    height: 0.5,
    marginHorizontal: 16,
    marginVertical: 6,
  },

  // My Info Section
  myInfoSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  myInfoHeader: {
    marginBottom: 16,
  },
  myInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  myInfoSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  infoRows: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRowMultiline: {
    alignItems: 'flex-start',
  },
  infoValueMultiline: {
    flex: 1,
    marginStart: 12,
  },
  certificatesPreviewBlock: {
    gap: 8,
  },
  certificatesPreviewScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  certificateThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '400',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: '400',
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 0.5,
    padding: 8,
    gap: 6,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '200',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '400',
  },

  // Settings Card
  settingsCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 6,
    borderWidth: 0.5,
    padding: 16,
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },

  // Language Badge
  languageBadge: {
    paddingHorizontal: 15,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  languageBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Font Size Selector
  fontSizeSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  fontSizeOption: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeOptionText: {
    fontWeight: '600',
    textAlign: 'center',
  },

  // Toggle Switch (alignSelf for thumb so RTL/AR works without scaleX)
  toggleSwitch: {
    width: 48,
    height: 24,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: FIGMA_COLORS.white,
  },
  toggleThumbLeft: {
    alignSelf: 'flex-start',
  },
  toggleThumbRight: {
    alignSelf: 'flex-end',
  },

  // Technician Card
  technicianCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    padding: 16,
  },

  // User Menu Card
  userMenuCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 6,
    borderWidth: 0.5,
    padding: 16,
    gap: 16,
    zIndex: 10,
    elevation: 5,
  },

  // Company Toggle
  companyToggleCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 15,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
      android: { elevation: 2 },
    }),
  },
  companyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  companyToggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyToggleText: {
    flex: 1,
  },
  companyToggleTitle: {
    fontWeight: '700',
  },
  companyToggleSubtitle: {
    marginTop: 2,
  },
  companyToggleCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  companyToggleCapsuleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  companyToggleDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  companyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  companyInfoText: {
    flex: 1,
  },
  companyVerifiedBadge: {
    backgroundColor: 'rgba(52,199,89,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  companyVerifiedText: {
    color: '#34C759',
    fontSize: 10,
    fontWeight: '700',
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 8,
    zIndex: 20,
  },

  // Logout Card
  logoutCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 6,
    borderWidth: 0.5,
    padding: 16,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: FIGMA_COLORS.purple,
  },

  deleteAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 8,
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4183D',
  },

});
