/**
 * PendingProjectScreen
 *
 * Screen for displaying project details when status is PENDING.
 * Supports two personas:
 * - User: Can view project overview, description, requirements, phases,
 *         and edit or delete the project.
 * - Technician: Can view project details and choose to ask for a visit
 *               or submit a bid.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { API_ENDPOINTS, buildApiUrl, buildApiUrlWithParams, buildAssetUrl } from '../config/api';
import { storage } from '../utils/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import BookAppointmentModal from '../components/BookAppointmentModal';

// ===== DESIGN TOKENS FROM FIGMA =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary80: '#004A8A',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary50: '#1A6DB4',
  primary10: '#E6EFF7',
  // Greens
  green90: '#007B36',
  green80: '#008B3E',
  green10: '#E6F5EC',
  // Purple
  purple100: '#3C076D',
  purple10: '#EFE6F5',
  // Amber
  amber60: '#FFB703',
  amber10: '#FFF8E6',
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
  description: string;
  title?: string;
  moneySpent: number;
  timeSpentDays: number;
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
  phases?: Phase[];
  requirements?: string[];
  timeRequiredDays?: number;
  needsVisit?: boolean;
  needsBooking?: boolean;
  // image fields (same as web)
  images?: string[];
  photos?: string[];
  files?: string[];
}

/** Generates "Phase 1", "Phase 2" etc. – same logic as web */
function generatePhaseTitle(phase: Phase, t: (k: string) => string): string {
  if (phase.title && phase.title.trim()) return phase.title;
  return `${t('Phase')} ${phase.phaseNumber}`;
}

/** Unwrap array from common API shapes (raw array, Spring `content`, nested `phases` / `data`). */
function normalizePhasesPayload(raw: unknown): Phase[] {
  const asArray = ((): unknown[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      if (Array.isArray(o.content)) return o.content;
      if (Array.isArray(o.phases)) return o.phases;
      if (Array.isArray(o.data)) return o.data;
    }
    return [];
  })();

  return asArray
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const p = item as Record<string, unknown>;
      let id = Number(p.id);
      if (!Number.isFinite(id)) id = -(index + 1);
      let phaseNumber = Number(p.phaseNumber);
      if (!Number.isFinite(phaseNumber)) phaseNumber = index + 1;
      const title = p.title != null && String(p.title).trim() ? String(p.title) : undefined;
      return {
        id,
        phaseNumber,
        description: String(p.description ?? ''),
        title,
        moneySpent: Number(p.moneySpent) || 0,
        timeSpentDays: Number(p.timeSpentDays) || 0,
      } as Phase;
    })
    .filter((x): x is Phase => x !== null);
}

function sortPhasesByNumber(list: Phase[]): Phase[] {
  return [...list].sort((a, b) => (a.phaseNumber || 0) - (b.phaseNumber || 0));
}

const { width: SCREEN_W } = Dimensions.get('window');
const IMAGE_HEIGHT = 220;

const PHASE_RIYAL_LIGHT = require('../../assets/saudi_riyal_logo.svg');
const PHASE_RIYAL_DARK = require('../../assets/saudi_riyal_logo_dark.svg');

interface VisitRequest {
  id: number;
  technicianId: number;
  technicianName?: string;
  projectId: number;
  status: string;
  requestedDate?: string;
  notes?: string;
  createdAt: string;
}

interface PendingProjectScreenProps {
  project: Project;
  onBack: () => void;
  // User-specific callbacks
  onEditProject?: () => void;
  onDeleteProject?: () => void;
  onSuccess?: () => void;
  // Technician-specific props
  isTechnician?: boolean;
  onAskForVisit?: () => void;
  onBidNow?: () => void;
}

