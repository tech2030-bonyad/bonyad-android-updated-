import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useTranslation } from 'react-i18next';
import i18n from '../localization/i18n';
import { useFontFamily } from '../context/FontContext';
import { useRTL } from '../hooks/useRTL';
import BonyadLogo from '../components/BonyadLogo';
import { AbsherLogoSvg } from '../assets/svg/AbsherLogo';
import { NafathLogoSvg } from '../assets/svg/NafathLogo';

// ─── Constants ──────────────────────────────────────────────────────────────
const BLUE = '#003867';
const AMBER = '#FFB703';
const TOTAL_PAGES = 4;

const VIDEOS = [
  { id: 'IDzG49s0xOA', titleKey: 'intro.video1', icon: 'hammer-outline' as const, color: '#00A5F4' },
  { id: 'XORyEQRqn5g', titleKey: 'intro.video2', icon: 'sparkles-outline' as const, color: '#AF52DE' },
  { id: '8MW12hrdi50', titleKey: 'intro.video3', icon: 'person-circle-outline' as const, color: '#34C759' },
  { id: 'pGQ35MXPbyM', titleKey: 'intro.video4', icon: 'bar-chart-outline' as const, color: '#FF9500' },
  { id: 'YwXbfME4Oks', titleKey: 'intro.video5', icon: 'card-outline' as const, color: '#30D158' },
  { id: 'ZBVwKwo9skU', titleKey: 'intro.video6', icon: 'create-outline' as const, color: '#5856D6' },
];

// ─── Dot pattern background (white 4% opacity, 28px spacing) ────────────────
function DotPattern({ w, h }: { w: number; h: number }) {
  const SPACING = 28;
  const circles: string[] = [];
  for (let x = SPACING / 2; x < w; x += SPACING) {
    for (let y = SPACING / 2; y < h; y += SPACING) {
      circles.push(`<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="1.5" fill="white" fill-opacity="0.04"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${circles.join('')}</svg>`;
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <SvgXml xml={svg} width={w} height={h} />
    </View>
  );
}

// ─── Logo card (Absher / Nafath) ─────────────────────────────────────────────
function LogoCard({
  svgXml,
  label,
  svgW,
  svgH,
}: {
  svgXml: string;
  label: string;
  svgW: number;
  svgH: number;
}) {
  return (
    <View style={styles.logoCard}>
      <SvgXml xml={svgXml} width={svgW} height={svgH} />
      <Text style={styles.logoCardLabel}>{label}</Text>
    </View>
  );
}

// ─── Star rating row ─────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={11}
          color={AMBER}
        />
      ))}
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
interface IntroToAppScreenProps {
  onBack?: () => void;
}

