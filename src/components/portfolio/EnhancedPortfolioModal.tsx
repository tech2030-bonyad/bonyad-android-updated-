import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFontFamily } from '../../context/FontContext';
import {
  updateEnhancedPortfolio,
  EnhancedPortfolioData,
} from '../../services/PortfolioService';

const COLORS = {
  primaryBlue: '#2563EB',
  darkText: '#0F172A',
  mediumGray: '#64748B',
  lightGray: '#94A3B8',
  lightBackground: '#F8FAFC',
  borderGray: '#F1F5F9',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.5)',
  red: '#DC2626',
};

interface EnhancedPortfolioModalProps {
  visible: boolean;
  portfolioId: number;
  initialData?: EnhancedPortfolioData;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EnhancedPortfolioModal({
  visible,
  portfolioId,
  initialData,
  onClose,
  onSuccess,
}: EnhancedPortfolioModalProps) {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontFamily, boldFontFamily } = useFontFamily();

  const isDark = theme === 'dark';
  const fontStyle = { fontFamily: fontFamily || undefined };
  const boldStyle = { fontFamily: boldFontFamily || fontFamily || undefined };

  // State - Project Size Indicators
  const [smallProjects, setSmallProjects] = useState('');
  const [mediumProjects, setMediumProjects] = useState('');
  const [largeProjects, setLargeProjects] = useState('');

  // State - Price Ranges
  const [residentialRange, setResidentialRange] = useState('');
  const [commercialRange, setCommercialRange] = useState('');
  const [industrialRange, setIndustrialRange] = useState('');

  // State - Employee Counts
  const [fullTimeCount, setFullTimeCount] = useState('');
  const [contractorsCount, setContractorsCount] = useState('');
  const [partTimeCount, setPartTimeCount] = useState('');

