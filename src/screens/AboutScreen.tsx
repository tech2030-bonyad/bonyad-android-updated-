import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRTL } from '../hooks/useRTL';

interface AboutScreenProps {
  onBack?: () => void;
}

export default function AboutScreen({ onBack }: AboutScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const { arrowBackIcon } = useRTL();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name={arrowBackIcon} size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(20) }]}>{t('About Bonyad')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text, fontSize: scaledSize(24) }]}>{t('Empowering Service Excellence')}</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
            {t('about.description')}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(20) }]}>{t('What We Offer')}</Text>
          <View style={styles.listItem}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={[styles.listText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Verified technicians with proven expertise')}</Text>
          </View>
          <View style={styles.listItem}>
            <Ionicons name="grid-outline" size={20} color={colors.primary} />
            <Text style={[styles.listText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Wide coverage across home, commercial, and industrial services')}</Text>
          </View>
          <View style={styles.listItem}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={[styles.listText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('Real-time project tracking and transparent communication')}</Text>
          </View>
          <View style={styles.listItem}>
            <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
            <Text style={[styles.listText, { color: colors.text, fontSize: scaledSize(16) }]}>{t('AI-powered assistance to scope, price, and plan projects')}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(20) }]}>{t('Why Bonyad')}</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary, fontSize: scaledSize(16) }]}>
            {t('about.whyBonyad')}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: scaledSize(20) }]}>{t('Our Values')}</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.valueLabel, { color: colors.primary, fontSize: scaledSize(14) }]}>{t('Trust')}</Text>
            <Text style={[styles.valueText, { color: colors.textSecondary, fontSize: scaledSize(15) }]}>{t('Every technician is vetted to ensure dependable results')}</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={[styles.valueLabel, { color: colors.primary, fontSize: scaledSize(14) }]}>{t('Innovation')}</Text>
            <Text style={[styles.valueText, { color: colors.textSecondary, fontSize: scaledSize(15) }]}>{t('We integrate AI experiences to speed up every step')}</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={[styles.valueLabel, { color: colors.primary, fontSize: scaledSize(14) }]}>{t('Community')}</Text>
            <Text style={[styles.valueText, { color: colors.textSecondary, fontSize: scaledSize(15) }]}>{t('We uplift technicians and empower customers to build confidently')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 0,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  listText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  valueRow: {
    gap: 6,
  },
  valueLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  valueText: {
    fontSize: 15,
    lineHeight: 22,
  },
});

