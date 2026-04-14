import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { BackArrowIonicons } from '../components/navigation/BackArrowIonicons';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTopPadding } from '../utils/statusBarHelper';
import { API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import ProjectCreationFlow from '../components/ProjectCreationFlow';
import { deleteReview, getProjectReviewStatus, ProjectReviewStatus, submitTechnicianReview, updateReview } from '../services/ReviewService';

// ===== DESIGN TOKENS (matching Figma design) =====
const COLORS = {
  // Primary Blues
  primary100: '#003867',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary10: '#E6EFF7',
  // Greens
  green90: '#007B36',
  green80: '#008B3E',
  green70: '#009C47',
  green60: '#00AC4F',
  green10: '#E6F5EC',
  // Amber
  amber60: '#FFB703',
  // Text
  textHeader: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textDividers: '#D9D9D9',
  textWhite: '#FFFFFF',
  // Backgrounds
  bgWhite: '#FFFFFF',
};

interface CompletedProjectScreenProps {
  project: any;
  onBack: () => void;
  onSuccess?: () => void;
  isTechnician?: boolean;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onViewTechnician?: (technicianId: number) => void;
  onStartNewProject?: () => void;
  onViewAllProjects?: () => void;
}

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
  createdAt: string;
  updatedAt: string;
}

