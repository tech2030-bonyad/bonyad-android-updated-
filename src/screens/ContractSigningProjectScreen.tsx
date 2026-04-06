/**
 * ContractSigningProjectScreen
 * 
 * Screen for displaying contract signing status based on Figma designs.
 * Shows different UI based on user persona:
 * - User/Homeowner: Can view contract details, download PDF, and send to email for signature
 * - Technician: Can view contract details and download PDF
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTopPadding } from '../utils/statusBarHelper';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import ContractViewerModal from './ContractViewerModal';

// ===== DESIGN TOKENS FROM FIGMA =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary50: '#1A6DB4',
  primary20: '#B3CEE6',
  primary10: '#E6EFF7',
  // Greens
  green90: '#007B36',
  green80: '#008B3E',
  green70: '#009C47',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  // Purple
  purple100: '#3C076D',
  purple70: '#5E0BA1',
  purple60: '#6A0DAD',
  purple10: '#EFE6F5',
  // Amber
  amber70: '#DA9C02',
  amber60: '#FFB703',
  amber10: '#FFF2CF',
  // Text
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  // Backgrounds
  bgWhite: '#FFFFFF',
};

interface Phase {
  id: number;
  phaseNumber: number;
  title?: string;
  description: string;
  moneySpent: number;
  timeSpentDays: number;
  status?: string;
  approved?: boolean;
  completed?: boolean;
}

interface Project {
  id: number;
  description: string;
  status: string;
  budget: number;
  address?: string;
  createdAt: string;
  serviceNameEn?: string;
  serviceNameAr?: string;
  technicianName?: string;
  technicianId?: number;
  userName?: string;
  acceptedBid?: {
    technicianName?: string;
    technicianId?: number;
    amount?: number;
  };
  phases?: Phase[];
  startDate?: string;
  completionDate?: string;
  contractNumber?: string;
}

interface ContractSigningProjectScreenProps {
  project: Project;
  onBack: () => void;
  onSuccess?: () => void;
  onViewContract?: () => void;
  isTechnician?: boolean;
}

export default function ContractSigningProjectScreen({
  project,
  onBack,
  onSuccess,
  onViewContract,
  isTechnician: propIsTechnician,
}: ContractSigningProjectScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const c = useMemo(() => ({
    ...COLORS,
    bgWhite: colors.cardBackground,
    textHeader: colors.text,
    textBody: colors.text,
    textSecondary: colors.textSecondary,
    textDividers: colors.border,
    primary10: colors.primary + '20',
    primary60: colors.primary,
    primary70: colors.primary,
    textWhite: colors.white,
    green60: colors.success,
    green70: colors.success,
    purple10: colors.cardBackground,
    purple60: colors.primary,
    purple70: colors.primary,
    amber10: colors.warning + '25',
    amber60: colors.warning,
  }), [colors]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTechnician, setIsTechnician] = useState(propIsTechnician ?? false);
  const [showContractModal, setShowContractModal] = useState(false);
  
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  
  const serviceName = i18n.language === 'ar' ? project?.serviceNameAr : project?.serviceNameEn;
  const isArabic = i18n.language?.startsWith('ar');

  // Get technician info from project or accepted bid
  const technicianName = project?.technicianName || 
    project?.acceptedBid?.technicianName || 
    t('Service Provider');
  
  const technicianId = project?.technicianId || 
    project?.acceptedBid?.technicianId;

  // Calculate total from phases or use budget
  const totalAmount = phases.length > 0 
    ? phases.reduce((sum, p) => sum + (p.moneySpent || 0), 0) 
    : project?.budget || project?.acceptedBid?.amount || 0;

  // Format dates
  const formatDate = (dateString?: string) => {
    if (!dateString) return t('To be determined');
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Contract number (use project id if not available)
  const contractNumber = project?.contractNumber || `#${project?.id}`;

  useEffect(() => {
    loadData();
  }, [project]);

  const loadData = async () => {
    if (!project?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Check user role if not provided
      if (propIsTechnician === undefined) {
        const role = await storage.getUserRole();
        const isTech = role?.toUpperCase() === 'TECHNICIAN';
        setIsTechnician(isTech);
      }
      
      // Load phases
      await loadPhases();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhases = async () => {
    if (!project?.id) return;
    
    try {
      const token = await storage.getAuthToken();
      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, { projectId: project.id });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPhases(data);
      }
    } catch (error) {
      console.error('Error loading phases:', error);
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadContract = () => {
    if (onViewContract) {
      onViewContract();
    } else {
      setShowContractModal(true);
    }
  };

  const styles = useMemo(() => makeStyles(c), [c]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bgWhite, paddingTop: getTopPadding(insets) }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.primary60} />
          <Text style={[styles.loadingText, { fontSize: scaledSize(14) }]}>{t('Loading...')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bgWhite, paddingTop: IS_LARGE_WEB ? 0 : getTopPadding(insets) }]}>
      {/* Header - Hidden on large web */}
      {!IS_LARGE_WEB && (
      <View style={[styles.header, isArabic ? styles.headerRTL : styles.headerLTR]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <BackArrowIonicons variant="chevron" size={24} color={c.textHeader} forceLtrLayout={!isArabic} />
        </TouchableOpacity>
        <View style={[styles.headerTitleContainer]}>
          <Text style={[styles.headerTitle, { fontSize: scaledSize(20) }]}>
            {serviceName || project?.description?.substring(0, 30) || t('Project')}
          </Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaledSize(14) }]}>
              {t('Contract Signing')}
          </Text>
        </View>
      </View>
      )}
      
      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          IS_LARGE_WEB && styles.webContent,
        ]}
      >
        {/* Title Section - Large Web */}
        {IS_LARGE_WEB && (
          <View style={[styles.titleSectionLargeWeb, isArabic ? styles.headerRTL : styles.headerLTR]}>
            <TouchableOpacity onPress={onBack} style={styles.titleBackButton}>
              <BackArrowIonicons variant="chevron" size={24} color={c.textHeader} forceLtrLayout={!isArabic} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.titleMainText, { fontSize: scaledSize(42) }]}>
                {serviceName || project?.description?.substring(0, 30) || t('Project')}
              </Text>
              <Text style={[styles.titleSubtext, { fontSize: scaledSize(20) }]}>
                {t('Contract Signing')}
              </Text>
            </View>
          </View>
        )}
        
        {/* Status Stepper */}
        <View style={[styles.stepperContainer, IS_LARGE_WEB && styles.stepperContainerLargeWeb]}>
          <ProjectCreationFlow currentStep="CONTRACT_SIGNING" />
        </View>
        
        {/* Divider */}
        <View style={[styles.divider, IS_LARGE_WEB && styles.dividerLargeWeb]} />
        {/* Contract Ready Badge */}
        <View style={[styles.badgeContainer]}>
          <View style={styles.contractReadyBadge}>
            <Text style={styles.contractReadyText}>{t('Contract Ready')}</Text>
          </View>
        </View>

        {/* Contract Signing Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle]}>
            {t('Contract Signing')}
          </Text>
          <Text style={[styles.sectionDescription]}>
            {isTechnician 
              ? t('Review the contract details below.')
              : t('Review the contract details below. Contract signing links have been sent to your email.')
            }
          </Text>
        </View>

        {/* Contract Details Card */}
        <View style={styles.contractCard}>
          {/* Contract Header */}
          <TouchableOpacity 
            style={[styles.contractHeader]}
            onPress={handleDownloadContract}
            activeOpacity={0.7}
          >
            <View style={styles.contractIconContainer}>
              <Ionicons name="document-text-outline" size={24} color={c.purple60} />
            </View>
            <View style={[styles.contractHeaderInfo]}>
              <Text style={[styles.contractTitle]}>
                {t('Service Agreement')}
              </Text>
              <Text style={[styles.contractSubtitle]}>
                {t('Contract')} {contractNumber}
              </Text>
            </View>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={c.textSecondary} 
            />
          </TouchableOpacity>

          {/* Contract Details */}
          <View style={styles.contractDetails}>
            {/* Provider */}
            <View style={[styles.detailRow]}>
              <Text style={[styles.detailLabel]}>
                {t('Provider')}
              </Text>
              <Text style={[styles.detailValue]}>
                {technicianName}
              </Text>
            </View>
            <View style={styles.detailDivider} />

            {/* Project */}
            <View style={[styles.detailRow]}>
              <Text style={[styles.detailLabel]}>
                {t('Project')}
              </Text>
              <Text style={[styles.detailValue]} numberOfLines={1}>
                {serviceName || project?.description?.substring(0, 30) || t('Project')}
              </Text>
            </View>
            <View style={styles.detailDivider} />

            {/* Total Amount */}
            <View style={[styles.detailRow]}>
              <Text style={[styles.detailLabel]}>
                {t('Total Amount')}
              </Text>
              <Text style={[styles.detailValueGreen]}>
                {formatBudget(totalAmount)} {t('SAR')}
              </Text>
            </View>
            <View style={styles.detailDivider} />

            {/* Start Date */}
            <View style={[styles.detailRow]}>
              <Text style={[styles.detailLabel]}>
                {t('Start Date')}
              </Text>
              <Text style={[styles.detailValue]}>
                {formatDate(project?.startDate)}
              </Text>
            </View>
            <View style={styles.detailDivider} />

            {/* Completion Date */}
            <View style={[styles.detailRow]}>
              <Text style={[styles.detailLabel]}>
                {t('Completion Date')}
              </Text>
              <Text style={[styles.detailValue]}>
                {formatDate(project?.completionDate)}
              </Text>
            </View>
          </View>

          {/* Download Contract Button */}
          <View style={styles.downloadButtonContainer}>
            <TouchableOpacity 
              style={[styles.downloadButton]}
              onPress={handleDownloadContract}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={20} color={c.primary70} />
              <Text style={styles.downloadButtonText}>
                {t('Download Contract (PDF)')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Email Signature Notice - User Only */}
        {!isTechnician && (
          <View style={[styles.emailNotice]}>
            <View style={styles.emailIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={24} color={c.green60} />
            </View>
            <View style={[styles.emailNoticeContent]}>
              <Text style={[styles.emailNoticeTitle]}>
                {t('Contract Sent for Signature')}
              </Text>
              <Text style={[styles.emailNoticeDescription]}>
                {t('Contract signing links have been sent to your email address. Please check your inbox to digitally sign the contract.')}
              </Text>
            </View>
          </View>
        )}
        
        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 50 }} />
      </ScrollView>

      {/* Contract Viewer Modal */}
      {project && (
        <ContractViewerModal
          visible={showContractModal}
          projectId={project.id}
          projectDetails={{
            description: project.description,
            budget: totalAmount,
            address: project.address,
            technicianName: technicianName,
            technicianId: technicianId,
            userName: project.userName,
          }}
          onClose={() => setShowContractModal(false)}
          isTechnician={isTechnician}
        />
      )}
    </View>
  );
}

