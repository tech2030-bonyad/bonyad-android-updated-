/**
 * StagesManagementModal — RTL bottom sheet for managing project stages (مراحل).
 * Slides up from bottom with open/close animation.
 * Uses riyal logo from assets; layout and colors per spec.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  Animated,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Circle } from 'react-native-svg';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import AlertPopup, { useAlertPopup } from './AlertPopup';
import { useHover } from '../hooks/useHover';

// ——— COLORS (exact from spec) ———
const C = {
  sheetBg: '#FAFBFF',
  sheetBorder: '#E8EEF8',
  handle: '#DDE5F0',
  title: '#0C1A2E',
  subtitle: '#8FA3BF',
  closeBg: '#F0F4FA',
  closeBgHover: '#FFE4E4',
  closeIcon: '#8FA3BF',
  closeIconHover: '#EF4444',
  tileBg: '#FFFFFF',
  tileBorder: '#EEF2FA',
  valBlue: '#0EA5E9',
  valAmber: '#F59E0B',
  valGreen: '#10B981',
  barBlue: '#0EA5E9',
  barAmber: '#F59E0B',
  barGreen: '#10B981',
  labelMuted: '#94A3B8',
  tipBg: '#F0F7FF',
  tipBorder: '#0EA5E9',
  tipIcon: '#0EA5E9',
  tipText: '#4A6FA5',
  tipBold: '#0EA5E9',
  listBadgeBg: '#EFF6FF',
  listBadgeText: '#0EA5E9',
  cardBg: '#FFFFFF',
  cardBorder: '#EEF2FA',
  cardBorderHover: '#BAD9FF',
  cardDivider: '#F1F5F9',
  stageNumBg: '#0C1A2E',
  stageNumText: '#FFFFFF',
  stageName: '#0C1A2E',
  stagePrice: '#0EA5E9',
  stageDays: '#94A3B8',
  // Match project card status colors: Pending=orange, In progress=green, Completed=blue
  badgePendingBg: 'rgba(255, 165, 0, 0.2)',
  badgePendingText: '#FFA500',
  badgeProgressBg: 'rgba(76, 175, 80, 0.2)',
  badgeProgressText: '#4CAF50',
  badgeDoneBg: 'rgba(33, 150, 243, 0.2)',
  badgeDoneText: '#2196F3',
  reorderBg: '#F8FAFC',
  reorderBorder: '#E8EEF8',
  reorderHoverBg: '#EFF6FF',
  reorderHoverBorder: '#BAD9FF',
  reorderIcon: '#94A3B8',
  editBg: '#EFF6FF',
  editBgHover: '#BFDBFE',
  editText: '#2563EB',
  deleteBg: '#FEF2F2',
  deleteBgHover: '#FECACA',
  deleteText: '#DC2626',
  addBg: '#0C1A2E',
  addBgHover: '#0EA5E9',
  addBgPress: '#0284C7',
  addText: '#FFFFFF',
};

// ——— DARK MODE COLORS ———
const C_DARK: Record<keyof typeof C, string> = {
  ...C,
  sheetBg: '#1C1C1E',
  sheetBorder: '#2C2C2E',
  handle: '#3A3A3C',
  title: '#FFFFFF',
  subtitle: '#B0B0B0',
  closeBg: '#2C2C2E',
  closeBgHover: '#3D2A2A',
  closeIcon: '#B0B0B0',
  closeIconHover: '#EF4444',
  tileBg: '#2C2C2E',
  tileBorder: '#3A3A3C',
  valBlue: '#38BDF8',
  valAmber: '#FBBF24',
  valGreen: '#34D399',
  barBlue: '#38BDF8',
  barAmber: '#FBBF24',
  barGreen: '#34D399',
  labelMuted: '#9CA3AF',
  tipBg: '#1E293B',
  tipBorder: '#38BDF8',
  tipIcon: '#38BDF8',
  tipText: '#94A3B8',
  tipBold: '#38BDF8',
  listBadgeBg: '#1E3A5F',
  listBadgeText: '#38BDF8',
  cardBg: '#2C2C2E',
  cardBorder: '#3A3A3C',
  cardBorderHover: '#475569',
  cardDivider: '#374151',
  stageNumBg: '#E5E7EB',
  stageNumText: '#1C1C1E',
  stageName: '#FFFFFF',
  stagePrice: '#38BDF8',
  stageDays: '#9CA3AF',
  // Dark mode: same hues as project card (orange, green, blue)
  badgePendingBg: 'rgba(255, 165, 0, 0.25)',
  badgePendingText: '#FFB74D',
  badgeProgressBg: 'rgba(76, 175, 80, 0.25)',
  badgeProgressText: '#81C784',
  badgeDoneBg: 'rgba(33, 150, 243, 0.25)',
  badgeDoneText: '#64B5F6',
  reorderBg: '#374151',
  reorderBorder: '#4B5563',
  reorderHoverBg: '#1E3A5F',
  reorderHoverBorder: '#475569',
  reorderIcon: '#9CA3AF',
  editBg: '#1E3A5F',
  editBgHover: '#2563EB',
  editText: '#93C5FD',
  deleteBg: '#3D2A2A',
  deleteBgHover: '#7F1D1D',
  deleteText: '#F87171',
  addBg: '#E5E7EB',
  addBgHover: '#38BDF8',
  addBgPress: '#0EA5E9',
  addText: '#1C1C1E',
};

// ——— API Phase type ———
interface Phase {
  id: number;
  projectId: number;
  phaseNumber: number;
  description: string;
  timeSpentDays: number;
  moneySpent: number;
  paymentStatus: string;
  approved: boolean;
  completed: boolean;
  createdAt?: string;
  updatedAt?: string;
  isNew?: boolean;
}

export interface StagesManagementModalProps {
  visible: boolean;
  projectId: number;
  projectName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

function mapPhaseToStage(p: Phase): { id: string; name: string; price: number; days: number; status: 'pending' | 'in_progress' | 'done'; order: number } {
  let status: 'pending' | 'in_progress' | 'done' = 'pending';
  if (p.completed) status = 'done';
  else if (p.approved) status = 'in_progress';
  return {
    id: String(p.id),
    name: p.description || '',
    price: p.moneySpent || 0,
    days: p.timeSpentDays || 0,
    status,
    order: p.phaseNumber,
  };
}

// ——— SVG Icons ———
function IconClose({ size = 24, color = C.closeIcon }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 6L6 18M6 6l12 12" />
    </Svg>
  );
}
function IconInfo({ size = 20, color = C.tipIcon }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 16v-4M12 8h.01" />
    </Svg>
  );
}
function IconClock({ size = 16, color = C.stageDays }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 8v4l2 2" />
    </Svg>
  );
}
function IconEdit({ size = 16, color = C.editText }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  );
}
function IconDelete({ size = 16, color = C.deleteText }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </Svg>
  );
}
function IconPlus({ size = 20, color = C.addText }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}
function IconChevronUp({ size = 18, color = C.reorderIcon }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 15l-6-6-6 6" />
    </Svg>
  );
}
function IconChevronDown({ size = 18, color = C.reorderIcon }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

const FONT = 'Cairo';

export default function StagesManagementModal({
  visible,
  projectId,
  projectName = '',
  onClose,
  onSuccess,
}: StagesManagementModalProps) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const riyalLogo = isDark ? require('../../assets/saudi_riyal_logo_dark.svg') : require('../../assets/saudi_riyal_logo.svg');
  const palette = isDark ? C_DARK : C;

  const windowHeight = Dimensions.get('window').height;
  const sheetHeight = windowHeight * 0.92;
  const slideAnim = useRef(new Animated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [isSubmittingPhase, setIsSubmittingPhase] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; confirmText: string; onConfirm: () => void; destructive?: boolean } | null>(null);

  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();

  useEffect(() => {
    if (visible && projectId) loadPhases();
  }, [visible, projectId]);

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
    ]).start();
    return () => {};
  }, [visible]);

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, {
        toValue: windowHeight,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleClose = () => {
    if (hasChanges) {
      setConfirmConfig({
        title: t('Unsaved Changes'),
        message: t('You have unsaved changes. Are you sure you want to close?'),
        confirmText: t('Discard'),
        destructive: true,
        onConfirm: () => {
          setShowConfirm(false);
          setHasChanges(false);
          closeModal();
        },
      });
      setShowConfirm(true);
    } else closeModal();
  };

  const loadPhases = async () => {
    setIsLoading(true);
    try {
      const token = await storage.getAuthToken();
      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, { projectId });
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setPhases(data.sort((a: Phase, b: Phase) => a.phaseNumber - b.phaseNumber));
      } else showError(t('Failed to load phases'));
    } catch (e) {
      showError(t('Failed to load phases'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatSAR = (n: number) => new Intl.NumberFormat('ar-SA').format(n);
  const totalSAR = phases.reduce((s, p) => s + (p.moneySpent || 0), 0);
  const totalDays = phases.reduce((s, p) => s + (p.timeSpentDays || 0), 0);
  const count = phases.length;

  const statusLabel = (status: 'pending' | 'in_progress' | 'done') => {
    if (status === 'pending') return 'قيد الانتظار';
    if (status === 'in_progress') return 'جارٍ التنفيذ';
    return 'مكتمل';
  };
  const statusStyle = (status: 'pending' | 'in_progress' | 'done') => {
    if (status === 'pending') return { bg: palette.badgePendingBg, text: palette.badgePendingText };
    if (status === 'in_progress') return { bg: palette.badgeProgressBg, text: palette.badgeProgressText };
    return { bg: palette.badgeDoneBg, text: palette.badgeDoneText };
  };

  const modalStyles = useMemo(
    () =>
      createModalStyles(palette, sheetHeight, insets.bottom),
    [isDark, sheetHeight, insets.bottom]
  );

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setPhases(prev => {
      const u = [...prev];
      [u[index - 1], u[index]] = [u[index], u[index - 1]];
      return u.map((p, i) => ({ ...p, phaseNumber: i + 1 }));
    });
    setHasChanges(true);
  };
  const handleMoveDown = (index: number) => {
    if (index >= phases.length - 1) return;
    setPhases(prev => {
      const u = [...prev];
      [u[index], u[index + 1]] = [u[index + 1], u[index]];
      return u.map((p, i) => ({ ...p, phaseNumber: i + 1 }));
    });
    setHasChanges(true);
  };
  const saveOrder = async () => {
    setIsSaving(true);
    try {
      const token = await storage.getAuthToken();
      await Promise.all(
        phases.map((p, i) => {
          if (p.id <= 0) return Promise.resolve();
          const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.UPDATE, { phaseId: p.id });
          return fetch(url, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phaseNumber: i + 1,
              description: p.description,
              timeSpentDays: p.timeSpentDays,
              moneySpent: p.moneySpent,
            }),
          });
        })
      );
      showSuccess(t('Phases reordered successfully'));
      setHasChanges(false);
      onSuccess?.();
    } catch (e) {
      showError(t('Failed to save phase order'));
    } finally {
      setIsSaving(false);
    }
  };
  const handleAddPhase = () => {
    setEditingPhase(null);
    setShowPhaseForm(true);
  };
  const handleEditPhase = (phase: Phase) => {
    setEditingPhase(phase);
    setShowPhaseForm(true);
  };
  const handleRemovePhase = (phase: Phase) => {
    setConfirmConfig({
      title: t('Remove Phase'),
      message: t('Are you sure you want to remove this phase? This action cannot be undone.'),
      confirmText: t('Remove'),
      destructive: true,
      onConfirm: () => {
        setPhases(prev => prev.filter(p => p.id !== phase.id).map((p, i) => ({ ...p, phaseNumber: i + 1 })));
        setHasChanges(true);
        setShowConfirm(false);
      },
    });
    setShowConfirm(true);
  };
  const handleSavePhase = async (data: { description: string; timeSpentDays: number; moneySpent: number }) => {
    setIsSubmittingPhase(true);
    try {
      const token = await storage.getAuthToken();
      if (editingPhase) {
        if (editingPhase.id > 0) {
          const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.UPDATE, { phaseId: editingPhase.id });
          const res = await fetch(url, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (res.ok) {
            showSuccess(t('Phase updated successfully'));
            await loadPhases();
          } else showError(t('Failed to update phase'));
        } else {
          setPhases(prev => prev.map(p => (p.id === editingPhase.id ? { ...p, ...data } : p)));
          setHasChanges(true);
        }
      } else {
        const url = buildApiUrl(API_ENDPOINTS.PHASES.CREATE);
        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            phaseNumber: phases.length + 1,
            ...data,
          }),
        });
        if (res.ok) {
          showSuccess(t('Phase added successfully'));
          await loadPhases();
          onSuccess?.();
        } else showError(t('Failed to add phase'));
      }
      setShowPhaseForm(false);
      setEditingPhase(null);
    } catch (e) {
      showError(t('Failed to save phase'));
    } finally {
      setIsSubmittingPhase(false);
    }
  };

  const closeHover = useHover();

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
        <View style={modalStyles.modalRoot}>
          <TouchableOpacity style={modalStyles.backdropTouch} activeOpacity={1} onPress={handleClose}>
            <Animated.View style={[modalStyles.backdrop, { opacity: backdropOpacity }]} />
          </TouchableOpacity>
          <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={modalStyles.handleWrap}>
              <View style={modalStyles.handle} />
            </View>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>إدارة المراحل</Text>
              <Pressable
                onPress={handleClose}
                style={[
                  modalStyles.closeBtn,
                  (closeHover.hovered || closeHover.pressed) && modalStyles.closeBtnHover,
                ]}
                {...closeHover.handlers}
              >
                <IconClose color={closeHover.hovered || closeHover.pressed ? palette.closeIconHover : palette.closeIcon} />
              </Pressable>
            </View>
            <Text style={modalStyles.subtitle} numberOfLines={1}>{projectName || t('Project')}</Text>

            {/* Metrics row */}
            <View style={modalStyles.metricsRow}>
              <View style={modalStyles.tile}>
                <Text style={[modalStyles.tileVal, { color: palette.valBlue }]}>{formatSAR(totalSAR)}</Text>
                <ExpoImage source={riyalLogo} style={modalStyles.riyalInTile} contentFit="contain" />
                <View style={[modalStyles.tileBar, { backgroundColor: palette.barBlue }]} />
              </View>
              <View style={modalStyles.tile}>
                <Text style={[modalStyles.tileVal, { color: palette.valAmber }]}>{formatSAR(totalDays)}</Text>
                <Text style={modalStyles.tileLabel}>أيام</Text>
                <View style={[modalStyles.tileBar, { backgroundColor: palette.barAmber }]} />
              </View>
              <View style={modalStyles.tile}>
                <Text style={[modalStyles.tileVal, { color: palette.valGreen }]}>{formatSAR(count)}</Text>
                <Text style={modalStyles.tileLabel}>مراحل</Text>
                <View style={[modalStyles.tileBar, { backgroundColor: palette.barGreen }]} />
              </View>
            </View>

            {/* Tip */}
            <View style={modalStyles.tipBox}>
              <IconInfo color={palette.tipIcon} />
              <Text style={modalStyles.tipText}>يمكن تعديل المراحل المعلقة</Text>
            </View>

            {/* List header */}
            <View style={modalStyles.listHeader}>
              <Text style={modalStyles.listHeaderLabel}>قائمة المراحل</Text>
              <View style={modalStyles.listBadge}>
                <Text style={modalStyles.listBadgeText}>{count} مرحلة</Text>
              </View>
            </View>

            {isLoading ? (
              <View style={modalStyles.loadingWrap}>
                <ActivityIndicator size="large" color={palette.valBlue} />
                <Text style={modalStyles.loadingText}>{t('Loading phases...')}</Text>
              </View>
            ) : (
              <ScrollView
                style={modalStyles.scroll}
                contentContainerStyle={modalStyles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {phases.map((phase, index) => {
                  const stage = mapPhaseToStage(phase);
                  const canEdit = !phase.approved && !phase.completed;
                  const isFirst = index === 0;
                  const isLast = index === phases.length - 1;
                  const st = statusStyle(stage.status);
                  return (
                    <View key={phase.id} style={modalStyles.card}>
                      <View style={modalStyles.cardTop}>
                        <View style={modalStyles.cardRight}>
                          <View style={modalStyles.stageNumCol}>
                            <View style={modalStyles.stageNum}>
                              <Text style={modalStyles.stageNumText}>{stage.order}</Text>
                            </View>
                            <View style={modalStyles.stageMetaTimeline}>
                              <IconClock size={14} color={palette.stageDays} />
                              <Text style={modalStyles.stageDays}>{stage.days} أيام</Text>
                            </View>
                          </View>
                          <View style={modalStyles.cardRightCol}>
                            <Text style={modalStyles.stageName} numberOfLines={1}>{stage.name || '—'}</Text>
                            <View style={modalStyles.stageMetaPrice}>
                              <ExpoImage source={riyalLogo} style={modalStyles.riyalSmall} contentFit="contain" />
                              <Text style={modalStyles.stagePrice}>{formatSAR(stage.price)}</Text>
                            </View>
                            <View style={[modalStyles.badge, { backgroundColor: st.bg }]}>
                              <Text style={[modalStyles.badgeText, { color: st.text }]}>{statusLabel(stage.status)}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                      <View style={modalStyles.cardDivider} />
                      <View style={modalStyles.cardBottom}>
                        <View style={modalStyles.reorderWrap}>
                          <TouchableOpacity
                            style={[modalStyles.reorderBtn, (isFirst || !canEdit) && modalStyles.reorderBtnDisabled]}
                            onPress={() => handleMoveUp(index)}
                            disabled={isFirst || !canEdit}
                          >
                            <IconChevronUp color={isFirst || !canEdit ? palette.labelMuted : palette.reorderIcon} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[modalStyles.reorderBtn, (isLast || !canEdit) && modalStyles.reorderBtnDisabled]}
                            onPress={() => handleMoveDown(index)}
                            disabled={isLast || !canEdit}
                          >
                            <IconChevronDown color={isLast || !canEdit ? palette.labelMuted : palette.reorderIcon} />
                          </TouchableOpacity>
                        </View>
                        <View style={modalStyles.actionWrap}>
                          {canEdit && (
                            <>
                              <TouchableOpacity style={modalStyles.editBtn} onPress={() => handleEditPhase(phase)}>
                                <IconEdit size={14} color={palette.editText} />
                                <Text style={modalStyles.editBtnText}>تعديل</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={modalStyles.deleteBtn} onPress={() => handleRemovePhase(phase)}>
                                <IconDelete size={14} color={palette.deleteText} />
                                <Text style={modalStyles.deleteBtnText}>حذف</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
                <TouchableOpacity style={modalStyles.addBtn} onPress={handleAddPhase}>
                  <IconPlus color={palette.addText} />
                  <Text style={modalStyles.addBtnText}>إضافة مرحلة جديدة</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {hasChanges && (
              <View style={modalStyles.footer}>
                <TouchableOpacity
                  style={[modalStyles.saveOrderBtn, isSaving && modalStyles.saveOrderBtnDisabled]}
                  onPress={saveOrder}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={modalStyles.saveOrderText}>{t('Save Order')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Phase Form Modal (reuse from PhaseManagementModal or minimal inline) */}
      {showPhaseForm && (
        <PhaseFormModalInline
          visible={showPhaseForm}
          phase={editingPhase}
          isEditing={!!editingPhase}
          onClose={() => { setShowPhaseForm(false); setEditingPhase(null); }}
          onSave={handleSavePhase}
          isSubmitting={isSubmittingPhase}
        />
      )}
      {showConfirm && confirmConfig && (
        <ConfirmModalInline
          visible={showConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          cancelText={t('Cancel')}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setShowConfirm(false)}
          destructive={confirmConfig.destructive}
        />
      )}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </>
  );
}

// ——— Inline Phase Form Modal (minimal, theme-aware) ———
function PhaseFormModalInline({
  visible,
  phase,
  isEditing,
  onClose,
  onSave,
  isSubmitting,
}: {
  visible: boolean;
  phase: Phase | null;
  isEditing: boolean;
  onClose: () => void;
  onSave: (data: { description: string; timeSpentDays: number; moneySpent: number }) => void;
  isSubmitting: boolean;
}) {
  const { t } = useTranslation();
  const isDark = useTheme().theme === 'dark';
  const palette = isDark ? C_DARK : C;
  const formStyles = useMemo(
    () =>
      StyleSheet.create({
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
        box: { backgroundColor: palette.sheetBg, borderRadius: 20, maxHeight: '80%', borderWidth: 1, borderColor: palette.sheetBorder },
        formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: palette.sheetBorder },
        formTitle: { fontSize: 18, fontWeight: '700', color: palette.title, fontFamily: FONT },
        formClose: { padding: 8 },
        formScroll: { padding: 20, maxHeight: 400 },
        formLabel: { fontSize: 14, fontWeight: '600', color: palette.title, marginBottom: 8, fontFamily: FONT },
        input: { backgroundColor: palette.tileBg, borderWidth: 1.5, borderColor: palette.tileBorder, borderRadius: 12, padding: 12, fontSize: 16, color: palette.title, marginBottom: 16, fontFamily: FONT },
        formFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: palette.sheetBorder },
        cancelBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: palette.reorderBg, alignItems: 'center' },
        cancelBtnText: { fontSize: 16, fontWeight: '600', color: palette.title, fontFamily: FONT },
        saveBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: palette.valBlue, alignItems: 'center' },
        saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: FONT },
      }),
    [isDark]
  );
  const [description, setDescription] = useState('');
  const [days, setDays] = useState('');
  const [money, setMoney] = useState('');
  useEffect(() => {
    if (visible && phase && isEditing) {
      setDescription(phase.description || '');
      setDays(String(phase.timeSpentDays ?? ''));
      setMoney(String(phase.moneySpent ?? ''));
    } else if (visible) {
      setDescription('');
      setDays('');
      setMoney('');
    }
  }, [visible, phase, isEditing]);
  const handleSave = () => {
    const d = parseInt(days, 10);
    const m = parseFloat(money);
    if (!description.trim() || !days || isNaN(d) || d <= 0 || !money || isNaN(m) || m <= 0) return;
    onSave({ description: description.trim(), timeSpentDays: d, moneySpent: m });
  };
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade">
      <View style={formStyles.overlay}>
        <View style={formStyles.box}>
          <View style={formStyles.formHeader}>
            <Text style={formStyles.formTitle}>{isEditing ? t('Edit Phase') : t('Add New Phase')}</Text>
            <TouchableOpacity onPress={onClose} style={formStyles.formClose}>
              <IconClose color={palette.closeIcon} />
            </TouchableOpacity>
          </View>
          <ScrollView style={formStyles.formScroll}>
            <Text style={formStyles.formLabel}>{t('Description')} *</Text>
            <TextInput
              style={formStyles.input}
              multiline
              placeholder={t('Describe what will be done in this phase...')}
              placeholderTextColor={palette.subtitle}
              value={description}
              onChangeText={setDescription}
            />
            <Text style={formStyles.formLabel}>{t('Duration (days)')} *</Text>
            <TextInput
              style={formStyles.input}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={palette.subtitle}
              value={days}
              onChangeText={setDays}
            />
            <Text style={formStyles.formLabel}>{t('Cost (SAR)')} *</Text>
            <TextInput
              style={formStyles.input}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={palette.subtitle}
              value={money}
              onChangeText={setMoney}
            />
          </ScrollView>
          <View style={formStyles.formFooter}>
            <TouchableOpacity style={formStyles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={formStyles.cancelBtnText}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={formStyles.saveBtn} onPress={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={formStyles.saveBtnText}>{isEditing ? t('Save Changes') : t('Add Phase')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ——— Inline Confirm (theme-aware) ———
function ConfirmModalInline({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  destructive,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  const isDark = useTheme().theme === 'dark';
  const palette = isDark ? C_DARK : C;
  const confirmStyles = useMemo(
    () =>
      StyleSheet.create({
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
        box: { backgroundColor: palette.sheetBg, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: palette.sheetBorder },
        title: { fontSize: 18, fontWeight: '700', color: palette.title, marginBottom: 8, fontFamily: FONT },
        message: { fontSize: 14, color: palette.subtitle, marginBottom: 24, fontFamily: FONT },
        actions: { flexDirection: 'row', gap: 12 },
        cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: palette.reorderBg, alignItems: 'center' },
        cancelText: { fontSize: 15, fontWeight: '600', color: palette.title, fontFamily: FONT },
        confirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: palette.valBlue, alignItems: 'center' },
        destructiveBtn: { backgroundColor: palette.deleteText },
        confirmText: { fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: FONT },
      }),
    [isDark]
  );
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade">
      <View style={confirmStyles.overlay}>
        <View style={confirmStyles.box}>
          <Text style={confirmStyles.title}>{title}</Text>
          <Text style={confirmStyles.message}>{message}</Text>
          <View style={confirmStyles.actions}>
            <TouchableOpacity style={confirmStyles.cancelBtn} onPress={onCancel}>
              <Text style={confirmStyles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[confirmStyles.confirmBtn, destructive && confirmStyles.destructiveBtn]} onPress={onConfirm}>
              <Text style={confirmStyles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createModalStyles(
  palette: typeof C,
  sheetHeight: number,
  safeBottom: number
) {
  return StyleSheet.create({
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    backdropTouch: { flex: 1 },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      backgroundColor: palette.sheetBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: palette.sheetBorder,
      height: sheetHeight,
      paddingBottom: safeBottom,
      direction: 'rtl',
    },
    handleWrap: { alignItems: 'center', marginTop: 14 },
    handle: { width: 36, height: 4, borderRadius: 99, backgroundColor: palette.handle },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 18,
      paddingHorizontal: 20,
      paddingBottom: 0,
    },
    title: { fontSize: 20, fontWeight: '800', color: palette.title, letterSpacing: -0.3, fontFamily: FONT },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.closeBg, justifyContent: 'center', alignItems: 'center' },
    closeBtnHover: { backgroundColor: palette.closeBgHover },
    subtitle: { fontSize: 12, fontWeight: '500', color: palette.subtitle, paddingHorizontal: 20, marginTop: 4, fontFamily: FONT },
    metricsRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 18, gap: 8 },
    tile: {
      flex: 1,
      backgroundColor: palette.tileBg,
      borderWidth: 1.5,
      borderColor: palette.tileBorder,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    tileVal: { fontSize: 22, fontWeight: '800', lineHeight: 22, fontFamily: FONT },
    riyalInTile: { width: 16, height: 16, marginTop: 4 },
    tileLabel: { fontSize: 11, fontWeight: '600', color: palette.labelMuted, marginTop: 2, fontFamily: FONT },
    tileBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    tipBox: {
      marginHorizontal: 20,
      marginBottom: 16,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: palette.tipBg,
      borderRightWidth: 3,
      borderRightColor: palette.tipBorder,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    tipText: { fontSize: 12, fontWeight: '500', color: palette.tipText, lineHeight: 20, flex: 1, fontFamily: FONT },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
    listHeaderLabel: { fontSize: 12, fontWeight: '700', color: palette.labelMuted, letterSpacing: 0.5, fontFamily: FONT },
    listBadge: { backgroundColor: palette.listBadgeBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    listBadgeText: { fontSize: 12, fontWeight: '700', color: palette.listBadgeText, fontFamily: FONT },
    loadingWrap: { padding: 40, alignItems: 'center', gap: 16 },
    loadingText: { fontSize: 14, color: palette.subtitle, fontFamily: FONT },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 12, paddingBottom: 24, paddingTop: 4 },
    card: {
      backgroundColor: palette.cardBg,
      borderWidth: 1.5,
      borderColor: palette.cardBorder,
      borderRadius: 18,
      marginHorizontal: 12,
      marginBottom: 20,
      minHeight: 140,
      overflow: 'hidden',
    },
    cardTop: { paddingVertical: 22, paddingHorizontal: 18, paddingBottom: 18 },
    cardRight: { flexDirection: 'row', gap: 14 },
    stageNumCol: { alignItems: 'center', gap: 8 },
    cardRightCol: { flex: 1, alignItems: 'flex-end', gap: 10 },
    stageNum: { width: 34, height: 34, borderRadius: 12, backgroundColor: palette.stageNumBg, justifyContent: 'center', alignItems: 'center' },
    stageNumText: { fontSize: 15, fontWeight: '700', color: palette.stageNumText, fontFamily: FONT },
    stageName: { fontSize: 15, fontWeight: '700', color: palette.stageName, fontFamily: FONT },
    stageMetaTimeline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stageMetaPrice: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    riyalSmall: { width: 14, height: 14 },
    stagePrice: { fontSize: 13, fontWeight: '700', color: palette.stagePrice, fontFamily: FONT },
    stageDays: { fontSize: 11, fontWeight: '500', color: palette.stageDays, fontFamily: FONT },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-end' },
    badgeText: { fontSize: 11, fontWeight: '700', fontFamily: FONT },
    cardDivider: { height: 1, backgroundColor: palette.cardDivider },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18, paddingBottom: 20 },
    reorderWrap: { flexDirection: 'row', gap: 4 },
    reorderBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: palette.reorderBg, borderWidth: 1, borderColor: palette.reorderBorder, justifyContent: 'center', alignItems: 'center' },
    reorderBtnDisabled: { opacity: 0.3 },
    actionWrap: { flexDirection: 'row', gap: 6 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 12, borderRadius: 8, backgroundColor: palette.editBg },
    editBtnText: { fontSize: 12, fontWeight: '600', color: palette.editText, fontFamily: FONT },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 12, borderRadius: 8, backgroundColor: palette.deleteBg },
    deleteBtnText: { fontSize: 12, fontWeight: '600', color: palette.deleteText, fontFamily: FONT },
    addBtn: {
      marginHorizontal: 12,
      marginTop: 8,
      height: 52,
      borderRadius: 18,
      backgroundColor: palette.addBg,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    addBtnText: { fontSize: 15, fontWeight: '700', color: palette.addText, fontFamily: FONT },
    footer: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 18, borderTopWidth: 1, borderTopColor: palette.sheetBorder },
    saveOrderBtn: { height: 48, borderRadius: 12, backgroundColor: palette.valGreen, justifyContent: 'center', alignItems: 'center' },
    saveOrderBtnDisabled: { opacity: 0.6 },
    saveOrderText: { fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: FONT },
  });
}
