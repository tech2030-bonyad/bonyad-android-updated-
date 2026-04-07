/**
 * SOWProjectCard – displays a project suggestion (Statement of Work) from the chatbot.
 * Port of iOS SOWProjectCard: animated card with project details and "Add to My Projects" button.
 * Calls POST /projects/create-from-sow to create the project directly.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import type { SOWDocument } from '../types/chat';

interface SOWProjectCardProps {
  sow: SOWDocument;
  onProjectCreated?: (projectId: number) => void;
  onDismiss?: () => void;
}

export default function SOWProjectCard({ sow, onProjectCreated, onDismiss }: SOWProjectCardProps) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const { fontFamily, boldFontFamily } = useFontFamily();
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Animations
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, tension: 200, friction: 15, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const handleCreateProject = async () => {
    if (isCreating || isCreated) return;
    setIsCreating(true);
    try {
      const token = await storage.getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const body = {
        title: sow.projectTitle || 'New Project',
        description: sow.projectDescription || sow.scopeOfWork?.join('. ') || '',
        projectType: sow.projectType,
        propertyType: sow.propertyType,
        location: sow.location,
        budgetMin: sow.budgetMin ?? sow.grandTotal,
        budgetMax: sow.budgetMax ?? sow.grandTotal,
        durationDays: sow.durationDays,
        workDisciplines: sow.workDisciplines,
        milestones: sow.milestones,
        materials: sow.materials,
        scopeOfWork: sow.scopeOfWork,
      };

      const res = await fetch(buildApiUrl('/projects/create-from-sow'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `Failed: ${res.status}`);
      }

      const data = await res.json();
      const projectId = data.id || data.projectId;
      setIsCreated(true);

      // Success animation
      Animated.spring(successScale, { toValue: 1, tension: 300, friction: 12, useNativeDriver: true }).start();

      onProjectCreated?.(projectId);
    } catch (error: any) {
      Alert.alert(t('Error'), error.message || t('Failed to create project'));
    } finally {
      setIsCreating(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return `${amount.toLocaleString()} SAR`;
  };

  return (
    <Animated.View style={[styles.container, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
      <LinearGradient
        colors={isDark ? ['#1A2744', '#1E3050'] : ['#F0F7FF', '#E8F2FE']}
        style={[styles.card, isDark && { borderColor: 'rgba(0,165,244,0.2)' }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(0,165,244,0.12)' }]}>
            <Ionicons name="document-text" size={24} color="#00A5F4" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text, fontFamily: boldFontFamily }]} numberOfLines={2}>
              {sow.projectTitle || t('Project Suggestion')}
            </Text>
            {sow.projectType && (
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily }]}>{sow.projectType}</Text>
            )}
          </View>
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss} hitSlop={12}>
              <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Grand Total Banner */}
        {sow.grandTotal != null && sow.grandTotal > 0 && (
          <LinearGradient
            colors={['#00A5F4', '#0078C8']}
            style={styles.totalBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.totalLabel, { fontFamily }]}>{t('Estimated Total')}</Text>
            <Text style={[styles.totalAmount, { fontFamily: boldFontFamily }]}>{formatCurrency(sow.grandTotal)}</Text>
          </LinearGradient>
        )}

        {/* Description */}
        {sow.projectDescription && (
          <Text style={[styles.description, { color: colors.text, fontFamily }]} numberOfLines={expanded ? undefined : 3}>
            {sow.projectDescription}
          </Text>
        )}

        {/* Expandable details */}
        <TouchableOpacity
          style={styles.expandRow}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <Text style={[styles.expandText, { color: '#00A5F4', fontFamily: boldFontFamily }]}>
            {expanded ? t('Show Less') : t('Show Details')}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#00A5F4" />
        </TouchableOpacity>

        {expanded && (
          <View style={styles.detailsWrap}>
            {/* Location */}
            {sow.location && (
              <View style={styles.detailRow}>
                <Ionicons name="location" size={16} color="#FF9500" />
                <Text style={[styles.detailText, { color: colors.text, fontFamily }]}>{sow.location}</Text>
              </View>
            )}
            {/* Timeline */}
            {sow.timeline && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar" size={16} color="#34C759" />
                <Text style={[styles.detailText, { color: colors.text, fontFamily }]}>{sow.timeline}</Text>
              </View>
            )}
            {/* Scope of Work */}
            {sow.scopeOfWork && sow.scopeOfWork.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text, fontFamily: boldFontFamily }]}>{t('Scope of Work')}</Text>
                {sow.scopeOfWork.map((item, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={[styles.bullet, { color: '#00A5F4' }]}>•</Text>
                    <Text style={[styles.bulletText, { color: colors.textSecondary, fontFamily }]}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
            {/* Milestones */}
            {sow.milestones && sow.milestones.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text, fontFamily: boldFontFamily }]}>{t('Milestones')}</Text>
                {sow.milestones.map((m, i) => (
                  <View key={i} style={styles.milestoneRow}>
                    <View style={[styles.milestoneNum, { backgroundColor: 'rgba(0,165,244,0.12)' }]}>
                      <Text style={[styles.milestoneNumText, { color: '#00A5F4', fontFamily: boldFontFamily }]}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.milestoneTitle, { color: colors.text, fontFamily: boldFontFamily }]}>{m.title}</Text>
                      {m.amount != null && (
                        <Text style={[styles.milestoneAmount, { color: colors.textSecondary, fontFamily }]}>{formatCurrency(m.amount)}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Action Button */}
        {isCreated ? (
          <Animated.View style={[styles.successWrap, { transform: [{ scale: successScale }] }]}>
            <Ionicons name="checkmark-circle" size={24} color="#34C759" />
            <Text style={[styles.successText, { fontFamily: boldFontFamily }]}>{t('Added to My Projects!')}</Text>
          </Animated.View>
        ) : (
          <TouchableOpacity
            style={[styles.addButton, isCreating && { opacity: 0.7 }]}
            onPress={handleCreateProject}
            disabled={isCreating}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#00A5F4', '#0078C8']}
              style={styles.addButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Feather name="plus-circle" size={18} color="#FFF" />
                  <Text style={[styles.addButtonText, { fontFamily: boldFontFamily }]}>{t('Add to My Projects')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8, marginHorizontal: 4 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,165,244,0.15)',
    overflow: 'hidden',
    padding: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  totalBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  totalAmount: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  description: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  expandRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  expandText: { fontSize: 13, fontWeight: '600' },
  detailsWrap: { gap: 10, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, flex: 1 },
  detailSection: { gap: 6 },
  detailSectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  bulletRow: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
  bullet: { fontSize: 14, fontWeight: '700' },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 18 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  milestoneNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  milestoneNumText: { fontSize: 12, fontWeight: '800' },
  milestoneTitle: { fontSize: 13, fontWeight: '600' },
  milestoneAmount: { fontSize: 12, marginTop: 1 },
  addButton: { borderRadius: 14, overflow: 'hidden' },
  addButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  successWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  successText: { color: '#34C759', fontSize: 15, fontWeight: '700' },
});
