/**
 * Animated Role Toggle Component
 *
 * A professional animated toggle for switching between User and Technician roles
 * with smooth animations - Figma Design (node 29:123) with Amber/Yellow color scheme.
 * Wrapped in direction: 'ltr' to avoid conflict with app-level I18nManager.forceRTL.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { FontFamily, UIFontSizes } from '../constants/Fonts';

interface AnimatedRoleToggleProps {
  selectedRole: 'user' | 'technician';
  onRoleChange: (role: 'user' | 'technician') => void;
  className?: string;
}

const figmaToggleColors = {
  amberActive: '#FFB703',
  amberBg: '#FFF2CF',
  textDark: '#2D2D2D',
};

export default function AnimatedRoleToggle({
  selectedRole,
  onRoleChange,
  className = '',
}: AnimatedRoleToggleProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const slideAnim = useRef(new Animated.Value(selectedRole === 'user' ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [containerWidth, setContainerWidth] = useState(300);

  const userText = t('User');
  const serviceProviderText = t('Service Provider');

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedRole === 'user' ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.97,
        duration: 80,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedRole]);

  const sliderWidth = containerWidth > 0 ? (containerWidth - 12) * 0.5 : 0;

  // User = 0 (left), Service Provider = sliderWidth (right). No RTL logic — wrapper forces LTR.
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sliderWidth],
  });

  const bgColor = isDarkMode ? '#3D3520' : figmaToggleColors.amberBg;
  const activeColor = figmaToggleColors.amberActive;
  const activeTextColor = isDarkMode ? '#FFFFFF' : figmaToggleColors.textDark;
  const inactiveTextColor = isDarkMode ? '#CCCCCC' : figmaToggleColors.textDark;

  // Force LTR so slider logic is consistent — avoids conflict with I18nManager.forceRTL
  return (
    <View style={{ width: '100%', direction: 'ltr' } as any}>
    <View
      style={{
        position: 'relative',
        backgroundColor: bgColor,
        borderRadius: 8,
        padding: 6,
        flexDirection: 'row',
        overflow: 'hidden',
        height: 52,
        width: '100%',
      }}
      onLayout={handleLayout}
    >
      {/* Animated slider background only — no text inside to avoid flip/alignment issues */}
      <Animated.View
        style={{
          position: 'absolute',
          backgroundColor: activeColor,
          borderRadius: 8,
          width: sliderWidth,
          height: 40,
          top: 6,
          left: 6,
          zIndex: 1,
          transform: [{ translateX }, { scale: scaleAnim }],
        }}
      />

      {/* User — always visible, color by selection */}
      <TouchableOpacity
        onPress={() => onRoleChange('user')}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          height: 40,
          minHeight: 40,
          zIndex: 2,
        }}
        activeOpacity={0.8}
      >
        <Text
          style={{
            fontSize: UIFontSizes.bodyLarge,
            fontWeight: '400',
            color: selectedRole === 'user' ? activeTextColor : inactiveTextColor,
            textAlign: 'center',
            fontFamily: FontFamily.primary,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {userText}
        </Text>
      </TouchableOpacity>

      {/* Service Provider — always visible, color by selection */}
      <TouchableOpacity
        onPress={() => onRoleChange('technician')}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          height: 40,
          minHeight: 40,
          zIndex: 2,
        }}
        activeOpacity={0.8}
      >
        <Text
          style={{
            fontSize: UIFontSizes.bodyLarge,
            fontWeight: '400',
            color: selectedRole === 'technician' ? activeTextColor : inactiveTextColor,
            textAlign: 'center',
            fontFamily: FontFamily.primary,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {serviceProviderText}
        </Text>
      </TouchableOpacity>
    </View>
    </View>
  );
}