export default function CompletedProjectScreen({
  project,
  onBack,
  onSuccess,
  isTechnician: propIsTechnician,
  onOpenChat,
  onViewTechnician,
  onStartNewProject,
  onViewAllProjects,
}: CompletedProjectScreenProps) {
  const resolvedProjectId = project?.id ?? project?.project?.id ?? project?.projectId;
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
    primary100: colors.primary,
    textWhite: colors.white,
    green10: colors.success + '20',
    green60: colors.success,
    green70: colors.success,
    green80: colors.success,
    green90: colors.success,
    amber60: colors.warning,
    error: colors.error,
  }), [colors]);
  const styles = useMemo(() => makeStyles(c), [c]);
  
  const screenWidth = Dimensions.get('window').width;
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const isArabic = i18n.language?.startsWith('ar');

  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [technicianId, setTechnicianId] = useState<number | null>(null);
  const [technicianName, setTechnicianName] = useState<string>('');
  const [serviceName, setServiceName] = useState<string>('');
  const [reviewStatus, setReviewStatus] = useState<ProjectReviewStatus>({ hasReview: false });
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [isTechnician, setIsTechnician] = useState(propIsTechnician ?? false);
  
  // Inline review state
  const [inlineRating, setInlineRating] = useState(0);
  const [inlineComment, setInlineComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  
  // User info for chat
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');

  // Check user role on mount
  useEffect(() => {
    const checkRole = async () => {
      if (propIsTechnician !== undefined) {
        setIsTechnician(propIsTechnician);
        return;
      }
      try {
        const role = await storage.getUserRole();
        const isTech = role?.toUpperCase() === 'TECHNICIAN';
        setIsTechnician(isTech);
      } catch (error) {
        setIsTechnician(false);
      }
    };
    checkRole();
  }, [propIsTechnician]);

  const loadReviewStatus = useCallback(async () => {
    if (!resolvedProjectId) return;
    try {
      setIsReviewLoading(true);

      const status = await getProjectReviewStatus(resolvedProjectId);
      
      setReviewStatus(status);
      // Pre-fill inline review if exists
      if (status.hasReview && status.review) {
        setInlineRating(status.review.rating || 0);
        setInlineComment(status.review.comment || '');
      } else {
        setInlineRating(0);
        setInlineComment('');
      }
    } catch (error) {
      setReviewStatus({ hasReview: false });
    } finally {
      setIsReviewLoading(false);
    }
  }, [resolvedProjectId, isTechnician]);

  useEffect(() => {
    loadPhases();
    loadProjectDetails();
    extractTechnicianInfo();
    extractServiceInfo();
    extractUserInfo();
    // Load review status for both users and technicians
    loadReviewStatus();
  }, [project, loadReviewStatus, isTechnician]);

  const extractTechnicianInfo = () => {
    let foundTechnicianId: number | null = null;
    let foundTechnicianName: string = '';

    // Try multiple ways to get technician info
    if (project.assignedTechnicianId) {
      foundTechnicianId = project.assignedTechnicianId;
    } else if (project.technicianId) {
      foundTechnicianId = project.technicianId;
    } else if (project.acceptedBid?.technicianId) {
      foundTechnicianId = project.acceptedBid.technicianId;
    } else if (project.assignedTechnician?.id) {
      foundTechnicianId = project.assignedTechnician.id;
    } else if (project.technician?.id) {
      foundTechnicianId = project.technician.id;
    }

    // Get technician name
    if (project.technicianName) {
      foundTechnicianName = project.technicianName;
    } else if (project.acceptedBid?.technicianName) {
      foundTechnicianName = project.acceptedBid.technicianName;
    } else if (project.technician?.name) {
      foundTechnicianName = project.technician.name;
    } else if (project.assignedTechnician?.name) {
      foundTechnicianName = project.assignedTechnician.name;
    }

    if (foundTechnicianId) setTechnicianId(foundTechnicianId);
    if (foundTechnicianName) setTechnicianName(foundTechnicianName);
  };

  const extractUserInfo = () => {
    // Extract user info for technician view
    if (project.userId) {
      setUserId(project.userId);
    } else if (project.user?.id) {
      setUserId(project.user.id);
    }
    
    if (project.userName) {
      setUserName(project.userName);
    } else if (project.user?.name) {
      setUserName(project.user.name);
    }
  };

  const extractServiceInfo = () => {
    if (project.serviceNameEn) {
      setServiceName(project.serviceNameEn);
    } else if (project.serviceNameAr) {
      setServiceName(project.serviceNameAr);
    } else if (project.service?.nameEn) {
      setServiceName(project.service.nameEn);
    } else if (project.service?.nameAr) {
      setServiceName(project.service.nameAr);
    } else if (project.category) {
      setServiceName(project.category);
    }
  };

  const calculateProjectSummary = () => {
    const totalPhases = phases.length;
    const completedPhases = phases.filter(p => p.completed).length;
    const paidPhases = phases.filter(p => p.paymentStatus === 'PAID' || p.paymentStatus === 'paid').length;
    const totalAmount = phases.reduce((sum, p) => sum + (p.moneySpent || 0), 0);
    const totalDays = phases.reduce((sum, p) => sum + (p.timeSpentDays || 0), 0);
    
    return {
      totalPhases,
      completedPhases,
      paidPhases,
      totalAmount,
      totalDays,
      totalWeeks: Math.ceil(totalDays / 7),
      totalMonths: Math.ceil(totalDays / 30),
    };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const loadProjectDetails = async () => {
    try {
      const token = await storage.getAuthToken();
      if (!token || !resolvedProjectId) return;

      const url = `https://bonyad-hub.com/api/projects/${resolvedProjectId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const projectData = await response.json();

        // Update technician info
        if (projectData.assignedTechnicianId) {
          setTechnicianId(projectData.assignedTechnicianId);
        } else if (projectData.technicianId) {
          setTechnicianId(projectData.technicianId);
        } else if (projectData.acceptedBid?.technicianId) {
          setTechnicianId(projectData.acceptedBid.technicianId);
        } else if (projectData.assignedTechnician?.id) {
          setTechnicianId(projectData.assignedTechnician.id);
        } else if (projectData.technician?.id) {
          setTechnicianId(projectData.technician.id);
        }

        if (projectData.technicianName) {
          setTechnicianName(projectData.technicianName);
        } else if (projectData.acceptedBid?.technicianName) {
          setTechnicianName(projectData.acceptedBid.technicianName);
        } else if (projectData.technician?.name) {
          setTechnicianName(projectData.technician.name);
        } else if (projectData.assignedTechnician?.name) {
          setTechnicianName(projectData.assignedTechnician.name);
        }
        
        // Update user info for technician view
        if (projectData.userId) setUserId(projectData.userId);
        if (projectData.userName) setUserName(projectData.userName);
        if (projectData.user?.id) setUserId(projectData.user.id);
        if (projectData.user?.name) setUserName(projectData.user.name);
      }
    } catch (error: any) {
      // silently handle
    }
  };

  const loadPhases = async () => {
    try {
      setIsLoading(true);
      const token = await storage.getAuthToken();
      if (!token) return;

      const url = buildApiUrlWithParams(API_ENDPOINTS.PHASES.LIST, {
        projectId: resolvedProjectId,
      });

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
    } catch (error: any) {
      // silently handle
    } finally {
      setIsLoading(false);
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const handleSubmitReview = async () => {
    // For users: review the technician (technicianId)
    // For technicians: review the user/client (userId)
    const reviewedUserId = isTechnician ? userId : technicianId;
    const reviewedUserName = isTechnician ? (userName || t('the client')) : (technicianName || t('this technician'));

    if (!reviewedUserId) {
      Alert.alert(t('Error'), isTechnician ? t('Client information not available') : t('Technician information not available'));
      return;
    }
    if (inlineRating === 0) {
      Alert.alert(t('Error'), t('Please select a rating'));
      return;
    }
    // API requires comment for ratings below 3.0
    if (inlineRating < 3 && (!inlineComment || inlineComment.trim().length === 0)) {
      Alert.alert(t('Error'), t('Comment is required for ratings below 3 stars'));
      return;
    }
    // Submit directly - no confirmation dialog needed since user already clicked "Submit Review" button
    try {
      setIsSubmittingReview(true);

      // Use the same API endpoint - it works for both user reviewing technician
      // and technician reviewing user (reviewedUserId is the person being reviewed)
      const result = await submitTechnicianReview(
        reviewedUserId,
        inlineRating,
        inlineComment || '',  // Ensure empty string instead of undefined
        resolvedProjectId
      );

      Alert.alert(t('Success'), t('Thank you for your review!'));
      
      // Reload review status to show the new review
      await loadReviewStatus();
      
      // Notify parent
      onSuccess?.();
    } catch (error: any) {
      // Show user-friendly error message
      const errorMessage = error.message || t('Failed to submit review');
      Alert.alert(t('Error'), errorMessage);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleEditReview = () => {
    // Switch to edit mode and pre-fill the form with existing review data
    if (reviewStatus.review) {
      setInlineRating(reviewStatus.review.rating || 0);
      setInlineComment(reviewStatus.review.comment || '');
      setIsEditingReview(true);
    }
  };

  const handleCancelEdit = () => {
    // Reset to view mode
    setIsEditingReview(false);
    // Restore original values
    if (reviewStatus.review) {
      setInlineRating(reviewStatus.review.rating || 0);
      setInlineComment(reviewStatus.review.comment || '');
    }
  };

  const handleUpdateReview = async () => {
    const reviewId = reviewStatus.review?.id ?? reviewStatus.review?.reviewId;
    if (!reviewId) {
      Alert.alert(t('Error'), t('Review ID not found'));
      return;
    }

    if (inlineRating === 0) {
      Alert.alert(t('Error'), t('Please select a rating'));
      return;
    }

    // API requires comment for ratings below 3.0
    if (inlineRating < 3 && (!inlineComment || inlineComment.trim().length === 0)) {
      Alert.alert(t('Error'), t('Comment is required for ratings below 3 stars'));
      return;
    }

    // Submit directly - no confirmation dialog needed
    try {
      setIsSubmittingReview(true);

      await updateReview(
        reviewId,
        inlineRating,
        inlineComment || '',
        resolvedProjectId
      );

      Alert.alert(t('Success'), t('Review updated successfully'));
      setIsEditingReview(false);
      
      // Reload review status
      await loadReviewStatus();
      
      onSuccess?.();
    } catch (error: any) {
      Alert.alert(t('Error'), error.message || t('Failed to update review'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    const reviewId = reviewStatus.review?.id ?? reviewStatus.review?.reviewId;
    if (!reviewId) return;

    // Use window.confirm for web compatibility (works on both web and native)
    const confirmed = window.confirm(t('Are you sure you want to delete your review?'));
    
    if (!confirmed) {
      return;
    }

    try {
      setIsDeletingReview(true);

      await deleteReview(reviewId);
      
      Alert.alert(t('Success'), t('Review deleted successfully'));
      setReviewStatus({ hasReview: false });
      setInlineRating(0);
      setInlineComment('');
      loadReviewStatus();
    } catch (error: any) {
      Alert.alert(t('Error'), error?.message || t('Failed to delete review'));
    } finally {
      setIsDeletingReview(false);
    }
  };

  const handleContactPress = () => {
    if (isTechnician) {
      // Contact User
      if (userId && onOpenChat) {
        const roomId = `project_${resolvedProjectId}_${userId}_${technicianId}`;
        onOpenChat(roomId, userId, userName || t('User'), resolvedProjectId);
      }
    } else {
      // Contact Provider/Technician
      if (technicianId && onOpenChat) {
        const roomId = `project_${resolvedProjectId}_${userId}_${technicianId}`;
        onOpenChat(roomId, technicianId, technicianName || t('Technician'), resolvedProjectId);
      }
    }
  };

  const handleDownloadInvoice = () => {
    // TODO: Implement invoice download - API endpoint not yet available
    // No API endpoint available yet for invoice download
  };

  const handlePrimaryAction = () => {
    if (isTechnician) {
      onViewAllProjects?.();
    } else {
      onStartNewProject?.();
    }
  };

  const renderStarRating = (currentRating: number, onPress?: (rating: number) => void, size: number = 32) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress?.(star)}
            disabled={!onPress}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= currentRating ? 'star' : 'star-outline'}
              size={size}
              color={star <= currentRating ? c.amber60 : c.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const summary = calculateProjectSummary();
  const providerName = technicianName || project.technicianName || t('Provider');

  return (
    <>
      <View style={[styles.container, { backgroundColor: c.bgWhite, paddingTop: IS_LARGE_WEB ? 0 : getTopPadding(insets) }]}>
        {/* Header - Hidden on large web */}
        {!IS_LARGE_WEB && (
        <View style={[styles.header, isArabic ? styles.headerRTL : styles.headerLTR, { paddingTop: getTopPadding(insets) }]}>
          <View style={[styles.headerContent]}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <BackArrowIonicons variant="chevron" size={28} color={c.primary100} forceLtrLayout={!isArabic} />
            </TouchableOpacity>
            <View style={[styles.headerTextContainer]}>
              <Text style={[styles.headerTitle,  { fontSize: scaledSize(20) }]}>
                {serviceName || project.description || t('Contracting Services')}
              </Text>
              <Text style={[styles.headerSubtitle,  { fontSize: scaledSize(14) }]}>
                  {t('Completed Project')}
              </Text>
            </View>
          </View>
        </View>
        )}

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={c.primary60} />
            <Text style={[styles.loadingText, { fontSize: scaledSize(14) }]}>{t('Loading...')}</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={[
              styles.scrollContent,
              IS_LARGE_WEB && styles.scrollContentLargeWeb,
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Section - Large Web */}
            {IS_LARGE_WEB && (
              <View style={[styles.titleSectionLargeWeb, isArabic ? styles.headerRTL : styles.headerLTR]}>
                <TouchableOpacity onPress={onBack} style={styles.titleBackButton}>
                  <BackArrowIonicons variant="chevron" size={24} color={c.primary100} forceLtrLayout={!isArabic} />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                  <Text style={[styles.titleMainText, { fontSize: scaledSize(42) }]}>
                    {serviceName || project.description || t('Contracting Services')}
                  </Text>
                  <Text style={[styles.titleSubtext, { fontSize: scaledSize(20) }]}>
                    {t('Completed Project')}
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.flowContainer, IS_LARGE_WEB && styles.flowContainerLargeWeb]}>
              <ProjectCreationFlow currentStep="COMPLETED" />
            </View>

            {/* Divider */}
            <View style={[styles.divider, IS_LARGE_WEB && styles.dividerLargeWeb]} />
            {/* Completion Success Section */}
            <View style={styles.successSection}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={32} color={c.green60} />
              </View>
              <Text style={[styles.successTitle, { fontSize: scaledSize(20) }]}>{t('Project Completed!')}</Text>
              <Text style={[styles.successSubtitle, { fontSize: scaledSize(16) }]}>
                {t('Your {{service}} has been successfully completed.', {
                  service: serviceName || t('Contracting Services')
                })}
              </Text>
            </View>

            {/* Project Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{t('Project Summary')}</Text>
              <View style={styles.summaryContent}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('Project')} #</Text>
                  <Text style={styles.summaryValue}>{project.id}</Text>
                </View>
                {project.createdAt ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('Created')}</Text>
                    <Text style={styles.summaryValue}>{formatDate(project.createdAt)}</Text>
                  </View>
                ) : null}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('Total Amount')}</Text>
                  <Text style={styles.summaryValue}>
                    {formatBudget(summary.totalAmount || project.budget || 0)} {t('SAR')}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('Duration')}</Text>
                  <Text style={styles.summaryValue}>
                    {summary.totalMonths} {summary.totalMonths === 1 ? t('Month') : t('Months')}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('Completion Date')}</Text>
                  <Text style={styles.summaryValue}>
                    {formatDate(project.updatedAt || project.completedAt || new Date().toISOString())}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {isTechnician ? t('Client') : t('Provider')}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {isTechnician ? (userName || t('Client')) : providerName}
                  </Text>
                </View>
              </View>
            </View>

            {/* Completed Phases Section */}
            {phases.length > 0 && (
              <View style={styles.phasesSection}>
                <Text style={styles.sectionTitle}>{t('Completed Phases')}</Text>
                {phases.map((phase) => (
                  <View key={phase.id} style={styles.phaseItem}>
                    <Ionicons 
                      name="checkmark-circle-outline" 
                      size={16} 
                      color={c.green60} 
                    />
                    <Text style={styles.phaseDescription}>{phase.description}</Text>
                    <View style={styles.phaseDateContainer}>
                      <Text style={styles.phaseDate}>
                        {formatDate(phase.updatedAt || phase.createdAt)}
                      </Text>
                      <Ionicons 
                        name="calendar-outline" 
                        size={14} 
                        color={c.textSecondary} 
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Review Section - For both Users and Technicians */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>{t('Rate Your Experience')}</Text>
                <Text style={styles.reviewSubtitle}>
                  {isTechnician 
                    ? t('How was your experience with {{name}}?', { name: userName || t('the client') })
                    : t('How was your experience with {{name}}?', { name: providerName })
                  }
                </Text>
                
                {isReviewLoading ? (
                  <View style={styles.reviewLoading}>
                    <ActivityIndicator color={c.primary60} />
                  </View>
                ) : reviewStatus.hasReview && reviewStatus.review && !isEditingReview ? (
                  <View style={styles.existingReviewContainer}>
                    {renderStarRating(reviewStatus.review.rating || 0, undefined, 28)}
                    {reviewStatus.review.comment && (
                      <Text style={styles.existingReviewComment}>
                        {reviewStatus.review.comment}
                      </Text>
                    )}
                    <View style={styles.reviewActions}>
                      <TouchableOpacity
                        style={styles.reviewActionButton}
                        onPress={handleEditReview}
                      >
                        <Ionicons name="create-outline" size={18} color={c.primary70} />
                        <Text style={styles.reviewActionText}>{t('Edit Review')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reviewActionButton, styles.deleteButton]}
                        onPress={handleDeleteReview}
                        disabled={isDeletingReview}
                      >
                        {isDeletingReview ? (
                          <ActivityIndicator size="small" color={c.error} />
                        ) : (
                          <Ionicons name="trash-outline" size={18} color={c.error} />
                        )}
                        <Text style={[styles.reviewActionText, styles.deleteText]}>
                          {t('Delete Review')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : isEditingReview ? (
                  <View style={styles.inlineReviewForm}>
                    {renderStarRating(inlineRating, setInlineRating)}
                    <TextInput
                      style={styles.reviewInput}
                      placeholder={t('Share your feedback (Optional)')}
                      placeholderTextColor={c.primary100}
                      value={inlineComment}
                      onChangeText={setInlineComment}
                      multiline
                      numberOfLines={3}
                    />
                    <View style={styles.editReviewButtons}>
                      <TouchableOpacity
                        style={styles.cancelEditButton}
                        onPress={handleCancelEdit}
                        disabled={isSubmittingReview}
                      >
                        <Text style={styles.cancelEditText}>{t('Cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.updateReviewButton,
                          (inlineRating === 0 || isSubmittingReview) && styles.submitButtonDisabled
                        ]}
                        onPress={handleUpdateReview}
                        disabled={inlineRating === 0 || isSubmittingReview}
                      >
                        {isSubmittingReview ? (
                          <ActivityIndicator size="small" color={c.textWhite} />
                        ) : (
                          <Text style={styles.submitReviewText}>{t('Update Review')}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.inlineReviewForm}>
                    {renderStarRating(inlineRating, setInlineRating)}
                    <TextInput
                      style={styles.reviewInput}
                      placeholder={t('Share your feedback (Optional)')}
                      placeholderTextColor={c.primary100}
                      value={inlineComment}
                      onChangeText={setInlineComment}
                      multiline
                      numberOfLines={3}
                    />
                    <TouchableOpacity
                      style={[
                        styles.submitReviewButton,
                        (inlineRating === 0 || isSubmittingReview) && styles.submitButtonDisabled
                      ]}
                      onPress={handleSubmitReview}
                      disabled={inlineRating === 0 || (!technicianId && !userId) || isSubmittingReview}
                    >
                      {isSubmittingReview ? (
                        <ActivityIndicator size="small" color={c.textWhite} />
                      ) : (
                        <Text style={styles.submitReviewText}>{t('Submit Review')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              {/* Download Invoice */}
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={handleDownloadInvoice}
              >
                <Ionicons name="download-outline" size={24} color={c.primary70} />
                <Text style={styles.outlineButtonText}>{t('Download Invoice')}</Text>
              </TouchableOpacity>

              {/* Contact Button */}
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={handleContactPress}
              >
                <Ionicons name="chatbubble-outline" size={24} color={c.primary70} />
                <Text style={styles.outlineButtonText}>
                  {isTechnician ? t('Contact User') : t('Contact Provider')}
                </Text>
              </TouchableOpacity>

              {/* Primary Action Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handlePrimaryAction}
              >
                <Text style={styles.primaryButtonText}>
                  {isTechnician ? t('View All Projects') : t('Start a New Project')}
                </Text>
              </TouchableOpacity>

             <View style={{ height: 30 }} />
            </View>
          </ScrollView>
        )}
      </View>
    </>
  );
}

function makeStyles(c: typeof COLORS & { error: string }) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: c.bgWhite,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLTR: {
    direction: 'ltr',
  },
  headerRTL: {
    direction: 'rtl',
  },
  headerLargeWeb: {
    paddingHorizontal: 48,
    paddingBottom: 32,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerContentLargeWeb: {
    gap: 56,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonLargeWeb: {
    width: 40,
    height: 40,
  },
  headerTextContainer: {
    flex: 1,
    gap: 4,
  },
  headerTextContainerLargeWeb: {
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.primary100,
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
  flowContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  flowContainerLargeWeb: {
    paddingHorizontal: 48,
    paddingTop: 8,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: c.textDividers,
    marginHorizontal: 16,
  },
  dividerLargeWeb: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: c.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  scrollContentLargeWeb: {
    padding: 48,
    paddingBottom: 32,
    width: '100%',
  },
  // Success Section
  successSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 6,
    backgroundColor: c.green10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: c.primary100,
  },
  successSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: c.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  // Summary Card
  summaryCard: {
    backgroundColor: c.green60,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: c.textDividers,
    padding: 16,
    gap: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textWhite,
  },
  summaryContent: {
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: c.green10,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '400',
    color: c.textWhite,
    textAlign: 'right',
  },
  // Phases Section
  phasesSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: c.textBody,
  },
  phaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.green10,
    borderWidth: 0.5,
    borderColor: c.green80,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    minHeight: 52,
  },
  phaseDescription: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: c.green90,
  },
  phaseDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseDate: {
    fontSize: 14,
    fontWeight: '300',
    color: c.textSecondary,
  },
  // Review Section
  reviewSection: {
    gap: 8,
  },
  reviewCard: {
    borderWidth: 0.5,
    borderColor: c.textDividers,
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: c.textBody,
  },
  reviewSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: c.textSecondary,
  },
  reviewLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  starButton: {
    padding: 4,
  },
  inlineReviewForm: {
    gap: 16,
  },
  reviewInput: {
    backgroundColor: c.primary10,
    borderWidth: 0.5,
    borderColor: c.primary100,
    borderRadius: 8,
    padding: 8,
    height: 84,
    fontSize: 14,
    fontWeight: '100',
    color: c.primary100,
    textAlignVertical: 'top',
  },
  submitReviewButton: {
    backgroundColor: c.primary70,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: c.textDividers,
  },
  submitReviewText: {
    fontSize: 16,
    fontWeight: '400',
    color: c.textWhite,
  },
  editReviewButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelEditButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.textDividers,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelEditText: {
    fontSize: 16,
    fontWeight: '400',
    color: c.textBody,
  },
  updateReviewButton: {
    flex: 2,
    backgroundColor: c.primary70,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  existingReviewContainer: {
    gap: 12,
    paddingTop: 8,
  },
  existingReviewComment: {
    fontSize: 14,
    fontWeight: '400',
    color: c.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  reviewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.primary70,
  },
  reviewActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.primary70,
  },
  deleteButton: {
    borderColor: c.error,
  },
  deleteText: {
    color: c.error,
  },
  // Actions Section
  actionsSection: {
    gap: 16,
    marginTop: 8,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 0.5,
    borderColor: c.primary70,
    borderRadius: 8,
    padding: 16,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: c.primary70,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: c.green70,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: c.textWhite,
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
    color: c.primary100,
    lineHeight: 42,
  },
  titleSubtext: {
    fontSize: 20,
    fontWeight: '300',
    color: c.textSecondary,
    lineHeight: 20,
  }
  });
}

