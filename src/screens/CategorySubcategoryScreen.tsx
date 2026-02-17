import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getSubcategories, ServiceSubcategory } from '../services/ServiceService';
import { getServerBaseUrl } from '../config/api';

export interface CategoryInfo {
  id: number;
  nameEn: string;
  nameAr?: string;
}

interface CategorySubcategoryScreenProps {
  category: CategoryInfo;
  onBack: () => void;
  onViewProjects?: (categoryId: number, subcategoryId?: number) => void;
  onSelectSubcategory?: (subcategory: ServiceSubcategory) => void;
}

function resolveImageSource(item: ServiceSubcategory) {
  const candidate = item.imageUrl || (item as any).image;
  if (!candidate || typeof candidate !== 'string') return null;
  const s = candidate.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return { uri: s };
  const base = getServerBaseUrl();
  return { uri: `${base}${s.startsWith('/') ? s : '/' + s}` };
}

export default function CategorySubcategoryScreen({
  category,
  onBack,
  onViewProjects,
  onSelectSubcategory,
}: CategorySubcategoryScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isRTL = i18n.language === 'ar';
  const isDark = theme === 'dark';

  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryName = isRTL && category.nameAr ? category.nameAr : category.nameEn;

  const loadSubcategories = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getSubcategories(category.id);
      setSubcategories(list);
    } catch (e: any) {
      setError(e.message || t('Failed to load subcategories'));
    } finally {
      setLoading(false);
    }
  }, [category.id, t]);

  useEffect(() => {
    loadSubcategories();
  }, [loadSubcategories]);

  const gridGap = 12;
  const gridPadding = 16;
  const numColumns = 2;
  const cardWidth = (width - gridPadding * 2 - gridGap * (numColumns - 1)) / numColumns;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, isRTL && { transform: [{ scaleX: -1 }] }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {categoryName}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('Loading...')}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error || '#FF3B30'} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={loadSubcategories}
          >
            <Text style={styles.retryBtnText}>{t('Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeaderSimple}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('Subcategories')}
            </Text>
          </View>

          {subcategories.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="layers-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('No subcategories in this category')}
              </Text>
            </View>
          ) : (
            <View style={styles.cardsGrid}>
              {subcategories.map((sub) => {
                const imgSrc = resolveImageSource(sub);
                const name = isRTL && sub.nameAr ? sub.nameAr : sub.nameEn;
                return (
                  <View
                    key={sub.id}
                    style={[styles.subcategoryCard, { width: cardWidth, backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  >
                    <View style={[styles.subcategoryCardImageWrap, !imgSrc && { backgroundColor: colors.primary + '15' }]}>
                      {imgSrc ? (
                        <Image source={imgSrc} style={styles.subcategoryCardImage} resizeMode="cover" />
                      ) : (
                        <Ionicons name="briefcase-outline" size={36} color={colors.primary} />
                      )}
                    </View>
                    <Text style={[styles.subcategoryCardTitle, { color: colors.text }]} numberOfLines={2}>
                      {name}
                    </Text>
                    {sub.description && (
                      <Text style={[styles.subcategoryCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {sub.description}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderSimple: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
      default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
    }),
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  subcategoryCard: {
    height: 220,
    borderRadius: 12,
    padding: 0,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
      default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
    }),
  },
  subcategoryCardImageWrap: {
    width: '100%',
    height: '70%',
    minHeight: 154,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  subcategoryCardImage: {
    width: '100%',
    height: '100%',
  },
  subcategoryCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingTop: 10,
    textAlign: 'center',
  },
  subcategoryCardDesc: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    textAlign: 'center',
  },
});
