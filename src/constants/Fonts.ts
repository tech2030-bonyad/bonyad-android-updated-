/**
 * 🔤 FONTS: App-wide font family and size configuration
 *
 * Language-aware fonts (same as web):
 * - Arabic: Cairo (Cairo-Regular, Cairo-Medium, Cairo-SemiBold, Cairo-Bold, Cairo-ExtraBold)
 * - English: Poppins (Poppins-Regular, Poppins-SemiBold, Poppins-Bold)
 *
 * Font files: assets/fonts/
 * Download Cairo from: https://fonts.google.com/specimen/Cairo
 * See docs/CAIRO_FONT_INSTRUCTIONS.md
 */

import { Platform } from 'react-native';

// Arabic font family (same as web) - Cairo (@expo-google-fonts/cairo)
export const ARABIC_FONTS = {
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semiBold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  extraBold: 'Cairo_800ExtraBold',
} as const;

// English font family (same as web) - Poppins (@expo-google-fonts/poppins)
export const ENGLISH_FONTS = {
  regular: 'Poppins_400Regular',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export type FontWeight = keyof typeof ARABIC_FONTS;

export function getFont(isArabic: boolean, weight: FontWeight = 'regular'): string {
  if (isArabic) {
    return ARABIC_FONTS[weight] ?? ARABIC_FONTS.regular;
  }
  if (weight === 'regular' || weight === 'medium') return ENGLISH_FONTS.regular;
  if (weight === 'semiBold') return ENGLISH_FONTS.semiBold;
  return ENGLISH_FONTS.bold;
}

// Legacy aliases
export const ARABIC_FONT = ARABIC_FONTS.regular;
export const ARABIC_FONT_BOLD = ARABIC_FONTS.bold;
export const SYSTEM_FONT = ENGLISH_FONTS.regular;
export const SYSTEM_FONT_BOLD = ENGLISH_FONTS.bold;

/**
 * Get font family based on language
 */
export const getFontFamily = (isArabic: boolean): string => {
  return getFont(isArabic, 'regular');
};

/**
 * Get bold font family based on language
 */
export const getBoldFontFamily = (isArabic: boolean): string => {
  return getFont(isArabic, 'bold');
};

// Font families for different use cases (legacy)
export const Fonts = {
  primary: ARABIC_FONTS.regular,
  primaryBold: ARABIC_FONTS.bold,
  heading: ARABIC_FONTS.bold,
  body: ARABIC_FONTS.regular,
  label: ARABIC_FONTS.medium,
  input: ARABIC_FONTS.regular,
  button: ARABIC_FONTS.semiBold,
  navigation: ARABIC_FONTS.regular,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace",
  }),
  arabic: ARABIC_FONTS.regular,
};

// Platform-specific font family strings (legacy)
export const FontFamily = {
  primary: Fonts.primary,
  primaryBold: Fonts.primaryBold,
  heading: Fonts.heading,
  body: Fonts.body,
  label: Fonts.label,
  input: Fonts.input,
  button: Fonts.button,
  mono: Fonts.mono,
  arabic: Fonts.arabic,
};

/**
 * Get language-aware FontFamily object
 */
export const getLanguageFontFamily = (isArabic: boolean) => {
  return {
    primary: getFont(isArabic, 'regular'),
    primaryBold: getFont(isArabic, 'bold'),
    heading: getFont(isArabic, 'bold'),
    body: getFont(isArabic, 'regular'),
    label: getFont(isArabic, 'medium'),
    input: getFont(isArabic, 'regular'),
    button: getFont(isArabic, 'semiBold'),
    mono: Fonts.mono,
    arabic: ARABIC_FONTS.regular,
  };
};

// Font weights
export const FontWeights = {
  thin: '100' as const,
  extraLight: '200' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
  black: '900' as const,
};

// ============================================
// 📏 FONT SIZES - INCREASED for SakkalMajalla
// ============================================

// Font size scale types
export type FontSizeScale = 'small' | 'medium' | 'large';

// Font size multipliers for each scale
export const FONT_SIZE_MULTIPLIERS: Record<FontSizeScale, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.2,
};

// Base font sizes (generic scale) - at medium (1.0x)
const BASE_FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 38,
  '6xl': 46,
  '7xl': 54,
};

// Default font sizes at medium scale
export const FontSizes = BASE_FONT_SIZES;

/**
 * Get scaled font sizes based on the selected scale
 * @param scale - The font size scale (small, medium, large)
 * @returns Object with all font sizes scaled appropriately
 */
export const getScaledFontSizes = (scale: FontSizeScale = 'medium') => {
  const multiplier = FONT_SIZE_MULTIPLIERS[scale];
  return {
    xs: Math.round(BASE_FONT_SIZES.xs * multiplier),
    sm: Math.round(BASE_FONT_SIZES.sm * multiplier),
    md: Math.round(BASE_FONT_SIZES.md * multiplier),
    lg: Math.round(BASE_FONT_SIZES.lg * multiplier),
    xl: Math.round(BASE_FONT_SIZES.xl * multiplier),
    '2xl': Math.round(BASE_FONT_SIZES['2xl'] * multiplier),
    '3xl': Math.round(BASE_FONT_SIZES['3xl'] * multiplier),
    '4xl': Math.round(BASE_FONT_SIZES['4xl'] * multiplier),
    '5xl': Math.round(BASE_FONT_SIZES['5xl'] * multiplier),
    '6xl': Math.round(BASE_FONT_SIZES['6xl'] * multiplier),
    '7xl': Math.round(BASE_FONT_SIZES['7xl'] * multiplier),
  };
};

