import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  Animated,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { getDisplayIconFullUrl } from '../services/ServiceService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

interface ServiceManagementScreenProps {
  onBack: () => void;
}

interface Service {
  id: number;
  nameAr: string;
  nameEn: string;
  description: string;
  imageUrl?: string;
  svgUrl?: string | null;
  iconUrl?: string | null;
  useSvg?: boolean;
  icon?: string;
  image?: string;
}

const getCategoryIcon = (nameEn: string): keyof typeof Ionicons.glyphMap => {
  const name = (nameEn || '').toLowerCase();
  if (name.includes('plumb')) return 'water-outline';
  if (name.includes('electric')) return 'flash-outline';
  if (name.includes('ac') || name.includes('hvac') || name.includes('air')) return 'snow-outline';
  if (name.includes('paint')) return 'color-palette-outline';
  if (name.includes('carpent') || name.includes('wood')) return 'hammer-outline';
  if (name.includes('clean')) return 'sparkles-outline';
  if (name.includes('construct') || name.includes('build')) return 'construct-outline';
  if (name.includes('design')) return 'brush-outline';
  if (name.includes('garden') || name.includes('landscape')) return 'leaf-outline';
  if (name.includes('security')) return 'shield-checkmark-outline';
  if (name.includes('move') || name.includes('transport')) return 'car-outline';
  if (name.includes('repair')) return 'build-outline';
  return 'grid-outline';
};

