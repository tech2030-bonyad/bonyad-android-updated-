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
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createSmallTaskRequest, type SmallTaskType, type CreateSmallTaskRequestBody } from '../services/SmallTaskService';
import { storage } from '../utils/storage';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import LocationPicker from '../components/LocationPicker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// iOS-matching design colors
const COLORS = {
  primaryLight: '#1A6DB4',
  primaryDark: '#4D8EC5',
  borderLight: 'rgba(26, 109, 180, 0.2)',
  borderDark: 'rgba(77, 142, 197, 0.3)',
  success: '#28A745',
};

interface SmallTaskRequestFormProps {
  taskType: SmallTaskType;
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
  const screenWidth = Dimensions.get('window').width;
  
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

  const primaryColor = isDarkMode ? COLORS.primaryDark : COLORS.primaryLight;
  const borderColor = isDarkMode ? COLORS.borderDark : COLORS.borderLight;
  const topSpacing = Platform.OS === 'android' ? 0 : insets.top;


  const isFormValid = 
    description.trim().length > 0 && 
    description.length <= 1000 && 
    address.trim().length > 0 &&
    latitude !== null &&
    longitude !== null;

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const token = await storage.getAuthToken();
      if (!token) {
        showError(t('authentication_required'), t('error'));
        setIsSubmitting(false);
        return;
      }

      if (!description.trim()) {
        showError(t('describe_task_requirements'), t('validation_error'));
        setIsSubmitting(false);
        return;
      }

      if (!address.trim()) {
        showError(t('enter_service_address'), t('validation_error'));
        setIsSubmitting(false);
        return;
      }

      if (latitude == null || longitude == null) {
        showError(t('select_location_on_map'), t('validation_error'));
        setIsSubmitting(false);
        return;
      }

      const body: CreateSmallTaskRequestBody = {
        taskTypeId: taskType.id,
        description: description.trim(),
        address: address.trim(),
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      };

      await createSmallTaskRequest(body);

      showSuccess(t('request_submitted_successfully'), t('success'));

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
    } catch (error: any) {
      console.error('Error creating small task request:', error);
      showError(error.message || t('failed_to_submit_request'), t('error'));
      setIsSubmitting(false);
    }
  };

  const taskName = i18n.language === 'ar' ? taskType.nameAr : taskType.nameEn;

  // Default map region (Riyadh)
  const mapRegion = {
    latitude: latitude ?? 24.7136,
    longitude: longitude ?? 46.6753,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          paddingTop: topSpacing, 
          borderBottomColor: colors.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }
      ]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <BackArrowIonicons variant="arrow" size={24} color={primaryColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: primaryColor }]}>
          {t('create_task_request')}
        </Text>
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Task Type Info Card - iOS style */}
          <View style={[
            styles.taskTypeCard, 
            { 
              backgroundColor: colors.cardBackground, 
              borderColor: borderColor,
            }
          ]}>
            <View style={[
              styles.taskTypeRow, 
              { flexDirection: isRTL ? 'row-reverse' : 'row' }
            ]}>
              <View style={[styles.iconCircle, { backgroundColor: primaryColor + '15' }]}>
                <Ionicons name="checkmark-circle" size={20} color={primaryColor} />
              </View>
              <View style={[
                styles.taskTypeInfo, 
                { alignItems: isRTL ? 'flex-end' : 'flex-start' }
              ]}>
                <Text style={[styles.selectedTaskLabel, { color: colors.textSecondary }]}>
                  {t('selected_task')}
                </Text>
                <Text style={[styles.taskTypeName, { color: colors.text }]}>
                  {taskName}
                </Text>
              </View>
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.inputSection}>
            <Text style={[
              styles.inputLabel, 
              { color: colors.text, textAlign: isRTL ? 'right' : 'left' }
            ]}>
              {t('task_description')}
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: borderColor,
                  color: colors.text,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              placeholder={t('describe_task_requirements')}
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={[
              styles.hintText, 
              { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }
            ]}>
              {t('max_1000_characters')}
            </Text>
          </View>

          {/* Address Section */}
          <View style={styles.inputSection}>
            <Text style={[
              styles.inputLabel, 
              { color: colors.text, textAlign: isRTL ? 'right' : 'left' }
            ]}>
              {t('service_address')}
            </Text>
            
            {/* Address Input */}
            <TextInput
              style={[
                styles.addressInput,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: borderColor,
                  color: colors.text,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              placeholder={t('enter_service_address')}
              placeholderTextColor={colors.textSecondary}
              value={address}
              onChangeText={setAddress}
            />

            {/* Map Picker Button */}
            <TouchableOpacity
              style={[
                styles.mapPickerButton,
                { backgroundColor: primaryColor + '15' },
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => setShowMapPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="location" size={16} color={primaryColor} />
              <Text style={[styles.mapPickerText, { color: primaryColor }]}>
                {t('select_location_on_map')}
              </Text>
              <Ionicons 
                name={isRTL ? "chevron-back" : "chevron-forward"} 
                size={12} 
                color={primaryColor} 
              />
            </TouchableOpacity>

            {/* Map Preview */}
            <View style={styles.mapPreviewContainer}>
              <MapView
                style={styles.mapPreview}
                provider={PROVIDER_GOOGLE}
                region={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {latitude && longitude && (
                  <Marker
                    coordinate={{ latitude, longitude }}
                    pinColor={primaryColor}
                  />
                )}
              </MapView>
              
              {/* Expand button overlay */}
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setShowMapPicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="expand-outline" size={12} color="#141B34" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: isFormValid ? COLORS.success : colors.textSecondary,
                opacity: isSubmitting ? 0.6 : 1,
              },
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {t('submit_request')}
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 140,
  },
  taskTypeCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  taskTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTypeInfo: {
    flex: 1,
  },
  selectedTaskLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  taskTypeName: {
    fontSize: 18,
    fontWeight: '600',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    minHeight: 120,
    lineHeight: 20,
  },
  hintText: {
    fontSize: 12,
    marginTop: 8,
  },
  addressInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    minHeight: 48,
    marginBottom: 12,
  },
  mapPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  mapPickerText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  mapPreviewContainer: {
    height: 163,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  mapPreview: {
    flex: 1,
  },
  expandButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    fontSize: 18,
    fontWeight: '600',
  },
});
