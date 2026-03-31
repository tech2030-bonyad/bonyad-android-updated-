import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useRTL } from '../hooks/useRTL';
import { getUserProfile, uploadProfileImage, deleteAccount } from '../services/ProfileService';
import { storage } from '../utils/storage';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import AnimatedLoadingScreen from '../components/AnimatedLoadingScreen';

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
}: ProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme, toggleTheme } = useTheme();
  const { fontFamily, fontSizeScale, setFontSizeScale, scaledSize } = useFontFamily();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [language, setLanguage] = useState(i18n.language);
  const isDarkMode = theme === 'dark';
  const isArabic = i18n.language === 'ar';
  const { isRTL } = useRTL();
  // In AR, menu arrows point left (chevron-back); in LTR they point right (chevron-forward)
  const menuChevron = isRTL ? 'chevron-back' : 'chevron-forward';
  
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showLogoutConfirmation, showConfirmation, hideConfirmation } = useConfirmationPopup();

  // Watch for language changes and force re-render
  useEffect(() => {
    setLanguage(i18n.language);
    
    const handleLanguageChange = (lng: string) => {
      console.log('🌐 Language changed to:', lng);
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
    } catch (error) {
      console.error('Error fetching profile:', error);
      showError(t('Failed to load profile'), t('Error'));
    } finally {
      setIsLoading(false);
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
    } catch (error) {
      console.error('Error changing language:', error);
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

  // Theme-aware colors
  const bgColor = isDarkMode ? colors.background : FIGMA_COLORS.white;
  const cardBgColor = isDarkMode ? colors.cardBackground : FIGMA_COLORS.white;
  const textColor = isDarkMode ? colors.text : FIGMA_COLORS.textBody;
  const headerTextColor = isDarkMode ? colors.text : FIGMA_COLORS.primaryDark;
  const secondaryTextColor = isDarkMode ? colors.textSecondary : FIGMA_COLORS.textSecondary;
  const dividerColor = isDarkMode ? colors.border : FIGMA_COLORS.divider;
  const primaryColor = isDarkMode ? colors.primary : FIGMA_COLORS.primary;
  const iconBgColor = isDarkMode ? colors.surface : FIGMA_COLORS.iconBg;
  const statBgColor = isDarkMode ? colors.surface : FIGMA_COLORS.purpleLight;
  const statBorderColor = isDarkMode ? colors.border : FIGMA_COLORS.purple;
  const successColor = isDarkMode ? colors.success : FIGMA_COLORS.greenSuccess;
  const successBgColor = isDarkMode ? 'rgba(26, 159, 120, 0.15)' : FIGMA_COLORS.greenLight;
  const avatarBgColor = isDarkMode ? colors.surface : FIGMA_COLORS.primaryLight;

  const technicianCertificateUrls = useMemo(() => {
    const c = userDetails?.certificates;
    if (!Array.isArray(c)) return [];
    return c.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  }, [userDetails?.certificates]);

  if (isLoading) {
    return <AnimatedLoadingScreen showMessage={false} />;
  }

  const user = userDetails;
  const isTechnician = user?.role?.toUpperCase() === 'TECHNICIAN';
  const isVerified = user?.status === 'APPROVED' || user?.status === 'VERIFIED';

  const technicianBioText = ((user?.description || user?.bio) ?? '').trim();
  const technicianAddressText = (user?.address ?? '').trim();

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 120), paddingTop: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page Title */}
        <View style={styles.pageTitleContainer}>
          <Text style={[styles.pageTitle, { color: headerTextColor, fontFamily, fontSize: scaledSize(20) }]}>{t('profile.myProfile')}</Text>
        </View>

        {/* Main Profile Card */}
        <View style={[styles.mainCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
          {/* User Welcome Section - Clickable to open settings */}
          <TouchableOpacity 
            style={styles.userWelcomeSection} 
            onPress={() => {
              if (isTechnician) {
                onNavigateToEditProfile?.();
              } else {
                onNavigateToEditProfile?.();
              }
            }}
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
          <View style={styles.myInfoSection}>
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
          <View style={styles.statsContainer}>
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

        {/* Settings Section Card */}
       
        {/* Technician Menu Items – same order as web: Portfolio, Subscription, Availability, Services, Small Task Types, Working Areas */}
        {isTechnician && (
          <>
            {/* My Portfolio */}
            <View style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
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
            <View style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
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

            {/* Availability */}
            <View style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => onNavigateToAvailability?.()}
                activeOpacity={0.7}
              >
                <View style={[styles.settingIconContainer, { backgroundColor: iconBgColor }]}>
                  <Ionicons name="calendar-outline" size={24} color={isDarkMode ? colors.textSecondary : '#666666'} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingTitle, { color: textColor, fontFamily, fontSize: scaledSize(16) }]}>
                    {t('profile.availability')}
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: secondaryTextColor, fontFamily, fontSize: scaledSize(14) }]}>
                    {t('profile.setWhenAvailable')}
                  </Text>
                </View>
                <Ionicons name={menuChevron} size={24} color={primaryColor} />
              </TouchableOpacity>
            </View>

            {/* Services */}
            <View style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
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

            {/* Small Task Types – ensure clickable with explicit handler and hitSlop */}
            <View style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
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

            {/* Working Areas – ensure clickable with hitSlop and explicit handler */}
            <View style={[styles.technicianCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
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
          <View style={[styles.userMenuCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
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
        <View style={[styles.userMenuCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.log('🎧 Support Center pressed, handler:', typeof onNavigateToSupportTickets);
              if (onNavigateToSupportTickets) {
                onNavigateToSupportTickets();
              } else {
                console.error('❌ onNavigateToSupportTickets is undefined!');
              }
            }}
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
        <View style={[styles.userMenuCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
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

         <View style={[styles.settingsCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
          {/* Language */}
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

          {/* Font Size */}
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

          {/* Dark Mode */}
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

        {/* Delete Account Card */}
        <View style={[styles.userMenuCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
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
        <View style={[styles.logoutCard, { backgroundColor: cardBgColor, borderColor: dividerColor }]}>
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