// One-row Service Card (compact list row)
const ServiceCard: React.FC<{
  service: Service;
  isSelected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  showCheckbox?: boolean;
  colors: any;
  scaledSize: (size: number) => number;
  language: string;
}> = ({
  service,
  isSelected,
  onPress,
  onRemove,
  showCheckbox = false,
  colors,
  scaledSize,
  language,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const fullIconUrl = !imageFailed ? getDisplayIconFullUrl(service as any) : null;
  const serviceName = language === 'ar' ? service.nameAr : service.nameEn;
  const isRTL = language === 'ar';
  const layoutIsRTL = isRTL && !showCheckbox; // Keep add-modal layout consistent across languages

  const Thumb = (
    <View style={[styles.cardRowThumb, { backgroundColor: colors.primary + '10' }]}>
      {fullIconUrl ? (
        <Image
          source={{ uri: fullIconUrl }}
          style={styles.cardRowThumbImage}
          resizeMode="contain"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Ionicons name={getCategoryIcon(service.nameEn)} size={24} color={colors.primary} />
      )}
      {showCheckbox && isSelected && (
        <View style={[styles.cardRowCheck, { backgroundColor: colors.primary }]}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </View>
      )}
    </View>
  );

  const RemoveButton =
    !showCheckbox && onRemove ? (
      <TouchableOpacity
        style={styles.removeBtnRow}
        onPress={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        accessibilityLabel="Remove service"
      >
        <Ionicons name="close" size={22} color={colors.error} />
      </TouchableOpacity>
    ) : null;

  return (
    <TouchableOpacity
      style={[
        styles.cardRow,
        {
          backgroundColor: colors.cardBackground,
          borderColor: isSelected ? colors.primary : colors.border || 'rgba(0,0,0,0.08)',
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.cardRowBody,
          showCheckbox && styles.modalRowLtrLayout,
        ]}
      >
        {layoutIsRTL ? Thumb : RemoveButton}
        <View style={[styles.cardRowInner, showCheckbox && isRTL && styles.modalTextNaturalRtl]}>
          <Text style={[styles.cardRowTitle, { color: colors.text, fontSize: scaledSize(15) }]} numberOfLines={1}>
            {serviceName}
          </Text>
          {service.description ? (
            <Text style={[styles.cardRowDesc, { color: colors.textSecondary, fontSize: scaledSize(12) }]} numberOfLines={1}>
              {service.description}
            </Text>
          ) : null}
        </View>
        {layoutIsRTL ? RemoveButton : Thumb}
      </View>
    </TouchableOpacity>
  );
};

export default function ServiceManagementScreen({ onBack }: ServiceManagementScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { scaledSize } = useFontFamily();

  const [myServices, setMyServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);

  const { alertState, showSuccess, showError, hideAlert } = useAlertPopup();
  const { confirmState, showDeleteConfirmation, hideConfirmation } = useConfirmationPopup();
  const removeInProgressRef = useRef(false);

  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const isRTL = language === 'ar';
  const screenWidth = Dimensions.get('window').width;

  const screenSlideX = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const modalFade = useRef(new Animated.Value(0)).current;
  const modalSlideX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const animateListNextLayout = () => {
    // Smoothly animate insert/remove/reorder of service cards
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        220,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
  };

  useEffect(() => {
    screenSlideX.setValue(-screenWidth);
    screenOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(screenSlideX, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBackScreen = () => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(screenSlideX, { toValue: screenWidth, duration: 220, useNativeDriver: true }),
    ]).start(() => onBack());
  };

  const closeAddModal = () => {
    Animated.parallel([
      Animated.timing(modalFade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(modalSlideX, { toValue: screenWidth, duration: 220, useNativeDriver: true }),
    ]).start(() => setShowAddModal(false));
  };

  useEffect(() => {
    if (showAddModal) {
      modalSlideX.setValue(-screenWidth);
      modalFade.setValue(0);
      Animated.parallel([
        Animated.timing(modalFade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(modalSlideX, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      modalSlideX.setValue(-screenWidth);
    }
  }, [showAddModal]);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const token = await storage.getAuthToken();

      const [myServicesRes, allServicesRes] = await Promise.all([
        fetch(buildApiUrl(API_ENDPOINTS.TECHNICIANS.SERVICES), {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(buildApiUrl(API_ENDPOINTS.SERVICES.LIST), {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (myServicesRes.ok) {
        const data = await myServicesRes.json();
        animateListNextLayout();
        setMyServices(data || []);
      }

      if (allServicesRes.ok) {
        const data = await allServicesRes.json();
        setAllServices(data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      showError(t('services.failedLoad'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddServices = async (serviceIds: number[]) => {
    setIsSaving(true);
    try {
      const token = await storage.getAuthToken();
      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.TECHNICIANS.ADD_SERVICES),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ serviceIds }),
        }
      );

      if (response.ok) {
        showSuccess(t('services.addedSuccess'), t('Success'));
        closeAddModal();
        setSelectedServices([]);
        fetchServices();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to add services');
      }
    } catch (error) {
      console.error('Error adding services:', error);
      showError((error as Error)?.message || t('services.failedAdd'), t('Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveService = (serviceId: number) => {
    const confirmRemove = async () => {
      if (removeInProgressRef.current) return;
      removeInProgressRef.current = true;
      hideConfirmation();
      try {
        const token = await storage.getAuthToken();
        const url = buildApiUrlWithParams(API_ENDPOINTS.TECHNICIANS.REMOVE_SERVICE, { serviceId });
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          showSuccess(t('services.removedSuccess'), t('Success'));
          fetchServices().catch(() => {});
        } else {
          const errorText = await response.text();
          throw new Error(errorText || t('services.failedRemove'));
        }
      } catch (error) {
        console.error('Error removing service:', error);
        showError((error as Error)?.message || t('services.failedRemove'), t('Error'));
      } finally {
        removeInProgressRef.current = false;
      }
    };

    showDeleteConfirmation(
      t('services.removeService'),
      t('services.removeServiceConfirm'),
      confirmRemove,
      t('services.remove')
    );
  };

  const toggleServiceSelection = (serviceId: number) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSaveSelection = () => {
    if (selectedServices.length === 0) {
      showError(t('services.selectAtLeastOne'), t('Error'));
      return;
    }
    handleAddServices(selectedServices);
  };

  const availableServices = allServices.filter(
    service => !myServices.some(myService => myService.id === service.id)
  );

  if (isLoading) {
    return (
      <Animated.View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background, opacity: screenOpacity, transform: [{ translateX: screenSlideX }] }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background, opacity: screenOpacity, transform: [{ translateX: screenSlideX }] }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border, direction: 'ltr', flexDirection: 'row' }]}>
        <TouchableOpacity onPress={handleBackScreen} style={styles.backButton}>
          <BackArrowIonicons variant="arrow" size={24} color={colors.text}/>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('services.title')}
        </Text>
        {availableServices.length > 0 && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.statsBar, { backgroundColor: colors.primary + '10' }]}>
          <View style={[styles.statItem, { flexDirection: 'row' }]}>
            <Ionicons name="briefcase" size={20} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {myServices.length} {t('services.activeServices')}
            </Text>
          </View>
          <View style={[styles.statItem, { flexDirection: 'row' }]}>
            <Ionicons name="add-circle" size={20} color={colors.success} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {availableServices.length} {t('services.available')}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('services.myServices')}
        </Text>

        {myServices.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="construct-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('services.noServicesYet')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {t('services.addServicesHint')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyAddButtonText}>{t('services.addServices')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {myServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onRemove={() => handleRemoveService(service.id)}
                colors={colors}
                scaledSize={scaledSize}
                language={language}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Services Modal - Animated */}
      <Modal visible={showAddModal} animationType="none" transparent onRequestClose={closeAddModal}>
        <Animated.View style={[styles.modalOverlay, { opacity: modalFade }]}>
          <Animated.View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground, transform: [{ translateX: modalSlideX }] },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('services.addServicesModalTitle')}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedServices.length} {t('services.selected')}
                </Text>
              </View>
              <TouchableOpacity onPress={closeAddModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
              {availableServices.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                  <Text style={[styles.modalEmptyTitle, { color: colors.text }]}>
                    {t('services.allAdded')}
                  </Text>
                  <Text style={[styles.modalEmptySubtitle, { color: colors.textSecondary }]}>
                    {t('services.allAddedHint')}
                  </Text>
                </View>
              ) : (
                <View style={styles.listContainer}>
                  {availableServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      isSelected={selectedServices.includes(service.id)}
                      onPress={() => toggleServiceSelection(service.id)}
                      showCheckbox={true}
                      colors={colors}
                      scaledSize={scaledSize}
                      language={language}
                    />
                  ))}
                </View>
              )}
            </ScrollView>

            {availableServices.length > 0 && (
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: selectedServices.length > 0 ? colors.primary : colors.border },
                    isRTL && styles.modalFooterButtonRowLtr,
                  ]}
                  onPress={handleSaveSelection}
                  disabled={isSaving || selectedServices.length === 0}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="add" size={20} color="#fff" />
                      <View style={isRTL ? styles.modalTextNaturalRtl : undefined}>
                        <Text style={styles.saveButtonText}>
                          {t('Add')} {selectedServices.length > 0 && `(${selectedServices.length})`}
                        </Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </Animated.View>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /** Keep checkbox row order; text direction reset in modalTextNaturalRtl */
  modalRowLtrLayout: {
    direction: 'ltr',
  },
  modalTextNaturalRtl: {
    direction: 'rtl',
    writingDirection: 'rtl',
  },
  modalFooterButtonRowLtr: {
    direction: 'ltr',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    direction: 'ltr',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  listContainer: {
    gap: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardRowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardRowInner: {
    flex: 1,
    minWidth: 0,
  },
  cardRowThumb: {
    position: 'relative',
    width: 52,
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardRowThumbImage: {
    width: '100%',
    height: '100%',
  },
  cardRowTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  cardRowDesc: {
    lineHeight: 18,
  },
  cardRowCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnRow: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: '70%',
  },
  modalScrollContent: {
    padding: 20,
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalEmptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  modalEmptySubtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
