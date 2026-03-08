/**
 * Support Category Icon Component
 * Renders icons from API (icon names or full SVG/PNG URLs)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SupportCategoryIconProps {
  iconName: string;
  size?: number;
  color: string;
  style?: any;
}

// Map API icon names to actual icon components
const ICON_MAPPING: Record<string, {
  library: 'ionicons' | 'feather' | 'material';
  icon: keyof typeof Ionicons | keyof typeof Feather | keyof typeof MaterialCommunityIcons;
}> = {
  'credit-card': { library: 'ionicons', icon: 'card-outline' },
  'rotate-ccw': { library: 'material', icon: 'refresh-outline' },
  'alert-circle': { library: 'ionicons', icon: 'alert-circle-outline' },
  'help-circle': { library: 'ionicons', icon: 'help-circle-outline' },
  'life-buoy': { library: 'ionicons', icon: 'life-buoy-outline' },
  'settings': { library: 'ionicons', icon: 'settings-outline' },
  'document': { library: 'ionicons', icon: 'document-text-outline' },
  'mail': { library: 'ionicons', icon: 'mail-outline' },
  'phone': { library: 'ionicons', icon: 'call-outline' },
  'calendar': { library: 'ionicons', icon: 'calendar-outline' },
  'clock': { library: 'ionicons', icon: 'time-outline' },
  'shield': { library: 'ionicons', icon: 'shield-checkmark-outline' },
  'lock': { library: 'ionicons', icon: 'lock-closed-outline' },
  'user': { library: 'ionicons', icon: 'person-outline' },
  'users': { library: 'ionicons', icon: 'people-outline' },
  'home': { library: 'ionicons', icon: 'home-outline' },
  'map': { library: 'ionicons', icon: 'map-outline' },
  'location': { library: 'ionicons', icon: 'location-outline' },
  'star': { library: 'ionicons', icon: 'star-outline' },
  'heart': { library: 'ionicons', icon: 'heart-outline' },
  'bell': { library: 'ionicons', icon: 'notifications-outline' },
  'check-circle': { library: 'ionicons', icon: 'checkmark-circle-outline' },
  'x-circle': { library: 'ionicons', icon: 'close-circle-outline' },
  'info': { library: 'ionicons', icon: 'information-circle-outline' },
  'wrench': { library: 'ionicons', icon: 'build-outline' },
  'tool': { library: 'ionicons', icon: 'hammer-outline' },
  'zap': { library: 'ionicons', icon: 'flash-outline' },
  'power': { library: 'ionicons', icon: 'power-outline' },
  'wifi': { library: 'ionicons', icon: 'wifi-outline' },
  'database': { library: 'ionicons', icon: 'server-outline' },
  'cloud': { library: 'ionicons', icon: 'cloud-outline' },
  'download': { library: 'ionicons', icon: 'download-outline' },
  'upload': { library: 'ionicons', icon: 'upload-outline' },
  'file': { library: 'ionicons', icon: 'document-outline' },
  'folder': { library: 'ionicons', icon: 'folder-outline' },
  'image': { library: 'ionicons', icon: 'image-outline' },
  'camera': { library: 'ionicons', icon: 'camera-outline' },
  'video': { library: 'ionicons', icon: 'videocam-outline' },
  'audio': { library: 'ionicons', icon: 'musical-notes-outline' },
  'message': { library: 'ionicons', icon: 'chatbubble-outline' },
  'send': { library: 'ionicons', icon: 'send-outline' },
  'bookmark': { library: 'ionicons', icon: 'bookmark-outline' },
  'share': { library: 'ionicons', icon: 'share-outline' },
  'search': { library: 'ionicons', icon: 'search-outline' },
  'filter': { library: 'ionicons', icon: 'funnel-outline' },
  'menu': { library: 'ionicons', icon: 'menu-outline' },
  'grid': { library: 'ionicons', icon: 'grid-outline' },
  'list': { library: 'ionicons', icon: 'list-outline' },
  'chevron-right': { library: 'ionicons', icon: 'chevron-forward' },
  'chevron-down': { library: 'ionicons', icon: 'chevron-down' },
  'plus': { library: 'ionicons', icon: 'add-outline' },
  'minus': { library: 'ionicons', icon: 'remove-outline' },
  'edit': { library: 'ionicons', icon: 'create-outline' },
  'trash': { library: 'ionicons', icon: 'trash-outline' },
  'save': { library: 'ionicons', icon: 'save-outline' },
  'play': { library: 'ionicons', icon: 'play-outline' },
  'pause': { library: 'ionicons', icon: 'pause-outline' },
  'stop': { library: 'ionicons', icon: 'stop-outline' },
};

export default function SupportCategoryIcon({
  iconName,
  size = 24,
  color,
  style,
}: SupportCategoryIconProps) {
  const mapping = ICON_MAPPING[iconName];

  // If no mapping found, use default help icon
  if (!mapping) {
    return (
      <View style={[styles.iconContainer, style]}>
        <Ionicons name="help-circle-outline" size={size} color={color} />
      </View>
    );
  }

  const { library, icon } = mapping;

  return (
    <View style={[styles.iconContainer, style]}>
      {library === 'ionicons' && (
        <Ionicons name={icon as any} size={size} color={color} />
      )}
      {library === 'feather' && (
        <Feather name={icon as any} size={size} color={color} />
      )}
      {library === 'material' && (
        <MaterialCommunityIcons name={icon as any} size={size} color={color} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

