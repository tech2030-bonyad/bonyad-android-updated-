/**
 * CategoryRatingComponent
 * 
 * Component for rating individual categories (Quality, Punctuality, etc.)
 * Used in review forms to collect category-based ratings
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { RatingCategory } from '../services/RatingService';

interface CategoryRatingComponentProps {
  category: RatingCategory;
  rating: number; // 0-5, 0 means not rated
  onRatingChange: (categoryId: number, rating: number) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function CategoryRatingComponent({
  category,
  rating,
  onRatingChange,
  required = false,
  disabled = false,
}: CategoryRatingComponentProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();
  const isRTL = i18n.language === 'ar';
  
  const categoryName = isRTL ? category.nameAr : category.nameEn;
  
  const handleStarPress = (starValue: number) => {
    if (disabled) return;
    // Toggle: if clicking the same star, set to 0
    const newRating = rating === starValue ? 0 : starValue;
    onRatingChange(category.id, newRating);
  };
  
  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.categoryName, { color: colors.text, fontSize: scaledSize(14) }]}>
          {categoryName}
        </Text>
        {required && (
          <Text style={[styles.required, { color: colors.error, fontSize: scaledSize(12) }]}>
            *
          </Text>
        )}
        {rating > 0 && (
          <Text style={[styles.ratingValue, { color: colors.primary, fontSize: scaledSize(12) }]}>
            {rating}/5
          </Text>
        )}
      </View>
      
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleStarPress(star)}
            disabled={disabled}
            style={styles.starButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={28}
              color={star <= rating ? colors.primary : colors.border}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontWeight: '600',
    flex: 1,
  },
  required: {
    marginLeft: 4,
    fontWeight: 'bold',
  },
  ratingValue: {
    marginLeft: 8,
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
});
