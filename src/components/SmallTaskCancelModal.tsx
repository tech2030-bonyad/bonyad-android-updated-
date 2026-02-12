import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

interface SmallTaskCancelModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  taskName?: string;
}

export default function SmallTaskCancelModal({
  visible,
  onClose,
  onConfirm,
  taskName,
}: SmallTaskCancelModalProps) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, fonts } = useFontFamily();
  const isDarkMode = theme === 'dark';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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
    }
  }, [visible]);

  const handleConfirm = () => {
    onConfirm();
    onClose();
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

      <View style={styles.container}>
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

            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="trash-outline" size={48} color={colors.error} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '700' }]}>
              {t('Cancel Task Request')}
            </Text>

            {/* Message */}
            <Text style={[styles.message, { color: colors.textSecondary, fontFamily: fonts?.body || fontFamily }]}>
              {t('Are you sure you want to cancel this task request? All pending bids will be cancelled. This action cannot be undone.')}
            </Text>

            {taskName && (
              <View style={[styles.taskNameContainer, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.taskNameText, { color: colors.primary, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {taskName}
                </Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text, fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('Keep Request')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.error }]}
                onPress={handleConfirm}
              >
                <Text style={[styles.confirmButtonText, { fontFamily: fonts?.primaryBold || fontFamily, fontWeight: '600' }]}>
                  {t('Cancel Request')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
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
    maxWidth: 400,
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
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  taskNameContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  taskNameText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
