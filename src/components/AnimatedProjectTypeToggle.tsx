/**
 * Animated Project Type Toggle Component
 * 
 * A professional animated toggle for switching between Large and Small projects
 * with smooth animations - Similar to AnimatedRoleToggle
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { FontFamily, UIFontSizes } from '../constants/Fonts';

interface AnimatedProjectTypeToggleProps {
  selectedType: 'large' | 'small';
  onTypeChange: (type: 'large' | 'small') => void;
  className?: string;
}

// Blue Toggle Colors
const blueToggleColors = {
  blueActive: '#0080E0',        // Primary blue
  blueBg: '#E6F2FF',         // Light blue background
  textDark: '#2D2D2D',       // Dark text color
};

export default function AnimatedProjectTypeToggle({ 
  selectedType, 
  onTypeChange,
  className = '' 
}: AnimatedProjectTypeToggleProps) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const slideAnim = useRef(new Animated.Value(selectedType === 'large' ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const containerWidth = useRef(0);
  
  // Calculate translateX - use a fixed approach that works with flexbox
  const [containerWidthState, setContainerWidthState] = useState(300); // Default width
  // Height for the toggle - increased for larger font
  const defaultHeight = 52; // Increased from 44 to accommodate larger font
  const [containerHeightState, setContainerHeightState] = useState(defaultHeight);
  
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerWidthState(width);
    setContainerHeightState(height);
    containerWidth.current = width;
  };

  useEffect(() => {
    // Animate slider position
    Animated.spring(slideAnim, {
      toValue: selectedType === 'large' ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Add scale animation on change
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
  }, [selectedType]);

  // Calculate translateX in pixels (50% of container width minus padding)
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (containerWidthState - 12) * 0.5], // 50% of available width (container - 12px padding)
  });

  // Use blue colors - use theme primary for active, light blue background
  const bgColor = isDarkMode ? '#1A2E3D' : blueToggleColors.blueBg; // Darker blue background for dark mode
  const activeColor = isDarkMode ? colors.primary : blueToggleColors.blueActive; // Use theme primary or blue
  const textColor = isDarkMode ? '#FFFFFF' : '#FFFFFF'; // White text on blue active
  const inactiveTextColor = isDarkMode ? '#CCCCCC' : blueToggleColors.textDark;

  return (
    <View 
      style={{
        position: 'relative',
        backgroundColor: bgColor,
        borderRadius: 8, // Figma: rounded-[8px]
        padding: 6, // Figma: p-[6px]
        flexDirection: 'row',
        overflow: 'hidden',
        height: 52, // Increased for larger font
      }}
      onLayout={handleLayout}
    >
      {/* Animated Slider Background with Text Inside */}
      <Animated.View
        style={{
          position: 'absolute',
          backgroundColor: activeColor,
          borderRadius: 8, // Figma: rounded-[8px]
          width: containerWidthState > 0 ? (containerWidthState - 12) * 0.5 : '50%', // Account for padding (6px on each side)
          height: 40, // Increased from 32 for larger font
          top: 6, // Match container padding
          left: 6, // Padding from left
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          transform: [
            { translateX },
            { scale: scaleAnim }
          ],
        }}
      >
        <Text
          style={{
            fontSize: UIFontSizes.bodyLarge, // Centralized font size
            fontWeight: '400',
            color: textColor,
            textAlign: 'center',
            fontFamily: FontFamily.primary,
          }}
          numberOfLines={1}
        >
          {selectedType === 'large' ? t('Large') : t('Small')}
        </Text>
      </Animated.View>

      {/* Large Button - Shows text when not selected */}
      <TouchableOpacity
        onPress={() => onTypeChange('large')}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          zIndex: 1,
          height: 40, // Increased to match slider
          minHeight: 40,
          maxHeight: 40,
        }}
        activeOpacity={0.8}
      >
        {selectedType !== 'large' && (
          <Text
            style={{
              fontSize: UIFontSizes.bodyLarge, // Centralized font size
              fontWeight: '400',
              color: inactiveTextColor,
              textAlign: 'center',
              fontFamily: FontFamily.primary,
            }}
            numberOfLines={1}
          >
            {t('Large')}
          </Text>
        )}
      </TouchableOpacity>

      {/* Small Button - Shows text when not selected */}
      <TouchableOpacity
        onPress={() => onTypeChange('small')}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          zIndex: 1,
          height: 40, // Increased to match slider
          minHeight: 40,
          maxHeight: 40,
        }}
        activeOpacity={0.8}
      >
        {selectedType !== 'small' && (
          <Text
            style={{
              fontSize: UIFontSizes.bodyLarge, // Centralized font size
              fontWeight: '400',
              color: inactiveTextColor,
              textAlign: 'center',
              fontFamily: FontFamily.primary,
            }}
            numberOfLines={1}
          >
            {t('Small')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