export default function IntroToAppScreen({ onBack }: IntroToAppScreenProps) {
  const { t } = useTranslation();
  const { scaledSize, fontFamily, boldFontFamily } = useFontFamily();
  const { isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const [page, setPage] = useState(0);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const pageScrollRef = useRef<ScrollView>(null);

  const isArabic = i18n.language === 'ar';
  const isWhitePage = page === 1;

  // Bottom bar height (dots row + action row + padding)
  const BOTTOM_H = insets.bottom + 128;
  const TOP_PAD = insets.top + 20;

  const goToPage = (p: number) => {
    pageScrollRef.current?.scrollTo({ x: p * W, animated: true });
    setPage(p);
    if (p !== 3) setActiveVideoId(null);
  };

  const handlePageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / W);
    if (p !== page) {
      setPage(p);
      if (p !== 3) setActiveVideoId(null);
    }
  };

  const handleNext = () => {
    if (page < TOTAL_PAGES - 1) goToPage(page + 1);
    else onBack?.();
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(isArabic ? 'en' : 'ar');
  };

  // ── helpers ──────────────────────────────────────────────────────────────
  const white = (opacity: number) => `rgba(255,255,255,${opacity})`;
  const row = (reverse?: boolean): object => ({
    flexDirection: (isRTL || reverse) ? 'row-reverse' : 'row',
    alignItems: 'center',
  });

  return (
    <View style={{ flex: 1, backgroundColor: BLUE }}>

      {/* ── Horizontal pager ─────────────────────────────────────────── */}
      <ScrollView
        ref={pageScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handlePageScroll}
        decelerationRate="fast"
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        bounces={false}
      >

        {/* ═══════════════════════════════════════════════════════════════
            PAGE 0 — WelcomeScreen
        ═══════════════════════════════════════════════════════════════ */}
        <View style={{ width: W, height: H, backgroundColor: BLUE }}>
          <DotPattern w={W} h={H} />
          <View style={{
            flex: 1,
            paddingTop: TOP_PAD,
            paddingBottom: BOTTOM_H,
            paddingHorizontal: 28,
            alignItems: 'center',
            justifyContent: 'center',
          }}>

            {/* Logo mark (large) */}
            <View style={{ marginBottom: 28 }}>
              <BonyadLogo size="xlarge" variant="light" spacing={14} />
            </View>

            {/* Brand tagline */}
            <Text style={{
              color: white(0.75),
              fontSize: scaledSize(16),
              fontFamily,
              textAlign: 'center',
              marginBottom: 48,
              letterSpacing: 0.3,
            }}>
              {t('intro.welcome.tagline')}
            </Text>

            {/* Absher + Nafath cards */}
            <View style={{ width: '100%', gap: 12 }}>
              <Text style={{
                color: white(0.5),
                fontSize: scaledSize(12),
                fontFamily: boldFontFamily,
                textAlign: 'center',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                {t('intro.trustedIntegrations')}
              </Text>
              <View style={[row(), { gap: 12, justifyContent: 'center' }]}>
                <LogoCard svgXml={AbsherLogoSvg} label="Absher" svgW={32} svgH={48} />
                <LogoCard svgXml={NafathLogoSvg} label="Nafath" svgW={60} svgH={26} />
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════
            PAGE 1 — ProjectTrackingScreen (white background)
        ═══════════════════════════════════════════════════════════════ */}
        <View style={{ width: W, height: H, backgroundColor: '#fff' }}>
          <View style={{
            flex: 1,
            paddingTop: TOP_PAD,
            paddingBottom: BOTTOM_H,
            paddingHorizontal: 24,
          }}>
            {/* Page header */}
            <View style={{ alignItems: 'center', marginBottom: 22 }}>
              <Text style={{
                color: BLUE,
                fontSize: scaledSize(24),
                fontFamily: boldFontFamily,
                textAlign: 'center',
                marginBottom: 6,
              }}>
                {t('intro.tracking.title')}
              </Text>
              <Text style={{
                color: '#666',
                fontSize: scaledSize(14),
                fontFamily,
                textAlign: 'center',
              }}>
                {t('intro.tracking.subtitle')}
              </Text>
            </View>

            {/* Project card */}
            <View style={styles.projectCard}>
              {/* Blue top bar */}
              <View style={[styles.projectCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.projectCardTitle, { fontFamily: boldFontFamily, flex: 1 }]} numberOfLines={1}>
                  {isArabic ? 'تجديد فيلا' : 'Villa Renovation'}
                </Text>
                <View style={styles.inProgressBadge}>
                  <Text style={[styles.inProgressText, { fontFamily: boldFontFamily }]}>
                    {isArabic ? 'قيد التنفيذ' : 'In Progress'}
                  </Text>
                </View>
              </View>

              <View style={{ padding: 14 }}>
                {/* Progress bar */}
                <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }]}>
                  <Text style={{ color: '#333', fontSize: scaledSize(13), fontFamily }}>
                    {isArabic ? 'اكتملت 68% • 12 يوم متبقية' : '68% Complete • 12 days left'}
                  </Text>
                  <Text style={{ color: AMBER, fontSize: scaledSize(13), fontFamily: boldFontFamily }}>
                    68%
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: '68%' }]} />
                </View>

                {/* Task rows */}
                <View style={{ marginTop: 14, gap: 10 }}>
                  {[
                    { label: isArabic ? 'أعمال الأساس' : 'Foundation Work', done: true },
                    { label: isArabic ? 'السباكة' : 'Plumbing', done: true },
                    { label: isArabic ? 'الكهرباء' : 'Electrical', done: false },
                  ].map((task, i) => (
                    <View key={i} style={[{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 10,
                    }]}>
                      <View style={[styles.taskCheck, task.done && styles.taskCheckDone]}>
                        {task.done && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                      <Text style={{
                        color: task.done ? '#333' : '#999',
                        fontSize: scaledSize(14),
                        fontFamily,
                        textDecorationLine: task.done ? 'none' : 'none',
                      }}>
                        {task.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Simple map view */}
            <View style={styles.mapContainer}>
              <MapMockView />
              {/* Map pin overlay */}
              <View style={styles.mapPin}>
                <Ionicons name="location" size={20} color="#ff3b30" />
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════
            PAGE 2 — FindProfessionalsScreen
        ═══════════════════════════════════════════════════════════════ */}
        <View style={{ width: W, height: H, backgroundColor: BLUE }}>
          <DotPattern w={W} h={H} />
          <View style={{
            flex: 1,
            paddingTop: TOP_PAD,
            paddingBottom: BOTTOM_H,
            paddingHorizontal: 20,
          }}>
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={{
                color: '#fff',
                fontSize: scaledSize(24),
                fontFamily: boldFontFamily,
                textAlign: 'center',
                marginBottom: 6,
              }}>
                {t('intro.professionals.title')}
              </Text>
              <Text style={{
                color: white(0.65),
                fontSize: scaledSize(14),
                fontFamily,
                textAlign: 'center',
              }}>
                {t('intro.professionals.subtitle')}
              </Text>
            </View>

            {/* Pro cards */}
            {[
              { initials: 'AR', nameEn: 'Ahmad Riyad', nameAr: 'أحمد رياض', roleEn: 'Plumber', roleAr: 'سباك', rating: 4.8, reviews: 127 },
              { initials: 'KO', nameEn: 'Khalid Omar', nameAr: 'خالد عمر', roleEn: 'Electrician', roleAr: 'كهربائي', rating: 4.7, reviews: 89 },
              { initials: 'OG', nameEn: 'Omar Ghazi', nameAr: 'عمر غازي', roleEn: 'Painter', roleAr: 'دهان', rating: 4.9, reviews: 203 },
            ].map((pro, i) => (
              <View key={i} style={[styles.proCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Avatar circle */}
                <View style={styles.proAvatar}>
                  <Text style={[styles.proInitials, { fontFamily: boldFontFamily }]}>{pro.initials}</Text>
                </View>
                {/* Info */}
                <View style={{ flex: 1, marginStart: 12 }}>
                  <Text style={[styles.proName, { fontFamily: boldFontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                    {isArabic ? pro.nameAr : pro.nameEn}
                  </Text>
                  <Text style={[styles.proRole, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>
                    {isArabic ? pro.roleAr : pro.roleEn}
                  </Text>
                  <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 3 }]}>
                    <Stars rating={pro.rating} />
                    <Text style={[styles.proRating, { fontFamily: boldFontFamily }]}>{pro.rating.toFixed(1)}</Text>
                    <Text style={[styles.proReviews, { fontFamily }]}>({pro.reviews})</Text>
                  </View>
                </View>
                {/* Verified badge */}
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              </View>
            ))}

            {/* Trusted integrations card */}
            <View style={styles.trustedCard}>
              <Text style={[styles.trustedLabel, { fontFamily: boldFontFamily, textAlign: 'center' }]}>
                {t('intro.trustedIntegrations')}
              </Text>
              <View style={[{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 12 }]}>
                <View style={styles.trustedLogoWrap}>
                  <SvgXml xml={AbsherLogoSvg} width={26} height={40} />
                  <Text style={[styles.trustedLogoName, { fontFamily }]}>Absher</Text>
                </View>
                <View style={styles.trustedDivider} />
                <View style={styles.trustedLogoWrap}>
                  <SvgXml xml={NafathLogoSvg} width={52} height={22} />
                  <Text style={[styles.trustedLogoName, { fontFamily }]}>Nafath</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════
            PAGE 3 — VideoSelectionPage
        ═══════════════════════════════════════════════════════════════ */}
        <View style={{ width: W, height: H, backgroundColor: BLUE }}>
          <DotPattern w={W} h={H} />
          <View style={{ flex: 1, paddingTop: TOP_PAD, paddingBottom: BOTTOM_H }}>

            {/* Header */}
            <View style={{ paddingHorizontal: 24, alignItems: 'center', marginBottom: 16 }}>
              <View style={styles.videoHeaderIcon}>
                <Ionicons name="play-circle" size={36} color={AMBER} />
              </View>
              <Text style={{
                color: '#fff',
                fontSize: scaledSize(22),
                fontFamily: boldFontFamily,
                textAlign: 'center',
                marginBottom: 4,
              }}>
                {t('intro.videos.title')}
              </Text>
              <Text style={{
                color: white(0.6),
                fontSize: scaledSize(13),
                fontFamily,
                textAlign: 'center',
              }}>
                {t('intro.videos.subtitle')}
              </Text>
            </View>

            {/* Inline player (shows when a video is active) */}
            {activeVideoId !== null && (
              <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                <View style={styles.inlinePlayer}>
                  <YoutubePlayer
                    height={Math.round((W - 32) * 9 / 16)}
                    width={W - 32}
                    videoId={activeVideoId}
                    play
                    webViewProps={{ allowsFullscreenVideo: true }}
                  />
                  <TouchableOpacity
                    onPress={() => setActiveVideoId(null)}
                    style={styles.playerClose}
                  >
                    <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Video list */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}
            >
              {VIDEOS.map((video) => {
                const isPlaying = activeVideoId === video.id;
                return (
                  <TouchableOpacity
                    key={video.id}
                    onPress={() => setActiveVideoId(prev => prev === video.id ? null : video.id)}
                    activeOpacity={0.8}
                    style={[styles.videoCard, isPlaying && styles.videoCardActive]}
                  >
                    {/* Colored icon circle */}
                    <View style={[styles.videoIconCircle, { backgroundColor: video.color }]}>
                      <Ionicons name={video.icon} size={20} color="#fff" />
                    </View>
                    {/* Title */}
                    <Text style={[styles.videoCardTitle, { fontFamily, textAlign: isRTL ? 'right' : 'left', flex: 1 }]} numberOfLines={2}>
                      {t(video.titleKey)}
                    </Text>
                    {/* Play button */}
                    <Ionicons
                      name={isPlaying ? 'pause-circle' : 'play-circle'}
                      size={26}
                      color={isPlaying ? AMBER : white(0.5)}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

      </ScrollView>

      {/* ── Bottom bar ───────────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, backgroundColor: isWhitePage ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.18)' }]}>

        {/* Page dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goToPage(i)}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            >
              <View style={{
                height: 7,
                width: i === page ? 22 : 7,
                borderRadius: 4,
                backgroundColor: i === page ? AMBER : 'rgba(255,255,255,0.30)',
              }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Action row */}
        <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}>

          {/* Language toggle */}
          <TouchableOpacity
            onPress={toggleLanguage}
            style={[styles.langToggle, {
              borderColor: isWhitePage ? 'rgba(0,56,103,0.22)' : 'rgba(255,255,255,0.22)',
              backgroundColor: isWhitePage ? 'rgba(0,56,103,0.06)' : 'rgba(255,255,255,0.09)',
            }]}
          >
            <Ionicons name="globe-outline" size={15} color={isWhitePage ? BLUE : '#fff'} />
            <Text style={[styles.langToggleText, { fontFamily: boldFontFamily, color: isWhitePage ? BLUE : '#fff' }]}>
              {isArabic ? 'AR' : 'EN'}
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Skip (not on last page) */}
          {page < TOTAL_PAGES - 1 && (
            <TouchableOpacity onPress={onBack} style={{ paddingHorizontal: 14, paddingVertical: 10, marginEnd: 8 }}>
              <Text style={{
                color: isWhitePage ? 'rgba(0,56,103,0.55)' : 'rgba(255,255,255,0.6)',
                fontSize: scaledSize(15),
                fontFamily,
              }}>
                {t('intro.skip')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Next / Get Started amber gradient button */}
          <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
            <LinearGradient
              colors={['#FFB703', '#FF9500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtn}
            >
              <Text style={[styles.nextBtnText, { fontFamily: boldFontFamily }]}>
                {page === TOTAL_PAGES - 1 ? t('intro.getStarted') : t('intro.next')}
              </Text>
              {page < TOTAL_PAGES - 1 && (
                <Ionicons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={15}
                  color="#fff"
                  style={{ marginStart: 4 }}
                />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Simple map mock (top-down city blocks) ──────────────────────────────────
function MapMockView() {
  return (
    <View style={{ flex: 1, backgroundColor: '#e8f0e0', overflow: 'hidden' }}>
      {/* Roads */}
      <View style={[styles.road, { top: '33%', left: 0, right: 0, height: 6 }]} />
      <View style={[styles.road, { top: '66%', left: 0, right: 0, height: 6 }]} />
      <View style={[styles.road, { left: '33%', top: 0, bottom: 0, width: 6 }]} />
      <View style={[styles.road, { left: '66%', top: 0, bottom: 0, width: 6 }]} />
      {/* Buildings (colored blocks) */}
      <View style={[styles.building, { top: '5%', left: '5%', width: '25%', height: '22%', backgroundColor: '#c8d8c0' }]} />
      <View style={[styles.building, { top: '5%', left: '36%', width: '24%', height: '22%', backgroundColor: '#b0c8b8' }]} />
      <View style={[styles.building, { top: '5%', right: '5%', width: '25%', height: '22%', backgroundColor: '#d0dcc8' }]} />
      <View style={[styles.building, { top: '40%', left: '5%', width: '22%', height: '20%', backgroundColor: '#c0d4b8' }]} />
      <View style={[styles.building, { top: '40%', left: '36%', width: '24%', height: '20%', backgroundColor: '#b8ccc0' }]} />
      <View style={[styles.building, { top: '40%', right: '5%', width: '25%', height: '20%', backgroundColor: '#ccd8c4' }]} />
      <View style={[styles.building, { bottom: '4%', left: '5%', width: '25%', height: '22%', backgroundColor: '#c4d0bc' }]} />
      <View style={[styles.building, { bottom: '4%', left: '36%', width: '24%', height: '22%', backgroundColor: '#b8c8b4' }]} />
      <View style={[styles.building, { bottom: '4%', right: '5%', width: '22%', height: '22%', backgroundColor: '#d4dcc8' }]} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Logo card (page 0)
  logoCard: {
    flex: 1,
    maxWidth: 160,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  logoCardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Project card (page 1)
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e8eef4',
    marginBottom: 14,
  },
  projectCardHeader: {
    backgroundColor: BLUE,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 8,
  },
  projectCardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  inProgressBadge: {
    backgroundColor: AMBER,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  inProgressText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#e8eef4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AMBER,
    borderRadius: 4,
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCheckDone: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  mapContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    minHeight: 120,
    position: 'relative',
  },
  mapPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -10,
  },
  road: {
    position: 'absolute',
    backgroundColor: '#d4c89a',
  },
  building: {
    position: 'absolute',
    borderRadius: 3,
  },

  // Pro cards (page 2)
  proCard: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
  },
  proAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  proName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  proRole: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    marginTop: 1,
  },
  proRating: {
    color: '#FFB703',
    fontSize: 12,
  },
  proReviews: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  trustedCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginTop: 4,
  },
  trustedLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  trustedLogoWrap: {
    alignItems: 'center',
    gap: 6,
  },
  trustedLogoName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  trustedDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // Video selection (page 3)
  videoHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  inlinePlayer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.4)',
    position: 'relative',
  },
  playerClose: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 12,
  },
  videoCardActive: {
    backgroundColor: 'rgba(255,183,3,0.15)',
    borderColor: 'rgba(255,183,3,0.35)',
  },
  videoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCardTitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  langToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