function makeStyles(c: typeof COLORS) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  headerLTR: {
    direction: 'ltr',
  },
  headerRTL: {
    direction: 'rtl',
  },
  headerLargeWeb: {
    paddingHorizontal: 48,
    paddingVertical: 32,
    gap: 56,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonLargeWeb: {
    width: 40,
    height: 40,
  },
  headerTitleContainer: {
    flex: 1,
    gap: 6,
  },
  headerTitleContainerLargeWeb: {
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.textHeader,
  },
  headerTitleLargeWeb: {
    fontSize: 34,
    fontWeight: '400',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: c.textSecondary,
  },
  headerSubtitleLargeWeb: {
    fontSize: 16,
  },
  stepperContainer: {
    paddingHorizontal: 16,
  },
  stepperContainerLargeWeb: {
    paddingHorizontal: 48,
    paddingTop: 8,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: c.textDividers,
    marginHorizontal: 16,
    marginTop: 8,
  },
  dividerLargeWeb: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  webContent: {
    width: '100%',
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: c.textSecondary,
  },
  // Contract Ready Badge
  badgeContainer: {
    alignItems: 'flex-start',
  },
  contractReadyBadge: {
    backgroundColor: c.purple10,
    borderWidth: 0.5,
    borderColor: c.purple70,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  contractReadyText: {
    fontSize: 12,
    fontWeight: '400',
    color: c.purple70,
  },
  // Section
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: c.textHeader,
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: c.textBody,
    lineHeight: 21,
  },
  // Contract Card
  contractCard: {
    borderWidth: 0.5,
    borderColor: c.textDividers,
    borderRadius: 6,
    backgroundColor: c.bgWhite,
    overflow: 'hidden',
  },
  contractHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 24,
  },
  contractIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: c.purple10,
    borderWidth: 0.5,
    borderColor: c.purple60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractHeaderInfo: {
    flex: 1,
    gap: 6,
  },
  contractTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textHeader,
  },
  contractSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: c.textSecondary,
  },
  contractDetails: {
    padding: 16,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '400',
    color: c.textBody,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  detailValueGreen: {
    fontSize: 14,
    fontWeight: '400',
    color: c.green70,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  detailDivider: {
    height: 1,
    backgroundColor: c.textDividers,
  },
  downloadButtonContainer: {
    padding: 16,
    paddingTop: 0,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary10,
    borderWidth: 0.5,
    borderColor: c.primary70,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: c.primary70,
  },
  // Email Notice
  emailNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderWidth: 0.5,
    borderColor: c.amber60,
    borderRadius: 6,
    gap: 16,
    backgroundColor: c.bgWhite,
  },
  // Title Section - Large Web (Figma Design)
  titleSectionLargeWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 48,
    paddingTop: 24,
    paddingBottom: 0,
  },
  titleBackButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    gap: 8,
  },
  titleMainText: {
    fontSize: 42,
    fontWeight: '700',
    color: c.textHeader,
    lineHeight: 42,
  },
  titleSubtext: {
    fontSize: 20,
    fontWeight: '300',
    color: c.textSecondary,
    lineHeight: 20,
  },
  emailIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: c.amber10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailNoticeContent: {
    flex: 1,
    gap: 16,
  },
  emailNoticeTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: c.textBody,
  },
  emailNoticeDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: c.textSecondary,
    lineHeight: 21,
  },
  });
}
