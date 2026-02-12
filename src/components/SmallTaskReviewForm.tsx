import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { SmallTaskRequest } from '../types/smallTasks';
import AlertPopup, { useAlertPopup } from './AlertPopup';

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

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      slideAnim.setValue(50);
      setRating(0);
      setComment('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (rating === 0) {
      showError(t('Please select a rating'), t('Validation Error'));
      return;
    }

    if (comment.trim().length < 10) {
      showError(t('Please write at least 10 characters'), t('Validation Error'));
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'), t('Error'));
        return;
      }

      // POST /api/reviews
      const url = buildApiUrl(API_ENDPOINTS.REVIEWS.CREATE);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technicianId,
          projectId: task.id,
          rating,
          comment: comment.trim(),
        }),
      });

      if (response.ok) {
        showSuccess(t('Review submitted successfully'), t('Success'));
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        showError(errorData.message || t('Failed to submit review'), t('Error'));
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      showError(t('Error submitting review'), t('Error'));
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
            onPress={() => setRating(star)}
            activeOpacity={0.7}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={40}
              color={star <= rating ? COLORS.amber60 : colors.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, isDarkMode ? 0.8 : 0.6],
              }),
            },
          ]}
        >
          {/* Blur effect handled via backdrop opacity */}
        </Animated.View>
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDarkMode ? colors.cardBackground : 'rgba(255, 255, 255, 0.95)',
                borderColor: colors.border,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
                ...(Platform.OS === 'web' && {
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }),
              },
            ]}
          >
            {/* Close Button */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: COLORS.amber10 }]}>
                <Ionicons name="star" size={48} color={COLORS.amber60} />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
                {t('Rate Your Experience')}
              </Text>

              {/* Subtitle */}
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily }]}>
                {t('How was your experience with this task?')}
              </Text>

              {/* Stars */}
              {renderStars()}

              {rating > 0 && (
                <View style={styles.ratingTextContainer}>
                  <Text style={[styles.ratingText, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                    {rating === 5 && t('Excellent')}
                    {rating === 4 && t('Very Good')}
                    {rating === 3 && t('Good')}
                    {rating === 2 && t('Fair')}
                    {rating === 1 && t('Poor')}
                  </Text>
                </View>
              )}

              {/* Comment Input */}
              <View style={styles.commentSection}>
                <Text style={[styles.commentLabel, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('Write a Review')} {rating > 0 && '*'}
                </Text>
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
                      backgroundColor: rating > 0 ? COLORS.amber60 : colors.border,
                      opacity: rating > 0 ? 1 : 0.5,
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting || rating === 0}
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
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
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
});
