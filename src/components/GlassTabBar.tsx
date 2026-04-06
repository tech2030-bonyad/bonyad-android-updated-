import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Animated,
  Pressable,
  Dimensions,
  Easing,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
const { width: SCREEN_W } = Dimensions.get('window');
const BRAND_BLUE = '#00A5F4';
const BRAND_BLUE_DARK = '#0078C8';

export type UserTabId = 'home' | 'projects' | 'new' | 'chat' | 'profile';

export interface TabItemConfig {
  id: string;
  icon: string;
  iconActive: string;
  label: string;
}

const DEFAULT_TABS: TabItemConfig[] = [
  { id: 'home', icon: 'home-outline', iconActive: 'home', label: 'Home' },
  { id: 'projects', icon: 'folder-outline', iconActive: 'folder', label: 'Projects' },
  { id: 'new', icon: 'add', iconActive: 'add', label: '' },
  { id: 'chat', icon: 'chatbubbles-outline', iconActive: 'chatbubbles', label: 'Chat' },
  { id: 'profile', icon: 'person-outline', iconActive: 'person', label: 'Profile' },
];

export const TECHNICIAN_TABS: TabItemConfig[] = [
  { id: 'home', icon: 'home-outline', iconActive: 'home', label: 'Home' },
  { id: 'projects', icon: 'folder-outline', iconActive: 'folder', label: 'Projects' },
  { id: 'wallet', icon: 'card-outline', iconActive: 'card', label: 'Payments' },
  { id: 'profile', icon: 'person-outline', iconActive: 'person', label: 'Profile' },
];

interface GlassTabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
  onNewPress?: () => void;
  tabs?: TabItemConfig[];
  primaryColor?: string;
  primaryColorDark?: string;
  isDark?: boolean;
  bottomInset?: number;
  t?: (key: string) => string;
}

/**
 * Reserve this much space at the bottom of embedded screens (e.g. chat) so content clears the
 * floating tab bar (`glassTabBarContainer` is `position: 'absolute'` in UserHomeScreen / TechnicianHomeScreen).
 * Matches `styles.outer` (paddingTop 6 + paddingBottom) + pill row (paddingVertical 8 + tabSlot 52) + gap.
 */
export function getGlassTabBarOverlayHeight(bottomInset: number): number {
  const outerTop = 6;
  const rowVertical = 8 * 2;
  const tabSlot = 52;
  const outerBottom = Math.max(bottomInset, 10);
  const gapAbovePill = 6;
  return outerTop + rowVertical + tabSlot + outerBottom + gapAbovePill;
}

