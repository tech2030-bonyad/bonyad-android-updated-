import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useRTL } from '../hooks/useRTL';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTechniciansByService } from '../services/TechnicianService';
import TechnicianProfileView from './TechnicianProfileView';
import { generateRoomId } from '../utils/chatUtils';
import { storage } from '../utils/storage';
import AnimatedLoadingScreen from '../components/AnimatedLoadingScreen';
import { getGlassTabBarOverlayHeight } from '../components/GlassTabBar';
import WathqBadge from '../components/WathqBadge';

const { width: SCREEN_W } = Dimensions.get('window');

interface ServiceTechniciansScreenProps {
  serviceId: number;
  serviceName?: string;
  onBack?: () => void;
  onNavigateToTechnicianProfile?: (technicianId: number) => void;
  onNavigateToChat?: (roomId: string, receiverId: number, receiverName: string) => void;
  onNavigateToBooking?: (technicianId: number, technicianName?: string) => void;
}

export default function ServiceTechniciansScreen({
  serviceId,
  serviceName,
  onBack,
  onNavigateToTechnicianProfile,
  onNavigateToChat,
  onNavigateToBooking,
}: ServiceTechniciansScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();
  const { arrowBackIcon } = useRTL();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';

  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [chatLoadingId, setChatLoadingId] = useState<number | null>(null);

  // Slide-in animation
  const slideX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadTechnicians();
  }, [serviceId]);

  const handleBack = () => {
    Animated.timing(slideX, {
      toValue: SCREEN_W,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onBack?.());
  };

  const loadTechnicians = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTechniciansByService(serviceId);
      setTechnicians(data);
    } catch (err: any) {
      setError(err.message || t('Failed to load technicians'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChat = async (technicianId: number, technicianName?: string) => {
    if (onNavigateToChat) {
      setChatLoadingId(technicianId);
      try {
        const currentUserId = await storage.getUserId();
        if (currentUserId) {
          const roomId = generateRoomId(currentUserId, technicianId);
          onNavigateToChat(roomId, technicianId, technicianName || `Technician ${technicianId}`);
        }
      } catch (e) {
        console.error('❌ [ServiceTechniciansScreen] Error opening chat:', e);
      } finally {
        setChatLoadingId(null);
      }
    }
  };

  const handleViewProfile = (technicianId: number) => {
    if (onNavigateToTechnicianProfile) {
      onNavigateToTechnicianProfile(technicianId);
    } else {
      setSelectedTechnicianId(technicianId);
    }
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating ?? 0);
    const half = (rating ?? 0) % 1 >= 0.5;
    const empty = 5 - Math.ceil(rating ?? 0);
    return (
      <View style={styles.starsRow}>
        {Array.from({ length: full }).map((_, i) => (
          <Ionicons key={`f${i}`} name="star" size={12} color="#F59E0B" />
        ))}
        {half && <Ionicons key="h" name="star-half" size={12} color="#F59E0B" />}
        {Array.from({ length: Math.max(empty, 0) }).map((_, i) => (
          <Ionicons key={`e${i}`} name="star-outline" size={12} color="#F59E0B" />
        ))}
      </View>
    );
  };

  const renderCard = ({ item, index }: { item: any; index: number }) => {
    const name: string = item.name || '';
    const rating: number = item.averageRating ?? 0;
    const reviews: number = item.totalReviews ?? 0;
    const region: string = isRTL && item.regionNameAr ? item.regionNameAr : (item.regionNameEn || '');
    const years: number | null = item.yearsOfExperience ?? null;
    const services: any[] = item.services ?? [];
    const isChatLoading = chatLoadingId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => handleViewProfile(item.id)}
        style={[styles.card, { backgroundColor: colors.cardBackground }]}
      >
        {/* Top row: avatar + info */}
        <View style={styles.cardTop}>
          <TouchableOpacity onPress={() => handleViewProfile(item.id)} activeOpacity={0.8}>
            {item.profileImage ? (
              <Image source={{ uri: item.profileImage }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[colors.primary, colors.primary + 'AA']}
                style={styles.avatar}
              >
                <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <View style={styles.cardInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.cardName, { color: colors.text, fontSize: scaledSize(15), flexShrink: 1 }]} numberOfLines={1}>
                {name}
              </Text>
              {item.isCompany && <WathqBadge variant="inline" />}
            </View>

            <View style={styles.ratingRow}>
              {renderStars(rating)}
              <Text style={[styles.ratingNum, { color: colors.text, fontSize: scaledSize(12) }]}>
                {rating.toFixed(1)}
              </Text>
              <Text style={[styles.ratingCount, { color: colors.textSecondary, fontSize: scaledSize(11) }]}>
                ({reviews})
              </Text>
            </View>

            <View style={styles.pillsRow}>
              {!!region && (
                <View style={[styles.pill, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="location-outline" size={11} color={colors.primary} />
                  <Text style={[styles.pillText, { color: colors.primary, fontSize: scaledSize(11) }]}>
                    {region}
                  </Text>
                </View>
              )}
              {!!years && (
                <View style={[styles.pill, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="time-outline" size={11} color={colors.primary} />
                  <Text style={[styles.pillText, { color: colors.primary, fontSize: scaledSize(11) }]}>
                    {years} {t('yrs')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Company info */}
        {item.isCompany && (
          <View style={{ marginBottom: 10 }}>
            <WathqBadge companyName={item.companyName} crNumber={item.crNumber} variant="compact" />
          </View>
        )}

        {/* Service chips */}
        {services.length > 0 && (
          <View style={styles.chipsRow}>
            {services.slice(0, 3).map((s: any, i: number) => (
              <View key={i} style={[styles.chip, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '28' }]}>
                <Text style={[styles.chipText, { color: colors.primary, fontSize: scaledSize(11) }]}>
                  {isRTL && s.nameAr ? s.nameAr : s.nameEn}
                </Text>
              </View>
            ))}
            {services.length > 3 && (
              <Text style={[styles.moreChips, { color: colors.textSecondary, fontSize: scaledSize(11) }]}>
                +{services.length - 3}
              </Text>
            )}
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* CTA buttons */}
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={[styles.ctaBtn, styles.ctaBtnOutline, { borderColor: colors.primary }]}
            onPress={() => handleChat(item.id, item.name)}
            activeOpacity={0.75}
            disabled={isChatLoading}
          >
            <Ionicons name={isChatLoading ? 'hourglass-outline' : 'chatbubble-outline'} size={16} color={colors.primary} />
            <Text style={[styles.ctaBtnText, { color: colors.primary, fontSize: scaledSize(13) }]}>
              {t('Chat')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={() => onNavigateToBooking?.(item.id, item.name)}
            activeOpacity={0.75}
          >
            <Ionicons name="briefcase-outline" size={16} color="#fff" />
            <Text style={[styles.ctaBtnText, { color: '#fff', fontSize: scaledSize(13) }]}>
              {t('Hire')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Inline TechnicianProfileView (when parent doesn't handle profile nav)
  if (selectedTechnicianId) {
    return (
      <TechnicianProfileView
        technicianId={selectedTechnicianId}
        onBack={() => setSelectedTechnicianId(null)}
        onChat={async (roomId, receiverId, receiverName) => {
          setSelectedTechnicianId(null);
          onNavigateToChat?.(roomId, receiverId, receiverName);
        }}
        onHire={(techId, techName) => {
          setSelectedTechnicianId(null);
          onNavigateToBooking?.(techId, techName);
        }}
      />
    );
  }

  return (
    <Animated.View style={[styles.screen, { backgroundColor: colors.background, transform: [{ translateX: slideX }] }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <BackArrowIonicons variant="arrow" size={22} color={colors.text}/>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(16) }]} numberOfLines={1}>
          {serviceName || t('Technicians')}
          {!isLoading && technicians.length > 0 ? `  (${technicians.length})` : ''}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <AnimatedLoadingScreen message={t('Loading technicians...')} />
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.centerText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={loadTechnicians}>
            <Text style={[styles.retryBtnText, { fontSize: scaledSize(14) }]}>{t('Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : technicians.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.centerText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
            {t('No technicians available')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={technicians}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCard}
          contentContainerStyle={[styles.list, { paddingBottom: getGlassTabBarOverlayHeight(insets.bottom) + 12 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  // List
  list: { padding: 16, gap: 12 },
  // Card
  card: {
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  cardTop: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#fff' },
  cardInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  cardName: { fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starsRow: { flexDirection: 'row', gap: 1 },
  ratingNum: { fontWeight: '600', marginLeft: 3 },
  ratingCount: {},
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontWeight: '600' },
  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  chipText: { fontWeight: '500' },
  moreChips: { alignSelf: 'center' },
  // Divider
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
  // CTA
  ctaRow: { flexDirection: 'row', gap: 10 },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
  },
  ctaBtnOutline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  ctaBtnText: { fontWeight: '700' },
  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  centerText: { textAlign: 'center' },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});
