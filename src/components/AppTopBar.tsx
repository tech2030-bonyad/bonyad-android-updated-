/**
 * Unified app top bar — same style as home screen across the app.
 * Logo left, Chat | Info | Notifications right (primary color icons, no blue bar).
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BonyadLogo from './BonyadLogo';
import { getAppTopBarPaddingTop } from '../utils/statusBarHelper';
import { useTheme } from '../context/ThemeContext';

const H_PADDING = 16;

export interface AppTopBarProps {
  onPressChat: () => void;
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
  onPressNotifications,
  unreadNotificationCount = 0,
  primaryColor,
  isDark = false,
  backgroundColor,
  notificationsWrapper,
}: AppTopBarProps) {
  const insets = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;
  const { colors } = useTheme();

  const icons = (
    <>
      <TouchableOpacity style={styles.iconBtn} onPress={onPressChat} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="chatbubbles-outline" size={24} color={primaryColor} />
      </TouchableOpacity>
      {notificationsWrapper ? (
        notificationsWrapper({
          onPress: onPressNotifications,
          children: (
            <View>
              <Ionicons name="notifications-outline" size={24} color={primaryColor} />
              {unreadNotificationCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.error }]} />
              )}
            </View>
          ),
        })
      ) : (
        <TouchableOpacity style={styles.iconBtn} onPress={onPressNotifications} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <View>
            <Ionicons name="notifications-outline" size={24} color={primaryColor} />
            {unreadNotificationCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]} />
            )}
          </View>
        </TouchableOpacity>
      )}
    </>
  );

  const topInset = getAppTopBarPaddingTop(insets);

  return (
    <View style={[styles.safeWrap, backgroundColor != null && { backgroundColor }, { paddingTop: topInset }]}>
      <View style={[styles.bar, isRTL && styles.barRTL]}>
        <View style={styles.logoWrap}>
          <BonyadLogo size="small" responsive={false} variant={isDark ? 'light' : 'dark'} />
        </View>
        <View style={[styles.icons, isRTL && styles.iconsRTL]}>{icons}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeWrap: {
    width: '100%',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
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
