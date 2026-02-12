import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

interface TaskLocationMapProps {
  address: string;
  latitude: number;
  longitude: number;
  taskName?: string;
}

export default function TaskLocationMap({
  address,
  latitude,
  longitude,
  taskName,
}: TaskLocationMapProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, fonts } = useFontFamily();

  const handleOpenMap = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude},${longitude}`;
    const label = encodeURIComponent(address);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) {
      Linking.openURL(url).catch((err) => {
        console.error('Error opening map:', err);
        // Fallback to web maps
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="location" size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
          {t('Location')}
        </Text>
      </View>

      <View style={styles.addressContainer}>
        <Text style={[styles.address, { color: colors.text, fontFamily: fonts?.body || fontFamily }]}>
          {address}
        </Text>
      </View>

      {/* Map Preview Placeholder */}
      <View style={[styles.mapPreview, { backgroundColor: colors.background }]}>
        <Ionicons name="map-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.mapPreviewText, { color: colors.textSecondary }]}>
          {t('Map Preview')}
        </Text>
      </View>

      {/* Get Directions Button */}
      <TouchableOpacity
        style={[styles.directionsButton, { backgroundColor: colors.primary }]}
        onPress={handleOpenMap}
      >
        <Ionicons name="navigate" size={20} color="#FFFFFF" />
        <Text style={[styles.directionsButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
          {t('Get Directions')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  addressContainer: {
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    lineHeight: 20,
  },
  mapPreview: {
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapPreviewText: {
    fontSize: 12,
    marginTop: 8,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  directionsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
