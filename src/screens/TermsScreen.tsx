import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
  I18nManager,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import BonyadLogo from '../components/BonyadLogo';
import {
  TermsAndConditions,
  getTermsByType,
  getTermsContent
} from '../services/TermsService';
import { printToFileAsync } from 'expo-print';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Platform-specific: .web.tsx exports null (no react-native-pdf); .native.tsx exports Pdf.
// This keeps react-native-pdf out of the web bundle and fixes "Importing native-only module on web".
const Pdf = require('./TermsScreenPdf').default;

const { width, height } = Dimensions.get('window');

interface TermsScreenProps {
  type: 'USER' | 'TECHNICIAN';
  onAccept: (termsId: number, version: string) => void;
  onDecline: () => void;
}

export default function TermsScreen({ type, onAccept, onDecline }: TermsScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Robust RTL check
  const isRTL = i18n.language.startsWith('ar');

  // Use PDF viewer only on native when Pdf module loaded; web and Expo Go use text fallback
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const canUsePdf = Platform.OS !== 'web' && !isExpoGo && !!Pdf;
  const isWeb = Platform.OS === 'web';

  console.log('🔍 [TermsScreen] Environment:', { isWeb, isExpoGo, canUsePdf, isRTL, lang: i18n.language });

  const [terms, setTerms] = useState<TermsAndConditions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    console.log('🔄 [TermsScreen] Mounted/Type Changed:', type);
    loadTerms();
  }, [type]);

  const loadTerms = async () => {
    try {
      console.log('⏳ [TermsScreen] Loading terms...');
      setLoading(true);
      setError(null);
      const data = await getTermsByType(type);
      console.log('📥 [TermsScreen] Terms Fetch Result:', data ? 'Success' : 'Null');
      setTerms(data);
      if (data && canUsePdf) {
        generatePDF(data);
      } else if (data && !canUsePdf) {
        console.log('📝 [TermsScreen] Rendering text fallback (PDF disabled or unavailable)');
      }
    } catch (err) {
      console.error('❌ [TermsScreen] Error loading terms:', err);
      setError(t('Failed to load terms and conditions'));
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (termsData: TermsAndConditions) => {
    if (!canUsePdf) return;

    try {
      console.log('📄 [TermsScreen] Generating PDF...');
      setGeneratingPdf(true);
      const content = isRTL ? termsData.contentAr : termsData.contentEn;
      const title = t('Terms and Conditions');
      const version = `${t('Version')} ${termsData.version}`;

      const html = `
        <html dir="${isRTL ? 'rtl' : 'ltr'}">
          <head>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: 'Helvetica', sans-serif; 
                padding: 40px; 
                font-size: 14px; 
                line-height: 1.6;
                color: #000;
                text-align: ${isRTL ? 'right' : 'left'};
                direction: ${isRTL ? 'rtl' : 'ltr'};
              }
              h1 { 
                text-align: center; 
                font-size: 24px; 
                margin-bottom: 10px;
                color: ${colors.primary};
              }
              .meta {
                text-align: center;
                color: #666;
                font-size: 12px;
                margin-bottom: 40px;
                border-bottom: 1px solid #ccc;
                padding-bottom: 20px;
              }
              p { margin-bottom: 15px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <div class="meta">${version}</div>
            <div>
              ${content ? content.replace(/\n/g, '<br/>') : ''}
            </div>
          </body>
        </html>
      `;

      const { uri } = await printToFileAsync({
        html,
        base64: false
      });
      console.log('✅ [TermsScreen] PDF Generated:', uri);
      setPdfUri(uri);
    } catch (err) {
      console.error('❌ [TermsScreen] Error generating PDF:', err);
      // Fail silently, fallback to text will handle it (pdfUri remains null)
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleAccept = () => {
    if (terms && accepted) {
      console.log('✅ [TermsScreen] Accepting terms ID:', terms.id);
      onAccept(terms.id, terms.version);
    }
  };

  const getContent = () => {
    if (!terms) return '';
    return getTermsContent(terms, i18n.language as 'ar' | 'en');
  };

  const dynamicColors = {
    background: isDarkMode ? '#0f172a' : '#fff',
    text: isDarkMode ? '#fff' : '#1f2937',
    textSecondary: isDarkMode ? '#94a3b8' : '#6b7280',
    primary: colors.primary,
    border: isDarkMode ? '#334155' : '#e5e7eb',
    cardBg: isDarkMode ? '#1e293b' : '#f8fafc',
  };

  // Common Loading State
  if (loading && !terms) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={dynamicColors.primary} />
          <Text style={[styles.loadingText, { color: dynamicColors.textSecondary }]}>
            {t('Loading terms...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Common Error State
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color="#ef4444" />
          <Text style={[styles.errorText, { color: dynamicColors.text }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTerms}>
            <Text style={styles.retryButtonText}>{t('Retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Common Empty state
  if (!terms) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.emptyContainer}>
          <Feather name="file-text" size={48} color={dynamicColors.textSecondary} />
          <Text style={[styles.emptyText, { color: dynamicColors.textSecondary }]}>
            {t('No terms and conditions available')}
          </Text>
          <TouchableOpacity style={styles.continueButton} onPress={() => onAccept(0, '0')}>
            <Text style={styles.continueButtonText}>{t('Continue')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <BonyadLogo size="medium" variant={isDarkMode ? 'light' : 'dark'} responsive />
        </View>
        <Text style={[styles.headerTitle, { color: dynamicColors.text }]}>
          {t('Terms and Conditions')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: dynamicColors.textSecondary }]}>
          {type === 'USER' ? t('User Agreement') : t('Technician Agreement')}
          {' '}• {t('Version')} {terms.version}
        </Text>
      </View>

      {/* Content: PDF (if supported) or Text Fallback */}
      <View style={styles.contentContainer}>
        {!canUsePdf ? (
          /* Web or Expo Go Fallback: Render Text */
          <ScrollView
            style={styles.webScrollView}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={true}
          >
            <View style={[styles.termsCard, { backgroundColor: dynamicColors.cardBg, borderColor: dynamicColors.border }]}>
              <Text style={[
                styles.termsText,
                {
                  color: dynamicColors.text,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr'
                }
              ]}>
                {getContent()}
              </Text>
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        ) : (
          /* Native PDF View */
          <View style={styles.pdfContainer}>
            {generatingPdf ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={dynamicColors.primary} />
                <Text style={[styles.loadingText, { color: dynamicColors.textSecondary, fontSize: 13, marginTop: 10 }]}>
                  {t('Preparing document...')}
                </Text>
              </View>
            ) : pdfUri && Pdf ? (
              <Pdf
                source={{ uri: pdfUri, cache: true }}
                style={styles.pdf}
                onError={(error: any) => {
                  console.log('❌ [TermsScreen] Pdf Component Error:', error);
                }}
              />
            ) : (
              /* Fallback to text if PDF failed or not yet generated */
              <ScrollView
                contentContainerStyle={styles.contentInner}
                showsVerticalScrollIndicator={true}
              >
                <View style={[styles.termsCard, { backgroundColor: dynamicColors.cardBg, borderColor: dynamicColors.border }]}>
                  <Text style={[
                    styles.termsText,
                    {
                      color: dynamicColors.text,
                      textAlign: isRTL ? 'right' : 'left',
                      writingDirection: isRTL ? 'rtl' : 'ltr'
                    }
                  ]}>
                    {getContent()}
                  </Text>
                </View>
                <View style={{ height: 100 }} />
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: dynamicColors.background, borderTopColor: dynamicColors.border }]}>
        {/* Checkbox */}
        <TouchableOpacity
          style={[styles.checkboxContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => setAccepted(!accepted)}
        >
          <View style={[
            styles.checkbox,
            { borderColor: dynamicColors.primary },
            accepted && { backgroundColor: dynamicColors.primary }
          ]}>
            {accepted && <MaterialIcons name="check" size={18} color="#fff" />}
          </View>
          <Text style={[
            styles.checkboxLabel,
            {
              color: dynamicColors.text,
              textAlign: isRTL ? 'right' : 'left',
              // Add margin/padding based on direction if needed
              marginLeft: isRTL ? 0 : 12,
              marginRight: isRTL ? 12 : 0,
            }
          ]}>
            {t('I have read and agree to the Terms and Conditions')}
          </Text>
        </TouchableOpacity>

        {/* Buttons */}
        <View style={[styles.buttonRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.declineButton, { borderColor: dynamicColors.border }]}
            onPress={onDecline}
          >
            <Text style={[styles.declineButtonText, { color: dynamicColors.textSecondary }]}>
              {t('Decline')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.acceptButton,
              { backgroundColor: dynamicColors.primary },
              !accepted && styles.acceptButtonDisabled
            ]}
            onPress={handleAccept}
            disabled={!accepted}
          >
            <Text style={styles.acceptButtonText}>{t('Accept & Continue')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#00549B',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  continueButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#00549B',
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logoContainer: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  webScrollView: {
    flex: 1,
  },
  pdfContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  contentInner: {
    padding: 20,
  },
  termsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
  },
  termsText: {
    fontSize: 15,
    lineHeight: 24,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
