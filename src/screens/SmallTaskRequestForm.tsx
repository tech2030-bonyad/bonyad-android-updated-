import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import LocationPicker from '../components/LocationPicker';

interface TaskType {
  id: number;
  nameAr: string;
  nameEn: string;
  description?: string;
  basePrice: number;
  estimatedDuration: number;
  isActive: boolean;
}

interface SmallTaskRequestFormProps {
  taskType: TaskType;
  onBack: () => void;
  onSuccess: () => void;
}

export default function SmallTaskRequestForm({
  taskType,
  onBack,
  onSuccess,
}: SmallTaskRequestFormProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isRTL = i18n.language === 'ar';
  const isDarkMode = theme === 'dark';
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

  const riyalLogo = theme === 'dark'
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US').format(budget);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} ${t('min')}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} ${t('hour')}${hours > 1 ? 's' : ''}`;
    }
    return `${hours}h ${mins}m`;
  };

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('Please login again'), t('Error'));
        setIsSubmitting(false);
        return;
      }

      const url = buildApiUrl(API_ENDPOINTS.SMALL_TASKS.CREATE_REQUEST);
      
      // Validate required fields
      if (!description.trim()) {
        showError(t('Please enter a description'), t('Validation Error'));
        setIsSubmitting(false);
        return;
      }

      if (!address.trim()) {
        showError(t('Please enter an address'), t('Validation Error'));
        setIsSubmitting(false);
        return;
      }

      if (latitude === null || longitude === null) {
        showError(t('Please select a location on the map'), t('Validation Error'));
        setIsSubmitting(false);
        return;
      }

      if (!budget.trim() || parseFloat(budget) <= 0) {
        showError(t('Please enter a valid budget amount'), t('Validation Error'));
        setIsSubmitting(false);
        return;
      }

      if (!duration.trim() || parseFloat(duration) <= 0) {
        showError(t('Please enter a valid duration in hours'), t('Validation Error'));
        setIsSubmitting(false);
        return;
      }

      // Convert hours to minutes for API
      const durationInMinutes = parseFloat(duration) * 60;

      const requestBody = {
        taskTypeId: taskType.id,
        description: description.trim(),
        address: address.trim(),
        latitude: latitude,
        longitude: longitude,
        budget: parseFloat(budget),
        estimatedDuration: durationInMinutes,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(t('Small task request created successfully'), t('Success'));
        
        // Exit animation
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setTimeout(() => {
            onSuccess();
          }, 300);
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to create small task request:', errorText);
        showError(t('Failed to create task request'), t('Error'));
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error('❌ Error creating small task request:', error);
      showError(error.message || t('Error creating task request'), t('Error'));
      setIsSubmitting(false);
    }
  };

  const taskName = i18n.language === 'ar' ? taskType.nameAr : taskType.nameEn;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          paddingTop: Math.max(insets.top, 20), 
          borderBottomColor: colors.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }
      ]}>
        <TouchableOpacity 
          onPress={onBack} 
          style={[
            styles.backButton,
            {
              left: isRTL ? undefined : 20,
              right: isRTL ? 20 : undefined,
            }
          ]}
        >
          <Ionicons 
            name={isRTL ? "arrow-forward" : "arrow-back"} 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('Create Small Task')}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Task Type Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.taskTypeHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="construct" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.taskTypeName, { color: colors.text }]}>
                {taskName}
              </Text>
              {taskType.description && (
                <Text style={[styles.taskTypeDescription, { color: colors.textSecondary }]}>
                  {taskType.description}
                </Text>
              )}
            </View>
          </View>

          {/* Description Input */}
          <View style={styles.inputSection}>
            <Text style={[
              styles.inputLabel, 
              { 
                color: colors.text,
                textAlign: isRTL ? 'right' : 'left',
              }
            ]}>
              {t('Description')} *
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={t('Describe your task in detail...')}
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Budget Input */}
          <View style={styles.inputSection}>
            <Text style={[
              styles.inputLabel, 
              { 
                color: colors.text,
                textAlign: isRTL ? 'right' : 'left',
              }
            ]}>
              {t('Budget')} *
            </Text>
            <View style={[
              styles.budgetInputContainer, 
              { 
                backgroundColor: colors.cardBackground, 
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }
            ]}>
              <ExpoImage
                source={riyalLogo}
                style={styles.riyalLogo}
                contentFit="contain"
              />
              <TextInput
                style={[
                  styles.budgetInput, 
                  { 
                    color: colors.text,
                    textAlign: isRTL ? 'right' : 'left',
                  }
                ]}
                placeholder={t('Enter budget amount')}
                placeholderTextColor={colors.textSecondary}
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
              />
            </View>
            {taskType.basePrice > 0 && (
              <Text style={[
                styles.hintText, 
                { 
                  color: colors.textSecondary,
                  textAlign: isRTL ? 'right' : 'left',
                }
              ]}>
                {t('Base price')}: {formatBudget(taskType.basePrice)}
              </Text>
            )}
          </View>

          {/* Duration Input */}
          <View style={styles.inputSection}>
            <Text style={[
              styles.inputLabel, 
              { 
                color: colors.text,
                textAlign: isRTL ? 'right' : 'left',
              }
            ]}>
              {t('Estimated Duration')} *
            </Text>
            <View style={[
              styles.durationInputContainer, 
              { 
                backgroundColor: colors.cardBackground, 
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }
            ]}>
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={[
                  styles.durationInput, 
                  { 
                    color: colors.text,
                    textAlign: isRTL ? 'right' : 'left',
                  }
                ]}
                placeholder={t('Enter duration in hours')}
                placeholderTextColor={colors.textSecondary}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />
              <Text style={[styles.durationUnit, { color: colors.textSecondary }]}>
                {t('hours')}
              </Text>
            </View>
            {taskType.estimatedDuration > 0 && (
              <Text style={[
                styles.hintText, 
                { 
                  color: colors.textSecondary,
                  textAlign: isRTL ? 'right' : 'left',
                }
              ]}>
                {t('Estimated duration')}: {formatDuration(taskType.estimatedDuration)}
              </Text>
            )}
          </View>

          {/* Address Input */}
          <View style={styles.inputSection}>
            <Text style={[
              styles.inputLabel, 
              { 
                color: colors.text,
                textAlign: isRTL ? 'right' : 'left',
              }
            ]}>
              {t('Address')} *
            </Text>
            <TouchableOpacity
              style={[
                styles.addressButton,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => setShowMapPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={address ? "location" : "map-outline"} 
                size={20} 
                color={colors.primary} 
              />
              <Text 
                style={[
                  styles.addressText,
                  { 
                    color: address ? colors.text : colors.textSecondary,
                    flex: 1,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
                numberOfLines={1}
              >
                {address || t('Select location on map')}
              </Text>
              <Ionicons 
                name={isRTL ? "chevron-back" : "chevron-forward"} 
                size={18} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: colors.primary,
                opacity: isSubmitting ? 0.6 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {t('Create Task Request')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Location Picker Modal */}
      {showMapPicker && (
        <LocationPicker
          initialLocation={
            latitude && longitude
              ? { latitude, longitude }
              : undefined
          }
          initialAddress={address || ''}
          onLocationSelect={(location) => {
            setAddress(location.address || '');
            setLatitude(location.latitude);
            setLongitude(location.longitude);
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    position: 'relative',
  },
  backButton: {
    padding: 8,
    position: 'absolute',
    zIndex: 1,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  taskTypeHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskTypeName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  taskTypeDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 4,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 48,
  },
  addressButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    gap: 12,
  },
  addressText: {
    fontSize: 14,
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  riyalLogo: {
    width: 20,
    height: 20,
  },
  budgetInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 24,
  },
  durationInputContainer: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  durationInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 24,
  },
  durationUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 120,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
