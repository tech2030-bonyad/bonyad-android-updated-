/**
 * ReviewTechnicianModalWithCategories
 * 
 * Updated review modal that supports category-based ratings
 * Replaces the old ReviewTechnicianModal for project reviews
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { 
  getRatingCategories, 
  createReviewWithCategories,
  RatingCategory,
  CategoryRating 
} from '../services/RatingService';
import CategoryRatingComponent from './CategoryRatingComponent';
import AlertPopup, { useAlertPopup } from './AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from './ConfirmationPopup';

interface ReviewTechnicianModalWithCategoriesProps {
  visible: boolean;
  onClose: () => void;
  projectId: number;
  technicianId: number;
  technicianName: string;
  onReviewSubmitted?: () => void;
  mode?: 'create' | 'edit';
  existingReview?: {
    id: number;
    rating: number;
    comment?: string | null;
    categoryRatings?: Array<{
      ratingCategoryId: number;
      rating: number;
    }>;
  } | null;
}

export default function ReviewTechnicianModalWithCategories({
  visible,
  onClose,
  projectId,
  technicianId,
  technicianName,
  onReviewSubmitted,
  mode = 'create',
  existingReview,
}: ReviewTechnicianModalWithCategoriesProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();
  
  const [overallRating, setOverallRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categories, setCategories] = useState<RatingCategory[]>([]);
  const [categoryRatings, setCategoryRatings] = useState<Record<number, number>>({});
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showConfirmation, hideConfirmation } = useConfirmationPopup();

  // Load categories when modal opens
  useEffect(() => {
    if (visible) {
      loadCategories();
      
      if (mode === 'edit' && existingReview) {
        setOverallRating(existingReview.rating || 0);
        setComment(existingReview.comment || '');
        
        // Load existing category ratings
        if (existingReview.categoryRatings) {
          const ratings: Record<number, number> = {};
          existingReview.categoryRatings.forEach(cr => {
            ratings[cr.ratingCategoryId] = cr.rating;
          });
          setCategoryRatings(ratings);
        }
      } else {
        setOverallRating(0);
        setComment('');
        setCategoryRatings({});
      }
    }
  }, [visible, mode, existingReview]);

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
    setCategoryRatings(prev => ({
      ...prev,
      [categoryId]: rating,
    }));
    
    // Calculate overall rating as average of category ratings
    const newRatings = { ...categoryRatings, [categoryId]: rating };
    const ratedCategories = Object.values(newRatings).filter(r => r > 0);
    if (ratedCategories.length > 0) {
      const average = ratedCategories.reduce((sum, r) => sum + r, 0) / ratedCategories.length;
      setOverallRating(Math.round(average * 10) / 10); // Round to 1 decimal
    } else {
      setOverallRating(0);
    }
  };

  const handleOverallRatingChange = (rating: number) => {
    setOverallRating(rating);
    
    // If user sets overall rating manually, distribute to all categories
    if (rating > 0) {
      const activeCategories = categories.filter(cat => cat.isActive);
      const newRatings: Record<number, number> = {};
      activeCategories.forEach(cat => {
        newRatings[cat.id] = rating;
      });
      setCategoryRatings(newRatings);
    }
  };

  const validateForm = (): string | null => {
    // Check required categories
    const requiredCategories = categories.filter(cat => cat.isRequired && cat.isActive);
    for (const category of requiredCategories) {
      if (!categoryRatings[category.id] || categoryRatings[category.id] === 0) {
        const categoryName = i18n.language === 'ar' ? category.nameAr : category.nameEn;
        return t('Please rate {{category}}', { category: categoryName });
      }
    }
    
    // Check overall rating
    if (overallRating === 0) {
      return t('Please select an overall rating');
    }
    
    // Check comment for low ratings
    if (overallRating < 3.0 && (!comment || comment.trim().length === 0)) {
      return t('Comment is mandatory for ratings below 3.0');
    }
    
    return null;
  };

  const handleSubmit = () => {
    const validationError = validateForm();
    if (validationError) {
      showError(validationError, t('Validation Error'));
      return;
    }
    
    // Show confirmation modal
    const isEdit = mode === 'edit' && existingReview?.id;
    showConfirmation(
      isEdit ? t('Update Review') : t('Submit Review'),
      t('Submit your review for {{name}}?', {
        name: technicianName || t('this technician'),
      }),
      async () => {
        await executeSubmit();
      }
    );
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);

    try {
      const requiredCategories = categories.filter(cat => cat.isRequired && cat.isActive);
      const categoryRatingsArray: CategoryRating[] = requiredCategories.map(cat => ({
        ratingCategoryId: cat.id,
        ratingValue: categoryRatings[cat.id] || 0,
      }));
      
      // Also include optional categories that were rated
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
        reviewType: 'PROJECT_REVIEW' as const,
        projectId,
        reviewedUserId: technicianId,
        rating: overallRating,
        comment: comment.trim() || undefined,
        categoryRatings: categoryRatingsArray,
      };
      
      console.log('📤 [ReviewTechnicianModal] Submitting review with categories...');
      const result = await createReviewWithCategories(request);
      
      console.log('✅ [ReviewTechnicianModal] Review submitted successfully');
      
      // Show success message
      showSuccess(
        mode === 'edit' ? t('Review updated successfully') : t('Thank you for your review!'),
        t('Success'),
        () => {
          // Reset form
          setOverallRating(0);
          setComment('');
          setCategoryRatings({});
          
          // Notify parent
          if (onReviewSubmitted) {
            onReviewSubmitted();
          }
          
          // Close modal
          onClose();
        }
      );
    } catch (error: any) {
      console.error('❌ [ReviewTechnicianModal] Error submitting review:', error);
      showError(error.message || t('Failed to submit review'), t('Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingText = (rating: number) => {
    if (rating >= 4.5) return t('⭐⭐⭐⭐⭐ Excellent');
    if (rating >= 3.5) return t('⭐⭐⭐⭐ Very Good');
    if (rating >= 2.5) return t('⭐⭐⭐ Good');
    if (rating >= 1.5) return t('⭐⭐ Fair');
    return t('⭐ Poor');
  };

  const requiredCategories = categories.filter(cat => cat.isRequired && cat.isActive);
  const optionalCategories = categories.filter(cat => !cat.isRequired && cat.isActive);
  const allRated = requiredCategories.every(cat => categoryRatings[cat.id] > 0);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                
                <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="person-check" size={60} color={colors.primary} />
                </View>
                
                <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(20) }]}>
                  {t('Review Technician')}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                  {t('How was your experience with {{name}}?', {
                    name: technicianName || t('this technician'),
                  })}
                </Text>
              </View>
              
              {isLoadingCategories ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    {t('Loading rating categories...')}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Overall Rating Section */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(16) }]}>
                      {t('Overall Rating')}
                    </Text>
                    
                    <View style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => handleOverallRatingChange(star)}
                          style={styles.starButton}
                        >
                          <Ionicons
                            name={star <= overallRating ? 'star' : 'star-outline'}
                            size={40}
                            color={star <= overallRating ? colors.primary : colors.border}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    {overallRating > 0 && (
                      <Text style={[styles.ratingText, { color: colors.primary, fontSize: scaledSize(14) }]}>
                        {getRatingText(overallRating)}
                      </Text>
                    )}
                  </View>
                  
                  {/* Category Ratings Section */}
                  {categories.length > 0 && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(16) }]}>
                        {t('Rate by Category')}
                      </Text>
                      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                        {t('Rate each category to provide detailed feedback')}
                      </Text>
                      
                      {/* Required Categories */}
                      {requiredCategories.length > 0 && (
                        <>
                          <Text style={[styles.categoryGroupTitle, { color: colors.text, fontSize: scaledSize(14) }]}>
                            {t('Required')}
                          </Text>
                          {requiredCategories.map((category) => (
                            <CategoryRatingComponent
                              key={category.id}
                              category={category}
                              rating={categoryRatings[category.id] || 0}
                              onRatingChange={handleCategoryRatingChange}
                              required={true}
                            />
                          ))}
                        </>
                      )}
                      
                      {/* Optional Categories */}
                      {optionalCategories.length > 0 && (
                        <>
                          <Text style={[styles.categoryGroupTitle, { color: colors.text, fontSize: scaledSize(14) }]}>
                            {t('Optional')}
                          </Text>
                          {optionalCategories.map((category) => (
                            <CategoryRatingComponent
                              key={category.id}
                              category={category}
                              rating={categoryRatings[category.id] || 0}
                              onRatingChange={handleCategoryRatingChange}
                              required={false}
                            />
                          ))}
                        </>
                      )}
                    </View>
                  )}
                  
                  {/* Comment Section */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(16) }]}>
                      {t('Add Comment')}
                      {overallRating > 0 && overallRating < 3.0 && (
                        <Text style={{ color: colors.error }}> *</Text>
                      )}
                      {overallRating >= 3.0 && (
                        <Text style={{ color: colors.textSecondary, fontSize: scaledSize(12) }}>
                          {' '}({t('Optional')})
                        </Text>
                      )}
                    </Text>
                    
                    {overallRating > 0 && overallRating < 3.0 && (
                      <Text style={[styles.warningText, { color: colors.error, fontSize: scaledSize(12) }]}>
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
                          fontSize: scaledSize(14),
                        },
                      ]}
                      placeholder={t('Share more about your experience...')}
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={5}
                      value={comment}
                      onChangeText={setComment}
                      textAlignVertical="top"
                      maxLength={500}
                    />
                    
                    <Text style={[styles.characterCount, { color: colors.textSecondary, fontSize: scaledSize(12) }]}>
                      {comment.length} / 500 {t('characters')}
                    </Text>
                  </View>
                  
                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      { 
                        backgroundColor: (allRated && overallRating > 0) ? colors.primary : colors.border,
                      },
                      (!allRated || overallRating === 0) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!allRated || overallRating === 0 || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.submitButtonText}>
                          {mode === 'edit' ? t('Update Review') : t('Submit Review')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      
      {/* Confirmation Popup */}
      <ConfirmationPopup
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        confirmStyle={confirmState.confirmStyle}
        icon={confirmState.icon}
        onConfirm={confirmState.onConfirm}
        onCancel={hideConfirmation}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        justifyContent: 'center',
        alignItems: 'center',
      },
    }),
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 600,
        borderRadius: 20,
        maxHeight: '90vh',
      },
    }),
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  headerIcon: {
    marginBottom: 12,
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    marginBottom: 16,
    lineHeight: 18,
  },
  categoryGroupTitle: {
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  warningText: {
    marginBottom: 8,
    fontStyle: 'italic',
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  characterCount: {
    textAlign: 'right',
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
