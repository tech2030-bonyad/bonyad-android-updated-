/**
 * AppBottomSheetModal — Unified bottom-sheet modal for project & small-task status screens.
 * Same design as StagesManagementModal: handle, title, close, theme, slide + fade animation.
 * Use RiyalAmount for any price (riyal logo from assets, no SAR/dollar text).
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Pressable,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHover } from '../hooks/useHover';

const FONT = 'Cairo';

// ——— Light palette (match StagesManagementModal) ———
const C = {
  sheetBg: '#FAFBFF',
  sheetBorder: '#E8EEF8',
  handle: '#DDE5F0',
  title: '#0C1A2E',
  subtitle: '#8FA3BF',
  closeBg: '#F0F4FA',
  closeBgHover: '#FFE4E4',
  closeIcon: '#8FA3BF',
  closeIconHover: '#EF4444',
};
const C_DARK = {
  ...C,
  sheetBg: '#1C1C1E',
  sheetBorder: '#2C2C2E',
  handle: '#3A3A3C',
  title: '#FFFFFF',
  subtitle: '#B0B0B0',
  closeBg: '#2C2C2E',
  closeBgHover: '#3D2A2A',
  closeIcon: '#B0B0B0',
  closeIconHover: '#EF4444',
};

function IconClose({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 6L6 18M6 6l12 12" />
    </Svg>
  );
}

export interface AppBottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Optional: custom content container style */
  contentStyle?: ViewStyle;
  /** Max height fraction of window (default 0.92) */
  heightFraction?: number;
  /** When false, content is not wrapped in ScrollView (e.g. for full-screen child like BookingScreen). Default true. */
  scrollable?: boolean;
}

export default function AppBottomSheetModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  contentStyle,
  heightFraction = 0.92,
  scrollable = true,
}: AppBottomSheetModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const palette = isDark ? C_DARK : C;
  const windowHeight = Dimensions.get('window').height;
  const sheetHeight = windowHeight * heightFraction;

  const slideAnim = useRef(new Animated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closeHover = useHover();

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
    ]).start();
  }, [visible]);

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: windowHeight, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modalRoot: { flex: 1, justifyContent: 'flex-end' },
        backdropTouch: { flex: 1 },
        backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
        sheet: {
          backgroundColor: palette.sheetBg,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: palette.sheetBorder,
          height: sheetHeight,
          paddingBottom: insets.bottom,
        },
        handleWrap: { alignItems: 'center', marginTop: 14 },
        handle: { width: 36, height: 4, borderRadius: 99, backgroundColor: palette.handle },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 18,
          paddingHorizontal: 20,
          paddingBottom: 0,
        },
        title: { fontSize: 20, fontWeight: '800', color: palette.title, letterSpacing: -0.3, fontFamily: FONT },
        closeBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: palette.closeBg,
          justifyContent: 'center',
          alignItems: 'center',
        },
        closeBtnHover: { backgroundColor: palette.closeBgHover },
        subtitle: { fontSize: 12, fontWeight: '500', color: palette.subtitle, paddingHorizontal: 20, marginTop: 4, fontFamily: FONT },
        scroll: { flex: 1 },
        scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
      }),
    [isDark, sheetHeight, insets.bottom]
  );

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={closeModal}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={closeModal}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableOpacity>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              onPress={closeModal}
              style={[styles.closeBtn, (closeHover.hovered || closeHover.pressed) && styles.closeBtnHover]}
              {...closeHover.handlers}
            >
              <IconClose color={closeHover.hovered || closeHover.pressed ? palette.closeIconHover : palette.closeIcon} />
            </Pressable>
          </View>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          {scrollable ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, contentStyle]}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.scroll, styles.scrollContent, contentStyle]}>{children}</View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ——— RiyalAmount: price display using riyal logo from assets (no SAR/dollar text) ———
export interface RiyalAmountProps {
  amount: number;
  /** Format for locale (e.g. ar-SA). Default from i18n if available. */
  locale?: string;
  /** Text style for the number */
  style?: ViewStyle;
  /** Size of the riyal icon (default 16) */
  iconSize?: number;
  /** Optional: show icon after number (default true) */
  showIcon?: boolean;
}

export function RiyalAmount({ amount, locale = 'ar-SA', style, iconSize = 16, showIcon = true }: RiyalAmountProps) {
  const { theme, colors } = useTheme();
  const isDark = theme === 'dark';
  const riyalLogo = isDark
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');
  const formatted = new Intl.NumberFormat(locale).format(amount);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4 }, style]}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: FONT }}>
        {formatted}
      </Text>
      {showIcon && (
        <ExpoImage source={riyalLogo} style={{ width: iconSize, height: iconSize }} contentFit="contain" />
      )}
    </View>
  );
}
