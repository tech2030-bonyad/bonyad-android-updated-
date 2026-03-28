import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { SmallTaskRequest } from '../types/smallTasks';
import AlertPopup, { useAlertPopup } from './AlertPopup';
import AppBottomSheetModal from './AppBottomSheetModal';
import {
  getRatingCategories,
  createReviewWithCategories,
  RatingCategory,
  CategoryRating,
} from '../services/RatingService';
import CategoryRatingComponent from './CategoryRatingComponent';

const COLORS = {
  amber60: '#FFB703',
  amber50: '#FFD683',
  amber10: '#FFF8E6',
  textWhite: '#FFFFFF',
  textSecondary: '#A3A3A3',
};

interface SmallTaskReviewFormProps {
  visible: boolean;
  task: SmallTaskRequest;
  technicianId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SmallTaskReviewForm({
  visible,
  task,
  technicianId,
  onClose,
  onSuccess,
}: SmallTaskReviewFormProps) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, fonts } = useFontFamily();
  const isDarkMode = theme === 'dark';

  const [overallRating, setOverallRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categories, setCategories] = useState<RatingCategory[]>([]);
  const [categoryRatings, setCategoryRatings] = useState<Record<number, number>>({});

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

  useEffect(() => {
    if (visible) {
      loadCategories();
    } else {
      setOverallRating(0);
      setComment('');
      setCategoryRatings({});
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const loadedCategories = await getRatingCategories();
      setCategories(loadedCategories);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      showError(error.message || t('Failed to load rating categories'), t('Error'));
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleCategoryRatingChange = (categoryId: number, rating: number) => {
    setCategoryRatings(prev => {
      const newRatings = { ...prev, [categoryId]: rating };
      // Calculate overall rating as average
      const ratedCategories = Object.values(newRatings).filter(r => r > 0);
      if (ratedCategories.length > 0) {
        const average = ratedCategories.reduce((sum, r) => sum + r, 0) / ratedCategories.length;
        setOverallRating(Math.round(average * 10) / 10);
      } else {
        setOverallRating(0);
      }
      return newRatings;
    });
  };

  const handleSubmit = async () => {
    // Validate required categories
    const requiredCategories = categories.filter(cat => cat.isRequired && cat.isActive);
    for (const category of requiredCategories) {
      if (!categoryRatings[category.id] || categoryRatings[category.id] === 0) {
        const categoryName = t('category'); // You can improve this with i18n
        showError(t('Please rate all required categories'), t('Validation Error'));
        return;
      }
    }

    if (overallRating === 0) {
      showError(t('Please select a rating'), t('Validation Error'));
      return;
    }

    if (overallRating < 3.0 && (!comment || comment.trim().length === 0)) {
      showError(t('Comment is mandatory for ratings below 3.0'), t('Validation Error'));
      return;
    }

    setIsSubmitting(true);
    try {
      const requiredCategories = categories.filter(cat => cat.isRequired && cat.isActive);
      const categoryRatingsArray: CategoryRating[] = requiredCategories.map(cat => ({
        ratingCategoryId: cat.id,
        ratingValue: categoryRatings[cat.id] || 0,
      }));
      
      // Include optional categories that were rated
      const optionalCategories = categories.filter(
        cat => !cat.isRequired && cat.isActive && categoryRatings[cat.id] && categoryRatings[cat.id] > 0
      );
      optionalCategories.forEach(cat => {
        categoryRatingsArray.push({
          ratingCategoryId: cat.id,
          ratingValue: categoryRatings[cat.id],
        });
      });

      const request = {
        reviewType: 'SMALL_TASK_REVIEW' as const,
        smallTaskRequestId: task.id,
        reviewedUserId: technicianId,
        rating: overallRating,
        comment: comment.trim() || undefined,
        categoryRatings: categoryRatingsArray,
      };

      await createReviewWithCategories(request);
      
      showSuccess(t('Review submitted successfully'), t('Success'));
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (error: any) {
      console.error('Error submitting review:', error);
      showError(error.message || t('Error submitting review'), t('Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => {
              // When user sets overall rating, distribute to all categories
              setOverallRating(star);
              const activeCategories = categories.filter(cat => cat.isActive);
              const newRatings: Record<number, number> = {};
              activeCategories.forEach(cat => {
                newRatings[cat.id] = star;
              });
              setCategoryRatings(newRatings);
            }}
            activeOpacity={0.7}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= overallRating ? 'star' : 'star-outline'}
              size={40}
              color={star <= overallRating ? COLORS.amber60 : colors.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <>
      <AppBottomSheetModal
        visible={visible}
        onClose={onClose}
        title={t('Rate Your Experience')}
        subtitle={t('How was your experience with this task?')}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.iconContainer, { backgroundColor: COLORS.amber10 }]}>
              <Ionicons name="star" size={48} color={COLORS.amber60} />
            </View>

            {/* Overall Rating Stars */}
              <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600', marginBottom: 12 }]}>
                {t('Overall Rating')}
              </Text>
              {renderStars()}

              {overallRating > 0 && (
                <View style={styles.ratingTextContainer}>
                  <Text style={[styles.ratingText, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {overallRating >= 4.5 && t('Excellent')}
                    {overallRating >= 3.5 && overallRating < 4.5 && t('Very Good')}
                    {overallRating >= 2.5 && overallRating < 3.5 && t('Good')}
                    {overallRating >= 1.5 && overallRating < 2.5 && t('Fair')}
                    {overallRating < 1.5 && t('Poor')}
                  </Text>
                </View>
              )}

              {/* Category Ratings */}
              {isLoadingCategories ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.amber60} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {t('Loading categories...')}
                  </Text>
                </View>
              ) : categories.length > 0 && (
                <View style={styles.categorySection}>
                  <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600', marginBottom: 12 }]}>
                    {t('Rate by Category')}
                  </Text>
                  {categories
                    .filter(cat => cat.isActive)
                    .map((category) => (
                      <CategoryRatingComponent
                        key={category.id}
                        category={category}
                        rating={categoryRatings[category.id] || 0}
                        onRatingChange={handleCategoryRatingChange}
                        required={category.isRequired}
                      />
                    ))}
                </View>
              )}

              {/* Comment Input */}
              <View style={styles.commentSection}>
                <Text style={[styles.commentLabel, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('Write a Review')}
                  {overallRating > 0 && overallRating < 3.0 && (
                    <Text style={{ color: colors.error }}> *</Text>
                  )}
                  {overallRating >= 3.0 && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {' '}({t('Optional')})
                    </Text>
                  )}
                </Text>
                {overallRating > 0 && overallRating < 3.0 && (
                  <Text style={[styles.warningText, { color: colors.error }]}>
                    {t('Comment is required for ratings below 3.0')}
                  </Text>
                )}
                <TextInput
                  style={[
                    styles.commentInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                      fontFamily: fonts?.body || fontFamily,
                    },
                  ]}
                  placeholder={t('Share your experience...')}
                  placeholderTextColor={colors.textSecondary}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                  {comment.length}/500
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.skipButton, { borderColor: colors.border }]}
                  onPress={onClose}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.skipButtonText, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {t('Skip')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor: overallRating > 0 ? COLORS.amber60 : colors.border,
                      opacity: overallRating > 0 ? 1 : 0.5,
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting || overallRating === 0}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={COLORS.textWhite} size="small" />
                  ) : (
                    <Text style={[styles.submitButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                      {t('Submit Review')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </AppBottomSheetModal>

      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingTextContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  commentInput: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  categorySection: {
    marginBottom: 24,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  warningText: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
});