// ===== PHASE CARD — simple layout, SAR via riyal SVG =====
const PhaseCard = ({
  phase,
  formatBudget,
}: {
  phase: Phase;
  formatBudget: (amount: number) => string;
}) => {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const riyalSource = theme === 'dark' ? PHASE_RIYAL_DARK : PHASE_RIYAL_LIGHT;

  const formatPhaseDuration = (days: number) => {
    if (days < 7) return `${days} ${t('day_unit') || 'days'}`;
    const w = Math.ceil(days / 7);
    return `${w} ${w === 1 ? t('Week') : t('weeks')}`;
  };

  const pcs = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.cardBackground,
          padding: 14,
          marginBottom: 12,
          gap: 10,
        },
        top: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
        },
        badge: {
          minWidth: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: colors.primary + '18',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 8,
        },
        badgeText: {
          fontSize: 13,
          fontWeight: '800',
          color: colors.primary,
        },
        title: {
          flex: 1,
          fontSize: 14,
          fontWeight: '600',
          color: colors.text,
          lineHeight: 19,
        },
        desc: {
          fontSize: 12,
          lineHeight: 18,
          color: colors.textSecondary,
        },
        bottom: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 10,
          marginTop: 2,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        durationRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          flex: 1,
          marginRight: 8,
        },
        durationText: {
          fontSize: 12,
          color: colors.textSecondary,
          fontWeight: '500',
          flexShrink: 1,
        },
        priceRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        priceText: {
          fontSize: 14,
          fontWeight: '700',
          color: colors.text,
        },
        riyal: { width: 20, height: 18 },
      }),
    [colors]
  );

  return (
    <View style={pcs.wrap}>
      <View style={pcs.top}>
        <View style={pcs.badge}>
          <Text style={pcs.badgeText}>{phase.phaseNumber}</Text>
        </View>
        <Text style={pcs.title} numberOfLines={2}>
          {generatePhaseTitle(phase, t)}
        </Text>
      </View>
      {phase.description?.trim() ? (
        <Text style={pcs.desc} numberOfLines={4}>
          {phase.description}
        </Text>
      ) : null}
      <View style={pcs.bottom}>
        <View style={pcs.durationRow}>
          <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
          <Text style={pcs.durationText} numberOfLines={1}>
            {formatPhaseDuration(phase.timeSpentDays)}
          </Text>
        </View>
        <View style={pcs.priceRow}>
          <Text style={pcs.priceText}>{formatBudget(phase.moneySpent)}</Text>
          <ExpoImage source={riyalSource} style={pcs.riyal} contentFit="contain" />
        </View>
      </View>
    </View>
  );
};

