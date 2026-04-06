import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRTL } from '../../hooks/useRTL';

export type BackArrowIconVariant = 'chevron' | 'arrow';

export interface BackArrowIoniconsProps {
  size: number;
  color: string;
  variant?: BackArrowIconVariant;
  style?: StyleProp<TextStyle>;
  /**
   * When the parent header row is forced to LTR (`direction: 'ltr'`), set this so the
   * glyph stays a normal LTR back arrow (left side, points left).
   */
  forceLtrLayout?: boolean;
}

/**
 * Header / toolbar back affordance: Ionicons chevron-back / arrow-back, mirrored in RTL
 * (same intent as Android vector autoMirrored / Compose Icons.AutoMirrored).
 */
export function BackArrowIonicons({
  size,
  color,
  variant = 'chevron',
  style,
  forceLtrLayout = false,
}: BackArrowIoniconsProps) {
  const { isRTL } = useRTL();
  const name = variant === 'arrow' ? 'arrow-back' : 'chevron-back';
  const mirror = !forceLtrLayout && isRTL;
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={[mirror ? { transform: [{ scaleX: -1 }] } : undefined, style]}
    />
  );
}
