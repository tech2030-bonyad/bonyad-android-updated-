import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

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
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDarkMode = theme === 'dark';

  const isRTL = i18n.language === 'ar';
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = isWeb && width >= 768;
  const cardElevation = isDarkMode && Platform.OS === 'android' ? 2 : 6;

  const categoryName = isRTL && category.nameAr ? category.nameAr : category.nameEn;
  const subcategoryName = isRTL && subcategory.nameAr ? subcategory.nameAr : subcategory.nameEn;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, isRTL && { transform: [{ scaleX: -1 }] }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {t('Choose Method')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subcategoryName}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={[styles.content, { backgroundColor: colors.background }]}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '15' }]}>
            <MaterialCommunityIcons name="folder-outline" size={20} color={colors.primary} />
            <Text style={[styles.categoryText, { color: colors.primary }]}>
              {categoryName}
            </Text>
          </View>
          <Text style={[styles.instruction, { color: colors.text }]}>
            {t('How would you like to create your project?')}
          </Text>
        </View>

        {/* Method Cards */}
        <View style={[styles.cardsContainer, isLargeScreen && styles.cardsContainerRow]}>
          {/* AI Method Card */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              { backgroundColor: colors.cardBackground },
              Platform.OS === 'android' && { elevation: cardElevation },
              isLargeScreen && styles.methodCardWide,
            ]}
            onPress={() => onChooseAI(category, subcategory)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary + '20', colors.primary + '05']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="robot" size={32} color={colors.white} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t('AI Assistant')}
              </Text>
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                {t('Let our AI guide you through a conversation to create your project details automatically.')}
              </Text>
              <View style={[styles.benefitBadge, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="flash" size={14} color={colors.success} />
                <Text style={[styles.benefitText, { color: colors.success }]}>
                  {t('Fast & Easy')}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Manual Method Card */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              { backgroundColor: colors.cardBackground },
              Platform.OS === 'android' && { elevation: cardElevation },
              isLargeScreen && styles.methodCardWide,
            ]}
            onPress={() => onChooseManual(category, subcategory)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.warning + '15', colors.warning + '05']}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.warning }]}>
                <MaterialCommunityIcons name="file-document-edit" size={32} color={colors.white} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t('Manual Entry')}
              </Text>
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                {t('Fill in the project details yourself with full control over all specifications.')}
              </Text>
              <View style={[styles.benefitBadge, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="settings" size={14} color={colors.primary} />
                <Text style={[styles.benefitText, { color: colors.primary }]}>
                  {t('Full Control')}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  instruction: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardsContainer: {
    gap: 16,
  },
  cardsContainerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  methodCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  methodCardWide: {
    flex: 1,
    maxWidth: 400,
  },
  cardGradient: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