// Base UI-specific font sizes (at medium scale)
const BASE_UI_FONT_SIZES = {
  // Form elements
  label: 20,
  input: 18,
  placeholder: 16,
  error: 14,
  
  // Buttons
  buttonLarge: 54,
  buttonMedium: 22,
  buttonSmall: 20,
  
  // Titles & Headers
  welcomeTitle: 40,
  welcomeSubtitle: 24,
  sectionTitle: 26,
  cardTitle: 22,
  
  // Body text
  bodyLarge: 18,
  body: 16,
  bodySmall: 14,
  caption: 14,
  
  // Links
  link: 24,
  linkSmall: 20,
  
  // Navigation
  navItem: 16,
  tabLabel: 14,
  
  // Mobile Logo
  logoText: 30,
  logoArabic: 24,
  
  // Language toggle
  langToggle: 20,
  
  // OTP
  otpInput: 36,
  otpLabel: 22,
  
  // Desktop specific
  desktop: {
    welcomeTitle: 32,
    welcomeSubtitle: 20,
    buttonLabel: 22,
    linkText: 24,
    formTitle: 44,
    formSubtitle: 22,
  },
};

// Default UI font sizes at medium scale
export const UIFontSizes = BASE_UI_FONT_SIZES;

/**
 * Get scaled UI font sizes based on the selected scale
 * @param scale - The font size scale (small, medium, large)
 * @returns Object with all UI font sizes scaled appropriately
 */
export const getScaledUIFontSizes = (scale: FontSizeScale = 'medium') => {
  const multiplier = FONT_SIZE_MULTIPLIERS[scale];
  return {
    // Form elements
    label: Math.round(BASE_UI_FONT_SIZES.label * multiplier),
    input: Math.round(BASE_UI_FONT_SIZES.input * multiplier),
    placeholder: Math.round(BASE_UI_FONT_SIZES.placeholder * multiplier),
    error: Math.round(BASE_UI_FONT_SIZES.error * multiplier),
    
    // Buttons
    buttonLarge: Math.round(BASE_UI_FONT_SIZES.buttonLarge * multiplier),
    buttonMedium: Math.round(BASE_UI_FONT_SIZES.buttonMedium * multiplier),
    buttonSmall: Math.round(BASE_UI_FONT_SIZES.buttonSmall * multiplier),
    
    // Titles & Headers
    welcomeTitle: Math.round(BASE_UI_FONT_SIZES.welcomeTitle * multiplier),
    welcomeSubtitle: Math.round(BASE_UI_FONT_SIZES.welcomeSubtitle * multiplier),
    sectionTitle: Math.round(BASE_UI_FONT_SIZES.sectionTitle * multiplier),
    cardTitle: Math.round(BASE_UI_FONT_SIZES.cardTitle * multiplier),
    
    // Body text
    bodyLarge: Math.round(BASE_UI_FONT_SIZES.bodyLarge * multiplier),
    body: Math.round(BASE_UI_FONT_SIZES.body * multiplier),
    bodySmall: Math.round(BASE_UI_FONT_SIZES.bodySmall * multiplier),
    caption: Math.round(BASE_UI_FONT_SIZES.caption * multiplier),
    
    // Links
    link: Math.round(BASE_UI_FONT_SIZES.link * multiplier),
    linkSmall: Math.round(BASE_UI_FONT_SIZES.linkSmall * multiplier),
    
    // Navigation
    navItem: Math.round(BASE_UI_FONT_SIZES.navItem * multiplier),
    tabLabel: Math.round(BASE_UI_FONT_SIZES.tabLabel * multiplier),
    
    // Mobile Logo
    logoText: Math.round(BASE_UI_FONT_SIZES.logoText * multiplier),
    logoArabic: Math.round(BASE_UI_FONT_SIZES.logoArabic * multiplier),
    
    // Language toggle
    langToggle: Math.round(BASE_UI_FONT_SIZES.langToggle * multiplier),
    
    // OTP
    otpInput: Math.round(BASE_UI_FONT_SIZES.otpInput * multiplier),
    otpLabel: Math.round(BASE_UI_FONT_SIZES.otpLabel * multiplier),
    
    // Desktop specific
    desktop: {
      welcomeTitle: Math.round(BASE_UI_FONT_SIZES.desktop.welcomeTitle * multiplier),
      welcomeSubtitle: Math.round(BASE_UI_FONT_SIZES.desktop.welcomeSubtitle * multiplier),
      buttonLabel: Math.round(BASE_UI_FONT_SIZES.desktop.buttonLabel * multiplier),
      linkText: Math.round(BASE_UI_FONT_SIZES.desktop.linkText * multiplier),
      formTitle: Math.round(BASE_UI_FONT_SIZES.desktop.formTitle * multiplier),
      formSubtitle: Math.round(BASE_UI_FONT_SIZES.desktop.formSubtitle * multiplier),
    },
  };
};

export default Fonts;
