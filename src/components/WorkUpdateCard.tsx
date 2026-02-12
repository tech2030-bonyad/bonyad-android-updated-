import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

interface WorkUpdateCardProps {
  message: string;
  photos?: string[];
  timestamp: string;
  technicianName?: string;
}

export default function WorkUpdateCard({
  message,
  photos,
  timestamp,
  technicianName,
}: WorkUpdateCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, fonts } = useFontFamily();

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="construct" size={20} color={colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          {technicianName && (
            <Text style={[styles.technicianName, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
              {technicianName}
            </Text>
          )}
          <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
            {formatDate(timestamp)}
          </Text>
        </View>
      </View>

      {/* Message */}
      <Text style={[styles.message, { color: colors.text, fontFamily: fonts?.body || fontFamily }]}>
        {message}
      </Text>

      {/* Photos */}
      {photos && photos.length > 0 && (
        <View style={styles.photosContainer}>
          {photos.map((photo, index) => (
            <ExpoImage
              key={index}
              source={{ uri: photo }}
              style={styles.photo}
              contentFit="cover"
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  technicianName: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '400',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
});
