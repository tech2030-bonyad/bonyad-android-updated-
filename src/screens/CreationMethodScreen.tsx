import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

/** Extra space above system home indicator when a bottom tab bar overlays the screen */
const BOTTOM_TAB_BAR_CLEARANCE = 76;

export interface CategoryInfo {
  id: number;
  nameEn: string;
  nameAr?: string;
}

export interface SubcategoryInfo {
  id: number;
  nameEn: string;
  nameAr?: string;
  description?: string;
}

interface CreationMethodScreenProps {
  category: CategoryInfo;
  subcategory: SubcategoryInfo;
  onBack: () => void;
  onChooseAI: (category: CategoryInfo, subcategory: SubcategoryInfo) => void;
  onChooseManual: (category: CategoryInfo, subcategory: SubcategoryInfo) => void;
}

export default function CreationMethodScreen({
  category,
  subcategory,
  onBack,
  onChooseAI,
  onChooseManual,
}: CreationMethodScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isRTL = i18n.language?.startsWith('ar') ?? false;
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = isWeb && width >= 768;

  const categoryName = isRTL && category.nameAr ? category.nameAr : category.nameEn;
  const subcategoryName = isRTL && subcategory.nameAr ? subcategory.nameAr : subcategory.nameEn;

  // ─── Screen enter / exit animation ────────────────────────────────────────
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(0)).current;
  const screenScale = useRef(new Animated.Value(1)).current;
  const isClosingRef = useRef(false);

  // Card stagger animations
  const card1Opacity = useRef(new Animated.Value(1)).current;
  const card1Y = useRef(new Animated.Value(0)).current;
  const card2Opacity = useRef(new Animated.Value(1)).current;
  const card2Y = useRef(new Animated.Value(0)).current;

  // Press scale for cards
  const aiPressScale = useRef(new Animated.Value(1)).current;
  const manualPressScale = useRef(new Animated.Value(1)).current;

  // Sparkle pulse for AI badge
  const sparkleScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sparkle pulse loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleScale, { toValue: 1.18, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(sparkleScale, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(screenTranslateY, { toValue: 260, duration: 200, useNativeDriver: true }),
      Animated.timing(screenScale, { toValue: 0.96, duration: 200, useNativeDriver: true }),
    ]).start(() => onBack());
  };

  const handleChooseAI = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(screenTranslateY, { toValue: -40, duration: 180, useNativeDriver: true }),
    ]).start(() => onChooseAI(category, subcategory));
  };

  const handleChooseManual = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(screenTranslateY, { toValue: -40, duration: 180, useNativeDriver: true }),
    ]).start(() => onChooseManual(category, subcategory));
  };

  const pressIn = (anim: Animated.Value) =>
    Animated.spring(anim, { toValue: 0.96, friction: 10, tension: 200, useNativeDriver: true }).start();
  const pressOut = (anim: Animated.Value) =>
    Animated.spring(anim, { toValue: 1, friction: 6, tension: 180, useNativeDriver: true }).start();

  return (
    <Animated.View
      style={[
        styles.root,
        { backgroundColor: colors.background },
        { opacity: screenOpacity, transform: [{ translateY: screenTranslateY }, { scale: screenScale }] },
      ]}
    >
      {/* Top bar: back + centered New Project */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { backgroundColor: colors.gray200 }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <BackArrowIonicons variant="chevron" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="add-circle" size={13} color="#fff" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {t('New Project')}
          </Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 12) + BOTTOM_TAB_BAR_CLEARANCE,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* Hero — compact */}
      <View style={styles.hero}>
        <View style={[styles.categoryPill, { backgroundColor: colors.primary + '12' }]}>
          <Ionicons name="folder-open-outline" size={12} color={colors.primary} />
          <Text style={[styles.categoryPillText, { color: colors.primary }]} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text style={[styles.categoryPillSep, { color: colors.primary + '60' }]}>·</Text>
          <Text style={[styles.categoryPillText, { color: colors.primary + 'CC' }]} numberOfLines={1}>
            {subcategoryName}
          </Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>{t('How would you like to create your project?')}</Text>
        <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
          {t('Choose the method that works best for you')}
        </Text>
      </View>

      {/* Cards */}
      <View style={[styles.cards, isLargeScreen && styles.cardsRow]}>
        {/* AI Card */}
        <Animated.View
          style={[
            styles.cardWrap,
            isLargeScreen && styles.cardWrapWide,
            { opacity: card1Opacity, transform: [{ translateY: card1Y }, { scale: aiPressScale }] },
          ]}
        >
          <TouchableOpacity
            style={[styles.cardAI, { backgroundColor: colors.cardBackground }]}
            onPress={handleChooseAI}
            onPressIn={() => pressIn(aiPressScale)}
            onPressOut={() => pressOut(aiPressScale)}
            activeOpacity={1}
          >
            {/* Top accent line */}
            <View style={[styles.cardAccentBar, { backgroundColor: colors.primary }]} />

            <View style={styles.cardInner}>
              {/* Icon + recommended badge row */}
              <View style={styles.cardTopRow}>
                <View style={[styles.cardIconWrap, { backgroundColor: colors.primary }]}>
                  <Ionicons name="sparkles" size={22} color="#fff" />
                </View>
                <Animated.View
                  style={[
                    styles.recommendedBadge,
                    { backgroundColor: colors.primary + '15', transform: [{ scale: sparkleScale }] },
                  ]}
                >
                  <Ionicons name="flash" size={11} color={colors.primary} />
                  <Text style={[styles.recommendedText, { color: colors.primary }]}>{t('Recommended')}</Text>
                </Animated.View>
              </View>

              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('AI Assistant')}</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                {t('Describe your project in plain words and AI will handle the details — scope, budget and timeline.')}
              </Text>

              {/* Feature pills */}
              <View style={styles.featurePills}>
                {[t('Fast'), t('Smart'), t('Auto-filled')].map((f) => (
                  <View key={f} style={[styles.featurePill, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.featurePillText, { color: colors.primary }]}>{f}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.cardCta, { backgroundColor: colors.primary }]}>
                <Text style={styles.cardCtaText}>{t('Use AI Assistant')}</Text>
                <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={15} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Manual Card */}
        <Animated.View
          style={[
            styles.cardWrap,
            isLargeScreen && styles.cardWrapWide,
            { opacity: card2Opacity, transform: [{ translateY: card2Y }, { scale: manualPressScale }] },
          ]}
        >
          <TouchableOpacity
            style={[styles.cardManual, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
            onPress={handleChooseManual}
            onPressIn={() => pressIn(manualPressScale)}
            onPressOut={() => pressOut(manualPressScale)}
            activeOpacity={1}
          >
            <View style={styles.cardInner}>
              <View style={styles.cardTopRow}>
                <View style={[styles.cardIconWrap, { backgroundColor: colors.gray200 }]}>
                  <Ionicons name="create-outline" size={22} color={colors.text} />
                </View>
                <View style={[styles.recommendedBadge, { backgroundColor: colors.gray200 }]}>
                  <Ionicons name="settings-outline" size={11} color={colors.textSecondary} />
                  <Text style={[styles.recommendedText, { color: colors.textSecondary }]}>{t('Full Control')}</Text>
                </View>
              </View>

              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('Manual Entry')}</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                {t('Fill in all project details yourself — title, budget, timeline and phases at your own pace.')}
              </Text>

              <View style={styles.featurePills}>
                {[t('Precise'), t('Flexible'), t('Custom')].map((f) => (
                  <View key={f} style={[styles.featurePill, { backgroundColor: colors.gray200 }]}>
                    <Text style={[styles.featurePillText, { color: colors.textSecondary }]}>{f}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.cardCta, { backgroundColor: isDark ? colors.gray300 : '#1A1A1A' }]}>
                <Text style={styles.cardCtaText}>{t('Enter Manually')}</Text>
                <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={15} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  topBarRTL: {
    flexDirection: 'row-reverse',
  },
  topBarSpacer: {
    width: 36,
    height: 36,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  headerBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    marginBottom: 8,
    maxWidth: '95%',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryPillSep: {
    fontSize: 12,
    fontWeight: '400',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  heroSub: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
  },
  cards: {
    paddingHorizontal: 16,
    gap: 8,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  cardWrap: {
    marginBottom: 0,
  },
  cardWrapWide: {
    flex: 1,
    maxWidth: 380,
  },
  cardAI: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...Platform.OS === 'ios' ? {
      shadowColor: '#00549B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    } : { elevation: 5 },
    borderWidth: 1.5,
    borderColor: '#00549B20',
  },
  cardAccentBar: {
    height: 3,
    width: '100%',
  },
  cardManual: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1.5,
    ...Platform.OS === 'ios' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 12,
    } : { elevation: 2 },
  },
  cardInner: {
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    marginBottom: 8,
  },
  featurePills: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 9,
    flexWrap: 'wrap',
  },
  featurePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  cardCtaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
