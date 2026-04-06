import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { getSubcategories } from '../services/ServiceService';
import { getTechniciansByService } from '../services/TechnicianService';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import TechnicianProfileView from './TechnicianProfileView';
import { generateRoomId } from '../utils/chatUtils';
import { storage } from '../utils/storage';
import AnimatedLoadingScreen from '../components/AnimatedLoadingScreen';
import { getGlassTabBarOverlayHeight } from '../components/GlassTabBar';

const { width: SCREEN_W } = Dimensions.get('window');

interface CategoryTechniciansScreenProps {
  categoryId: number;
  categoryName?: string;
  onBack?: () => void;
  onNavigateToTechnicianProfile?: (technicianId: number) => void;
  onNavigateToChat?: (roomId: string, receiverId: number, receiverName: string) => void;
  onNavigateToBooking?: (technicianId: number, technicianName?: string) => void;
}

export default function CategoryTechniciansScreen({
  categoryId,
  categoryName,
  onBack,
  onNavigateToTechnicianProfile,
  onNavigateToChat,
  onNavigateToBooking,
}: CategoryTechniciansScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';

  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [chatLoadingId, setChatLoadingId] = useState<number | null>(null);

  const title = categoryName || t('Technicians');

  // Slide-in animation (matches ServiceTechniciansScreen feel)
  const slideX = useRef(new Animated.Value(SCREEN_W)).current;
  useEffect(() => {
    Animated.spring(slideX, {
      toValue: 0,
      tension: 280,
      friction: 28,
      useNativeDriver: true,
    }).start();
  }, [slideX]);

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
      const subs = await getSubcategories(categoryId);
      const results = await Promise.all(subs.map((s) => getTechniciansByService(s.id).catch(() => [])));
      const merged = results.flat();
      const byId = new Map<number, any>();
      for (const tech of merged) {
        if (tech?.id != null) byId.set(Number(tech.id), tech);
      }
      setTechnicians(Array.from(byId.values()));
    } catch (err: any) {
      setError(err?.message || t('Failed to load technicians'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTechnicians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const handleChat = async (technicianId: number, technicianName?: string) => {
    if (!onNavigateToChat) return;
    setChatLoadingId(technicianId);
    try {
      const currentUserId = await storage.getUserId();
      if (currentUserId) {
        const roomId = generateRoomId(currentUserId, technicianId);
        onNavigateToChat(roomId, technicianId, technicianName || `Technician ${technicianId}`);
      }
    } catch (e) {
      console.error('❌ [CategoryTechniciansScreen] Error opening chat:', e);
    } finally {
      setChatLoadingId(null);
    }
  };

  const handleViewProfile = (technicianId: number) => {
    if (onNavigateToTechnicianProfile) onNavigateToTechnicianProfile(technicianId);
    else setSelectedTechnicianId(technicianId);
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

  const listTitle = useMemo(() => {
    if (!categoryName) return title;
    return title;
  }, [categoryName, title]);

  const renderCard = ({ item }: { item: any }) => {
    const name: string = item.name || '';
    const rating: number = item.averageRating ?? 0;
    const reviews: number = item.totalReviews ?? 0;
    const isChatLoading = chatLoadingId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => handleViewProfile(item.id)}
        style={[styles.card, { backgroundColor: colors.cardBackground }]}
      >
        <View style={styles.cardTop}>
          <TouchableOpacity onPress={() => handleViewProfile(item.id)} activeOpacity={0.8}>
            {item.profileImage ? (
              <Image source={{ uri: item.profileImage }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={[colors.primary, colors.primary + 'AA']} style={styles.avatar}>
                <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: colors.text, fontSize: scaledSize(15) }]} numberOfLines={1}>
              {name}
            </Text>

            <View style={styles.ratingRow}>
              {renderStars(rating)}
              <Text style={[styles.ratingNum, { color: colors.text, fontSize: scaledSize(12) }]}>
                {Number.isFinite(rating) ? rating.toFixed(1) : '0.0'}
              </Text>
              <Text style={[styles.ratingCount, { color: colors.textSecondary, fontSize: scaledSize(11) }]}>
                ({reviews})
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={[styles.ctaBtn, styles.ctaBtnOutline, { borderColor: colors.primary }]}
            onPress={() => handleChat(item.id, item.name)}
            activeOpacity={0.75}
            disabled={isChatLoading || !onNavigateToChat}
          >
            <Ionicons
              name={isChatLoading ? 'hourglass-outline' : 'chatbubble-outline'}
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.ctaBtnText, { color: colors.primary, fontSize: scaledSize(13) }]}>
              {t('Chat')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={() => onNavigateToBooking?.(item.id, item.name)}
            activeOpacity={0.75}
            disabled={!onNavigateToBooking}
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
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <BackArrowIonicons variant="arrow" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(16) }]} numberOfLines={1}>
          {listTitle}
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
          keyExtractor={(item) => String(item.id)}
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
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  cardTop: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#fff' },
  cardInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  cardName: { fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  starsRow: { flexDirection: 'row', gap: 1 },
  ratingNum: { fontWeight: '600', marginLeft: 3 },
  ratingCount: {},
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  centerText: { textAlign: 'center' },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});

