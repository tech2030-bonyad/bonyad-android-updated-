/**
 * Unified app top bar — same style as home screen across the app.
 * Logo left, Chat | Info | Notifications right (primary color icons, no blue bar).
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet, I18nManager, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BonyadLogo from './BonyadLogo';

const H_PADDING = 16;

export interface AppTopBarProps {
  onPressChat: () => void;
  onPressInfo: () => void;
  onPressNotifications: () => void;
  unreadNotificationCount?: number;
  primaryColor: string;
  isDark?: boolean;
  backgroundColor?: string;
  /** Optional wrapper for coach marks (e.g. CoachTouchable around notifications). Receives { onPress, children } so the wrapper can attach onPress. */
  notificationsWrapper?: (props: { onPress: () => void; children: React.ReactNode }) => React.ReactNode;
}

export default function AppTopBar({
  onPressChat,
  onPressInfo,
  onPressNotifications,
  unreadNotificationCount = 0,
  primaryColor,
  isDark = false,
  backgroundColor,
  notificationsWrapper,
}: AppTopBarProps) {
  const insets = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;

  const icons = (
    <>
      <TouchableOpacity style={styles.iconBtn} onPress={onPressChat} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="chatbubbles-outline" size={24} color={primaryColor} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconBtn} onPress={onPressInfo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="information-circle-outline" size={24} color={primaryColor} />
      </TouchableOpacity>
      {notificationsWrapper ? (
        notificationsWrapper({
          onPress: onPressNotifications,
          children: (
            <View>
              <Ionicons name="notifications-outline" size={24} color={primaryColor} />
              {unreadNotificationCount > 0 && (
                <View style={[styles.badge, { backgroundColor: '#FF3B30' }]} />
              )}
            </View>
          ),
        })
      ) : (
        <TouchableOpacity style={styles.iconBtn} onPress={onPressNotifications} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <View>
            <Ionicons name="notifications-outline" size={24} color={primaryColor} />
            {unreadNotificationCount > 0 && (
              <View style={[styles.badge, { backgroundColor: '#FF3B30' }]} />
            )}
          </View>
        </TouchableOpacity>
      )}
    </>
  );

  const topInset = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 28) : 10);
  return (
    <View
      style={[
        styles.bar,
        isRTL && styles.barRTL,
        { paddingTop: topInset },
        backgroundColor != null && { backgroundColor },
      ]}
    >
      <View style={styles.logoWrap}>
        <BonyadLogo size="small" responsive={false} variant={isDark ? 'light' : 'dark'} />
      </View>
      <View style={[styles.icons, isRTL && styles.iconsRTL]}>{icons}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: H_PADDING,
    paddingBottom: 12,
    marginBottom: 16,
  },
  barRTL: { flexDirection: 'row-reverse' },
  logoWrap: {},
  icons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconsRTL: { flexDirection: 'row-reverse' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
