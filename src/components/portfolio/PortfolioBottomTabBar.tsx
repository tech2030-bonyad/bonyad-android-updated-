import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export type BottomTabId = 'home' | 'projects' | 'payments' | 'profile';

type Props = {
  activeTab: BottomTabId;
  onTabPress: (tab: BottomTabId) => void;
};

const TABS: { id: BottomTabId; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'home', icon: 'home-outline' },
  { id: 'projects', icon: 'folder-outline' },
  { id: 'payments', icon: 'card-outline' },
  { id: 'profile', icon: 'person-outline' },
];

export function PortfolioBottomTabBar({ activeTab, onTabPress }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const bottomPad = Math.max(28, insets.bottom);
  const barBg = isDark ? 'rgba(0,0,0,0.92)' : colors.cardBackground;
  const barBorder = isDark ? 'rgba(255,255,255,0.07)' : colors.border;
  const inactiveIcon = isDark ? '#3a3a3a' : colors.textTertiary;

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad, backgroundColor: barBg, borderTopColor: barBorder }]}>
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <TouchableOpacity key={tab.id} style={styles.item} onPress={() => onTabPress(tab.id)} activeOpacity={0.85}>
            <View style={[styles.pill, active && styles.pillActive]}>
              <Ionicons name={tab.icon} size={20} color={active ? colors.primaryLight : inactiveIcon} />
            </View>
            {active ? <View style={styles.dot} /> : <View style={styles.dotPlaceholder} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  pill: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pillActive: {
    backgroundColor: 'rgba(0,84,155,0.2)',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00549B',
  },
  dotPlaceholder: {
    width: 4,
    height: 4,
  },
});