export default function GlassTabBar({
  activeTab,
  onTabPress,
  onNewPress,
  tabs = DEFAULT_TABS,
  primaryColor = BRAND_BLUE,
  primaryColorDark = BRAND_BLUE_DARK,
  isDark = false,
  bottomInset = 20,
  t,
}: GlassTabBarProps) {
  const { t: i18nT } = useTranslation();
  const tFn = t ?? i18nT ?? ((k: string) => k);
  const regularTabs = useMemo(() => tabs.filter((tab) => tab.id !== 'new'), [tabs]);
  const hasCenter = tabs.some((tab) => tab.id === 'new');
  const activeIndex = regularTabs.findIndex((tab) => tab.id === activeTab);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const barWidth = SCREEN_W - 32;
  const slotCount = hasCenter ? regularTabs.length + 1 : regularTabs.length;
  const rowPadding = 4;
  const slotW = (barWidth - rowPadding * 2) / slotCount;
  // indicator dimensions — kept here so position calc and style stay in sync
  const INDICATOR_W = slotW - 8;
  const INDICATOR_H = 54;

  useEffect(() => {
    if (activeIndex < 0) return;
    let physicalIdx = activeIndex;
    if (hasCenter) {
      const newTab = tabs.find((t) => t.id === 'new');
      if (newTab) {
        const centerSlot = Math.floor(tabs.indexOf(newTab));
        const beforeCenter = tabs.slice(0, centerSlot).filter((t) => t.id !== 'new').length;
        physicalIdx = activeIndex < beforeCenter ? activeIndex : activeIndex + 1;
      }
    }
    const slotCenter = rowPadding + physicalIdx * slotW + slotW / 2;
    const target = slotCenter - INDICATOR_W / 2;
    Animated.spring(indicatorX, {
      toValue: target,
      tension: 300,
      friction: 22,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, slotW, hasCenter, tabs]);

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(bottomInset, 10), direction: 'ltr' }]}>
      <View style={[styles.pill, isDark ? styles.pillDark : styles.pillLight, { direction: 'ltr' }]}>
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']
              : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.20)']
          }
          style={[StyleSheet.absoluteFillObject, styles.pillRadius]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <View style={[styles.pillRadius, styles.pillBorder, isDark && styles.pillBorderDark]} />

        {activeIndex >= 0 && (
          <Animated.View
            style={[
              styles.slidingIndicator,
              {
                width: INDICATOR_W,
                height: INDICATOR_H,
                top: (68 - INDICATOR_H) / 2,
                backgroundColor: (primaryColor || BRAND_BLUE) + '18',
                borderColor: (primaryColor || BRAND_BLUE) + '30',
                transform: [{ translateX: indicatorX }],
              },
            ]}
            pointerEvents="none"
          />
        )}

        <View style={[styles.row, { flexDirection: 'row' }]}>
          {tabs.map((tab) => {
            const inner =
              tab.id === 'new' ? (
                <PlusButton
                  key="__plus__"
                  onPress={() => (onNewPress ? onNewPress() : onTabPress('new'))}
                  primaryColor={primaryColor}
                  primaryColorDark={primaryColorDark}
                />
              ) : (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  isSelected={activeTab === tab.id}
                  onPress={() => onTabPress(tab.id)}
                  primaryColor={primaryColor}
                  isDark={isDark}
                  t={tFn}
                />
              );
            return inner;
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Tab Item ────────────────────────────────────────────────────────────────

function TabItem({
  tab,
  isSelected,
  onPress,
  primaryColor,
  isDark,
  t,
}: {
  tab: TabItemConfig;
  isSelected: boolean;
  onPress: () => void;
  primaryColor: string;
  isDark: boolean;
  t: (k: string) => string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(isSelected ? 1 : 0.92)).current;
  const labelOpacity = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const labelTranslate = useRef(new Animated.Value(isSelected ? 0 : 6)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: isSelected ? 1 : 0.92,
        tension: 350,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(labelOpacity, {
        toValue: isSelected ? 1 : 0,
        duration: isSelected ? 250 : 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(labelTranslate, {
        toValue: isSelected ? 0 : 6,
        tension: 340,
        friction: 14,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected]);

  const fireRipple = () => {
    rippleScale.setValue(0.3);
    rippleOpacity.setValue(0.35);
    Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1.2,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const inactiveColor = isDark ? '#888' : '#9ca3af';
  const label = t(tab.label) || tab.label;

  return (
    <Pressable
      onPress={() => {
        fireRipple();
        onPress();
      }}
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.88, tension: 400, friction: 15, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1, tension: 300, friction: 14, useNativeDriver: true }).start()
      }
      style={styles.tabSlot}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rippleCircle,
            {
              backgroundColor: primaryColor,
              opacity: rippleOpacity,
              transform: [{ scale: rippleScale }],
            },
          ]}
        />
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Ionicons
            name={(isSelected ? tab.iconActive : tab.icon) as any}
            size={22}
            color={isSelected ? primaryColor : inactiveColor}
          />
        </Animated.View>
        <Animated.Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: primaryColor,
              opacity: labelOpacity,
              transform: [{ translateY: labelTranslate }],
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Center Plus Button ──────────────────────────────────────────────────────

function PlusButton({
  onPress,
  primaryColor,
  primaryColorDark,
}: {
  onPress: () => void;
  primaryColor: string;
  primaryColorDark: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.1)).current;
  const glowScale = useRef(new Animated.Value(0.88)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.28,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1.04,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.1,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 0.88,
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const fireRipple = () => {
    rippleScale.setValue(0.4);
    rippleOpacity.setValue(0.5);
    Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1.18,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={() => {
        fireRipple();
        onPress();
      }}
      onPressIn={() =>
        Animated.spring(scale, { toValue: 0.85, tension: 400, friction: 14, useNativeDriver: true }).start()
      }
      onPressOut={() =>
        Animated.spring(scale, { toValue: 1, tension: 260, friction: 12, useNativeDriver: true }).start()
      }
      style={styles.plusSlot}
    >
      <Animated.View style={[styles.plusContainer, { transform: [{ scale }] }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.plusGlow,
            {
              backgroundColor: primaryColor,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.plusRipple,
            {
              backgroundColor: primaryColor,
              opacity: rippleOpacity,
              transform: [{ scale: rippleScale }],
            },
          ]}
        />
        <LinearGradient
          colors={[primaryColor, primaryColorDark]}
          style={styles.plusCircle}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
        >
          <View style={styles.plusCircleBorder} />
          <Ionicons name="add" size={26} color="#fff" />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  pill: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      android: { elevation: 16 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      web: { boxShadow: '0 10px 30px rgba(0,0,0,0.10)' },
    }),
  },
  pillLight: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  pillDark: {
    backgroundColor: 'rgba(28,28,30,0.95)',
  },
  pillRadius: {
    borderRadius: 28,
  },
  pillBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.40)',
  },
  pillBorderDark: {
    borderColor: 'rgba(255,255,255,0.10)',
  },
  slidingIndicator: {
    position: 'absolute',
    left: 0,
    borderRadius: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  // ── Tab ──
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    overflow: 'hidden',
    borderRadius: 16,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
  },
  rippleCircle: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  // ── Plus ── (circular clip keeps glow/ripple inside the slot)
  plusSlot: {
    width: 62,
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
  },
  plusGlow: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  plusRipple: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  plusCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: BRAND_BLUE,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
    }),
  },
  plusCircleBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
