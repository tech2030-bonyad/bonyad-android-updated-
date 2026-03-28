/**
 * RegionsManagementScreen (Working Areas)
 * Same backend integration as web: GET /users/profile, GET /regions, PUT /users/profile (regionIds).
 * Android app design (Figma colors, ThemeContext, FontContext).
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { storage } from '../utils/storage';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { updateProfile, getUserProfile } from '../services/ProfileService';
import { getTopPadding } from '../utils/statusBarHelper';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

const FIGMA_COLORS = {
  primary: '#005DAC',
  primaryDark: '#003867',
  white: '#FFFFFF',
  divider: '#D9D9D9',
  error: '#D4183D',
};

interface RegionsManagementScreenProps {
  onBack: () => void;
}

interface Region {
  id: number;
  nameAr: string;
  nameEn: string;
}

export default function RegionsManagementScreen({ onBack }: RegionsManagementScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';

  const [myRegions, setMyRegions] = useState<Region[]>([]);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<number[]>([]);

  const screenWidth = Dimensions.get('window').width;
  const screenSlideX = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const modalFade = useRef(new Animated.Value(0)).current;
  const modalSlideX = useRef(new Animated.Value(0)).current;

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

  const { alertState, showSuccess, showError, hideAlert } = useAlertPopup();
  const { confirmState, showDeleteConfirmation, hideConfirmation } = useConfirmationPopup();
  const removeInProgressRef = useRef(false);

  const bgColor = isDarkMode ? colors.background : FIGMA_COLORS.white;
  const cardBgColor = isDarkMode ? colors.cardBackground : FIGMA_COLORS.white;
  const textColor = isDarkMode ? colors.text : FIGMA_COLORS.primaryDark;
  const primaryColor = isDarkMode ? colors.primary : FIGMA_COLORS.primary;

  useEffect(() => {
    fetchData();
  }, []);

  const closeAddModal = () => {
    Animated.parallel([
      Animated.timing(modalFade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(modalSlideX, { toValue: screenWidth, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setShowAddModal(false);
      setSelectedRegions([]);
    });
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const profile = await getUserProfile();
      setMyRegions(profile.regions || []);

      const token = await storage.getAuthToken();
      const zonesRes = await fetch(buildApiUrl(API_ENDPOINTS.ZONES.LIST), {
        headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      });
      if (zonesRes.ok) {
        const data = await zonesRes.json();
        setAllRegions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
      showError(t('Failed to load regions'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRegions = async (regionIds: number[]) => {
    setIsSaving(true);
    try {
      const existingIds = myRegions.map((r) => r.id);
      const allIds = [...new Set([...existingIds, ...regionIds])];
      await updateProfile({ regionIds: allIds });
      showSuccess(t('Regions added successfully'), t('Success'));
      closeAddModal();
      fetchData();
    } catch (error: any) {
      showError(error.message || t('Failed to add regions'), t('Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveRegion = (regionId: number) => {
    showDeleteConfirmation(
      t('Remove Region'),
      t('Are you sure you want to remove this working area?'),
      async () => {
        if (removeInProgressRef.current) return;
        removeInProgressRef.current = true;
        hideConfirmation();
        try {
          const updatedIds = myRegions.filter((r) => r.id !== regionId).map((r) => r.id);
          await updateProfile({ regionIds: updatedIds });
          showSuccess(t('Region removed successfully'), t('Success'));
          fetchData().catch(() => {});
        } catch (error: any) {
          showError(error.message || t('Failed to remove region'), t('Error'));
        } finally {
          removeInProgressRef.current = false;
        }
      },
      t('Remove')
    );
  };

  const toggleRegionSelection = (regionId: number) => {
    if (selectedRegions.includes(regionId)) {
      setSelectedRegions(selectedRegions.filter((id) => id !== regionId));
    } else {
      setSelectedRegions([...selectedRegions, regionId]);
    }
  };

  const handleSaveSelection = () => {
    if (selectedRegions.length === 0) {
      showError(t('Please select at least one region'), t('Error'));
      return;
    }
    handleAddRegions(selectedRegions);
  };

  const isRTL = i18n.language === 'ar';
  const availableRegions = allRegions.filter((r) => !myRegions.some((my) => my.id === r.id));

  if (isLoading) {
    return (
      <Animated.View style={[styles.loadingContainer, { paddingTop: getTopPadding(insets), backgroundColor: bgColor, opacity: screenOpacity, transform: [{ translateX: screenSlideX }] }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { paddingTop: getTopPadding(insets), backgroundColor: bgColor, opacity: screenOpacity, transform: [{ translateX: screenSlideX }] }]}>
      <View style={[styles.headerRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity onPress={handleBackScreen} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor, fontSize: scaledSize(18) }]}>
          {t('Working Areas')}
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: textColor, fontSize: scaledSize(16) }]}>
            {t('My Working Areas')} ({myRegions.length})
          </Text>

          {myRegions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={60} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: scaledSize(18) }]}>
                {t('No working areas added yet')}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
                {t('Add regions to show where you offer services')}
              </Text>
              {availableRegions.length > 0 && (
                <TouchableOpacity
                  style={[styles.emptyAddButton, { backgroundColor: primaryColor }]}
                  onPress={() => setShowAddModal(true)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.emptyAddButtonText}>{t('Add Working Area')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            myRegions.map((region) => (
              <View key={region.id} style={[styles.regionCard, { backgroundColor: cardBgColor, borderColor: colors.border || FIGMA_COLORS.divider }]}>
                <View style={[styles.regionIconContainer, { backgroundColor: `${primaryColor}15` }]}>
                  <Ionicons name="location" size={24} color={primaryColor} />
                </View>
                <View style={styles.regionInfo}>
                  <Text style={[styles.regionName, { color: textColor, fontSize: scaledSize(16) }]}>
                    {isRTL ? region.nameAr : region.nameEn}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveRegion(region.id)} style={styles.removeButton}>
                  <Ionicons name="trash" size={20} color={colors.error || FIGMA_COLORS.error} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={[styles.infoCard, { backgroundColor: `${primaryColor}10`, borderColor: `${primaryColor}30` }]}>
            <Ionicons name="information-circle-outline" size={24} color={primaryColor} />
            <Text style={[styles.infoText, { color: textColor, fontSize: scaledSize(14) }]}>
              {t('Working areas help users find you based on their location. Add all regions where you can provide services.')}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showAddModal} animationType="none" transparent onRequestClose={closeAddModal}>
        <Animated.View style={[styles.modalOverlay, { opacity: modalFade }]}>
          <Animated.View style={[styles.modalContent, { backgroundColor: cardBgColor, transform: [{ translateX: modalSlideX }] }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border || FIGMA_COLORS.divider }]}>
              <View style={styles.modalHeaderTextBlock}>
                <Text style={[styles.modalTitle, { color: textColor }]}>{t('Add Working Areas')}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedRegions.length} {t('services.selected')}
                </Text>
              </View>
              <TouchableOpacity onPress={closeAddModal} style={styles.modalCloseButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {availableRegions.length === 0 ? (
                <View style={styles.noMoreRegions}>
                  <Ionicons name="checkmark-circle" size={48} color={primaryColor} />
                  <Text style={[styles.noMoreText, { color: textColor, fontSize: scaledSize(16) }]}>
                    {t('All regions have been added')}
                  </Text>
                </View>
              ) : (
                <>
                  {availableRegions.map((region) => (
                    <TouchableOpacity
                      key={region.id}
                      activeOpacity={0.85}
                      style={[
                        styles.regionOption,
                        { backgroundColor: cardBgColor, borderColor: selectedRegions.includes(region.id) ? primaryColor : (colors.border || FIGMA_COLORS.divider) },
                        selectedRegions.includes(region.id) && { borderWidth: 2 },
                      ]}
                      onPress={() => toggleRegionSelection(region.id)}
                    >
                      {selectedRegions.includes(region.id) && (
                        <View style={[styles.checkIcon, { backgroundColor: primaryColor }]}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      )}
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color={selectedRegions.includes(region.id) ? primaryColor : colors.textSecondary}
                        style={styles.regionOptionIcon}
                      />
                      <Text style={[styles.regionOptionText, { color: textColor }]}>
                        {isRTL ? region.nameAr : region.nameEn}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.saveButton, { backgroundColor: primaryColor }, selectedRegions.length === 0 && { opacity: 0.5 }]}
                    onPress={handleSaveSelection}
                    disabled={isSaving || selectedRegions.length === 0}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>{t('Add')} ({selectedRegions.length})</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  rowRTL: { flexDirection: 'row-reverse' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontWeight: '600', textAlign: 'center', flex: 1 },
  placeholder: { width: 40 },
  addButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 12 },
  addButton: { width: 40, minWidth: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  sectionTitle: { fontWeight: '600', marginBottom: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtext: { textAlign: 'center', paddingHorizontal: 40, marginBottom: 20 },
  emptyAddButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, gap: 10 },
  emptyAddButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  regionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  regionIconContainer: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  regionInfo: { flex: 1 },
  regionName: { fontWeight: '600' },
  removeButton: { padding: 8 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderRadius: 12, marginTop: 24, borderWidth: 1, gap: 12 },
  infoText: { flex: 1, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalHeaderTextBlock: { flex: 1, paddingRight: 8 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalSubtitle: { fontSize: 13, marginTop: 4 },
  modalCloseButton: { padding: 4 },
  modalScrollView: { padding: 20 },
  noMoreRegions: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  noMoreText: { textAlign: 'center' },
  regionOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 8, marginBottom: 8, borderWidth: 1, gap: 12 },
  regionOptionIcon: {},
  regionOptionText: { fontSize: 16, flex: 1 },
  checkIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveButton: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
