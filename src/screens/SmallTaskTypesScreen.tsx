/**
 * SmallTaskTypesScreen – Technician subscribed task types (Small Task Types).
 * Same backend as web: getActiveSpecializations, unsubscribeFromTaskType.
 * Android app design.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { getActiveSpecializations, unsubscribeFromTaskType } from '../services/SmallTaskService';
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
  const isRTL = i18n.language === 'ar';

  const [specializations, setSpecializations] = useState<TechnicianSpecializationApi[]>([]);
  const [taskTypesMap, setTaskTypesMap] = useState<Record<number, SmallTaskType>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [unsubscribingId, setUnsubscribingId] = useState<number | null>(null);

  const { alertState, showSuccess, showError, hideAlert } = useAlertPopup();
  const { confirmState, showDeleteConfirmation, hideConfirmation } = useConfirmationPopup();

  const bgColor = isDarkMode ? colors.background : FIGMA_COLORS.white;
  const cardBgColor = isDarkMode ? colors.cardBackground : FIGMA_COLORS.white;
  const textColor = isDarkMode ? colors.text : FIGMA_COLORS.primaryDark;
  const primaryColor = isDarkMode ? colors.primary : FIGMA_COLORS.primary;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [specs, types] = await Promise.all([
        getActiveSpecializations(),
        getSmallTaskTypes(),
      ]);
      setSpecializations(specs);
      const map: Record<number, SmallTaskType> = {};
      types.forEach((tt) => { map[tt.id] = tt; });
      setTaskTypesMap(map);
    } catch (error: any) {
      showError(error.message || t('Failed to load task types'), t('Error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = (taskTypeId: number) => {
    showDeleteConfirmation(
      t('Unsubscribe from Task Type'),
      t('Are you sure you want to unsubscribe? You will no longer receive notifications for new tasks of this type.'),
      async () => {
        setUnsubscribingId(taskTypeId);
        try {
          await unsubscribeFromTaskType(taskTypeId);
          showSuccess(t('Unsubscribed successfully'), t('Success'));
          fetchData();
        } catch (error: any) {
          showError(error.message || t('Failed to unsubscribe'), t('Error'));
        } finally {
          setUnsubscribingId(null);
        }
      },
      t('Unsubscribe')
    );
  };

  const getName = (spec: TechnicianSpecializationApi) => {
    const tt = taskTypesMap[spec.taskTypeId];
    if (!tt) return `#${spec.taskTypeId}`;
    return isRTL ? (tt.nameAr || tt.nameEn) : (tt.nameEn || tt.nameAr);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top, backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bgColor }]}>
      <View style={[styles.headerRow, isRTL && styles.rowRTL]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor, fontSize: scaledSize(18) }]}>
          {t('Small Task Types')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionTitle, { color: textColor, fontSize: scaledSize(16) }]}>
          {t('My subscribed task types')} ({specializations.length})
        </Text>
        {specializations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={60} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
              {t('No task types subscribed yet')}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>
              {t('Subscribe to task types from the Small Tasks section to receive requests.')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  rowRTL: { flexDirection: 'row-reverse' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontWeight: '600', textAlign: 'center', flex: 1 },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
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
