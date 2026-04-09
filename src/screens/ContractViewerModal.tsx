import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  TextInput,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrlWithParams, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import { formatMessageTime } from '../utils/chatUtils';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { showError } from '../utils/alert';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import Pdf from 'react-native-pdf';
import { WebView } from 'react-native-webview';

// Streaming letter-by-letter text animation
const StreamingText = ({ text, color, fontSize = 15 }: { text: string; color: string; fontSize?: number }) => {
  const [visibleCount, setVisibleCount] = useState(0);
  const cursorOpacity = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    setVisibleCount(0);
    const interval = setInterval(() => {
      setVisibleCount(prev => {
        if (prev >= text.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [text]);

  useEffect(() => {
    const blink = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(cursorOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        RNAnimated.timing(cursorOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  return (
    <Text style={{ color, fontSize, fontWeight: '500' }}>
      {text.substring(0, visibleCount)}
      <RNAnimated.Text style={{ opacity: cursorOpacity, color }}>|</RNAnimated.Text>
    </Text>
  );
};

interface ContractViewerModalProps {
  visible: boolean;
  projectId: number;
  phases?: Phase[];
  projectDetails?: {
    description: string;
    budget: number;
    address?: string;
    technicianName?: string;
    technicianId?: number;
    userName?: string;
  };
  onClose: () => void;
  isTechnician?: boolean;
}

interface Phase {
  id: number;
  phaseNumber: number;
  description: string;
  timeSpentDays: number;
  moneySpent: number;
  approved: boolean;
  completed: boolean;
}

export default function ContractViewerModal({
  visible,
  projectId,
  phases: providedPhases,
  projectDetails: providedProjectDetails,
  onClose,
  isTechnician: providedIsTechnician,
}: ContractViewerModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const [isLoading, setIsLoading] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [phases, setPhases] = useState<Phase[]>(providedPhases || []);
  const [projectDetails, setProjectDetails] = useState(providedProjectDetails);
  const [isTechnician, setIsTechnician] = useState(providedIsTechnician || false);
  const { alertState, hideAlert } = useAlertPopup();

  useEffect(() => {
    if (visible && projectId) {
      // If phases and project details not provided, fetch them
      if (!providedPhases || !providedProjectDetails) {
        loadProjectData();
      }

      // Determine user role if not provided
      if (providedIsTechnician === undefined) {
        checkUserRole();
      }
    }
  }, [visible, projectId]);


  const checkUserRole = async () => {
    try {
      const userRole = await storage.getUserRole();
      setIsTechnician(userRole === 'technician');
    } catch (error) {
      console.log('Error checking user role:', error);
    }
  };

  const loadProjectData = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      if (!token) {
        console.error('❌ No auth token found');
        return;
      }

      // Load project details
      const projectUrl = buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.DETAILS, {
        id: projectId,
      });

      const projectResponse = await fetch(projectUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        console.log('✅ [ContractViewerModal] Project API response:', JSON.stringify(projectData, null, 2));
        const projectPayload = projectData?.project ?? projectData;

        const derivedTechnicianId =
          projectPayload?.technicianId ||
          projectPayload?.assignedTechnicianId ||
          projectPayload?.assignedTechnician?.id ||
          projectPayload?.technician?.id ||
          projectPayload?.acceptedBid?.technicianId ||
          null;

        const derivedTechnicianName =
          projectPayload?.technicianName ||
          projectPayload?.assignedTechnician?.name ||
          projectPayload?.technician?.name ||
          projectPayload?.acceptedBid?.technicianName ||
          '';

        setProjectDetails({
          description: projectPayload?.description || '',
          budget: projectPayload?.budget || 0,
          address: projectPayload?.address,
          technicianName: derivedTechnicianName,
          technicianId: derivedTechnicianId,
          userName: projectPayload?.userName,
        });

        if (!providedPhases && Array.isArray(projectData?.phases)) {
          setPhases(projectData.phases);
        }
      }
 
      // Load phases
      if (!providedPhases) {
        const phasesUrl = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, {
          projectId,
        });

        const phasesResponse = await fetch(phasesUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (phasesResponse.ok) {
          const phasesData = await phasesResponse.json();
          setPhases(phasesData);
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading project data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate and get PDF URL using the new API
  const getPdfUrl = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token || !projectDetails?.technicianId) {
        return null;
      }

      const url = buildApiUrl(API_ENDPOINTS.CONTRACTS.GENERATE_PDF);
      
      const formBody = new URLSearchParams({
        projectId: projectId.toString(),
        technicianId: projectDetails.technicianId.toString(),
        language: i18n.language === 'ar' ? 'AR' : 'EN',
        returnPdf: 'false',
      }).toString();

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });

      if (response.ok) {
        const data = await response.json();
        // Return full URL
        const pdfUrl = data.downloadUrl || data.pdfUrl;
        if (pdfUrl && !pdfUrl.startsWith('http')) {
          return `https://www.bonyad-hub.com${pdfUrl}`;
        }
        return pdfUrl;
      }
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
    }
    return null;
  };

  const [pdfLocalUri, setPdfLocalUri] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingText, setDownloadingText] = useState('');

  // View PDF — opens immediately in WebView (fast, no download needed)
  const viewPdfContract = async () => {
    setIsLoadingPdf(true);
    try {
      const generatedPdfUrl = await getPdfUrl();
      if (!generatedPdfUrl) {
        showError(t('Could not load PDF'), t('Error'));
        return;
      }
      setPdfUrl(generatedPdfUrl);
      setShowPdfViewer(true);
    } catch (error) {
      console.error('❌ Error opening PDF:', error);
      showError(t('Could not open PDF contract'), t('Error'));
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Download PDF — downloads to device then opens share sheet
  const downloadPdfContract = async () => {
    setIsDownloading(true);
    setDownloadingText(i18n.language === 'ar'
      ? 'جاري تحميل العقد بصيغة PDF...'
      : 'Downloading your contract PDF...');
    try {
      let url = pdfUrl;
      if (!url) {
        url = await getPdfUrl();
        if (url) setPdfUrl(url);
      }
      if (!url) {
        showError(t('Could not load PDF'), t('Error'));
        return;
      }

      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!cacheDir) {
        await Linking.openURL(url);
        return;
      }

      const fileName = `contract_${projectId}_${Date.now()}.pdf`;
      const localUri = `${cacheDir}${fileName}`;
      const token = await storage.getAuthToken();

      setDownloadingText(i18n.language === 'ar'
        ? 'جاري حفظ الملف على جهازك...'
        : 'Saving the file to your device...');

      const downloadResult = await FileSystem.downloadAsync(url, localUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (downloadResult.status !== 200) {
        console.warn('⚠️ PDF download status:', downloadResult.status);
        await Linking.openURL(url);
        return;
      }

      setPdfLocalUri(downloadResult.uri);

      setDownloadingText(i18n.language === 'ar'
        ? 'تم التحميل! جاري فتح خيارات المشاركة...'
        : 'Downloaded! Opening share options...');

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('Contract'),
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('❌ Error downloading PDF:', error);
      if (pdfUrl) {
        try { await Linking.openURL(pdfUrl); } catch {}
      }
      showError(t('Could not download PDF'), t('Error'));
    } finally {
      setIsDownloading(false);
      setDownloadingText('');
    }
  };

  // Share from PDF viewer (reuses downloaded file or downloads fresh)
  const sharePdf = async () => {
    if (!pdfUrl) return;
    try {
      let fileUri = pdfLocalUri;
      if (!fileUri) {
        const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        if (!cacheDir) { await Linking.openURL(pdfUrl); return; }
        const fileName = `contract_${projectId}_${Date.now()}.pdf`;
        const token = await storage.getAuthToken();
        const result = await FileSystem.downloadAsync(pdfUrl, `${cacheDir}${fileName}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (result.status === 200) fileUri = result.uri;
      }
      if (fileUri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: t('Contract'), UTI: 'com.adobe.pdf' });
      } else {
        await Linking.openURL(pdfUrl);
      }
    } catch { await Linking.openURL(pdfUrl); }
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US').format(budget);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(20) }]}>
              {t('Project Contract')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Contract Status */}
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: '#F59E0B20',
                  borderColor: '#F59E0B',
                },
              ]}
            >
              <View style={styles.statusRow}>
                <Ionicons name="time-outline" size={24} color="#F59E0B" />
                <Text style={[styles.statusText, { color: '#F59E0B' }]}>
                  {t('Waiting for Signatures')}
                </Text>
              </View>
            </View>

            {/* Service Agreement Card - Figma-style Header */}
            <View style={[styles.serviceAgreementCard, { backgroundColor: colors.cardBackground }]}>
              {/* Header with file icon */}
              <View style={styles.serviceAgreementHeader}>
                <View style={[styles.serviceAgreementIconContainer, { backgroundColor: '#E8F4FE' }]}>
                  <Ionicons name="document-text-outline" size={24} color="#1A73E8" />
                </View>
                <View style={styles.serviceAgreementInfo}>
                  <Text style={[styles.serviceAgreementTitle, { color: colors.text }]}>
                    {t('Service Agreement')}
                  </Text>
                  <Text style={[styles.serviceAgreementSubtitle, { color: colors.textSecondary }]}>
                    {t('Contract')} #{projectId}
                  </Text>
                </View>
                <TouchableOpacity onPress={viewPdfContract} style={styles.serviceAgreementChevron}>
                  <BackArrowIonicons variant="chevron" size={24} color={colors.textSecondary}/>
                </TouchableOpacity>
              </View>

              {/* Contract Details */}
              {projectDetails && (
                <View style={styles.contractDetailsSection}>
                  {/* Provider */}
                  <View style={[styles.contractDetailRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.contractDetailLabel, { color: colors.textSecondary }]}>
                      {t('Provider')}
                    </Text>
                    <Text style={[styles.contractDetailValue, { color: colors.text }]}>
                      {isTechnician ? projectDetails.userName : projectDetails.technicianName || t('Not assigned')}
                    </Text>
                  </View>

                  {/* Project Name */}
                  <View style={[styles.contractDetailRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.contractDetailLabel, { color: colors.textSecondary }]}>
                      {t('Project')}
                    </Text>
                    <Text style={[styles.contractDetailValue, { color: colors.text }]} numberOfLines={2}>
                      {projectDetails.description}
                    </Text>
                  </View>

                  {/* Total Amount */}
                  <View style={[styles.contractDetailRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.contractDetailLabel, { color: colors.textSecondary }]}>
                      {t('Total Amount')}
                    </Text>
                    <Text style={[styles.contractDetailValueGreen, { color: '#22C55E' }]}>
                      {formatBudget(projectDetails.budget)} {t('SAR')}
                    </Text>
                  </View>

                  {/* Start Date */}
                  <View style={[styles.contractDetailRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.contractDetailLabel, { color: colors.textSecondary }]}>
                      {t('Start Date')}
                    </Text>
                    <Text style={[styles.contractDetailValue, { color: colors.text }]}>
                      {t('To be determined')}
                    </Text>
                  </View>

                  {/* Completion Date */}
                  <View style={styles.contractDetailRowLast}>
                    <Text style={[styles.contractDetailLabel, { color: colors.textSecondary }]}>
                      {t('Completion Date')}
                    </Text>
                    <Text style={[styles.contractDetailValue, { color: colors.text }]}>
                      {phases.length > 0 
                        ? t('~{{weeks}} weeks', { weeks: Math.ceil(phases.reduce((sum, p) => sum + p.timeSpentDays, 0) / 7) }) 
                        : t('To be determined')}
                    </Text>
                  </View>
                </View>
              )}

              {/* View & Download Buttons */}
              <View style={styles.contractButtonsRow}>
                <TouchableOpacity
                  style={[styles.viewPdfButton, { backgroundColor: '#1A73E8' }]}
                  onPress={viewPdfContract}
                  disabled={isLoadingPdf || isDownloading}
                >
                  {isLoadingPdf ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="eye-outline" size={20} color="#fff" />
                      <Text style={styles.viewPdfButtonText}>{t('View PDF')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.downloadPdfButton, { borderColor: '#1A73E8' }]}
                  onPress={downloadPdfContract}
                  disabled={isLoadingPdf || isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#1A73E8" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={20} color="#1A73E8" />
                      <Text style={[styles.downloadPdfButtonText, { color: '#1A73E8' }]}>
                        {t('Download')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Streaming download status */}
              {isDownloading && downloadingText !== '' && (
                <View style={styles.downloadingStatusContainer}>
                  <StreamingText
                    text={downloadingText}
                    color={colors.primary}
                    fontSize={13}
                  />
                </View>
              )}
            </View>

            {/* Email Signature Sent Info - Figma style */}
            {!isTechnician && (
              <View style={styles.emailSignatureInfoCard}>
                <View style={[styles.emailSignatureIconContainer, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="checkmark-circle-outline" size={28} color="#059669" />
                </View>
                <View style={styles.emailSignatureInfoContent}>
                  <Text style={[styles.emailSignatureInfoTitle, { color: colors.text }]}>
                    {t('Contract Sent for Signature')}
                  </Text>
                  <Text style={[styles.emailSignatureInfoDescription, { color: colors.textSecondary }]}>
                    {t('Contract signing links have been sent to your email address. Please check your inbox to digitally sign the contract.')}
                  </Text>
                </View>
              </View>
            )}

            {/* Phases - Collapsed Section */}
            {phases.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Phases')}</Text>

                {phases.map((phase, index) => {
                  return (
                    <View key={phase.id} style={styles.phaseRow}>
                      <View style={styles.phaseHeader}>
                        <View style={styles.phaseNumberContainer}>
                          <View style={[styles.phaseNumberBadge, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.phaseNumberText, { color: colors.primary }]}>
                              {phase.phaseNumber}
                            </Text>
                          </View>
                          <Text style={[styles.phaseName, { color: colors.text }]}>
                            {phase.description}
                          </Text>
                        </View>
                        <Text style={[styles.phaseAmount, { color: colors.primary }]}> 
                          {formatBudget(phase.moneySpent)} {t('SAR')}
                        </Text>
                      </View>
                      <View style={styles.phaseMeta}> 
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.phaseMetaText, { color: colors.textSecondary }]}> 
                          {phase.timeSpentDays} {t('day_unit')}
                        </Text>
                      </View>
                      {index < phases.length - 1 && (
                        <View style={[styles.phaseDivider, { borderBottomColor: colors.border }]} />
                      )}
                    </View>
                  );
                })}

                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.text }]}>{t('Total')}:</Text>
                  <Text style={[styles.totalAmount, { color: colors.primary }]}>
                    {formatBudget(phases.reduce((sum, p) => sum + p.moneySpent, 0))} {t('SAR')}
                  </Text>
                </View>
              </View>
            )}

            {/* Terms & Conditions */}
            <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('Terms & Conditions')}
              </Text>
              <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                {t(
                  'This contract outlines the agreed-upon phases, costs, and timeline for the project. Payment will be made phase-by-phase upon completion. Both parties agree to abide by the terms specified in this document.'
                )}
              </Text>
            </View>

          </ScrollView>

        </View>
      </View>

      {/* PDF Viewer Modal */}
      <Modal
        visible={showPdfViewer}
        transparent={false}
        animationType="slide"
        onRequestClose={() => { setShowPdfViewer(false); setPdfLocalUri(null); }}
      >
        <View style={[styles.pdfModalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.pdfHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => { setShowPdfViewer(false); setPdfLocalUri(null); }}
              style={styles.pdfHeaderBackBtn}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.pdfHeaderTitle, { color: colors.text, fontSize: scaledSize(18), flex: 1 }]} numberOfLines={1}>
              {t('Contract')} #{projectId}
            </Text>
            <View style={styles.pdfHeaderActions}>
              {Platform.OS !== 'web' && (
                <>
                  <TouchableOpacity onPress={downloadPdfContract} style={styles.pdfHeaderActionBtn} disabled={isDownloading}>
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="download-outline" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={sharePdf} style={styles.pdfHeaderActionBtn}>
                    <Ionicons name="share-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </>
              )}
              {pdfUrl && (
                <TouchableOpacity onPress={() => pdfUrl && Linking.openURL(pdfUrl)} style={styles.pdfHeaderActionBtn}>
                  <Ionicons name="open-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* PDF Content */}
          <View style={styles.pdfViewer}>
            {Platform.OS === 'web' ? (
              pdfUrl ? (
                <div
                  style={{ width: '100%', height: '100%' }}
                  dangerouslySetInnerHTML={{
                    __html: `<iframe src="${pdfUrl}" style="width:100%;height:100%;border:none;" />`
                  }}
                />
              ) : (
                <View style={styles.pdfUnavailableContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              )
            ) : (
              // Native: try react-native-pdf with local file, fallback to WebView
              pdfLocalUri ? (
                <Pdf
                  source={{ uri: pdfLocalUri }}
                  trustAllCerts={false}
                  style={styles.pdfRendererFull}
                  onLoadComplete={(numberOfPages) => {
                    console.log(`✅ PDF loaded: ${numberOfPages} pages`);
                  }}
                  onError={(error) => {
                    console.error('❌ react-native-pdf error:', error);
                    // Fallback: clear local URI to trigger WebView
                    setPdfLocalUri(null);
                  }}
                  enablePaging={false}
                  spacing={8}
                />
              ) : pdfUrl ? (
                // WebView fallback using Google Docs viewer
                <WebView
                  source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}` }}
                  style={styles.pdfRendererFull}
                  startInLoadingState
                  renderLoading={() => (
                    <View style={styles.pdfLoadingOverlay}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.pdfLoadingText, { color: colors.textSecondary }]}>
                        {t('Loading PDF...')}
                      </Text>
                    </View>
                  )}
                  onError={() => {
                    console.error('❌ WebView PDF load failed');
                  }}
                />
              ) : (
                <View style={styles.pdfUnavailableContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.pdfLoadingText, { color: colors.textSecondary }]}>
                    {t('Loading PDF...')}
                  </Text>
                </View>
              )
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 0.9,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  // Service Agreement Card - Figma-style
  serviceAgreementCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  serviceAgreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  serviceAgreementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceAgreementInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceAgreementTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  serviceAgreementSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  serviceAgreementChevron: {
    padding: 4,
  },
  contractDetailsSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  contractDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  contractDetailRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  contractDetailLabel: {
    fontSize: 14,
    flex: 1,
  },
  contractDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  contractDetailValueGreen: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  contractButtonsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  viewPdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  viewPdfButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  downloadPdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  downloadPdfButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  downloadingStatusContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  // Email Signature Info Card - Figma style
  emailSignatureInfoCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  emailSignatureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailSignatureInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  emailSignatureInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emailSignatureInfoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Original styles kept for compatibility
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  phaseRow: {
    marginBottom: 12,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  phaseNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  phaseNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  phaseNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  phaseName: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  phaseNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  phaseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  phaseDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  phaseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phaseMetaText: {
    fontSize: 12,
  },
  phaseDivider: {
    borderBottomWidth: 1,
    marginTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 14,
    lineHeight: 22,
  },
  signatoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  signatoryInfo: {
    flex: 1,
  },
  signatoryRole: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  signatoryEmail: {
    fontSize: 12,
  },
  signatureStatus: {
    alignItems: 'flex-end',
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  signedDate: {
    fontSize: 12,
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
  signButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  signButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emailFormCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  emailFormTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emailFormSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  emailInputContainer: {
    marginBottom: 16,
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  emailFormButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  emailFormButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelEmailButton: {
    borderWidth: 1,
  },
  submitEmailButton: {
    backgroundColor: '#2196F3',
  },
  emailFormButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  pdfModalContainer: {
    flex: 1,
  },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  pdfHeaderBackBtn: {
    padding: 6,
  },
  pdfHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  pdfHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pdfHeaderActionBtn: {
    padding: 8,
  },
  pdfViewer: {
    flex: 1,
  },
  pdfRendererFull: {
    flex: 1,
    width: Dimensions.get('window').width,
  },
  pdfLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  pdfLoadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  pdfUnavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 40,
  },
  pdfUnavailableText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pdfUnavailableSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      } as any,
      default: {
        elevation: 5,
      },
    }),
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  confirmModalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalCancelButton: {
    borderWidth: 1,
  },
  confirmModalConfirmButton: {
    // backgroundColor set inline
  },
  confirmModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

