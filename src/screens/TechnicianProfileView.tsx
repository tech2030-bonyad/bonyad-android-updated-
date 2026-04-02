import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useRTL } from '../hooks/useRTL';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTechnicianProfile, TechnicianProfile } from '../services/TechnicianService';
import { storage } from '../utils/storage';
import { generateRoomId } from '../utils/chatUtils';
import AnimatedLoadingScreen from '../components/AnimatedLoadingScreen';
import { getGlassTabBarOverlayHeight } from '../components/GlassTabBar';

const { width: SCREEN_W } = Dimensions.get('window');

interface TechnicianProfileViewProps {
  technicianId: number;
  onBack: () => void;
  onChat?: (roomId: string, technicianId: number, technicianName: string) => void;
  onHire?: (technicianId: number, technicianName: string) => void;
}

export default function TechnicianProfileView({
  technicianId,
  onBack,
  onChat,
  onHire,
}: TechnicianProfileViewProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();
  const { arrowBackIcon } = useRTL();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';

  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  // Slide-in animation
  const slideX = useRef(new Animated.Value(SCREEN_W)).current;

  useEffect(() => {
    Animated.spring(slideX, {
      toValue: 0,
      tension: 280,
      friction: 28,
      useNativeDriver: true,
    }).start();
    loadProfile();
  }, [technicianId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await getTechnicianProfile(technicianId);
      setProfile(data);
    } catch (e) {
      console.error('❌ [TechnicianProfileView] Error loading profile:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Animated.timing(slideX, {
      toValue: SCREEN_W,
      duration: 220,
      useNativeDriver: true,
    }).start(onBack);
  };

  const handleChat = async () => {
    if (!profile || !onChat) return;
    setChatLoading(true);
    try {
      const currentUserId = await storage.getUserId();
      if (currentUserId) {
        const roomId = generateRoomId(currentUserId, technicianId);
        onChat(roomId, technicianId, profile.name);
      }
    } catch (e) {
      console.error('❌ [TechnicianProfileView] Error opening chat:', e);
    } finally {
      setChatLoading(false);
    }
  };

  const handleHire = () => {
    if (!profile || !onHire) return;
    onHire(technicianId, profile.name);
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - Math.ceil(rating);
    return (
      <View style={styles.starsRow}>
        {Array.from({ length: full }).map((_, i) => (
          <Ionicons key={`f${i}`} name="star" size={14} color="#F59E0B" />
        ))}
        {half && <Ionicons key="h" name="star-half" size={14} color="#F59E0B" />}
        {Array.from({ length: empty }).map((_, i) => (
          <Ionicons key={`e${i}`} name="star-outline" size={14} color="#F59E0B" />
        ))}
      </View>
    );
  };

  if (chatLoading) {
    return (
      <Animated.View style={[styles.screen, { backgroundColor: colors.background, transform: [{ translateX: slideX }] }]}>
        <AnimatedLoadingScreen message={t('Opening chat...')} />
      </Animated.View>
    );
  }

  if (isLoading) {
    return (
      <Animated.View style={[styles.screen, { backgroundColor: colors.background, transform: [{ translateX: slideX }] }]}>
        <AnimatedLoadingScreen message={t('Loading profile...')} />
      </Animated.View>
    );
  }

  if (!profile) {
    return (
      <Animated.View style={[styles.screen, styles.center, { backgroundColor: colors.background, transform: [{ translateX: slideX }] }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{t('Failed to load profile')}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={loadProfile}>
          <Text style={styles.retryBtnText}>{t('Retry')}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const name = profile.name || '';
  const rating = profile.averageRating ?? 0;
  const totalReviews = profile.totalReviews ?? 0;
  const completed = profile.completedProjects ?? 0;
  const activeBids = profile.activeBids ?? 0;
  const years = (profile as any).yearsOfExperience;
  const region = isRTL ? (profile as any).regionNameAr : (profile as any).regionNameEn;
  const description = (profile as any).description;
  const services: any[] = (profile as any).services ?? [];
  const reviews: any[] = (profile as any).reviews ?? [];

  return (
    <Animated.View style={[styles.screen, { transform: [{ translateX: slideX }] }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={arrowBackIcon} size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(16) }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: getGlassTabBarOverlayHeight(insets.bottom) + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: colors.cardBackground }]}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {profile.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={[colors.primary, colors.primary + 'AA']} style={styles.avatar}>
                <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
            {(profile as any).subscriptionStatus === 'ACTIVE' && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </View>

          <Text style={[styles.name, { color: colors.text, fontSize: scaledSize(20) }]}>{name}</Text>

          {/* Rating row */}
          <View style={styles.ratingRow}>
            {renderStars(rating)}
            <Text style={[styles.ratingNum, { color: colors.text }]}>{rating.toFixed(1)}</Text>
            <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>({totalReviews})</Text>
          </View>

          {/* Location + experience pills */}
          <View style={styles.pillsRow}>
            {!!region && (
              <View style={[styles.pill, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="location-outline" size={13} color={colors.primary} />
                <Text style={[styles.pillText, { color: colors.primary }]}>{region}</Text>
              </View>
            )}
            {!!years && (
              <View style={[styles.pill, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="time-outline" size={13} color={colors.primary} />
                <Text style={[styles.pillText, { color: colors.primary }]}>{years} {t('yrs')}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.text }]}>{completed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('Completed')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.text }]}>{activeBids}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('Active Bids')}</Text>
            </View>
            {!!rating && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: colors.text }]}>{rating.toFixed(1)}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('Rating')}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* About */}
        {!!description && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(15) }]}>{t('About')}</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>{description}</Text>
          </View>
        )}

        {/* Services */}
        {services.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(15) }]}>{t('Services')}</Text>
            <View style={styles.chipsWrap}>
              {services.map((s: any) => (
                <View key={s.id} style={[styles.chip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
                  <Text style={[styles.chipText, { color: colors.primary, fontSize: scaledSize(13) }]}>
                    {isRTL ? s.nameAr : s.nameEn}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(15) }]}>
              {t('Reviews')} ({reviews.length})
            </Text>
            {reviews.map((r: any) => (
              <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.reviewTop}>
                  <View style={[styles.reviewAvatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.reviewInitial, { color: colors.primary }]}>
                      {(r.reviewerName || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={[styles.reviewerName, { color: colors.text, fontSize: scaledSize(14) }]}>{r.reviewerName}</Text>
                    <Text style={[styles.reviewDate, { color: colors.textSecondary, fontSize: scaledSize(11) }]}>
                      {new Date(r.createdAt).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  {renderStars(r.rating)}
                </View>
                {!!r.comment && (
                  <Text style={[styles.reviewComment, { color: colors.textSecondary, fontSize: scaledSize(13) }]}>{r.comment}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA bar */}
      <View style={[styles.ctaBar, { backgroundColor: colors.cardBackground, borderTopColor: colors.border, paddingBottom: getGlassTabBarOverlayHeight(insets.bottom) + 4 }]}>
        {onChat && (
          <TouchableOpacity
            style={[styles.ctaBtn, styles.ctaBtnOutline, { borderColor: colors.primary }]}
            onPress={handleChat}
            activeOpacity={0.75}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={[styles.ctaBtnText, { color: colors.primary, fontSize: scaledSize(15) }]}>{t('Chat')}</Text>
          </TouchableOpacity>
        )}
        {onHire && (
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={handleHire}
            activeOpacity={0.75}
          >
            <Ionicons name="briefcase-outline" size={18} color="#fff" />
            <Text style={[styles.ctaBtnText, { color: '#fff', fontSize: scaledSize(15) }]}>{t('Hire')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    ...Platform.select({ android: { elevation: 0 } }),
  },
  center: { justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { flex: 1, fontWeight: '600', textAlign: 'center' },
  // Hero
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 34, fontWeight: '700', color: '#fff' },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: { fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  starsRow: { flexDirection: 'row', gap: 2 },
  ratingNum: { fontWeight: '700', marginLeft: 4 },
  ratingCount: { fontSize: 12 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', width: '100%', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, marginTop: 4 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 36, alignSelf: 'center' },
  // Sections
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 18,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: { fontWeight: '700', marginBottom: 10 },
  sectionBody: { lineHeight: 22 },
  // Chips (services)
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontWeight: '600' },
  // Reviews
  reviewCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginTop: 10 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  reviewInitial: { fontWeight: '700', fontSize: 15 },
  reviewerName: { fontWeight: '600' },
  reviewDate: { marginTop: 1 },
  reviewComment: { lineHeight: 20 },
  // CTA bar
  ctaBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  ctaBtnOutline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  ctaBtnText: { fontWeight: '700' },
  // Error
  errorText: { fontSize: 15, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
