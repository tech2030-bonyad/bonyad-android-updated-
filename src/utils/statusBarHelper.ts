/**
 * Status Bar Helper - Provides consistent top padding for Android screens
 * to prevent status bar icons (clock, WiFi, battery) from overlapping with app content.
 */
import { Platform, StatusBar } from 'react-native';
import { EdgeInsets } from 'react-native-safe-area-context';

/**
 * Calculates the appropriate top padding for screens to avoid status bar overlap.
 * On Android, adds extra padding to account for status bar height.
 * On iOS, uses the safe area inset.
 * 
 * @param insets - The safe area insets from useSafeAreaInsets()
 * @param extraPadding - Additional padding to add (default: 0)
 * @returns The calculated top padding value
 */
export function getTopPadding(insets: EdgeInsets, extraPadding: number = 0): number {
  if (Platform.OS === 'android') {
    const statusBarHeight = StatusBar.currentHeight ?? 0;
    // Add extra 8px padding to ensure content is below status bar icons
    const basePadding = statusBarHeight > 0 ? statusBarHeight : 32;
    return basePadding + 8 + extraPadding;
  }
  // iOS uses safe area insets
  return (insets.top > 0 ? insets.top : 10) + extraPadding;
}

/**
 * Gets just the Android status bar height with extra padding.
 * Useful for headers and fixed top elements.
 * 
 * @returns The status bar height plus extra padding for Android, or 0 for iOS
 */
export function getAndroidStatusBarHeight(): number {
  if (Platform.OS === 'android') {
    const statusBarHeight = StatusBar.currentHeight ?? 0;
    return (statusBarHeight > 0 ? statusBarHeight : 32) + 8;
  }
  return 0;
}

/**
 * Helper to conditionally add top padding only on Android
 * 
 * @param insets - The safe area insets
 * @returns Top padding style object
 */
export function getAndroidTopPaddingStyle(insets: EdgeInsets): { paddingTop: number } {
  return { paddingTop: getTopPadding(insets) };
}
