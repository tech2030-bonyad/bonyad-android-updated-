/**
 * CompactProjectHeader - Creative compact header for Projects screen
 *
 * Features:
 *  - Minimal icon-based project type toggle (Projects/Small Tasks)
 *  - Project count displayed as elegant badge
 *  - Integrated search with smooth animations
 *  - Dark mode support
 *  - RTL support
 *  - Exposes element refs for tour guide targeting
 */

import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

export interface CompactProjectHeaderRefs {
  toggleRef: React.RefObject<View>;
  countBadgeRef: React.RefObject<View>;
  filterButtonRef: React.RefObject<View>;
  searchContainerRef: React.RefObject<View>;
  searchIconRef: React.RefObject<View>;
  searchInputRef: React.RefObject<View>;
}

interface CompactProjectHeaderProps {
  projectType: 'large' | 'small';
  onTypeChange: (type: 'large' | 'small') => void;
  projectCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterPress: () => void;
}

const CompactProjectHeader = forwardRef<CompactProjectHeaderRefs, CompactProjectHeaderProps>(
  function CompactProjectHeader(
    {
      projectType,
      onTypeChange,
      projectCount,
      searchQuery,
      onSearchChange,
      onFilterPress,
    },
    ref
  ) {
    const { t } = useTranslation();
    const { colors, theme } = useTheme();
    const { fontFamily, boldFontFamily } = useFontFamily();
    const isDark = theme === 'dark';
    const isRTL = I18nManager.isRTL;

    const [searchFocused, setSearchFocused] = useState(false);
    const searchScaleAnim = useRef(new Animated.Value(1)).current;

    // Individual element refs for tour targeting
    const toggleRef = useRef<View>(null);
    const countBadgeRef = useRef<View>(null);
    const filterButtonRef = useRef<View>(null);
    const searchContainerRef = useRef<View>(null);
    const searchIconRef = useRef<View>(null);
    const searchInputRef = useRef<View>(null);

    // Expose refs to parent
    useImperativeHandle(ref, () => ({
      toggleRef,
      countBadgeRef,
      filterButtonRef,
      searchContainerRef,
      searchIconRef,
      searchInputRef,
    }));

    const handleSearchFocus = () => {
      setSearchFocused(true);
      Animated.spring(searchScaleAnim, {
        toValue: 1.02,
        useNativeDriver: true,
        friction: 8,
      }).start();
    };

    const handleSearchBlur = () => {
      setSearchFocused(false);
      Animated.spring(searchScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }).start();
    };

    const bg = isDark ? '#1a1a1c' : '#ffffff';
    const borderColor = isDark ? '#3a3a3c' : '#e5e7eb';
    const textColor = isDark ? '#f2f2f7' : '#1f2937';
    const secondaryText = isDark ? '#a0a0a8' : '#6b7280';
    const accentColor = colors.primary || '#3b82f6';

    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Row 1: Type Toggle + Project Count Badge + Filter */}
        <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Minimal Icon Toggle */}
          <View
            ref={toggleRef}
            collapsable={false}
            style={[
              styles.compactToggle,
              {
                backgroundColor: isDark ? '#2a2a2e' : '#f3f4f6',
                borderColor: borderColor,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.toggleButton,
                projectType === 'large' && styles.toggleButtonActive,
                projectType === 'large' && { backgroundColor: accentColor },
              ]}
              onPress={() => onTypeChange('large')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="briefcase"
                size={16}
                color={projectType === 'large' ? '#ffffff' : secondaryText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleButton,
                projectType === 'small' && styles.toggleButtonActive,
                projectType === 'small' && { backgroundColor: accentColor },
              ]}
              onPress={() => onTypeChange('small')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="list"
                size={16}
                color={projectType === 'small' ? '#ffffff' : secondaryText}
              />
            </TouchableOpacity>
          </View>

          {/* Project Count Badge */}
          <View
            ref={countBadgeRef}
            collapsable={false}
            style={[
              styles.countBadge,
              {
                backgroundColor: `${accentColor}15`,
                borderColor: `${accentColor}30`,
              },
            ]}
          >
            <Text
              style={[
                styles.countNumber,
                { color: accentColor, fontFamily: boldFontFamily },
              ]}
            >
              {projectCount}
            </Text>
            <Text style={[styles.countLabel, { color: secondaryText }]}>
              {projectCount === 1 ? t('projectsScreen.project') : t('projectsScreen.projects')}
            </Text>
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            ref={filterButtonRef}
            collapsable={false}
            style={[
              styles.filterButton,
              {
                backgroundColor: isDark ? '#2a2a2e' : '#f3f4f6',
                borderColor: borderColor,
              },
            ]}
            onPress={onFilterPress}
            activeOpacity={0.7}
          >
            <Feather name="filter" size={16} color={accentColor} />
          </TouchableOpacity>
        </View>

        {/* Row 2: Search Bar */}
        <Animated.View
          style={[
            styles.searchRow,
            { transform: [{ scale: searchScaleAnim }] },
          ]}
        >
          <View
            ref={searchContainerRef}
            collapsable={false}
            style={[
              styles.searchContainer,
              {
                backgroundColor: isDark ? '#2a2a2e' : '#f9fafb',
                borderColor: searchFocused ? accentColor : borderColor,
                borderWidth: searchFocused ? 2 : 1,
              },
            ]}
          >
            <View ref={searchIconRef} collapsable={false}>
              <Feather
                name="search"
                size={16}
                color={searchFocused ? accentColor : secondaryText}
              />
            </View>
            <View ref={searchInputRef} collapsable={false} style={styles.searchInputWrapper}>
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    color: textColor,
                    fontFamily: fontFamily,
                  },
                ]}
                placeholder={t('projectsScreen.searchPlaceholder')}
                placeholderTextColor={secondaryText}
                value={searchQuery}
                onChangeText={onSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                returnKeyType="search"
              />
            </View>
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => onSearchChange('')}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={16} color={secondaryText} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    );
  }
);

export default CompactProjectHeader;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  compactToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  countBadge: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  countLabel: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
    marginTop: 2,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    width: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
});
