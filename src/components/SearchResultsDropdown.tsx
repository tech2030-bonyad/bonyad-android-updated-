/**
 * SearchResultsDropdown — Absolutely-positioned search results panel.
 * Sits between the search bar and keyboard. Does NOT use Modal (avoids stealing focus).
 * Animated open and per-item stagger. Full RTL support.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { HighlightedText } from './ui/HighlightedText';
import { getServerBaseUrl } from '../config/api';
import type { ScoredSearchResults, Region, TechnicianSearchResult, ServiceCategory } from '../utils/searchService';
import type { ScoredMatch } from '../utils/smartSearch';

const { width: SW, height: SH } = Dimensions.get('window');
const H_PAD = 12;

interface SearchResultsDropdownProps {
  visible: boolean;
  anchorPageY: number;        // bottom-Y of search bar in screen coords
  results: ScoredSearchResults;
  loading: boolean;
  query: string;
  regions: Region[];
  selectedRegionId?: number;
  onRegionChange: (regionId: number | undefined) => void;
  onCategoryPress: (category: ServiceCategory) => void;
  onSubcategoryPress: (subcategory: ServiceCategory) => void;
  onTechnicianPress: (technicianId: number) => void;
  onClose: () => void;
}

function buildImageUrl(path?: string): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${getServerBaseUrl()}${path.startsWith('/') ? path : '/' + path}`;
}

// ─── Animated row wrapper ─────────────────────────────────────────────────────

function FadeSlide({ children, delay }: { children: React.ReactNode; delay: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 200, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: a,
      transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, label, count, isRTL }: { icon: string; label: string; count: number; isRTL: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionLeft}>
        <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>{label}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: colors.primary + '18' }]}>
        <Text style={[styles.badgeText, { color: colors.primary }]}>{count}</Text>
      </View>
    </View>
  );
}

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoryRow({ scored, onPress, isRTL }: { scored: ScoredMatch<ServiceCategory>; onPress: () => void; isRTL: boolean }) {
  const { colors } = useTheme();
  const cat = scored.item;
  const iconUrl = buildImageUrl(cat.imageUrl);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={[styles.row, { borderBottomColor: colors.border + '30' }]}
    >
      {iconUrl
        ? <Image source={{ uri: iconUrl }} style={styles.rowIcon} resizeMode="contain" />
        : <View style={[styles.rowIconWrap, { backgroundColor: colors.primary + '14' }]}>
            <Ionicons name="grid-outline" size={17} color={colors.primary} />
          </View>
      }
      <HighlightedText
        parts={scored.highlightParts}
        style={[styles.rowTitle, { color: colors.text, flex: 1, marginHorizontal: 12 }]}
        highlightStyle={{ backgroundColor: colors.primary + '28', borderRadius: 3 }}
        numberOfLines={1}
      />
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

// ─── Subcategory Row ──────────────────────────────────────────────────────────

function SubcategoryRow({ scored, onPress, isRTL }: { scored: ScoredMatch<ServiceCategory>; onPress: () => void; isRTL: boolean }) {
  const { colors } = useTheme();
  const sub = scored.item;
  const parent = sub.parentService
    ? (isRTL && sub.parentService.nameAr ? sub.parentService.nameAr : sub.parentService.nameEn)
    : null;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={[styles.row, { borderBottomColor: colors.border + '30' }]}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: '#7C3AED14' }]}>
        <Ionicons name="construct-outline" size={17} color="#7C3AED" />
      </View>
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <HighlightedText
          parts={scored.highlightParts}
          style={[styles.rowTitle, { color: colors.text }]}
          highlightStyle={{ backgroundColor: '#7C3AED' + '28', borderRadius: 3 }}
          numberOfLines={1}
        />
        {parent ? <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>{parent}</Text> : null}
      </View>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

// ─── Technician Row ───────────────────────────────────────────────────────────

function TechnicianRow({ scored, onPress, isRTL }: { scored: ScoredMatch<TechnicianSearchResult>; onPress: () => void; isRTL: boolean }) {
  const { colors } = useTheme();
  const tech = scored.item;
  const avatar = buildImageUrl(tech.profilePicture);
  const svc = tech.services?.[0]
    ? (isRTL && tech.services[0].nameAr ? tech.services[0].nameAr : tech.services[0].nameEn)
    : null;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={[styles.row, { borderBottomColor: colors.border + '30' }]}
    >
      {avatar
        ? <Image source={{ uri: avatar }} style={styles.avatar} />
        : <View style={[styles.avatarWrap, { backgroundColor: colors.primary + '14' }]}>
            <Ionicons name="person-outline" size={19} color={colors.primary} />
          </View>
      }
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <HighlightedText
          parts={scored.highlightParts}
          style={[styles.rowTitle, { color: colors.text }]}
          highlightStyle={{ backgroundColor: colors.primary + '28', borderRadius: 3 }}
          numberOfLines={1}
        />
        <View style={styles.techMeta}>
          <Ionicons name="star" size={11} color="#F59E0B" />
          <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
            {tech.averageRating?.toFixed(1) ?? '0.0'} ({tech.totalReviews ?? 0})
          </Text>
          {svc ? <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>· {svc}</Text> : null}
        </View>
      </View>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

// ─── Region Chips ─────────────────────────────────────────────────────────────

function RegionChips({ regions, selectedId, onChange, isRTL }: { regions: Region[]; selectedId?: number; onChange: (id: number | undefined) => void; isRTL: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (regions.length === 0) return null;
  return (
    <View style={[styles.chipsWrap, { borderBottomColor: colors.border + '40' }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 8, gap: 6 }}>
        <TouchableOpacity
          onPress={() => onChange(undefined)}
          style={[styles.chip, { backgroundColor: !selectedId ? colors.primary : 'transparent', borderColor: !selectedId ? colors.primary : colors.border }]}
        >
          <Text style={[styles.chipText, { color: !selectedId ? '#fff' : colors.textSecondary }]}>{t('All')}</Text>
        </TouchableOpacity>
        {regions.map((r) => {
          const active = selectedId === r.id;
          return (
            <TouchableOpacity key={r.id} onPress={() => onChange(r.id)}
              style={[styles.chip, { backgroundColor: active ? colors.primary : 'transparent', borderColor: active ? colors.primary : colors.border }]}>
              <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]} numberOfLines={1}>
                {isRTL ? r.nameAr : r.nameEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SearchResultsDropdown: React.FC<SearchResultsDropdownProps> = ({
  visible,
  anchorPageY,
  results,
  loading,
  query,
  regions,
  selectedRegionId,
  onRegionChange,
  onCategoryPress,
  onSubcategoryPress,
  onTechnicianPress,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isRTL = i18n.language === 'ar';
  const isDark = theme === 'dark';

  // Track keyboard height so we size the panel to fit between search bar and keyboard
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Panel open animation
  const panelAnim = useRef(new Animated.Value(0)).current;
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      panelAnim.setValue(0);
      Animated.spring(panelAnim, { toValue: 1, tension: 70, friction: 11, useNativeDriver: true }).start();
    } else if (!visible && wasVisible.current) {
      panelAnim.setValue(0);
    }
    wasVisible.current = visible;
  }, [visible]);

  if (!visible) return null;

  const top = anchorPageY > 0 ? anchorPageY : 140;
  const bottomPad = keyboardHeight > 0 ? keyboardHeight + 8 : 16;
  const panelHeight = Math.max(200, SH - top - bottomPad);

  const total = results.categories.length + results.subcategories.length + results.technicians.length;
  const showEmpty = !loading && query.length >= 2 && total === 0;
  const showHint = !loading && query.length > 0 && query.length < 2;

  let idx = 0;
  const next = () => idx++;

  return (
    <>
      {/* Backdrop — covers area below search bar; tapping closes dropdown */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { top }]} />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            top,
            left: H_PAD,
            right: H_PAD,
            maxHeight: panelHeight,
            backgroundColor: isDark ? '#1A1D2E' : '#FFFFFF',
            borderColor: isDark ? colors.border : colors.primary + '28',
            opacity: panelAnim,
            transform: [
              { translateY: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) },
              { scaleX: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
            ],
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border + '40', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }]}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="search-outline" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {loading ? t('Searching...') : total > 0 ? `${total} ${t('results')}` : t('Search results')}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <RegionChips regions={regions} selectedId={selectedRegionId} onChange={onRegionChange} isRTL={isRTL} />

        {/* Loading */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.hint, { color: colors.textSecondary, marginTop: 8 }]}>{t('Searching...')}</Text>
          </View>
        )}

        {/* Hint */}
        {showHint && (
          <View style={styles.center}>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('Type at least 2 characters')}</Text>
          </View>
        )}

        {/* Empty */}
        {showEmpty && (
          <View style={styles.center}>
            <View style={[styles.emptyCircle, { backgroundColor: colors.border + '50' }]}>
              <Ionicons name="search-outline" size={26} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('No results')}</Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>«{query}»</Text>
          </View>
        )}

        {/* Results */}
        {!loading && total > 0 && (
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {results.categories.length > 0 && (
              <>
                <FadeSlide delay={next() * 35}>
                  <SectionHeader icon="grid-outline" label={t('Categories')} count={results.categories.length} isRTL={isRTL} />
                </FadeSlide>
                {results.categories.map((s) => (
                  <FadeSlide key={s.item.id} delay={next() * 35}>
                    <CategoryRow scored={s} onPress={() => onCategoryPress(s.item)} isRTL={isRTL} />
                  </FadeSlide>
                ))}
              </>
            )}
            {results.subcategories.length > 0 && (
              <>
                <FadeSlide delay={next() * 35}>
                  <SectionHeader icon="construct-outline" label={t('Services')} count={results.subcategories.length} isRTL={isRTL} />
                </FadeSlide>
                {results.subcategories.map((s) => (
                  <FadeSlide key={s.item.id} delay={next() * 35}>
                    <SubcategoryRow scored={s} onPress={() => onSubcategoryPress(s.item)} isRTL={isRTL} />
                  </FadeSlide>
                ))}
              </>
            )}
            {results.technicians.length > 0 && (
              <>
                <FadeSlide delay={next() * 35}>
                  <SectionHeader icon="people-outline" label={t('Technicians')} count={results.technicians.length} isRTL={isRTL} />
                </FadeSlide>
                {results.technicians.map((s) => (
                  <FadeSlide key={s.item.id} delay={next() * 35}>
                    <TechnicianRow scored={s} onPress={() => onTechnicianPress(s.item.id)} isRTL={isRTL} />
                  </FadeSlide>
                ))}
              </>
            )}
            <View style={{ height: 12 }} />
          </ScrollView>
        )}
      </Animated.View>
    </>
  );
};

export default SearchResultsDropdown;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  panel: {
    position: 'absolute',
    zIndex: 999,
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipsWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 34, height: 34, borderRadius: 10 },
  rowIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: 14, fontWeight: '500' },
  rowSub: { fontSize: 12, marginTop: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarWrap: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  techMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  center: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyCircle: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 13, textAlign: 'center', opacity: 0.8 },
});