  // State - Certifications
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCertification, setNewCertification] = useState('');

  // State - License & URL
  const [licenseNumber, setLicenseNumber] = useState('');
  const [publicPortfolioUrl, setPublicPortfolioUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load initial data
  useEffect(() => {
    if (visible && initialData) {
      setSmallProjects(initialData.projectSizeIndicators?.small?.toString() || '');
      setMediumProjects(initialData.projectSizeIndicators?.medium?.toString() || '');
      setLargeProjects(initialData.projectSizeIndicators?.large?.toString() || '');

      setResidentialRange(initialData.priceRanges?.residential || '');
      setCommercialRange(initialData.priceRanges?.commercial || '');
      setIndustrialRange(initialData.priceRanges?.industrial || '');

      setFullTimeCount(initialData.employeeCounts?.fullTime?.toString() || '');
      setContractorsCount(initialData.employeeCounts?.contractors?.toString() || '');
      setPartTimeCount(initialData.employeeCounts?.partTime?.toString() || '');

      setCertifications(initialData.certifications || []);
      setLicenseNumber(initialData.licenseNumber || '');
      setPublicPortfolioUrl(initialData.publicPortfolioUrl || '');
    }
  }, [visible, initialData]);

  const handleAddCertification = () => {
    if (newCertification.trim()) {
      setCertifications([...certifications, newCertification.trim()]);
      setNewCertification('');
    }
  };

  const handleRemoveCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const data: EnhancedPortfolioData = {};

      // Project Size Indicators
      if (smallProjects || mediumProjects || largeProjects) {
        data.projectSizeIndicators = {
          small: smallProjects ? parseInt(smallProjects) : undefined,
          medium: mediumProjects ? parseInt(mediumProjects) : undefined,
          large: largeProjects ? parseInt(largeProjects) : undefined,
        };
      }

      // Price Ranges
      if (residentialRange || commercialRange || industrialRange) {
        data.priceRanges = {
          residential: residentialRange || undefined,
          commercial: commercialRange || undefined,
          industrial: industrialRange || undefined,
        };
      }

      // Employee Counts
      if (fullTimeCount || contractorsCount || partTimeCount) {
        data.employeeCounts = {
          fullTime: fullTimeCount ? parseInt(fullTimeCount) : undefined,
          contractors: contractorsCount ? parseInt(contractorsCount) : undefined,
          partTime: partTimeCount ? parseInt(partTimeCount) : undefined,
        };
      }

      // Certifications
      if (certifications.length > 0) {
        data.certifications = certifications;
      }

      // License Number
      if (licenseNumber.trim()) {
        data.licenseNumber = licenseNumber.trim();
      }

      // Public Portfolio URL
      if (publicPortfolioUrl.trim()) {
        data.publicPortfolioUrl = publicPortfolioUrl.trim();
      }

      await updateEnhancedPortfolio(portfolioId, data);

      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);
    } catch (error: any) {
      console.error('Error updating portfolio:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const bgColor = isDark ? '#1a1a1a' : COLORS.lightBackground;
  const textColor = isDark ? '#ffffff' : COLORS.darkText;
  const secondaryText = isDark ? '#a0a0a0' : COLORS.mediumGray;
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : COLORS.borderGray;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: bgColor,
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="briefcase" size={24} color={COLORS.primaryBlue} />
              </View>
              <View>
                <Text style={[styles.headerTitle, boldStyle, { color: textColor }]}>
                  {t('Enhanced Portfolio')}
                </Text>
                <Text style={[styles.headerSubtitle, fontStyle, { color: secondaryText }]}>
                  {t('Showcase your expertise')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
              <Ionicons name="close" size={28} color={textColor} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Project Size Indicators */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, boldStyle, { color: textColor }]}>
                {t('Project Size Indicators')}
              </Text>
              <Text style={[styles.sectionHint, fontStyle, { color: secondaryText }]}>
                {t('Number of projects completed by size')}
              </Text>
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, fontStyle, { color: secondaryText }]}>{t('Small')}</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: textColor,
                        borderColor: borderColor,
                        backgroundColor: colors.cardBackground,
                        ...fontStyle,
                      },
                    ]}
                    value={smallProjects}
                    onChangeText={setSmallProjects}
                    placeholder="0"
                    placeholderTextColor={secondaryText}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, fontStyle, { color: secondaryText }]}>{t('Medium')}</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: textColor,
                        borderColor: borderColor,
                        backgroundColor: colors.cardBackground,
                        ...fontStyle,
                      },
                    ]}
                    value={mediumProjects}
                    onChangeText={setMediumProjects}
                    placeholder="0"
                    placeholderTextColor={secondaryText}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, fontStyle, { color: secondaryText }]}>{t('Large')}</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: textColor,
                        borderColor: borderColor,
                        backgroundColor: colors.cardBackground,
                        ...fontStyle,
                      },
                    ]}
                    value={largeProjects}
                    onChangeText={setLargeProjects}
                    placeholder="0"
                    placeholderTextColor={secondaryText}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Price Ranges */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, boldStyle, { color: textColor }]}>
                {t('Price Ranges')}
              </Text>
              <Text style={[styles.sectionHint, fontStyle, { color: secondaryText }]}>
                {t('Typical price ranges for different project types')}
              </Text>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, fontStyle, { color: secondaryText }]}>
                  {t('Residential')}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: textColor,
                      borderColor: borderColor,
                      backgroundColor: colors.cardBackground,
                      ...fontStyle,
                    },
                  ]}
                  value={residentialRange}
                  onChangeText={setResidentialRange}
                  placeholder={t('e.g., 5000-20000 SAR')}
                  placeholderTextColor={secondaryText}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, fontStyle, { color: secondaryText }]}>
                  {t('Commercial')}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: textColor,
                      borderColor: borderColor,
                      backgroundColor: colors.cardBackground,
                      ...fontStyle,
                    },
                  ]}
                  value={commercialRange}
                  onChangeText={setCommercialRange}
                  placeholder={t('e.g., 20000-100000 SAR')}
                  placeholderTextColor={secondaryText}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, fontStyle, { color: secondaryText }]}>
                  {t('Industrial')}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: textColor,
                      borderColor: borderColor,
                      backgroundColor: colors.cardBackground,
                      ...fontStyle,
                    },
                  ]}
                  value={industrialRange}
                  onChangeText={setIndustrialRange}
                  placeholder={t('e.g., 50000-500000 SAR')}
                  placeholderTextColor={secondaryText}
                />
              </View>
            </View>

            {/* Employee Counts */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, boldStyle, { color: textColor }]}>
                {t('Team Size')}
              </Text>
              <Text style={[styles.sectionHint, fontStyle, { color: secondaryText }]}>
                {t('Number of employees by type')}
              </Text>
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, fontStyle, { color: secondaryText }]}>
                    {t('Full-Time')}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: textColor,
                        borderColor: borderColor,
                        backgroundColor: colors.cardBackground,
                        ...fontStyle,
                      },
                    ]}
                    value={fullTimeCount}
                    onChangeText={setFullTimeCount}
                    placeholder="0"
                    placeholderTextColor={secondaryText}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, fontStyle, { color: secondaryText }]}>
                    {t('Contractors')}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: textColor,
                        borderColor: borderColor,
                        backgroundColor: colors.cardBackground,
                        ...fontStyle,
                      },
                    ]}
                    value={contractorsCount}
                    onChangeText={setContractorsCount}
                    placeholder="0"
                    placeholderTextColor={secondaryText}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, fontStyle, { color: secondaryText }]}>
                    {t('Part-Time')}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: textColor,
                        borderColor: borderColor,
                        backgroundColor: colors.cardBackground,
                        ...fontStyle,
                      },
                    ]}
                    value={partTimeCount}
                    onChangeText={setPartTimeCount}
                    placeholder="0"
                    placeholderTextColor={secondaryText}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Certifications */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, boldStyle, { color: textColor }]}>
                {t('Certifications')}
              </Text>
              <View style={styles.inputWithButton}>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.certificationInput,
                    {
                      color: textColor,
                      borderColor: borderColor,
                      backgroundColor: colors.cardBackground,
                      ...fontStyle,
                    },
                  ]}
                  value={newCertification}
                  onChangeText={setNewCertification}
                  placeholder={t('e.g., ISO 9001')}
                  placeholderTextColor={secondaryText}
                  onSubmitEditing={handleAddCertification}
                />
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: COLORS.primaryBlue }]}
                  onPress={handleAddCertification}
                >
                  <Ionicons name="add" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              {certifications.map((cert, index) => (
                <View
                  key={index}
                  style={[
                    styles.certificationChip,
                    {
                      backgroundColor: borderColor,
                      borderColor: borderColor,
                    },
                  ]}
                >
                  <Text style={[styles.certificationText, fontStyle, { color: textColor }]}>
                    {cert}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveCertification(index)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* License Number */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, boldStyle, { color: textColor }]}>
                {t('License Number')}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: textColor,
                    borderColor: borderColor,
                    backgroundColor: colors.cardBackground,
                    ...fontStyle,
                  },
                ]}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder={t('e.g., CR-12345678')}
                placeholderTextColor={secondaryText}
              />
            </View>

            {/* Public Portfolio URL */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, boldStyle, { color: textColor }]}>
                {t('Public Portfolio URL')}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: textColor,
                    borderColor: borderColor,
                    backgroundColor: colors.cardBackground,
                    ...fontStyle,
                  },
                ]}
                value={publicPortfolioUrl}
                onChangeText={setPublicPortfolioUrl}
                placeholder={t('e.g., https://portfolio.example.com')}
                placeholderTextColor={secondaryText}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: borderColor },
              ]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={[boldStyle, { color: textColor }]}>
                {t('Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: COLORS.primaryBlue },
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                  <Text style={[boldStyle, { color: COLORS.white, marginLeft: 8 }]}>
                    {t('Save Changes')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primaryBlue}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.darkText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.mediumGray,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkText,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.mediumGray,
    marginTop: -8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.mediumGray,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.darkText,
    backgroundColor: COLORS.white,
  },
  inputWithButton: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  certificationInput: {
    flex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primaryBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certificationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderGray,
    backgroundColor: COLORS.borderGray,
    marginTop: 8,
  },
  certificationText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.darkText,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderGray,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryBlue,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});
