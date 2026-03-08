import React, { useState, useEffect, useCallback } from 'react';
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
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { storage } from '../utils/storage';
import { API_BASE_URL, API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
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
}

// Calculate responsive grid columns based on screen width
const getGridConfig = (width: number) => {
  if (width >= 1200) return { columns: 4, cardSize: (width - 80) / 4 };
  if (width >= 900) return { columns: 3, cardSize: (width - 70) / 3 };
  if (width >= 600) return { columns: 2, cardSize: (width - 60) / 2 };
  return { columns: 1, cardSize: width - 40 };
};

// Professional Service Card Component
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
  language
}) => {
  const imageUrl = service.imageUrl 
    ? (service.imageUrl.startsWith('http') 
        ? service.imageUrl 
        : `${API_BASE_URL.replace('/api', '')}${service.imageUrl}`)
    : null;

  const serviceName = language === 'ar' ? service.nameAr : service.nameEn;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { 
          backgroundColor: colors.cardBackground,
          borderColor: isSelected ? colors.primary : colors.border || 'rgba(0,0,0,0.08)',
          borderWidth: isSelected ? 2 : 1,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Image Container */}
      <View style={styles.cardImageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="construct" size={32} color={colors.primary} />
          </View>
        )}
        
        {/* Selection Checkmark */}
        {showCheckbox && isSelected && (
          <View style={[styles.checkmarkOverlay, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </View>
        )}
        
        {/* Remove Button for My Services */}
        {!showCheckbox && onRemove && (
          <TouchableOpacity
            style={[styles.removeBtn, { backgroundColor: colors.error }]}
            onPress={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text 
          style={[styles.cardTitle, { color: colors.text, fontSize: scaledSize(15) }]} 
          numberOfLines={1}
        >
          {serviceName}
        </Text>
        {service.description && (
          <Text 
            style={[styles.cardDescription, { color: colors.textSecondary, fontSize: scaledSize(12) }]} 
            numberOfLines={2}
          >
            {service.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function ServiceManagementScreen({ onBack }: ServiceManagementScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { width: windowWidth } = useWindowDimensions();
  
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  
  const { alertState, showSuccess, showError, hideAlert } = useAlertPopup();
  const { confirmState, showDeleteConfirmation, hideConfirmation } = useConfirmationPopup();

  const language = i18n.language === 'ar' ? 'ar' : 'en';
  const { columns, cardSize } = getGridConfig(windowWidth);

  useEffect(() => {
    fetchServices();
  }, []);

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
        setMyServices(data || []);
      }

      if (allServicesRes.ok) {
        const data = await allServicesRes.json();
        setAllServices(data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      showError(t('Failed to load services'), t('Error'));
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
        showSuccess(t('Services added successfully'), t('Success'));
        setShowAddModal(false);
        setSelectedServices([]);
        fetchServices();
      } else {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to add services');
      }
    } catch (error) {
      console.error('Error adding services:', error);
      showError((error as Error)?.message || t('Failed to add services'), t('Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveService = (serviceId: number) => {
    const confirmRemove = async () => {
      try {
        const token = await storage.getAuthToken();
        const url = buildApiUrlWithParams(API_ENDPOINTS.TECHNICIANS.REMOVE_SERVICE, { id: serviceId });
        
        const response = await fetch(`${API_BASE_URL}${url}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          showSuccess(t('Service removed successfully'), t('Success'));
          fetchServices();
        } else {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to remove service');
        }
      } catch (error) {
        console.error('Error removing service:', error);
        showError((error as Error)?.message || t('Failed to remove service'), t('Error'));
      }
    };

    showDeleteConfirmation(
      t('Remove Service'),
      t('Are you sure you want to remove this service?'),
      confirmRemove,
      t('Remove')
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
      showError(t('Please select at least one service'), t('Error'));
      return;
    }
    handleAddServices(selectedServices);
  };

  const availableServices = allServices.filter(
    service => !myServices.some(myService => myService.id === service.id)
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('Service Management')}
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
        {/* Stats Bar */}
        <View style={[styles.statsBar, { backgroundColor: colors.primary + '10' }]}>
          <View style={styles.statItem}>
            <Ionicons name="briefcase" size={20} color={colors.primary} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {myServices.length} {t('Active Services')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="add-circle" size={20} color={colors.success} />
            <Text style={[styles.statText, { color: colors.text }]}>
              {availableServices.length} {t('Available')}
            </Text>
          </View>
        </View>

        {/* Section Title */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('My Services')}
        </Text>

        {myServices.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="construct-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('No services added yet')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {t('Add services to show what you can do')}
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyAddButtonText}>{t('Add Services')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.gridContainer, { gap: 16 }]}>
            {myServices.map((service) => (
              <View 
                key={service.id} 
                style={[
                  styles.gridItem,
                  { width: cardSize }
                ]}
              >
                <ServiceCard
                  service={service}
                  onRemove={() => handleRemoveService(service.id)}
                  colors={colors}
                  scaledSize={scaledSize}
                  language={language}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Services Modal */}
      <Modal 
        visible={showAddModal} 
        animationType="slide" 
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('Add Services')}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedServices.length} {t('selected')}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowAddModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Available Services Grid */}
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
            >
              {availableServices.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                  <Text style={[styles.modalEmptyTitle, { color: colors.text }]}>
                    {t('All services added!')}
                  </Text>
                  <Text style={[styles.modalEmptySubtitle, { color: colors.textSecondary }]}>
                    {t('You have added all available services')}
                  </Text>
                </View>
              ) : (
                <View style={[styles.gridContainer, { gap: 12 }]}>
                  {availableServices.map((service) => (
                    <View 
                      key={service.id} 
                      style={[
                        styles.gridItem,
                        { width: cardSize }
                      ]}
                    >
                      <ServiceCard
                        service={service}
                        isSelected={selectedServices.includes(service.id)}
                        onPress={() => toggleServiceSelection(service.id)}
                        showCheckbox={true}
                        colors={colors}
                        scaledSize={scaledSize}
                        language={language}
                      />
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Modal Footer with Save Button */}
            {availableServices.length > 0 && (
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.saveButton, 
                    { 
                      backgroundColor: selectedServices.length > 0 ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={handleSaveSelection}
                  disabled={isSaving || selectedServices.length === 0}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>
                        {t('Add')} {selectedServices.length > 0 && `(${selectedServices.length})`}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  // Grid Layout
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  gridItem: {
    marginBottom: 8,
  },
  // Professional Card Styles
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    lineHeight: 18,
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
