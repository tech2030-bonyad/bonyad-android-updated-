import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing as ReEasing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HEIGHT = 220;

interface OptionCardProps {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  cardBackground: string;
  textColor: string;
  subtitleColor: string;
  shimmerDuration: number;
  onPress: () => void;
}

const OptionCard = React.memo(({
  icon,
  title,
  subtitle,
  color,
  cardBackground,
  textColor,
  subtitleColor,
  shimmerDuration,
  onPress,
}: OptionCardProps) => {
  const shimmerY = useSharedValue(CARD_HEIGHT);

  useEffect(() => {
    shimmerY.value = withRepeat(
      withTiming(-CARD_HEIGHT, {
        duration: shimmerDuration,
        easing: ReEasing.inOut(ReEasing.sin),
      }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shimmerY.value }],
  }));

  return (
    <ReAnimated.View style={[styles.card, { backgroundColor: cardBackground, borderColor: color + '40' }]}>
      {/* Bottom-to-top color shimmer */}
      <ReAnimated.View style={[styles.shimmerWrap, shimmerStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', color + '28', color + '50', color + '28', 'transparent']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </ReAnimated.View>

      {/* Top accent bar */}
      <LinearGradient
        colors={[color, color + '88']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.cardContent}>
        {/* Icon circle */}
        <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon as any} size={48} color={color} />
        </View>

        {/* Title */}
        <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>

        {/* Subtitle */}
        <Text style={[styles.cardSubtitle, { color: subtitleColor }]}>{subtitle}</Text>
      </TouchableOpacity>
    </ReAnimated.View>
  );
});

interface ProjectTypeSelectionScreenProps {
  onSelectLarge: () => void;
  onSelectSmall: () => void;
  onBack?: () => void;
  /** Optional: allow parent (UserHomeScreen) to store a tour control handle. */
  onExposeTourControl?: (control: { startTour: () => void } | null) => void;
}

export default function ProjectTypeSelectionScreen({
  onSelectLarge,
  onSelectSmall,
  onBack,
  onExposeTourControl,
}: ProjectTypeSelectionScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, boldFontFamily } = useFontFamily();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    // No dedicated project-type selection tour yet; expose a no-op control for compatibility.
    onExposeTourControl?.({ startTour: () => {} });
    return () => onExposeTourControl?.(null);
  }, [onExposeTourControl]);

  const handleSelect = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -24, duration: 180, useNativeDriver: true }),
    ]).start(() => callback());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      {onBack && (
        <View
          collapsable={false}
          style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}
        >
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <BackArrowIonicons variant="arrow" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>{t('Create New')}</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
              {t('Choose the type of project you want to create')}
            </Text>
          </View>
        </View>
      )}

      <Animated.View
        style={[styles.body, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <ScrollView
          style={[styles.scrollView, { backgroundColor: colors.background }]}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 120) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Cards */}
          <View style={styles.cardsContainer}>
            <View collapsable={false}>
              <OptionCard
                icon="business-outline"
                title={t('Large Project')}
                subtitle={t('Full project with phases, contracts and bids')}
                color={colors.primary}
                cardBackground={colors.cardBackground}
                textColor={colors.text}
                subtitleColor={colors.textSecondary}
                shimmerDuration={2000}
                onPress={() => handleSelect(onSelectLarge)}
              />
            </View>

            <View collapsable={false}>
              <OptionCard
                icon="construct-outline"
                title={t('Small Task')}
                subtitle={t('Quick task with fast assignment and payment')}
                color={colors.warning}
                cardBackground={colors.cardBackground}
                textColor={colors.text}
                subtitleColor={colors.textSecondary}
                shimmerDuration={2400}
                onPress={() => handleSelect(onSelectSmall)}
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 8,
    alignSelf: 'center',
  },
  headerText: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardsContainer: {
    gap: 20,
  },
  // Card
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  shimmerWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    height: CARD_HEIGHT,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  cardContent: {
    padding: 28,
    alignItems: 'center',
    zIndex: 1,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
