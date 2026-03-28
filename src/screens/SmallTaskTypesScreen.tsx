/**
 * SmallTaskTypesScreen – Technician subscribed task types (Small Task Types).
 * Same backend as web: getActiveSpecializations, unsubscribeFromTaskType.
 * Android app design.
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
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { getActiveSpecializations, unsubscribeFromTaskType, subscribeToTaskType } from '../services/SmallTaskService';
import type { TechnicianSpecializationApi } from '../services/SmallTaskService';
import { getSmallTaskTypes, type SmallTaskType } from '../services/SmallTaskService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';

const FIGMA_COLORS = {
  primary: '#005DAC',
  primaryDark: '#003867',
  white: '#FFFFFF',
  error: '#D4183D',
};

interface SmallTaskTypesScreenProps {
  onBack: () => void;
}

export default function SmallTaskTypesScreen({ onBack }: SmallTaskTypesScreenProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';

  const [specializations, setSpecializations] = useState<TechnicianSpecializationApi[]>([]);
  const [taskTypesMap, setTaskTypesMap] = useState<Record<number, SmallTaskType>>({});
  const [allTaskTypes, setAllTaskTypes] = useState<SmallTaskType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unsubscribingId, setUnsubscribingId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [subscribingId, setSubscribingId] = useState<number | null>(null);

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [specs, types] = await Promise.all([
        getActiveSpecializations(),
        getSmallTaskTypes(),
      ]);
      setSpecializations(specs);
      setAllTaskTypes(types);
      const map: Record<number, SmallTaskType> = {};
      types.forEach((tt) => { map[tt.id] = tt; });
      setTaskTypesMap(map);
    } catch (error: any) {
      showError(error.message || t('smallTasks.failedToLoadTaskTypes'), t('smallTasks.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const subscribedIds = new Set(specializations.map((s) => s.taskTypeId));
  const availableToAdd = allTaskTypes.filter((tt) => !subscribedIds.has(tt.id));

  const handleSubscribe = async (taskTypeId: number) => {
    setSubscribingId(taskTypeId);
    try {
      await subscribeToTaskType(taskTypeId);
      showSuccess(t('smallTasks.subscribedSuccess'), t('smallTasks.success'));
      await fetchData();
      closeAddModal();
    } catch (error: any) {
      showError(error.message || t('smallTasks.failedToSubscribe'), t('smallTasks.error'));
    } finally {
      setSubscribingId(null);
    }
  };

  const handleUnsubscribe = (taskTypeId: number) => {
    showDeleteConfirmation(
      t('smallTasks.unsubscribeFromTaskType'),
      t('smallTasks.unsubscribeConfirmMessage'),
      async () => {
        setUnsubscribingId(taskTypeId);
        try {
          await unsubscribeFromTaskType(taskTypeId);
          showSuccess(t('smallTasks.unsubscribedSuccess'), t('smallTasks.success'));
          fetchData();
        } catch (error: any) {
          showError(error.message || t('smallTasks.failedToUnsubscribe'), t('smallTasks.error'));
        } finally {
          setUnsubscribingId(null);
        }
      },
      t('smallTasks.unsubscribe')
    );
  };

  const getName = (spec: TechnicianSpecializationApi) => {
    const tt = taskTypesMap[spec.taskTypeId];
    if (!tt) return `#${spec.taskTypeId}`;
    return i18n.language === 'ar' ? (tt.nameAr || tt.nameEn) : (tt.nameEn || tt.nameAr);
  };

  if (isLoading) {
    return (
      <Animated.View style={[styles.loadingContainer, { paddingTop: insets.top, backgroundColor: bgColor, opacity: screenOpacity, transform: [{ translateX: screenSlideX }] }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top, backgroundColor: bgColor, opacity: screenOpacity, transform: [{ translateX: screenSlideX }] }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBackScreen} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor, fontSize: scaledSize(18) }]}>
          {t('smallTasks.smallTaskTypes')}
        </Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={FIGMA_COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionTitle, { color: textColor, fontSize: scaledSize(16) }]}>
          {t('smallTasks.mySubscribedTaskTypes')} ({specializations.length})
        </Text>
        {specializations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={60} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
              {t('smallTasks.noTaskTypesSubscribed')}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {t('smallTasks.subscribeFromSmallTasks')}
            </Text>
          </View>
        ) : (
          specializations.map((spec) => (
            <View key={spec.taskTypeId} style={[styles.card, { backgroundColor: cardBgColor, borderColor: colors.border }]}>
              <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}15` }]}>
                <Ionicons name="list" size={24} color={primaryColor} />
              </View>
              <Text style={[styles.cardTitle, { color: textColor, fontSize: scaledSize(16) }]} numberOfLines={1}>
                {getName(spec)}
              </Text>
              <TouchableOpacity
                onPress={() => handleUnsubscribe(spec.taskTypeId)}
                disabled={unsubscribingId === spec.taskTypeId}
                style={styles.removeButton}
              >
                {unsubscribingId === spec.taskTypeId ? (
                  <ActivityIndicator size="small" color={colors.error || FIGMA_COLORS.error} />
                ) : (
                  <Ionicons name="trash-outline" size={22} color={colors.error || FIGMA_COLORS.error} />
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

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

      {/* Add task type modal */}
      <Modal visible={showAddModal} animationType="none" transparent onRequestClose={closeAddModal}>
        <Animated.View style={[styles.modalOverlay, { opacity: modalFade }]}>
          <Animated.View style={[styles.modalContent, { backgroundColor: cardBgColor, transform: [{ translateX: modalSlideX }] }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor, fontSize: scaledSize(18) }]}>
                {t('smallTasks.addTaskType')}
              </Text>
              <TouchableOpacity onPress={closeAddModal} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            {availableToAdd.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Ionicons name="checkmark-done" size={48} color={primaryColor} />
                <Text style={[styles.modalEmptyText, { color: colors.textSecondary }]}>
                  {t('smallTasks.subscribedToAllTypes')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableToAdd}
                keyExtractor={(item) => item.id.toString()}
                style={styles.modalList}
                renderItem={({ item }) => {
                  const name = i18n.language === 'ar' ? (item.nameAr || item.nameEn) : (item.nameEn || item.nameAr);
                  const isSubscribing = subscribingId === item.id;
                  return (
                    <View style={[styles.modalRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.modalRowTitle, { color: textColor }]} numberOfLines={1}>
                        {name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleSubscribe(item.id)}
                        disabled={isSubscribing}
                        style={[styles.subscribeButton, { backgroundColor: primaryColor }]}
                      >
                        {isSubscribing ? (
                          <ActivityIndicator size="small" color={FIGMA_COLORS.white} />
                        ) : (
                          <>
                            <Ionicons name="add" size={18} color={FIGMA_COLORS.white} />
                            <Text style={styles.subscribeButtonText}>{t('smallTasks.add')}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontWeight: '600', textAlign: 'center', flex: 1 },
  addButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  modalTitle: { fontWeight: '600' },
  modalClose: { padding: 8 },
  modalList: { maxHeight: 400 },
  modalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1 },
  modalRowTitle: { flex: 1, fontSize: 16, marginRight: 12 },
  subscribeButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, gap: 6 },
  subscribeButtonText: { color: FIGMA_COLORS.white, fontWeight: '600', fontSize: 14 },
  modalEmpty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  modalEmptyText: { fontSize: 16, textAlign: 'center', marginTop: 12 },
  content: { padding: 20, paddingBottom: 48, flexGrow: 1 },
  sectionTitle: { fontWeight: '600', marginBottom: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtext: { textAlign: 'center', paddingHorizontal: 24 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { flex: 1, fontWeight: '600' },
  removeButton: { padding: 8 },
});