// ===== IMAGE GALLERY COMPONENT =====
const ImageGallery = ({ images, c }: { images: string[]; c: typeof COLORS }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIdx(idx);
  };

  if (images.length === 0) {
    return (
      <View style={[igStyles.placeholder, { backgroundColor: c.primary10 }]}>
        <View style={[igStyles.placeholderIcon, { backgroundColor: c.primary80 + '18' }]}>
          <Ionicons name="image-outline" size={40} color={c.primary80} />
        </View>
        <Text style={[igStyles.placeholderText, { color: c.textSecondary }]}>No photos yet</Text>
        <Text style={[igStyles.placeholderSub, { color: c.textSecondary + 'aa' }]}>
          Photos will appear here once added
        </Text>
      </View>
    );
  }

  return (
    <View style={igStyles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {images.map((uri, idx) => (
          <ExpoImage
            key={idx}
            source={{ uri }}
            style={igStyles.image}
            contentFit="cover"
            transition={300}
            placeholderContentFit="cover"
          />
        ))}
      </ScrollView>
      {/* Dot indicators */}
      {images.length > 1 && (
        <View style={igStyles.dotsRow}>
          {images.map((_, idx) => (
            <View
              key={idx}
              style={[
                igStyles.dot,
                {
                  backgroundColor: idx === activeIdx ? COLORS.textWhite : COLORS.textWhite + '60',
                  width: idx === activeIdx ? 16 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}
      {/* Counter badge */}
      {images.length > 1 && (
        <View style={igStyles.counter}>
          <Text style={igStyles.counterText}>{activeIdx + 1} / {images.length}</Text>
        </View>
      )}
    </View>
  );
};

const igStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  image: {
    width: SCREEN_W,
    height: IMAGE_HEIGHT,
  },
  placeholder: {
    height: IMAGE_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderSub: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});

// ===== MAIN COMPONENT =====
export default function PendingProjectScreen({
  project,
  onBack,
  onEditProject,
  onDeleteProject,
  onSuccess,
  isTechnician = false,
  onAskForVisit,
  onBidNow,
}: PendingProjectScreenProps) {
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
    primary80: colors.primary,
    primary100: colors.primary,
    textWhite: colors.white,
    green10: colors.success + '20',
    green80: colors.success,
    green90: colors.success,
    purple10: colors.cardBackground,
    purple100: colors.text,
    amber10: colors.warning + '25',
    amber60: colors.warning,
  }), [colors]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedVisitRequest, setSelectedVisitRequest] = useState<VisitRequest | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;

  // Image helpers (mirrors web version)
  const normalizeImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';
    return buildAssetUrl(url);
  };
  const projectImages = useMemo(() => {
    const raw = project?.images || project?.photos || (project as any)?.files || [];
    return (raw as string[]).map(normalizeImageUrl).filter(Boolean);
  }, [project]);
  // Normalize booleans that might arrive as strings/numbers from API
  // API sometimes uses different field names; support all
  const needsVisitRaw =
    (project as any).needsVisit ??
    (project as any).needsHouseVisit ??
    (project as any).needsHomeVisit;
  const needsBookingRaw =
    (project as any).needsBooking ??
    (project as any).needsBookingVisit ??
    (project as any).needsBookingRequired;
  const needsVisit =
    needsVisitRaw === true || needsVisitRaw === 'true' || needsVisitRaw === 1;
  const needsBooking =
    needsBookingRaw === true || needsBookingRaw === 'true' || needsBookingRaw === 1;

  const serviceName = i18n.language === 'ar' ? project?.serviceNameAr : project?.serviceNameEn;
  const isArabic = i18n.language?.startsWith('ar');

  /** Prefer fetched phases; fall back to phases embedded on `project` (e.g. from Projects list). */
  const displayPhases = useMemo(() => {
    const fromFetch = sortPhasesByNumber(normalizePhasesPayload(phases));
    if (fromFetch.length > 0) return fromFetch;
    const embedded = normalizePhasesPayload((project as any)?.phases);
    return sortPhasesByNumber(embedded);
  }, [phases, project]);
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, showInfo, hideAlert } = useAlertPopup();
  const { confirmState, showDeleteConfirmation, showConfirmation, hideConfirmation } = useConfirmationPopup();
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
      await Promise.all([loadPhases(), !isTechnician ? loadVisitRequests() : Promise.resolve()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhases = async () => {
    if (!project?.id) {
      return;
    }

    try {
      const token = await storage.getAuthToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      } as const;

      const fetchList = async (url: string): Promise<Phase[]> => {
        const response = await fetch(url, { method: 'GET', headers });
        if (!response.ok) return [];
        const data = await response.json();
        return sortPhasesByNumber(normalizePhasesPayload(data));
      };

      let list = await fetchList(
        buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, { projectId: project.id }),
      );
      if (list.length === 0) {
        list = await fetchList(
          buildApiUrlWithParams(API_ENDPOINTS.PROJECTS.PROJECT_PHASES, { id: project.id }),
        );
      }
      setPhases(list);
    } catch (error) {
      console.error('Error loading phases:', error);
    }
  };

  const loadVisitRequests = async () => {
    if (!project?.id) return;

    setIsLoadingVisits(true);
    setVisitsError(null);

    try {
      const url = buildApiUrlWithParams(API_ENDPOINTS.VISIT_REQUESTS.LIST, { projectId: project.id });
      const token = await storage.getAuthToken();

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVisitRequests(Array.isArray(data) ? data : []);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load visit requests:', errorText);
        setVisitsError(t('Failed to load visit requests'));
      }
    } catch (error) {
      console.error('❌ Error loading visit requests:', error);
      setVisitsError(t('Failed to load visit requests'));
    } finally {
      setIsLoadingVisits(false);
    }
  };

  /** Same as web PendingProjectScreen: plain number format (currency icon shown separately in UI). */
  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  /** Same as web PendingProjectScreen: use timeRequiredDays with Week/weeks copy. */
  const formatDuration = () => {
    if (!project?.timeRequiredDays) {
      return t('projectsScreen.notSpecified');
    }
    const days = project.timeRequiredDays;
    const weeks = Math.ceil(days / 7);
    if (weeks === 1) {
      return `1 ${t('Week')}`;
    }
    return `${weeks} ${t('weeks')}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
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

  const handleDeleteProject = () => {
    showDeleteConfirmation(
      t('Delete Project'),
      t('Are you sure you want to delete this project? This action cannot be undone.'),
      async () => {
        if (onDeleteProject) {
          onDeleteProject();
        } else {
          try {
            const token = await storage.getAuthToken();
            const url = buildApiUrl(API_ENDPOINTS.PROJECTS.DELETE.replace(':id', project.id.toString()));
            
            const response = await fetch(url, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              showSuccess(t('Project deleted successfully'), t('Success'));
              onSuccess?.();
              onBack();
            } else {
              showError(t('Failed to delete project'), t('Error'));
            }
          } catch (error) {
            console.error('Error deleting project:', error);
            showError(t('Failed to delete project'), t('Error'));
          }
        }
      }
    );
  };

  // Technician action handlers
  const handleAskForVisit = () => {
    if (onAskForVisit) {
      onAskForVisit();
    } else {
      // Default behavior - show confirmation
      showConfirmation(
        t('Ask for Visit'),
        t('Do you want to request a site visit for this project?'),
        () => {
          showSuccess(t('Visit request sent successfully'), t('Success'));
          onSuccess?.();
        }
      );
    }
  };

  const handleBidNow = () => {
    if (onBidNow) {
      onBidNow();
    } else {
      // Default behavior - show info
      showInfo(t('You will be redirected to submit your bid for this project.'), t('Bid Now'));
    }
  };

  const styles = useMemo(() => makeStyles(c), [c]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bgWhite, paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.primary60} />
          <Text style={[styles.loadingText, { fontSize: scaledSize(14) }]}>{t('Loading project...')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bgWhite, paddingTop: IS_LARGE_WEB ? 0 : insets.top }]}>
      {/* ── Header ── */}
      {!IS_LARGE_WEB && (
        <View style={[styles.header, isArabic ? styles.headerRTL : styles.headerLTR]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <BackArrowIonicons variant="chevron" size={24} color={c.textBody} forceLtrLayout={!isArabic} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { fontSize: scaledSize(15) }]} numberOfLines={1}>
              {serviceName || t('Project')}
            </Text>
            <Text style={[styles.headerSubtitle, { fontSize: scaledSize(10) }]}>
              {t('Pending Project')}
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
          IS_LARGE_WEB && styles.webContentFullWidth,
        ]}
      >
        {/* ── Hero Image Gallery ── */}
        {!IS_LARGE_WEB && (
          <View style={styles.heroWrapper}>
            <ImageGallery images={projectImages} c={c} />
          </View>
        )}

        {/* Title Section - Large Web */}
        {IS_LARGE_WEB && (
          <View style={[styles.titleSectionLargeWeb, isArabic ? styles.headerRTL : styles.headerLTR]}>
            <TouchableOpacity onPress={onBack} style={styles.titleBackButton}>
              <BackArrowIonicons variant="chevron" size={24} color={c.textHeader} forceLtrLayout={!isArabic} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.titleMainText, { fontSize: scaledSize(42) }]}>
                {serviceName || t('Project')}
              </Text>
              <Text style={[styles.titleSubtext, { fontSize: scaledSize(20) }]}>
                {t('Pending Project')}
              </Text>
            </View>
          </View>
        )}

        {/* Status Stepper */}
        <View style={[styles.stepperContainer, IS_LARGE_WEB && styles.stepperContainerLargeWeb]}>
          <ProjectCreationFlow currentStep="PENDING" />
        </View>

        {/* Divider */}
        <View style={[styles.divider, IS_LARGE_WEB && styles.dividerLargeWeb]} />
        {/* Project Overview Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeaderTitle, { fontSize: scaledSize(16) }]}>{t('Project Overview')}</Text>
          <View style={[styles.requestIdCreatedRow, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.requestIdText, { color: c.textSecondary }]}>#{project.id}</Text>
            {project.createdAt ? (
              <Text style={[styles.createdText, { color: c.textSecondary }]}>
                {t('Created')}: {formatDate(project.createdAt)}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.sectionDescription, { fontSize: scaledSize(14) }]}>
            {isTechnician
              ? t('Review the project details below. You can request a visit or submit a bid.')
              : t('Review your project details below. Once submitted, service providers will start sending bids.')
            }
          </Text>

          {/* Budget and Duration Cards */}
          <View style={[styles.statsRow, IS_LARGE_WEB && styles.statsRowLargeWeb]}>
            <View style={[styles.statCard, styles.budgetCard, IS_LARGE_WEB && styles.statCardLargeWeb]}>
              <View style={[styles.statHeader, IS_LARGE_WEB && styles.statHeaderLargeWeb]}>
                <Ionicons name="cash-outline" size={IS_LARGE_WEB ? 20 : 12} color={c.primary80} />
                <Text style={[styles.statTitle, IS_LARGE_WEB && styles.statTitleLargeWeb]}>
                  {t('Total Budget')}
                </Text>
              </View>
              <Text style={[styles.statValue, IS_LARGE_WEB && styles.statValueLargeWeb]}>
                {formatBudget(project.budget)}
              </Text>
            </View>
            <View style={[styles.statCard, styles.durationCard, IS_LARGE_WEB && styles.statCardLargeWeb]}>
              <View style={[styles.statHeader, IS_LARGE_WEB && styles.statHeaderLargeWeb]}>
                <Ionicons name="time-outline" size={IS_LARGE_WEB ? 20 : 12} color={c.green90} />
                <Text style={[styles.statTitle, { color: c.green90 }, IS_LARGE_WEB && styles.statTitleLargeWeb]}>
                  {t('Duration')}
                </Text>
              </View>
              <Text style={[styles.statValue, IS_LARGE_WEB && styles.statValueLargeWeb]}>
                {formatDuration()}
              </Text>
            </View>
          </View>

          {/* Work phases (inside overview — matches list data + API) */}
          {displayPhases.length > 0 ? (
            <>
              <View style={[styles.overviewPhasesHeader, IS_LARGE_WEB && styles.overviewPhasesHeaderLargeWeb]}>
                <Ionicons name="layers-outline" size={IS_LARGE_WEB ? 22 : 12} color={c.primary80} />
                <Text style={[styles.sectionLabel, IS_LARGE_WEB && styles.sectionLabelLargeWeb]}>
                  {t('Work Phases')}
                </Text>
              </View>
              {displayPhases.map((phase) => (
                <PhaseCard
                  key={phase.id}
                  phase={phase}
                  formatBudget={formatBudget}
                />
              ))}
            </>
          ) : (
            <View />
          )}
        </View>
        
        {/* Description Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, IS_LARGE_WEB && styles.sectionHeaderLargeWeb]}>
            <Ionicons name="document-text-outline" size={IS_LARGE_WEB ? 24 : 12} color={c.primary80} />
            <Text style={[styles.sectionLabel, IS_LARGE_WEB && styles.sectionLabelLargeWeb]}>
              {t('Description')}
            </Text>
          </View>
          <View style={[styles.descriptionBox, IS_LARGE_WEB && styles.descriptionBoxLargeWeb]}>
            <Text style={[styles.descriptionText, IS_LARGE_WEB && styles.descriptionTextLargeWeb]}>
              {(project.description && project.description.trim() && project.description.trim().toLowerCase() !== 'not specified')
                ? project.description
                : t('projectsScreen.notSpecified')}
            </Text>
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, IS_LARGE_WEB && styles.sectionHeaderLargeWeb]}>
            <Ionicons name="location-outline" size={IS_LARGE_WEB ? 24 : 12} color={c.primary80} />
            <Text style={[styles.sectionLabel, IS_LARGE_WEB && styles.sectionLabelLargeWeb]}>
              {t('Project Address')}
            </Text>
          </View>
          <View style={[styles.descriptionBox, IS_LARGE_WEB && styles.descriptionBoxLargeWeb]}>
            <Text style={[styles.descriptionText, IS_LARGE_WEB && styles.descriptionTextLargeWeb]}>
              {(() => {
                const a = (project.address || '').trim();
                if (!a) return t('No address specified');
                if (a.toLowerCase() === 'not specified') return t('projectsScreen.notSpecified');
                return a;
              })()}
            </Text>
          </View>
        </View>

        {/* Project Options Section - Only shown for Users */}
        {!isTechnician && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="options-outline" size={12} color={c.primary80} />
              <Text style={styles.sectionLabel}>{t('Project Options')}</Text>
            </View>
            <View style={styles.optionsContainer}>
              {/* Needs House Visit */}
              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <Ionicons name="home-outline" size={16} color={c.primary80} />
                  <Text style={styles.optionLabel}>{t('Needs House Visit')}</Text>
                </View>
                <View style={[
                  styles.optionBadge,
                  { backgroundColor: needsVisit ? c.green10 : c.primary10 }
                ]}>
                  <Ionicons 
                    name={needsVisit ? "checkmark-circle" : "close-circle"} 
                    size={14} 
                    color={needsVisit ? c.green80 : c.textSecondary} 
                  />
                  <Text style={[
                    styles.optionBadgeText,
                    { color: needsVisit ? c.green80 : c.textSecondary }
                  ]}>
                    {needsVisit ? t('Yes') : t('No')}
                  </Text>
                </View>
              </View>

              {/* Needs Booking */}
              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <Ionicons name="calendar-outline" size={16} color={c.primary80} />
                  <Text style={styles.optionLabel}>{t('Needs Booking')}</Text>
                </View>
                <View style={[
                  styles.optionBadge,
                  { backgroundColor: needsBooking ? c.green10 : c.primary10 }
                ]}>
                  <Ionicons 
                    name={needsBooking ? "checkmark-circle" : "close-circle"} 
                    size={14} 
                    color={needsBooking ? c.green80 : c.textSecondary} 
                  />
                  <Text style={[
                    styles.optionBadgeText,
                    { color: needsBooking ? c.green80 : c.textSecondary }
                  ]}>
                    {needsBooking ? t('Yes') : t('No')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Visit Requests Section - User can track technicians who requested a visit */}
        {!isTechnician && (
          <View style={[styles.section, styles.visitRequestsSection]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="home-outline" size={12} color={c.amber60} />
              <Text style={[styles.sectionLabel, { color: c.amber60 }]}>{t('Visit Requests')}</Text>
            </View>

            {isLoadingVisits ? (
              <View style={styles.inlineLoadingRow}>
                <ActivityIndicator size="small" color={c.primary60} />
                <Text style={styles.inlineLoadingText}>{t('Loading visits...')}</Text>
              </View>
            ) : visitsError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={c.purple100} />
                <Text style={styles.errorText}>{visitsError}</Text>
              </View>
            ) : visitRequests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyBoxTitle}>{t('No visit requests yet')}</Text>
                <Text style={styles.emptyBoxSubtext}>{t('Technicians will appear here once they request a visit.')}</Text>
              </View>
            ) : (
              <View style={styles.visitList}>
                {visitRequests.map((vr) => {
                  const status = (vr.status || '').toUpperCase();
                  const isApproved = status === 'APPROVED' || status === 'ACCEPTED';
                  const isRejected = status === 'REJECTED' || status === 'DECLINED';
                  const badgeBg = isApproved ? c.green10 : isRejected ? c.purple10 : c.primary10;
                  const badgeText = isApproved ? c.green90 : isRejected ? c.purple100 : c.primary80;

                  return (
                    <View key={vr.id} style={styles.visitCard}>
                      <View style={styles.visitCardHeader}>
                        <View style={styles.visitCardHeaderLeft}>
                          <View style={[styles.visitAvatar, { backgroundColor: c.primary10 }]}>
                            <Ionicons name="person-outline" size={14} color={c.primary80} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.visitTechnicianName} numberOfLines={1}>
                              {vr.technicianName || t('Technician')}
                            </Text>
                            <Text style={styles.visitMetaText}>
                              {t('Status')}: {status || 'PENDING'}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.visitStatusBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.visitStatusText, { color: badgeText }]} numberOfLines={1}>
                            {status || 'PENDING'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.visitDatesRow}>
                        <Ionicons name="calendar-outline" size={12} color={c.textSecondary} />
                        <Text style={styles.visitDateText}>
                          {t('Requested On')}: {formatDate(vr.createdAt)}
                        </Text>
                      </View>
                      {!!vr.requestedDate && (
                        <View style={styles.visitDatesRow}>
                          <Ionicons name="time-outline" size={12} color={c.textSecondary} />
                          <Text style={styles.visitDateText}>
                            {t('Requested Date')}: {formatDate(vr.requestedDate)}
                          </Text>
                        </View>
                      )}

                      {!!vr.notes && (
                        <View style={styles.visitNotesBox}>
                          <Text style={styles.visitNotesLabel}>{t('Additional Notes')}</Text>
                          <Text style={styles.visitNotesText}>{vr.notes}</Text>
                        </View>
                      )}
                      
                      {/* Book Button for PENDING status */}
                      {status === 'PENDING' && (
                        <TouchableOpacity
                          style={styles.bookButton}
                          onPress={() => {
                            setSelectedVisitRequest(vr);
                            setBookingModalVisible(true);
                          }}
                        >
                          <Ionicons name="calendar-outline" size={14} color={c.textWhite} />
                          <Text style={styles.bookButtonText}>{t('Book')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
        
        {/* Requirements Section */}
        {project.requirements && project.requirements.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={12} color={c.primary80} />
              <Text style={styles.sectionLabel}>{t('Requirements')}</Text>
            </View>
            <View style={styles.descriptionBox}>
              {project.requirements.map((req, index) => (
                <View key={index} style={styles.requirementItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.requirementText}>{req}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View />
        )}
        
        {/* Action Buttons - Different for User vs Technician */}
        <View style={[styles.actionButtons, IS_LARGE_WEB && styles.actionButtonsLargeWeb]}>
          {isTechnician ? (
            // Technician View: Ask for Visit & Bid Now
            <>
              <TouchableOpacity
                style={[styles.primaryButton, IS_LARGE_WEB && styles.primaryButtonLargeWeb]}
                onPress={handleAskForVisit}
              >
                <Text style={[styles.primaryButtonText, IS_LARGE_WEB && styles.primaryButtonTextLargeWeb]}>
                  {t('Ask for Visit')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, IS_LARGE_WEB && styles.secondaryButtonLargeWeb]}
                onPress={handleBidNow}
              >
                <Text style={[styles.secondaryButtonText, IS_LARGE_WEB && styles.secondaryButtonTextLargeWeb]}>
                  {t('Bid Now')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            // User View: Edit & Delete Project
            <>
              <TouchableOpacity
                style={[styles.primaryButton, IS_LARGE_WEB && styles.primaryButtonLargeWeb]}
                onPress={onEditProject}
              >
                <Text style={[styles.primaryButtonText, IS_LARGE_WEB && styles.primaryButtonTextLargeWeb]}>
                  {t('Edit Project')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, IS_LARGE_WEB && styles.secondaryButtonLargeWeb]}
                onPress={handleDeleteProject}
              >
                <Text style={[styles.secondaryButtonText, IS_LARGE_WEB && styles.secondaryButtonTextLargeWeb]}>
                  {t('Delete Project')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        
        {/* Bottom Padding */}
        <View style={{ height: insets.bottom + 70 }} />
      </ScrollView>
      
      {/* Book Appointment Modal */}
      {selectedVisitRequest && (
        <BookAppointmentModal
          visible={bookingModalVisible}
          technicianId={selectedVisitRequest.technicianId}
          technicianName={selectedVisitRequest.technicianName || t('Technician')}
          projectId={project?.id}
          onClose={() => {
            setBookingModalVisible(false);
            setSelectedVisitRequest(null);
          }}
          onSuccess={() => {
            loadVisitRequests();
            onSuccess?.();
          }}
        />
      )}
      
      {/* Alert Popup */}
      <AlertPopup
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
      
      {/* Confirmation Popup */}
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

function makeStyles(c: typeof COLORS) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
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
    fontSize: 16,
    fontWeight: '700',
    color: c.textHeader,
  },
  headerTitleLargeWeb: {
    fontSize: 34,
    fontWeight: '400',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '300',
    color: c.textSecondary,
  },
  headerSubtitleLargeWeb: {
    fontSize: 16,
  },
  heroWrapper: {
    position: 'relative',
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 16,
    overflow: 'hidden',
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
  },
  webContent: {
    maxWidth: 1344,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  webContentFullWidth: {
    width: '100%',
    paddingHorizontal: 48,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: c.textHeader,
    marginBottom: 12,
  },
  requestIdCreatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  requestIdText: {
    fontSize: 12,
    fontWeight: '500',
  },
  createdText: {
    fontSize: 12,
    fontWeight: '400',
  },
  sectionDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: c.textBody,
    lineHeight: 21,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statsRowLargeWeb: {
    gap: 32,
  },
  statCard: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  statCardLargeWeb: {
    padding: 32,
    gap: 8,
    minHeight: 79,
  },
  statHeaderLargeWeb: {
    gap: 6,
    marginBottom: 8,
  },
  statTitleLargeWeb: {
    fontSize: 16,
  },
  statValueLargeWeb: {
    fontSize: 14,
  },
  budgetCard: {
    backgroundColor: c.primary10,
    borderColor: c.textHeader,
  },
  durationCard: {
    backgroundColor: c.green10,
    borderColor: c.green80,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: c.primary80,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textSecondary,
  },
  overviewPhasesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    marginBottom: 10,
  },
  overviewPhasesHeaderLargeWeb: {
    gap: 14,
    marginTop: 28,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionHeaderLargeWeb: {
    gap: 16,
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: c.primary80,
  },
  sectionLabelLargeWeb: {
    fontSize: 16,
  },
  descriptionBox: {
    borderWidth: 0.5,
    borderColor: c.textDividers,
    borderRadius: 6,
    padding: 16,
  },
  descriptionBoxLargeWeb: {
    padding: 32,
    minHeight: 98,
  },
  descriptionText: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textBody,
    lineHeight: 18,
  },
  descriptionTextLargeWeb: {
    fontSize: 14,
    lineHeight: 21,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  bulletPoint: {
    fontSize: 12,
    color: c.textBody,
  },
  requirementText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: c.textBody,
    lineHeight: 18,
  },
  optionsContainer: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.bgWhite,
    borderWidth: 0.5,
    borderColor: c.textDividers,
    borderRadius: 8,
    padding: 16,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: c.textBody,
  },
  optionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  optionBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  visitRequestsSection: {
    backgroundColor: c.amber10,
    borderWidth: 0.5,
    borderColor: c.amber60,
    borderRadius: 8,
    padding: 12,
  },
  inlineLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  inlineLoadingText: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: c.purple10,
    borderWidth: 0.5,
    borderColor: c.purple100,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: c.purple100,
  },
  emptyBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: c.amber60,
    backgroundColor: c.bgWhite,
    gap: 6,
  },
  emptyBoxTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textBody,
  },
  emptyBoxSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textSecondary,
    lineHeight: 18,
  },
  visitList: {
    gap: 12,
  },
  visitCard: {
    borderWidth: 1,
    borderColor: c.amber60,
    borderRadius: 8,
    padding: 16,
    backgroundColor: c.bgWhite,
    gap: 12,
  },
  visitCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  visitCardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  visitAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitTechnicianName: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textBody,
  },
  visitMetaText: {
    fontSize: 10,
    fontWeight: '300',
    color: c.textSecondary,
    marginTop: 2,
  },
  visitStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  visitStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  visitDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visitDateText: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textSecondary,
  },
  visitNotesBox: {
    borderWidth: 0.5,
    borderColor: c.amber60,
    borderRadius: 8,
    padding: 12,
    backgroundColor: c.amber10,
    gap: 6,
  },
  visitNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.amber60,
  },
  visitNotesText: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textBody,
    lineHeight: 18,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.primary60,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 6,
  },
  bookButtonText: {
    fontSize: 12,
    fontWeight: '400',
    color: c.textWhite,
  },
  actionButtons: {
    gap: 12,
    marginTop: 16,
  },
  actionButtonsLargeWeb: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  primaryButton: {
    backgroundColor: c.primary60,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLargeWeb: {
    flex: 1,
    paddingVertical: 32,
    borderRadius: 0,
    minHeight: 88,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: c.textWhite,
    textAlign: 'center',
  },
  primaryButtonTextLargeWeb: {
    fontSize: 16,
    fontWeight: '400',
  },
  secondaryButton: {
    backgroundColor: c.purple10,
    borderWidth: 1,
    borderColor: c.purple100,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonLargeWeb: {
    flex: 1,
    paddingVertical: 32,
    borderRadius: 0,
    minHeight: 88,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: c.purple100,
    textAlign: 'center',
  },
  secondaryButtonTextLargeWeb: {
    fontSize: 16,
    fontWeight: '400',
  },
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
    gap: 12,
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
  });
}
