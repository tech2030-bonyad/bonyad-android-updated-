import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  TextInput,
  Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather } from '@expo/vector-icons';
// import { PieChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_ENDPOINTS, buildApiUrl } from '../config/api';
import { storage } from '../utils/storage';
import {
  getAvailableProjects,
  getMyProjects,
  getMyAssignedProjects,
  getTechnicianMyBidsAsProjectRows,
  mergeUserHasBidFlag,
  fetchProjectById,
} from '../services/ProjectService';
import AlertPopup, { useAlertPopup } from '../components/AlertPopup';
import ConfirmationPopup, { useConfirmationPopup } from '../components/ConfirmationPopup';
import ProjectDetailModal from './ProjectDetailModal';
import ProjectDetailScreen from './ProjectDetailScreen';
import PendingProjectScreen from './PendingProjectScreen';
import BidReceivedProjectScreen from './BidReceivedProjectScreen';
import ApprovedProjectScreen from './ApprovedProjectScreen';
import BidFormModal from './BidFormModal';
import VisitRequestModal from './VisitRequestModal';
// PhaseEditingPage is now integrated into ApprovedProjectScreen via PhaseManagementModal
import ContractSigningProjectScreen from './ContractSigningProjectScreen';
import InProgressProjectScreen from './InProgressProjectScreen';
import UserPhaseViewPage from './UserPhaseViewPage';
// UserPhaseReviewPage removed - PHASE_PLANNING now uses ApprovedProjectScreen
// ContractSigningPage and UserContractSigningPage replaced by ContractSigningProjectScreen
// ProjectProgressPage and UserProjectProgressPage replaced by InProgressProjectScreen
import CompletedProjectScreen from './CompletedProjectScreen';
import TechnicianProfileView from './TechnicianProfileView';
import OwnerProjectEditScreen from './OwnerProjectEditScreen';
import NewProjectView from './NewProjectView';
import ConversationalAIForm from './ConversationalAIForm';
import ManualProjectForm from './ManualProjectForm';
import SmallTasksListScreen from './SmallTasksListScreen';
import ProjectTypeSelectionScreen from './ProjectTypeSelectionScreen';
import SmallTaskTypeSelectionScreen from './SmallTaskTypeSelectionScreen';
import SmallTaskRequestForm from './SmallTaskRequestForm';
import SmallTaskDetailScreen from './SmallTaskDetailScreen';
import PendingSmallTaskScreen from './PendingSmallTaskScreen';
import AssignedSmallTaskScreen from './AssignedSmallTaskScreen';
import SmallTaskPaymentScreen from './SmallTaskPaymentScreen';
import InProgressSmallTaskScreen from './InProgressSmallTaskScreen';
import CompletedSmallTaskScreen from './CompletedSmallTaskScreen';
import AnimatedProjectTypeToggle from '../components/AnimatedProjectTypeToggle';

interface ProjectsScreenProps {
  onBack?: () => void;
  filter?: 'all' | 'available' | 'running' | 'approved' | 'completed' | 'bid_received' | 'direct_offers';
  /** When set, filter available projects by this service category id (e.g. from Home → Category → View available projects) */
  initialServiceCategoryId?: number | null;
  /** When set, auto-open this project's detail screen on first mount (pass the full project object) */
  initialProject?: any;
  /** When set, auto-open this small task's detail screen on first mount (pass the full task object) */
  initialSmallTask?: any;
  /** When 'small', show small tasks list on first mount (e.g. from Home "Available small tasks") */
  initialProjectType?: 'large' | 'small';
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onViewTechnician?: (technicianId: number) => void;
  onBookAppointment?: (technicianId: number, technicianName: string, projectId?: number) => void;
  onRequestVisit?: (userId: number, userName: string, projectId?: number) => void;
  onFilterChange?: (filter: 'all' | 'available' | 'running' | 'approved' | 'completed' | 'bid_received' | 'direct_offers') => void;
}

interface Project {
  id: number;
  description: string;
  budget: number;
  status: string;
  address: string;
  serviceNameEn: string;
  serviceNameAr: string;
  serviceId: number;
  /** Normalized from API for region filtering (same as web) */
  regionId?: number;
  /** Category (main service group) when using category/subcategory API */
  serviceCategory?: { id: number; nameEn?: string; nameAr?: string } | null;
  createdAt: string;
  timeRequiredDays?: number;
  requirements?: string[];
  needsVisit?: boolean;
  needsBooking?: boolean;
  /** Open market: hide projects the technician already bid on (same as web) */
  userHasBid?: boolean;
  /** Bids count (when from API) - same as web card */
  bidCount?: number;
  /** Visit requests count (when from API) - same as web card */
  visitRequestCount?: number;
  assignedTechnician?: {
    id: number;
    name: string;
  } | null;
  phases?: Array<{
    id: number;
    phaseNumber: number;
    description: string;
    moneySpent: number;
    timeSpentDays: number;
  }>;
}

interface Service {
  id: number;
  nameEn: string;
  nameAr: string;
  description: string;
  imageUrl: string;
}

/** Region from GET /api/regions (aligned with web ProjectsScreen) */
interface Region {
  id: number;
  nameAr: string;
  nameEn: string;
  techniciansCount?: number;
}

const CONTAINER_PADDING = 16; // Padding from Figma design
const CARD_GAP = 12; // Gap between cards in a row (24px / 2)

// Figma Design Colors
const FIGMA_COLORS = {
  // Blues
  primary100: '#003867',
  primary70: '#00549B',
  primary60: '#005DAC',
  primary50: '#1A6DB4',
  primary40: '#4D8EC5',
  primary30: '#80AED6',
  primary20: '#B3CEE6',
  primary10: '#E6EFF7',
  // Text
  textHeaders: '#003867',
  textBody: '#383838',
  textSecondary: '#A3A3A3',
  textPrimary: '#6E6E6E',
  textWhite: '#FFFFFF',
  // Amber
  amber60: '#FFB703',
  amber10: '#FFF2CF',
  // Purple
  purple70: '#5E0BA1',
  purple60: '#6A0DAD',
  purple10: '#EFE6F5',
  // Background
  background: '#F0F0F0',
  white: '#FFFFFF',
};

export default function ProjectsScreen({ onBack, filter = 'available', initialServiceCategoryId, initialProject, initialSmallTask, initialProjectType, onOpenChat, onViewTechnician, onBookAppointment, onRequestVisit, onFilterChange }: ProjectsScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();

  const screenWidthForAnimation = Dimensions.get('window').width;
  const screenSlideX = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    screenSlideX.setValue(-screenWidthForAnimation);
    screenOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(screenSlideX, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBackScreen = useCallback(() => {
    Animated.parallel([
      Animated.timing(screenOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(screenSlideX, { toValue: screenWidthForAnimation, duration: 220, useNativeDriver: true }),
    ]).start(() => onBack?.());
  }, [onBack]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  /** When set, list is filtered by this category id (from Home → Category → View available projects) */
  const [serviceCategoryFilterId, setServiceCategoryFilterId] = useState<number | null>(initialServiceCategoryId ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showBidForm, setShowBidForm] = useState(false);
  const [showVisitRequest, setShowVisitRequest] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [localFilter, setLocalFilter] = useState<'all' | 'available' | 'running' | 'approved' | 'completed' | 'bid_received' | 'direct_offers'>(filter || 'available');
  // When initialSmallTask is provided, start on the status screen to avoid flash of list/loading
  const getInitialSmallTaskPage = (): 'list' | 'contract-signing' | 'progress' | 'user-phase-view' | 'user-contract-signing' | 'user-progress' | 'completed-project' | 'technician-profile' | 'project-detail' | 'owner-edit' | 'project-detail-screen' | 'pending-project' | 'bid-received-project' | 'technician-pending-project' | 'technician-bid-received' | 'approved-project' | 'technician-approved-project' | 'new-project' | 'project-type-selection' | 'small-task-type-selection' | 'small-task-request-form' | 'ai-form' | 'manual-form' | 'small-tasks-list' | 'small-task-detail' | 'pending-small-task' | 'assigned-small-task' | 'small-task-payment' | 'in-progress-small-task' | 'completed-small-task' => {
    if (!initialSmallTask) return 'list';
    const status = (initialSmallTask.status || 'PENDING').toUpperCase();
    switch (status) {
      case 'PENDING': return 'pending-small-task';
      case 'ACCEPTED':
      case 'ASSIGNED': return 'assigned-small-task';
      case 'IN_PROGRESS': return 'in-progress-small-task';
      case 'COMPLETED': return 'completed-small-task';
      case 'CANCELLED': return 'small-task-detail';
      default: return 'small-task-detail';
    }
  };
  const [projectType, setProjectType] = useState<'large' | 'small'>(() =>
    initialProjectType ?? (initialSmallTask ? 'small' : 'large')
  );
  const [selectedTaskType, setSelectedTaskType] = useState<any>(null);
  const [smallTasksRefreshTrigger, setSmallTasksRefreshTrigger] = useState(0);
  // New pages for technicians and users
  const [currentPage, setCurrentPage] = useState<'list' | 'contract-signing' | 'progress' | 'user-phase-view' | 'user-contract-signing' | 'user-progress' | 'completed-project' | 'technician-profile' | 'project-detail' | 'owner-edit' | 'project-detail-screen' | 'pending-project' | 'bid-received-project' | 'technician-pending-project' | 'technician-bid-received' | 'approved-project' | 'technician-approved-project' | 'new-project' | 'project-type-selection' | 'small-task-type-selection' | 'small-task-request-form' | 'ai-form' | 'manual-form' | 'small-tasks-list' | 'small-task-detail' | 'pending-small-task' | 'assigned-small-task' | 'small-task-payment' | 'in-progress-small-task' | 'completed-small-task'>(getInitialSmallTaskPage);
  const [selectedProject, setSelectedProject] = useState<Project | null>(() => initialSmallTask ?? null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [smallTaskPaymentAmount, setSmallTaskPaymentAmount] = useState<number>(0);
  const [showAndroidPhaseFilterModal, setShowAndroidPhaseFilterModal] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<'all' | number>('all');
  const [showRegionFilterModal, setShowRegionFilterModal] = useState(false);

  const phaseAllowsRunningFlows =
    localFilter === 'running' || localFilter === 'all' || localFilter === 'approved';

  // Animate list content when switching between Small and Large (slide from left)
  const listContentOpacity = useRef(new Animated.Value(1)).current;
  const listContentTranslateX = useRef(new Animated.Value(0)).current;
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showDeleteConfirmation, hideConfirmation } = useConfirmationPopup();

  // Refs to ensure auto-open effects only fire once per mount
  const didOpenInitialProject = useRef(false);
  const didOpenInitialTask = useRef(false);

  /** Animate out (slide left) → switch project type → animate in (slide in from left) */
  const handleProjectTypeChange = useCallback((type: 'large' | 'small') => {
    if (type === projectType) return;
    const slideDistance = Dimensions.get('window').width * 0.15; // ~15% of screen width
    // Outgoing: slide current content left and fade out
    Animated.parallel([
      Animated.timing(listContentOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(listContentTranslateX, {
        toValue: -slideDistance,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setProjectType(type);
      if (type === 'small') setLocalFilter('available');
      // Incoming: start off-screen to the left, then slide in to center
      listContentTranslateX.setValue(-slideDistance);
      Animated.parallel([
        Animated.timing(listContentOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(listContentTranslateX, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [projectType]);

  /** Back from root list only: go to Home when onBack provided, else stay on list. */
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      setCurrentPage('list');
      setSelectedProject(null);
      setSelectedTechnicianId(null);
    }
  }, [onBack]);

  /** Stack-aware back: pop to projects list. Use for all sub-screens so back returns to list, not Home. */
  const goToProjectList = useCallback(() => {
    setCurrentPage('list');
    setSelectedProject(null);
    setSelectedTechnicianId(null);
  }, []);

  /** Back to small task type selection (when leaving request form). */
  const goToSmallTaskTypeSelection = useCallback(() => {
    setCurrentPage('small-task-type-selection');
  }, []);

  /** Back to project type selection (when leaving new project / manual / AI). */
  const goToProjectTypeSelection = useCallback(() => {
    setCurrentPage('project-type-selection');
  }, []);

  /** Back to new-project view (when leaving AI or manual form). */
  const goToNewProject = useCallback(() => {
    setCurrentPage('new-project');
  }, []);

  // Update local filter when prop changes
  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);

  // When parent asks to show small tasks list (e.g. from Home "Available small tasks")
  useEffect(() => {
    if (initialProjectType === 'small') {
      setProjectType('small');
    }
  }, [initialProjectType]);

  // When navigating from Home → Category → View available projects, apply category filter
  useEffect(() => {
    if (initialServiceCategoryId != null) {
      setServiceCategoryFilterId(initialServiceCategoryId);
    }
  }, [initialServiceCategoryId]);

  // Auto-open a specific project when initialProject is provided (e.g. from Home screen card tap).
  // Uses the project object directly — no extra API call, status is already correct.
  useEffect(() => {
    if (!initialProject || !userRole || didOpenInitialProject.current) return;
    didOpenInitialProject.current = true;
    handleProjectCardPress(initialProject as Project);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProject, userRole]);

  // Auto-open a specific small task when initialSmallTask is provided (e.g. from Home screen card tap).
  // Uses the task object directly — no extra API call, status is already correct.
  useEffect(() => {
    if (!initialSmallTask || !userRole || didOpenInitialTask.current) return;
    didOpenInitialTask.current = true;
    setProjectType('small');
    const status = (initialSmallTask.status || 'PENDING').toUpperCase();
    switch (status) {
      case 'PENDING': setCurrentPage('pending-small-task'); break;
      case 'ACCEPTED':
      case 'ASSIGNED': setCurrentPage('assigned-small-task'); break;
      case 'IN_PROGRESS': setCurrentPage('in-progress-small-task'); break;
      case 'COMPLETED': setCurrentPage('completed-small-task'); break;
      case 'CANCELLED': setCurrentPage('small-task-detail'); break;
      default: setCurrentPage('small-task-detail');
    }
    setSelectedProject(initialSmallTask as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSmallTask, userRole]);

  // Calculate responsive breakpoints
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1024;
  const columns = IS_LARGE_WEB ? 2 : 1;

  // Calculate dynamic card width based on screen size
  const cardWidth = React.useMemo(() => {
    const availableWidth = screenWidth - (CONTAINER_PADDING * 2) - CARD_GAP;
    return availableWidth / 2;
  }, [screenWidth]);

  // Handle filter change
  const handleFilterChange = (newFilter: 'all' | 'available' | 'running' | 'approved' | 'completed' | 'bid_received' | 'direct_offers') => {
    setLocalFilter(newFilter);
    if (Platform.OS === 'android') {
      setShowAndroidPhaseFilterModal(false);
    }
    if (onFilterChange) {
      onFilterChange(newFilter);
    }
  };

  const androidPhaseFilterOptions = React.useMemo(() => {
    const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
    const opts: { key: 'all' | 'available' | 'running' | 'approved' | 'completed' | 'bid_received' | 'direct_offers'; label: string }[] = [
      { key: 'all', label: t('projectsScreen.all') },
      { key: 'available', label: isTechnician ? t('projectsScreen.available') : t('projectsScreen.availableProjects') },
      { key: 'running', label: isTechnician ? t('projectsScreen.inProgress') : t('projectsScreen.running') },
      { key: 'approved', label: t('projectsScreen.approvedFilter') },
    ];
    if (isTechnician) {
      opts.push({ key: 'direct_offers', label: t('projectsScreen.directAssigned') });
      opts.push({ key: 'bid_received', label: t('projectsScreen.bidding') });
    }
    opts.push({
      key: 'completed',
      label: isTechnician ? t('projectsScreen.completed') : t('projectsScreen.completedProjects'),
    });
    return opts;
  }, [userRole, t, i18n.language]);

  const androidPhaseFilterButtonLabel = React.useMemo(() => {
    const hit = androidPhaseFilterOptions.find((o) => o.key === localFilter);
    return hit?.label ?? t('projectsScreen.projects');
  }, [androidPhaseFilterOptions, localFilter, t]);

  const regionFilterButtonLabel = React.useMemo(() => {
    if (selectedRegionId === 'all') return t('projectsScreen.all');
    const r = regions.find((x) => x.id === selectedRegionId);
    if (!r) return t('projectsScreen.all');
    return i18n.language === 'ar' ? r.nameAr : r.nameEn;
  }, [selectedRegionId, regions, i18n.language, t]);

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setShowProjectDetail(false);
    setCurrentPage('owner-edit');
  };

  const handleDeleteProject = async (project: Project) => {
    showDeleteConfirmation(
      t('projectsScreen.deleteProject'),
      t('projectsScreen.deleteConfirmMessage'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          if (!token) {
            showError(t('projectsScreen.pleaseLoginAgain'), t('projectsScreen.error'));
            return;
          }

          const deleteUrl = buildApiUrl(API_ENDPOINTS.PROJECTS.DELETE.replace(':id', project.id.toString()));
          const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok || response.status === 204) {
            showSuccess(t('projectsScreen.projectDeletedSuccess'), t('projectsScreen.success'));
            loadProjects();
          } else {
            const errorText = await response.text();
            throw new Error(errorText || t('projectsScreen.failedToDeleteProject'));
          }
        } catch (error: any) {
          console.error('❌ Failed to delete project:', error);
          showError(error.message || t('projectsScreen.failedToDeleteProject'), t('projectsScreen.error'));
        }
      }
    );
  };

  // Listen for screen dimension changes (especially important for web resize)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    loadUserRole();
    loadServices();
    loadRegions();
  }, []);

  // Load projects on mount and when filter / technician region changes (same as web)
  useEffect(() => {
    loadProjects();
  }, [localFilter, selectedRegionId]);

  useEffect(() => {
    if (userRole?.toUpperCase() !== 'TECHNICIAN' || localFilter !== 'available') {
      setShowRegionFilterModal(false);
    }
  }, [localFilter, userRole]);

  const loadUserRole = async () => {
    const role = await storage.getUserRole();
    setUserRole(role);
  };

  useEffect(() => {
    filterProjects();
  }, [selectedCategory, projects, userRole, localFilter, searchQuery, serviceCategoryFilterId, selectedRegionId, regions]);

  const loadServices = async () => {
    try {
      const url = buildApiUrl(API_ENDPOINTS.SERVICES.LIST);
      console.log('🔍 Fetching services from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Services API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded services:', data);
        console.log('📊 Number of services:', data.length);
        setServices(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load services - Status:', response.status);
        console.error('❌ Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ Error loading services:', error);
    }
  };

  const loadRegions = async () => {
    try {
      setIsLoadingRegions(true);
      const url = buildApiUrl(API_ENDPOINTS.ZONES.LIST);
      const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (response.ok) {
        const data = await response.json();
        setRegions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('❌ Error loading regions:', error);
    } finally {
      setIsLoadingRegions(false);
    }
  };

  const loadProjects = async () => {
    try {
      const role = await storage.getUserRole();
      const token = await storage.getAuthToken();
      const isTechnician = role?.toUpperCase() === 'TECHNICIAN';
      const currentFilter = localFilter;

      let rawList: any[] = [];

      if (isTechnician) {
        if (currentFilter === 'available' || currentFilter === 'all') {
          try {
            const regionId =
              currentFilter === 'available' && selectedRegionId !== 'all'
                ? Number(selectedRegionId)
                : undefined;
            rawList = await getAvailableProjects(regionId);
            rawList = await mergeUserHasBidFlag(rawList);
          } catch (e) {
            console.error('❌ Available projects failed:', e);
            setProjects([]);
            return;
          }
        } else if (currentFilter === 'bid_received') {
          rawList = await getTechnicianMyBidsAsProjectRows();
        } else {
          rawList = await getMyAssignedProjects(
            currentFilter === 'direct_offers' ? { type: 'DIRECT_ASSIGNMENT' } : undefined
          );
        }
      } else {
        if (!token) {
          console.error('❌ No auth token for MY_PROJECTS');
          setIsLoading(false);
          setRefreshing(false);
          return;
        }
        try {
          rawList = await getMyProjects();
        } catch (e) {
          console.error('❌ MY_PROJECTS failed:', e);
          rawList = [];
        }
      }

      console.log('📊 Loaded projects count:', rawList.length, 'filter:', currentFilter, 'technician:', isTechnician);
      setProjects(rawList);
    } catch (error) {
      console.error('❌ Error loading projects:', error);
      setProjects([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
    loadProjects();
  };

  const handleViewTechnician = (technicianId: number) => {
    console.log('🔵 [ProjectsScreen] Viewing technician profile:', technicianId);
    setSelectedTechnicianId(technicianId);
    setCurrentPage('technician-profile');
  };

  const filterProjects = () => {
    let filtered = [...projects];
    const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';

    // Status filtering (same rules as web ProjectsScreen; 'all' = no status filter)
    if (localFilter === 'all') {
      // keep full list from API
    } else if (localFilter === 'available') {
      if (isTechnician) {
        filtered = filtered.filter((p) => !(p as { userHasBid?: boolean }).userHasBid);
      } else {
        filtered = filtered.filter(
          (p) => p.status === 'PENDING' || p.status === 'BID_RECEIVED'
        );
      }
    } else if (localFilter === 'running') {
      if (isTechnician) {
        filtered = filtered.filter((p) => {
          const status = (p.status || '').toUpperCase();
          return status !== 'PENDING' && status !== 'COMPLETED';
        });
      } else {
        const runningStatuses = [
          'APPROVED',
          'PHASE_PLANNING',
          'PHASE_PLANNING_APPROVED',
          'CONTRACT_SIGNING',
          'IN_PROGRESS',
        ];
        filtered = filtered.filter((p) => runningStatuses.includes((p.status || '').toUpperCase()));
      }
    } else if (localFilter === 'approved') {
      filtered = filtered.filter((p) => (p.status || '').toUpperCase().trim() === 'APPROVED');
    } else if (localFilter === 'completed') {
      filtered = filtered.filter((p) => (p.status || '').toUpperCase() === 'COMPLETED');
    } else if (localFilter === 'bid_received' || localFilter === 'direct_offers') {
      // API already scopes list; no extra status filter
    }

    // Service category (same as web: selectedCategory is service id or "All")
    if (selectedCategory !== 'All') {
      const serviceId = parseInt(selectedCategory, 10);
      if (!Number.isNaN(serviceId)) {
        filtered = filtered.filter((p) => p.serviceId === serviceId);
      }
    }

    // Step 2b: Filter by service category when opened from Home → Category → View available projects
    if (serviceCategoryFilterId != null) {
      filtered = filtered.filter(p => {
        const categoryId = (p as Project).serviceCategory?.id;
        return categoryId === serviceCategoryFilterId;
      });
    }

    // Technician Available: region filter (same rules as web ProjectsScreen)
    if (isTechnician && localFilter === 'available' && selectedRegionId !== 'all') {
      const selectedRegion = regions.find((r) => r.id === selectedRegionId);
      const selectedIdNum = Number(selectedRegionId);
      filtered = filtered.filter((p) => {
        const projectRegionId = p.regionId != null ? Number(p.regionId) : undefined;
        if (projectRegionId !== undefined && Number(projectRegionId) === selectedIdNum) return true;
        if (!selectedRegion) return false;
        const nameEn = (p as any).regionNameEn ?? (p as any).region_name_en ?? (p as any).region?.nameEn ?? '';
        const nameAr = (p as any).regionNameAr ?? (p as any).region_name_ar ?? (p as any).region?.nameAr ?? '';
        if (nameEn && nameEn === selectedRegion.nameEn) return true;
        if (nameAr && nameAr === selectedRegion.nameAr) return true;
        const address = (p.address || '').toLowerCase();
        if (address && selectedRegion.nameEn && address.includes(selectedRegion.nameEn.toLowerCase())) return true;
        if (address && selectedRegion.nameAr && address.includes(selectedRegion.nameAr.trim())) return true;
        return false;
      });
    }

    // Step 3: Apply search query filter (applies to all platforms)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const description = (p.description || '').toLowerCase();
        const serviceNameEn = (p.serviceNameEn || '').toLowerCase();
        const serviceNameAr = (p.serviceNameAr || '').toLowerCase();
        const address = (p.address || '').toLowerCase();
        return (
          description.includes(query) ||
          serviceNameEn.includes(query) ||
          serviceNameAr.includes(query) ||
          address.includes(query)
        );
      });
    }

    setFilteredProjects(filtered);
  };

  const formatBudget = (budget: number) => {
    return new Intl.NumberFormat('en-US').format(budget);
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#FFA500';
      case 'IN_PROGRESS':
      case 'ACCEPTED':
        return '#4CAF50';
      case 'COMPLETED':
        return '#2196F3';
      default:
        return colors.textSecondary;
    }
  };

  const riyalLogo = theme === 'dark'
    ? require('../../assets/saudi_riyal_logo_dark.svg')
    : require('../../assets/saudi_riyal_logo.svg');

  const getStatusLabel = (status: string) => {
    if (!status) return t('projectsScreen.unknown');
    const key: Record<string, string> = {
      PENDING: t('projectsScreen.statusPending'),
      BID_RECEIVED: t('projectsScreen.statusBidReceived'),
      APPROVED: t('projectsScreen.statusApproved'),
      PHASE_PLANNING: t('projectsScreen.statusPhasePlanning'),
      PHASE_PLANNING_APPROVED: t('projectsScreen.statusPhasePlanningApproved'),
      IN_PROGRESS: t('projectsScreen.statusInProgress'),
      COMPLETED: t('projectsScreen.statusCompleted'),
      CANCELLED: t('projectsScreen.statusCancelled'),
      CONTRACT_SIGNING: t('projectsScreen.statusContractSigning'),
      ACCEPTED: t('projectsScreen.statusAccepted'),
      ASSIGNED: t('projectsScreen.statusAssigned'),
    };
    const normalized = (status || '').trim().toUpperCase();
    if (key[normalized]) return key[normalized];
    return status
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const computePhaseMetrics = (phases: Project['phases']) => {
    if (!phases || phases.length === 0) {
      return {
        totalPercent: 0,
        totalSpent: 0,
        percentData: [],
        budgetData: [],
      };
    }

    const totalBudget = phases.reduce((sum, phase) => sum + (phase.moneySpent || 0), 0);
    const percentData = phases.map((phase) => ({
      name: `${t('projectsScreen.phase')} ${phase.phaseNumber}`,
      value: Math.max(1, Math.round((phase.moneySpent / totalBudget) * 100)),
    }));

    const budgetData = phases.map((phase) => ({
      label: `${t('projectsScreen.p')} ${phase.phaseNumber}`,
      value: phase.moneySpent,
    }));

    return {
      totalPercent: 100,
      totalSpent: totalBudget,
      percentData,
      budgetData,
    };
  };

  /** Same as web ProjectsScreen: GET /projects/:id then merge list row (keeps userHasBid, bidCount, etc.). */
  const handleProjectCardPress = (item: Project) => {
    void openProjectFromList(item);
  };

  const openProjectFromList = async (item: Project) => {
    const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
    const full = await fetchProjectById(item.id);
    const merged = (full ? { ...item, ...full, id: Number(item.id) } : item) as Project;
    const status = (merged.status || item.status || '').toUpperCase();

    console.log('🔵 [ProjectsScreen] Card pressed - Status:', status, 'isTechnician:', isTechnician, 'detail:', !!full);
    setSelectedProject(merged);

    if (localFilter === 'all') {
      if (status === 'PENDING') {
        setCurrentPage(isTechnician ? 'technician-pending-project' : 'pending-project');
      } else if (status === 'BID_RECEIVED' || (status.includes('BID') && status.includes('RECEIVED'))) {
        if (isTechnician) setCurrentPage('technician-bid-received');
        else setCurrentPage('bid-received-project');
      } else if (status === 'APPROVED' || status === 'PHASE_PLANNING' || status === 'PHASE_PLANNING_APPROVED') {
        setCurrentPage(isTechnician ? 'technician-approved-project' : 'approved-project');
      } else if (status === 'CONTRACT_SIGNING') {
        setCurrentPage(isTechnician ? 'contract-signing' : 'user-contract-signing');
      } else if (status === 'IN_PROGRESS') {
        setCurrentPage(isTechnician ? 'progress' : 'user-progress');
      } else if (status === 'COMPLETED') {
        setCurrentPage('completed-project');
      } else {
        setShowProjectDetail(true);
      }
      return;
    }

    if (isTechnician && (localFilter === 'running' || localFilter === 'approved')) {
      console.log('🔵 [ProjectsScreen] Technician clicked on running project');
      if (status === 'APPROVED') {
        setCurrentPage('technician-approved-project');
      } else if (status === 'PHASE_PLANNING' || status === 'PHASE_PLANNING_APPROVED') {
        setCurrentPage('technician-approved-project');
      } else if (status === 'CONTRACT_SIGNING') {
        setCurrentPage('contract-signing');
      } else if (status === 'IN_PROGRESS') {
        setCurrentPage('progress');
      } else {
        setShowProjectDetail(true);
      }
    } else if (!isTechnician && (localFilter === 'running' || localFilter === 'approved')) {
      console.log('🔵 [ProjectsScreen] User clicked on running project');
      if (status === 'APPROVED') {
        setCurrentPage('approved-project');
      } else if (status === 'PHASE_PLANNING' || status === 'PHASE_PLANNING_APPROVED') {
        setCurrentPage('approved-project');
      } else if (status === 'CONTRACT_SIGNING') {
        setCurrentPage('user-contract-signing');
      } else if (status === 'IN_PROGRESS') {
        setCurrentPage('user-progress');
      } else {
        setShowProjectDetail(true);
      }
    } else if (localFilter === 'completed' || status === 'COMPLETED') {
      setCurrentPage('completed-project');
    } else if (isTechnician && localFilter === 'available') {
      setCurrentPage('technician-pending-project');
    } else if (isTechnician && localFilter === 'bid_received') {
      setCurrentPage('technician-bid-received');
    } else if (!isTechnician && localFilter === 'available' && status === 'PENDING') {
      setCurrentPage('pending-project');
    } else if (!isTechnician && localFilter === 'available' && (status === 'BID_RECEIVED' || (status.includes('BID') && status.includes('RECEIVED')))) {
      setCurrentPage('bid-received-project');
    } else {
      setShowProjectDetail(true);
    }
  };

  // Figma-styled project card for grid layout (theme-aware)
  const renderFigmaProjectCard = ({ item, index }: { item: Project; index: number }) => {
    const serviceName = i18n.language === 'ar' ? item.serviceNameAr : item.serviceNameEn;
    return (
      <TouchableOpacity
        style={[
          styles.figmaProjectCard,
          { marginRight: index % 2 === 0 ? CARD_GAP : 0, backgroundColor: colors.cardBackground, borderColor: colors.border },
        ]}
        onPress={() => handleProjectCardPress(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.figmaProjectTitle, { color: colors.text }]} numberOfLines={1}>
          {serviceName || t('projectsScreen.project')}
        </Text>
        <Text style={[styles.figmaProjectDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description || t('projectsScreen.projectDescription')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProjectCard = ({ item }: { item: Project }) => {
    const serviceName = i18n.language === 'ar' ? item.serviceNameAr : item.serviceNameEn;
    const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
    const phasesCount =
      Array.isArray(item.phases) && item.phases.length > 0
        ? item.phases.length
        : (item as any)?.phaseCount ?? 0;
    const statusLabel = getStatusLabel(item.status || '');
    const phaseMetrics = computePhaseMetrics(item.phases);

    return (
      <View
        style={[
          styles.projectCard,
          columns > 1 ? styles.projectCardLargeWeb : styles.projectCardFullWidth,
          { backgroundColor: colors.cardBackground },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleProjectCardPress(item)}
          activeOpacity={0.7}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
                {serviceName || t('projectsScreen.project')}
              </Text>
              {item.status && (
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {statusLabel}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.metaItem}>
              <Image source={riyalLogo} style={styles.riyalLogo} resizeMode="contain" />
              <Text style={[styles.budgetText, { color: colors.primary }]}>
                {formatBudget(item.budget)}
              </Text>
            </View>
          </View>

          {/* Description */}
          {item.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3} ellipsizeMode="tail">
              {item.description}
            </Text>
          ) : null}

          {/* Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="briefcase-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {serviceName}
              </Text>
            </View>
            {phasesCount > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="layers-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {t('projectsScreen.phases')}: {phasesCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Technician Action Buttons */}
        {isTechnician && localFilter === 'available' && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.primary }]}
              onPress={() => {
                setSelectedProject(item);
                setShowVisitRequest(true);
              }}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]} numberOfLines={1} ellipsizeMode="tail">
                {t('projectsScreen.askForVisit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setSelectedProject(item);
                setShowBidForm(true);
              }}
            >
              <Ionicons name="cash-outline" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]} numberOfLines={1} ellipsizeMode="tail">
                {t('projectsScreen.bidNow')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* User Action Buttons - Edit and Delete for available projects */}
        {!isTechnician && localFilter === 'available' && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary, flex: 1 }]}
              onPress={(e) => {
                e?.stopPropagation?.();
                handleEditProject(item);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]} numberOfLines={1} ellipsizeMode="tail">
                {t('projectsScreen.edit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error, flex: 1, marginLeft: 8 }]}
              onPress={(e) => {
                e?.stopPropagation?.();
                handleDeleteProject(item);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]} numberOfLines={1} ellipsizeMode="tail">
                {t('projectsScreen.delete')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Skip loading screen when navigating directly to a small task status screen (e.g. from Home card tap).
  // We have all data needed; avoid flash of "Available" header + spinner before status screen.
  if (isLoading && !initialSmallTask) {
    const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
    return (
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: colors.background, opacity: screenOpacity, transform: [{ translateX: screenSlideX }] },
        ]}
      >
        <View style={[styles.header, styles.headerLTR, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
          {onBack ? (
            <TouchableOpacity onPress={handleBackScreen}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
            {localFilter === 'all' ? t('projectsScreen.all') :
             localFilter === 'available' ? (isTechnician ? t('projectsScreen.available') : t('projectsScreen.availableProjects')) :
             localFilter === 'running' ? (isTechnician ? t('projectsScreen.inProgress') : t('projectsScreen.runningProjects')) :
             localFilter === 'approved' ? t('projectsScreen.approvedFilter') :
             localFilter === 'bid_received' ? t('projectsScreen.bidding') :
             localFilter === 'direct_offers' ? t('projectsScreen.directAssigned') :
             localFilter === 'completed' ? (isTechnician ? t('projectsScreen.completed') : t('projectsScreen.completedProjects')) :
             t('projectsScreen.projects')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Animated.View>
    );
  }

  // If showing a specific page, render only that page
  if (currentPage !== 'list' && selectedProject && currentPage !== 'technician-profile') {
    // Pages will be rendered below in the return statement
    // Return early to prevent rendering the list
  }
  
  if (currentPage === 'technician-profile' && selectedTechnicianId) {
    // Technician profile page will be rendered below
    // Return early to prevent rendering the list
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background, opacity: screenOpacity, transform: [{ translateX: screenSlideX }] },
      ]}
    >
      {/* New Pages for Technicians in Running Projects */}
      
      {/* Approved Project Screen - Technician View (handles both APPROVED and PHASE_PLANNING) */}
      {userRole?.toUpperCase() === 'TECHNICIAN' && 
       phaseAllowsRunningFlows && 
       selectedProject && 
       currentPage === 'technician-approved-project' && (
        <ApprovedProjectScreen
          project={selectedProject}
          isTechnician={true}
          onBack={goToProjectList}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] ApprovedProjectScreen (Technician) success - reloading projects');
            loadProjects();
          }}
          onOpenChat={onOpenChat}
        />
      )}

      {userRole?.toUpperCase() === 'TECHNICIAN' && 
       phaseAllowsRunningFlows && 
       selectedProject && 
       currentPage === 'contract-signing' && (
        <ContractSigningProjectScreen
          project={selectedProject}
          isTechnician={true}
          onBack={goToProjectList}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] ContractSigningProjectScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() === 'TECHNICIAN' && 
       phaseAllowsRunningFlows && 
       selectedProject && 
       currentPage === 'progress' && (
        <InProgressProjectScreen
          project={selectedProject}
          isTechnician={true}
          onBack={goToProjectList}
          onOpenChat={onOpenChat}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] InProgressProjectScreen (Technician) success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {/* User Pages for Running Projects */}
      
      {/* Approved Project Screen - User View */}
      {userRole?.toUpperCase() !== 'TECHNICIAN' && 
       phaseAllowsRunningFlows && 
       selectedProject && 
       currentPage === 'approved-project' && (
        <ApprovedProjectScreen
          project={selectedProject}
          onBack={goToProjectList}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] ApprovedProjectScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onProceedToContract={() => {
            console.log('🔵 [ProjectsScreen] Proceeding to contract signing');
            setCurrentPage('user-contract-signing');
          }}
          onOpenChat={onOpenChat}
        />
      )}

      {/* Legacy UserPhaseViewPage - kept for backwards compatibility */}
      {userRole?.toUpperCase() !== 'TECHNICIAN' && 
       phaseAllowsRunningFlows && 
       selectedProject && 
       currentPage === 'user-phase-view' && (
        <UserPhaseViewPage
          project={selectedProject}
          onBack={goToProjectList}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] UserPhaseViewPage success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {/* UserPhaseReviewPage removed - PHASE_PLANNING now uses ApprovedProjectScreen */}

      {userRole?.toUpperCase() !== 'TECHNICIAN' && 
       phaseAllowsRunningFlows && 
       selectedProject && 
       currentPage === 'user-contract-signing' && (
        <ContractSigningProjectScreen
          project={selectedProject}
          isTechnician={false}
          onBack={goToProjectList}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] ContractSigningProjectScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() !== 'TECHNICIAN' && 
       phaseAllowsRunningFlows && 
       selectedProject && 
       currentPage === 'user-progress' && (
        <InProgressProjectScreen
          project={selectedProject}
          isTechnician={false}
          onBack={goToProjectList}
          onOpenChat={onOpenChat}
          onBookAppointment={onBookAppointment}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] InProgressProjectScreen (User) success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {selectedProject && 
       currentPage === 'completed-project' && (
        <CompletedProjectScreen
          project={selectedProject}
          isTechnician={userRole?.toUpperCase() === 'TECHNICIAN'}
          onBack={goToProjectList}
          onOpenChat={onOpenChat}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] CompletedProjectScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onStartNewProject={() => {
            console.log('🔵 [ProjectsScreen] Start new project from CompletedProjectScreen');
            setCurrentPage('new-project');
            setSelectedProject(null);
          }}
          onViewAllProjects={() => {
            console.log('🔵 [ProjectsScreen] View all projects from CompletedProjectScreen');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() !== 'TECHNICIAN' &&
       selectedProject &&
       currentPage === 'owner-edit' && (
        <OwnerProjectEditScreen
          projectId={selectedProject.id}
          onBack={goToProjectList}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] OwnerProjectEditScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {/* Pending Project Screen - For PENDING status */}
      {userRole?.toUpperCase() !== 'TECHNICIAN' &&
       selectedProject &&
       currentPage === 'pending-project' && (
        <PendingProjectScreen
          project={selectedProject}
          onBack={goToProjectList}
          onEditProject={() => {
            console.log('🔵 [ProjectsScreen] Edit project from PendingProjectScreen');
            setCurrentPage('owner-edit');
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] PendingProjectScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {/* Bid Received Project Screen - For BID_RECEIVED status (User view) */}
      {userRole?.toUpperCase() !== 'TECHNICIAN' &&
       selectedProject &&
       currentPage === 'bid-received-project' && (
        <BidReceivedProjectScreen
          project={selectedProject}
          onBack={goToProjectList}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] BidReceivedProjectScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onOpenChat={onOpenChat}
          onViewTechnician={(technicianId) => {
            setSelectedTechnicianId(technicianId);
            setCurrentPage('technician-profile');
          }}
        />
      )}

      {/* Technician Bid Received Project Screen - For technicians viewing their bids (My Bids tab) */}
      {userRole?.toUpperCase() === 'TECHNICIAN' &&
       selectedProject &&
       currentPage === 'technician-bid-received' && (
        <BidReceivedProjectScreen
          project={selectedProject}
          isTechnician={true}
          onBack={goToProjectList}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] TechnicianBidReceivedProjectScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onOpenChat={onOpenChat}
          onViewTechnician={(technicianId) => {
            setSelectedTechnicianId(technicianId);
            setCurrentPage('technician-profile');
          }}
        />
      )}

      {/* Technician Pending Project Screen - For technicians viewing available projects */}
      {userRole?.toUpperCase() === 'TECHNICIAN' &&
       selectedProject &&
       currentPage === 'technician-pending-project' && (
        <PendingProjectScreen
          project={selectedProject}
          isTechnician={true}
          onBack={goToProjectList}
          onAskForVisit={() => {
            console.log('🔵 [ProjectsScreen] Ask for Visit from TechnicianPendingProjectScreen');
            setShowVisitRequest(true);
          }}
          onBidNow={() => {
            console.log('🔵 [ProjectsScreen] Bid Now from TechnicianPendingProjectScreen');
            setShowBidForm(true);
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] TechnicianPendingProjectScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}
 
      {/* Technician Profile View */}
      {currentPage === 'technician-profile' && selectedTechnicianId && (
        <TechnicianProfileView
          technicianId={selectedTechnicianId}
          onBack={goToProjectList}
        />
      )}

      {/* Projects List - Only show if not on a specific page */}
      {currentPage === 'list' && (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Modal
        visible={showRegionFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRegionFilterModal(false)}
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
            activeOpacity={1}
            onPress={() => setShowRegionFilterModal(false)}
          />
          <View style={[styles.androidPhaseFilterModalRoot, { pointerEvents: 'box-none' }]} pointerEvents="box-none">
            <View style={[styles.androidPhaseFilterModalSheet, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
                <TouchableOpacity
                  style={[
                    styles.androidFilterOption,
                    { borderBottomColor: colors.border },
                    selectedRegionId === 'all' && { backgroundColor: colors.primary + '18' },
                  ]}
                  onPress={() => {
                    setSelectedRegionId('all');
                    setShowRegionFilterModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.androidFilterOptionText,
                      {
                        color: selectedRegionId === 'all' ? colors.primary : colors.textSecondary,
                        fontWeight: selectedRegionId === 'all' ? '600' : '400',
                      },
                    ]}
                  >
                    {t('projectsScreen.all')}
                  </Text>
                  {selectedRegionId === 'all' ? <Feather name="check" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
                {isLoadingRegions ? (
                  <View style={{ padding: 16 }}>
                    <Text style={{ color: colors.textSecondary }}>{t('projectsScreen.loadingRegions')}</Text>
                  </View>
                ) : (
                  regions.map((region) => (
                    <TouchableOpacity
                      key={region.id}
                      style={[
                        styles.androidFilterOption,
                        { borderBottomColor: colors.border },
                        selectedRegionId === region.id && { backgroundColor: colors.primary + '18' },
                      ]}
                      onPress={() => {
                        setSelectedRegionId(region.id);
                        setShowRegionFilterModal(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.androidFilterOptionText,
                          {
                            color: selectedRegionId === region.id ? colors.primary : colors.textSecondary,
                            fontWeight: selectedRegionId === region.id ? '600' : '400',
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {i18n.language === 'ar' ? region.nameAr : region.nameEn}
                      </Text>
                      {selectedRegionId === region.id ? <Feather name="check" size={18} color={colors.primary} /> : null}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Android Design - New Redesign */}
      {Platform.OS === 'android' ? (
        <View style={[styles.androidContainer, { backgroundColor: colors.background }]}>
          {/* Project Type Selector - Toggle (always visible) */}
          <View style={styles.androidProjectTypeSelector}>
            <AnimatedProjectTypeToggle
              selectedType={projectType}
              onTypeChange={handleProjectTypeChange}
            />
          </View>

          {/* Show Small Tasks or Large Projects - slide in from left when switching */}
          <Animated.View
            style={[
              { flex: 1 },
              {
                opacity: listContentOpacity,
                transform: [{ translateX: listContentTranslateX }],
              },
            ]}
          >
          {projectType === 'small' ? (
            <ScrollView
              style={[styles.androidContent, { backgroundColor: colors.background }]}
              contentContainerStyle={styles.androidContentContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
            >
              <SmallTasksListScreen
                onBack={handleBack}
                isTechnician={userRole?.toUpperCase() === 'TECHNICIAN'}
                onTaskPress={(task) => {
                  // Route to appropriate status screen based on task status
                  // Per README: PENDING → ACCEPTED (after bid acceptance) → IN_PROGRESS (after payment) → COMPLETED
                  const status = (task.status || 'PENDING').toUpperCase();
                  switch (status) {
                    case 'PENDING':
                      setCurrentPage('pending-small-task');
                      break;
                    case 'ACCEPTED':
                    case 'ASSIGNED':
                      // ACCEPTED = bid accepted, payment required (per README)
                      // ASSIGNED = legacy status, treat same as ACCEPTED
                      setCurrentPage('assigned-small-task');
                      break;
                    case 'IN_PROGRESS':
                      setCurrentPage('in-progress-small-task');
                      break;
                    case 'COMPLETED':
                      setCurrentPage('completed-small-task');
                      break;
                    case 'CANCELLED':
                      // Show detail screen for cancelled tasks
                      setCurrentPage('small-task-detail');
                      break;
                    default:
                      setCurrentPage('small-task-detail');
                  }
                  setSelectedProject(task as any);
                }}
                filter={localFilter === 'available' ? 'available' : localFilter === 'running' ? 'in-progress' : localFilter === 'completed' ? 'completed' : 'available'}
                refreshTrigger={smallTasksRefreshTrigger}
              />
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Header: title, phase tabs (same as web), service category, search */}
              <View style={[styles.androidHeaderSection, { backgroundColor: colors.cardBackground }]}>
                <View style={styles.androidTitleSection}>
                  <Text style={[styles.androidPageTitle, { color: colors.text }]}>
                    {(() => {
                      const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
                      return localFilter === 'all'
                        ? t('projectsScreen.all')
                        : localFilter === 'available'
                          ? (isTechnician ? t('projectsScreen.available') : t('projectsScreen.availableProjects'))
                          : localFilter === 'running'
                            ? (isTechnician ? t('projectsScreen.inProgress') : t('projectsScreen.runningProjects'))
                            : localFilter === 'approved'
                              ? t('projectsScreen.approvedFilter')
                            : localFilter === 'bid_received'
                              ? t('projectsScreen.bidding')
                              : localFilter === 'direct_offers'
                                ? t('projectsScreen.directAssigned')
                                : localFilter === 'completed'
                                  ? (isTechnician ? t('projectsScreen.completed') : t('projectsScreen.completedProjects'))
                                  : t('projectsScreen.myProjects');
                    })()}
                  </Text>
                  <Text style={[styles.androidProjectCount, { color: colors.textSecondary }]}>
                    {filteredProjects.length} {t('projectsScreen.totalProjects')}
                  </Text>
                </View>

                <View style={styles.androidFilterContainer}>
                  <TouchableOpacity
                    style={[styles.androidFilterButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                    onPress={() => setShowAndroidPhaseFilterModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.androidFilterButtonText, { color: colors.text }]} numberOfLines={1}>
                      {androidPhaseFilterButtonLabel}
                    </Text>
                    <Feather name="chevron-down" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {userRole?.toUpperCase() === 'TECHNICIAN' && localFilter === 'available' && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
                      {t('Select Region')}
                    </Text>
                    <TouchableOpacity
                      style={[styles.androidFilterButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                      onPress={() => setShowRegionFilterModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.androidFilterButtonText, { color: colors.text }]} numberOfLines={1}>
                        {regionFilterButtonLabel}
                      </Text>
                      <Feather name="chevron-down" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}

                <Modal
                  visible={showAndroidPhaseFilterModal}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowAndroidPhaseFilterModal(false)}
                >
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity
                      style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
                      activeOpacity={1}
                      onPress={() => setShowAndroidPhaseFilterModal(false)}
                    />
                    <View style={[styles.androidPhaseFilterModalRoot, { pointerEvents: 'box-none' }]} pointerEvents="box-none">
                      <View style={[styles.androidPhaseFilterModalSheet, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                        <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 360 }}>
                          {androidPhaseFilterOptions.map((opt) => (
                            <TouchableOpacity
                              key={opt.key}
                              style={[
                                styles.androidFilterOption,
                                { borderBottomColor: colors.border },
                                localFilter === opt.key && { backgroundColor: colors.primary + '18' },
                              ]}
                              onPress={() => handleFilterChange(opt.key)}
                            >
                              <Text
                                style={[
                                  styles.androidFilterOptionText,
                                  { color: localFilter === opt.key ? colors.primary : colors.textSecondary, fontWeight: localFilter === opt.key ? '600' : '400' },
                                ]}
                                numberOfLines={2}
                              >
                                {opt.label}
                              </Text>
                              {localFilter === opt.key ? <Feather name="check" size={18} color={colors.primary} /> : null}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </View>
                </Modal>

                <View style={[styles.categoryFilterWrapper, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
                    <TouchableOpacity
                      style={[
                        styles.categoryButton,
                        { backgroundColor: selectedCategory === 'All' ? colors.primary : colors.border, borderWidth: 0 },
                      ]}
                      onPress={() => setSelectedCategory('All')}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          {
                            color: selectedCategory === 'All' ? '#FFFFFF' : colors.text,
                            fontWeight: selectedCategory === 'All' ? 'bold' : 'normal',
                          },
                        ]}
                      >
                        {t('projectsScreen.all')}
                      </Text>
                    </TouchableOpacity>
                    {services.map((service) => (
                      <TouchableOpacity
                        key={service.id}
                        style={[
                          styles.categoryButton,
                          { backgroundColor: selectedCategory === service.id.toString() ? colors.primary : colors.border, borderWidth: 0 },
                        ]}
                        onPress={() => setSelectedCategory(service.id.toString())}
                      >
                        <Text
                          style={[
                            styles.categoryButtonText,
                            {
                              color: selectedCategory === service.id.toString() ? '#FFFFFF' : colors.text,
                              fontWeight: selectedCategory === service.id.toString() ? 'bold' : 'normal',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {i18n.language === 'ar' ? service.nameAr : service.nameEn}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={[styles.androidSearchContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <Feather name="search" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.androidSearchInput, { color: colors.text }]}
                    placeholder={t('projectsScreen.searchPlaceholder')}
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
              </View>

              {/* Project Cards List */}
              <FlatList
                data={filteredProjects}
                extraData={[localFilter, selectedCategory, searchQuery]}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item: project }) => {
                  const truncateDescription = (text: string): string => {
                    if (!text) return t('projectsScreen.projectDescription');
                    const words = text.trim().split(/\s+/);
                    if (words.length <= 7) return text;
                    return words.slice(0, 7).join(' ') + '...';
                  };
                  const statusLabel = getStatusLabel(project.status || '');
                  const statusColor = getStatusColor(project.status || '');
                  const formatCardDate = (dateString: string) => {
                    if (!dateString) return '';
                    try {
                      return new Date(dateString).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    } catch { return dateString; }
                  };
                  const bidsCount = project.bidCount ?? 0;
                  const visitsCount = project.visitRequestCount ?? 0;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.androidProjectCard,
                        { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        i18n.language === 'ar' && { direction: 'ltr' },
                      ]}
                      onPress={() => handleProjectCardPress(project)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.androidCardHeaderRow, i18n.language === 'ar' && { justifyContent: 'space-between' }]}>
                        {i18n.language === 'ar' ? (
                          <>
                            <View style={[styles.androidStatusBadge, { backgroundColor: statusColor + '20' }]}>
                              <Text style={[styles.androidStatusText, { color: statusColor }]}>{statusLabel}</Text>
                            </View>
                            <Text style={[styles.androidProjectId, { color: colors.textSecondary }]}>#{project.id}</Text>
                          </>
                        ) : (
                          <>
                            <Text style={[styles.androidProjectId, { color: colors.textSecondary }]}>#{project.id}</Text>
                            <View style={[styles.androidStatusBadge, { backgroundColor: statusColor + '20' }]}>
                              <Text style={[styles.androidStatusText, { color: statusColor }]}>{statusLabel}</Text>
                            </View>
                          </>
                        )}
                      </View>
                      <View style={styles.androidCardHeader}>
                        <Text style={[styles.androidProjectTitle, { color: colors.text }]} numberOfLines={1}>
                          {project.serviceNameEn || project.serviceNameAr || `${t('projectsScreen.project')} ${project.id}`}
                        </Text>
                        <View style={styles.androidPriceContainer}>
                          <ExpoImage
                            source={riyalLogo}
                            style={styles.androidRiyalLogo}
                            contentFit="contain"
                          />
                          <Text style={[styles.androidPriceText, { color: colors.primary }]}>
                            {formatBudget(project.budget)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.androidProjectDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                        {truncateDescription(project.description || '')}
                      </Text>
                      {project.address ? (
                        <View style={styles.androidCardMetaRow}>
                          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.androidCardMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {project.address}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.androidCardMetaRow}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.androidCardMetaText, { color: colors.textSecondary }]}>
                          {formatCardDate(project.createdAt)}
                        </Text>
                      </View>
                      {(bidsCount > 0 || visitsCount > 0) ? (
                        <View style={styles.androidCardStatsRow}>
                          <View style={[styles.androidCardStatItem, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="hand-left-outline" size={14} color={colors.primary} />
                            <Text style={[styles.androidCardStatValue, { color: colors.primary }]}>{bidsCount}</Text>
                            <Text style={[styles.androidCardStatLabel, { color: colors.textSecondary }]}>{t('projectsScreen.bids')}</Text>
                          </View>
                          <View style={[styles.androidCardStatItem, { backgroundColor: '#FF9500' + '15' }]}>
                            <Ionicons name="calendar-outline" size={14} color="#FF9500" />
                            <Text style={[styles.androidCardStatValue, { color: '#FF9500' }]}>{visitsCount}</Text>
                            <Text style={[styles.androidCardStatLabel, { color: colors.textSecondary }]}>{t('projectsScreen.visits')}</Text>
                          </View>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.androidEmptyContainer}>
                    <Ionicons name="folder-outline" size={80} color={colors.textSecondary} />
                    <Text style={[styles.androidEmptyText, { color: colors.textSecondary }]}>
                      {t('projectsScreen.noProjectsFound')}
                    </Text>
                  </View>
                }
                contentContainerStyle={[
                  styles.androidListContentContainer,
                  userRole?.toUpperCase() === 'TECHNICIAN' && {
                    paddingBottom: Math.max(insets.bottom + 32, 48),
                  },
                  filteredProjects.length === 0 && styles.androidListEmptyContent,
                ]}
                style={[styles.androidContent, { backgroundColor: colors.background }]}
                showsVerticalScrollIndicator={true}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                  />
                }
              />
            </View>
            )}
          </Animated.View>

          {/* FAB – new project (users only; technicians browse/bid, no create-from-here) */}
          {userRole?.toUpperCase() !== 'TECHNICIAN' && (
            <TouchableOpacity
              style={[styles.androidFab, { backgroundColor: colors.primary }]}
              onPress={() => setCurrentPage('project-type-selection')}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={28} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {/* Original Header - For non-Android platforms */}
      {!IS_LARGE_WEB && (() => {
        const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
        return (
          <View style={[styles.header, styles.headerLTR, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
            {onBack ? (
              <TouchableOpacity onPress={handleBackScreen}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
              {localFilter === 'all' ? t('projectsScreen.all') :
               localFilter === 'available' ? (isTechnician ? t('projectsScreen.available') : t('projectsScreen.availableProjects')) :
               localFilter === 'running' ? (isTechnician ? t('projectsScreen.inProgress') : t('projectsScreen.runningProjects')) :
               localFilter === 'approved' ? t('projectsScreen.approvedFilter') :
               localFilter === 'bid_received' ? t('projectsScreen.bidding') :
               localFilter === 'direct_offers' ? t('projectsScreen.directAssigned') :
               localFilter === 'completed' ? (isTechnician ? t('projectsScreen.completed') : t('projectsScreen.completedProjects')) :
               t('projectsScreen.projects')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
        );
      })()}

          {/* Filter Tabs - All Screens - Only for non-Android */}
          {(Platform.OS !== 'android' as any) && (() => {
        const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
        return (
          <View style={[IS_LARGE_WEB ? styles.tabsContainer : styles.mobileTabsContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={IS_LARGE_WEB ? undefined : styles.mobileTabsContent}
            >
              <View style={IS_LARGE_WEB ? styles.tabsRow : styles.mobileTabsRow}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { borderBottomColor: localFilter === 'available' ? colors.primary : 'transparent' }
                ]}
                onPress={() => handleFilterChange('available')}
              >
                <Text style={[
                  styles.tabButtonText,
                  localFilter === 'available' && styles.tabButtonActive,
                  { color: localFilter === 'available' ? colors.primary : colors.textSecondary, fontSize: scaledSize(14) }
                ]}>
                  {t('projectsScreen.available')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { borderBottomColor: localFilter === 'running' ? colors.primary : 'transparent' }
                ]}
                onPress={() => handleFilterChange('running')}
              >
                <Text style={[
                  styles.tabButtonText,
                  localFilter === 'running' && styles.tabButtonActive,
                  { color: localFilter === 'running' ? colors.primary : colors.textSecondary, fontSize: scaledSize(14) }
                ]}>
                  {isTechnician ? t('projectsScreen.inProgress') : t('projectsScreen.running')}
                </Text>
              </TouchableOpacity>
              {isTechnician && (
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    { borderBottomColor: localFilter === 'direct_offers' ? colors.primary : 'transparent' }
                  ]}
                  onPress={() => handleFilterChange('direct_offers')}
                >
                  <Text style={[
                    styles.tabButtonText,
                    localFilter === 'direct_offers' && styles.tabButtonActive,
                    { color: localFilter === 'direct_offers' ? colors.primary : colors.textSecondary }
                  ]}>
                    {t('projectsScreen.directAssigned')}
                  </Text>
                </TouchableOpacity>
              )}
              {isTechnician && (
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    { borderBottomColor: localFilter === 'bid_received' ? colors.primary : 'transparent' }
                  ]}
                  onPress={() => handleFilterChange('bid_received')}
                >
                  <Text style={[
                    styles.tabButtonText,
                    localFilter === 'bid_received' && styles.tabButtonActive,
                    { color: localFilter === 'bid_received' ? colors.primary : colors.textSecondary }
                  ]}>
                    {t('projectsScreen.bidding')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { borderBottomColor: localFilter === 'completed' ? colors.primary : 'transparent' }
                ]}
                onPress={() => handleFilterChange('completed')}
              >
                <Text style={[
                  styles.tabButtonText,
                  localFilter === 'completed' && styles.tabButtonActive,
                  { color: localFilter === 'completed' ? colors.primary : colors.textSecondary }
                ]}>
                  {t('projectsScreen.completed')}
                </Text>
              </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        );
      })()}

          {(Platform.OS !== 'android' as any) &&
            userRole?.toUpperCase() === 'TECHNICIAN' &&
            localFilter === 'available' && (
              <View
                style={[
                  styles.categoryFilterWrapper,
                  { backgroundColor: colors.background, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
                ]}
              >
                <Text style={[styles.categoryButtonText, { color: colors.textSecondary, flexShrink: 0, marginRight: 8 }]}>{t('Select Region')}:</Text>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.cardBackground,
                  }}
                  onPress={() => setShowRegionFilterModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryButtonText, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                    {regionFilterButtonLabel}
                  </Text>
                  <Feather name="chevron-down" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

          {/* Category Filter - Only for non-Android */}
          {(Platform.OS !== 'android' as any) && (
      <View style={[styles.categoryFilterWrapper, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
        <TouchableOpacity
          key="All"
          style={[
            styles.categoryButton,
            { 
              backgroundColor: selectedCategory === 'All' ? colors.primary : colors.border,
              borderWidth: 0,
            }
          ]}
          onPress={() => setSelectedCategory('All')}
        >
          <Text
            style={[
              styles.categoryButtonText,
              { 
                color: selectedCategory === 'All' ? '#FFFFFF' : colors.text,
                fontWeight: selectedCategory === 'All' ? 'bold' : 'normal',
              }
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.categoryButton,
              { 
                backgroundColor: selectedCategory === service.id.toString() ? colors.primary : colors.border,
                borderWidth: 0,
              }
            ]}
            onPress={() => setSelectedCategory(service.id.toString())}
          >
            <Text
              style={[
                styles.categoryButtonText,
                { 
                  color: selectedCategory === service.id.toString() ? '#FFFFFF' : colors.text,
                  fontWeight: selectedCategory === service.id.toString() ? 'bold' : 'normal',
                }
              ]}
              numberOfLines={1}
            >
              {i18n.language === 'ar' ? service.nameAr : service.nameEn}
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>
          )}

          {/* Projects Grid - Only for non-Android */}
          {(Platform.OS !== 'android' as any) && (
            <>
      {filteredProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No projects found
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          renderItem={renderProjectCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          removeClippedSubviews={false}
          key={`flatlist-${screenWidth}`} // Force re-render on width change
          {...(Platform.OS === 'web' && {
            style: { width: '100%' },
          })}
        />
      )}

      {/* Floating Action Button - Add New Project (Only for Users, not Technicians) */}
      {userRole?.toUpperCase() !== 'TECHNICIAN' && (
        <TouchableOpacity
          style={styles.figmaFab}
          onPress={() => setCurrentPage('project-type-selection')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={FIGMA_COLORS.amber60} />
        </TouchableOpacity>
      )}
            </>
          )}
        </>
      )}

      {/* Project Detail Modal - Show ProjectDetailModal for general project details */}
      {/* Note: Specific screens like PendingProjectScreen and BidReceivedProjectScreen are now 
          used for specific statuses via currentPage navigation */}
        <ProjectDetailModal
          visible={showProjectDetail && currentPage === 'list'}
          project={selectedProject}
          onClose={() => {
            setShowProjectDetail(false);
            setSelectedProject(null);
          }}
          onOpenChat={onOpenChat}
          onViewTechnician={handleViewTechnician}
          onBookAppointment={onBookAppointment}
          onSuccess={() => {
            // Reload projects after phase approval, contract signing, or any update
            loadProjects();
          }}
        />

          </View>
      )}

      {/* Bid Form Modal - Only show for technicians (outside of currentPage === 'list' to work from any screen) */}
      {selectedProject && userRole?.toUpperCase() === 'TECHNICIAN' && (
        <BidFormModal
          visible={showBidForm}
          project={selectedProject}
          onClose={() => {
            setShowBidForm(false);
            // Don't clear selectedProject if on technician-pending-project page
            if (currentPage !== 'technician-pending-project') {
              setSelectedProject(null);
            }
          }}
          onSuccess={() => {
            setShowBidForm(false);
            loadProjects(); // Refresh projects after successful bid
            // Go back to list after successful bid
            if (currentPage === 'technician-pending-project') {
              setCurrentPage('list');
              setSelectedProject(null);
            }
          }}
        />
      )}

      {/* Visit Request Modal - Only show for technicians (outside of currentPage === 'list' to work from any screen) */}
      {selectedProject && userRole?.toUpperCase() === 'TECHNICIAN' && (
        <VisitRequestModal
          visible={showVisitRequest}
          project={selectedProject}
          onClose={() => {
            setShowVisitRequest(false);
            // Don't clear selectedProject if on technician-pending-project page
            if (currentPage !== 'technician-pending-project') {
              setSelectedProject(null);
            }
          }}
          onSuccess={() => {
            setShowVisitRequest(false);
            loadProjects(); // Refresh projects after successful visit request
            // Go back to list after successful visit request
            if (currentPage === 'technician-pending-project') {
              setCurrentPage('list');
              setSelectedProject(null);
            }
          }}
        />
      )}

      {/* Project Type Selection Screen - First screen when clicking New Project */}
      {currentPage === 'project-type-selection' && (
        <ProjectTypeSelectionScreen
          onSelectLarge={() => {
            console.log('🔵 [ProjectsScreen] Selected Large Project');
            setCurrentPage('new-project');
          }}
          onSelectSmall={() => {
            console.log('🔵 [ProjectsScreen] Selected Small Task');
            setCurrentPage('small-task-type-selection');
          }}
          onBack={goToProjectList}
        />
      )}

      {/* Small Task Type Selection Screen */}
      {currentPage === 'small-task-type-selection' && (
        <SmallTaskTypeSelectionScreen
          onSelectTaskType={(taskType) => {
            console.log('🔵 [ProjectsScreen] Selected task type:', taskType);
            setSelectedTaskType(taskType);
            setCurrentPage('small-task-request-form');
          }}
          onBack={goToProjectList}
        />
      )}

      {/* Small Task Request Form */}
      {currentPage === 'small-task-request-form' && selectedTaskType && (
        <SmallTaskRequestForm
          taskType={selectedTaskType}
          onBack={goToSmallTaskTypeSelection}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] Small task request created successfully');
            // Trigger refresh of small tasks list
            setSmallTasksRefreshTrigger(prev => prev + 1);
            setProjectType('small');
            setCurrentPage('list');
            setSelectedTaskType(null);
          }}
        />
      )}

      {/* New Project View - For creating large projects */}
      {currentPage === 'new-project' && (
        <NewProjectView
          onNavigateToAI={() => {
            console.log('🔵 [ProjectsScreen] Navigate to AI project creation');
            setCurrentPage('ai-form');
          }}
          onNavigateToManual={() => {
            console.log('🔵 [ProjectsScreen] Navigate to manual project creation');
            setCurrentPage('manual-form');
          }}
          onBack={goToProjectTypeSelection}
        />
      )}

      {/* AI Project Creation Form */}
      {currentPage === 'ai-form' && (
        <ConversationalAIForm
          onBack={goToNewProject}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] AI Form success - reloading projects');
            loadProjects();
            setCurrentPage('list');
          }}
        />
      )}

      {/* Manual Project Creation Form */}
      {currentPage === 'manual-form' && (
        <ManualProjectForm
          onBack={goToNewProject}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] Manual Form success - reloading projects');
            loadProjects();
            setCurrentPage('list');
          }}
        />
      )}

      {/* Small Task Status Screens */}
      {currentPage === 'pending-small-task' && selectedProject && (
        <PendingSmallTaskScreen
          task={selectedProject as any}
          onBack={goToProjectList}
          onSuccess={() => {
            setSmallTasksRefreshTrigger(prev => prev + 1);
            setCurrentPage('list');
          }}
          isTechnician={userRole?.toUpperCase() === 'TECHNICIAN'}
          onViewTechnician={(technicianId) => {
            setSelectedTechnicianId(technicianId);
            setCurrentPage('technician-profile');
          }}
        />
      )}

      {currentPage === 'assigned-small-task' && selectedProject && (
        <AssignedSmallTaskScreen
          task={selectedProject as any}
          onBack={goToProjectList}
          onSuccess={() => {
            setSmallTasksRefreshTrigger(prev => prev + 1);
            setCurrentPage('list');
          }}
          isTechnician={userRole?.toUpperCase() === 'TECHNICIAN'}
          onOpenChat={onOpenChat}
          onViewTechnician={(technicianId) => {
            setSelectedTechnicianId(technicianId);
            setCurrentPage('technician-profile');
          }}
          onPay={(task, amount) => {
            setSelectedProject(task as any);
            setSmallTaskPaymentAmount(amount);
            setCurrentPage('small-task-payment');
          }}
        />
      )}

      {currentPage === 'small-task-payment' && selectedProject && (
        <SmallTaskPaymentScreen
          task={selectedProject as any}
          amount={smallTaskPaymentAmount}
          onBack={goToProjectList}
          onSuccess={() => {
            setSmallTasksRefreshTrigger(prev => prev + 1);
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {currentPage === 'in-progress-small-task' && selectedProject && (
        <InProgressSmallTaskScreen
          task={selectedProject as any}
          onBack={goToProjectList}
          onSuccess={() => {
            setSmallTasksRefreshTrigger(prev => prev + 1);
            setCurrentPage('list');
          }}
          isTechnician={userRole?.toUpperCase() === 'TECHNICIAN'}
          onOpenChat={onOpenChat}
        />
      )}

      {currentPage === 'completed-small-task' && selectedProject && (
        <CompletedSmallTaskScreen
          task={selectedProject as any}
          onBack={goToProjectList}
          onSuccess={() => {
            setSmallTasksRefreshTrigger(prev => prev + 1);
            setCurrentPage('list');
          }}
          isTechnician={userRole?.toUpperCase() === 'TECHNICIAN'}
          onOpenChat={onOpenChat}
          onViewTechnician={(technicianId) => {
            setSelectedTechnicianId(technicianId);
            setCurrentPage('technician-profile');
          }}
          onViewAllTasks={() => {
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {/* Small Task Detail Screen (Fallback) */}
      {currentPage === 'small-task-detail' && selectedProject && (
        <SmallTaskDetailScreen
          task={selectedProject as any}
          onBack={goToProjectList}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] Small task detail success');
            setSmallTasksRefreshTrigger(prev => prev + 1);
            setCurrentPage('list');
          }}
        />
      )}
      <View style={{ height: 40 }} />
      
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
    </Animated.View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLTR: {
    direction: 'ltr',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryFilterWrapper: {
    width: '100%',
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        display: 'flex' as any,
      },
    }),
  },
  categoryScroll: {
    width: '100%',
    ...Platform.select({
      web: {
        overflowX: 'auto' as any,
        overflowY: 'hidden' as any,
        WebkitOverflowScrolling: 'touch' as any,
      },
    }),
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    height: 60,
    ...Platform.select({
      web: {
        display: 'flex' as any,
        flexDirection: 'row' as any,
        flexWrap: 'nowrap' as any,
        minWidth: 'max-content' as any,
      },
    }),
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    height: 36,
    justifyContent: 'center' as any,
    alignItems: 'center' as any,
    ...Platform.select({
      web: {
        flexShrink: 0 as any,
        whiteSpace: 'nowrap' as any,
        display: 'inline-flex' as any,
      },
    }),
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    ...Platform.select({
      web: {
        whiteSpace: 'nowrap' as any,
      },
    }),
  },
  listContent: {
    padding: CONTAINER_PADDING,
    ...(Platform.OS === 'web' && {
      maxWidth: '100%',
      boxSizing: 'border-box' as any,
    } as any),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
    gap: CARD_GAP,
  },
  projectCard: {
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    flex: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden', // Ensure content doesn't overflow
    ...(Platform.OS === 'web' && {
      boxSizing: 'border-box' as any,
    } as any),
  },
  projectCardLargeWeb: {
    ...(Platform.OS === 'web' && {
      flexBasis: '48%',
      maxWidth: 'calc(50% - 8px)',
    } as any),
  },
  projectCardFullWidth: {
    ...(Platform.OS === 'web'
      ? {
          width: '100%',
          maxWidth: '100%',
        }
      : {}),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 20,
    flexShrink: 1,
    overflow: 'hidden',
    width: '100%',
    ...(Platform.OS === 'web' && {
      wordBreak: 'break-word' as any,
      overflowWrap: 'break-word' as any,
    } as any),
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 'auto',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riyalLogo: {
    width: 16,
    height: 16,
  },
  budgetText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  eyeIcon: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    flexShrink: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    minWidth: 0, // Allow button to shrink
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
    ...(Platform.OS === 'web' && {
      whiteSpace: 'nowrap' as any,
      overflow: 'hidden' as any,
      textOverflow: 'ellipsis' as any,
    } as any),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    ...Platform.select({
      web: {
        minHeight: '60vh' as any,
        paddingTop: 120,
        paddingBottom: 120,
      },
    }),
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  tabsContainer: {
    paddingHorizontal: 40,
    paddingTop: 20,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' as any,
      },
    }),
  },
  mobileTabsContainer: {
    borderBottomWidth: 1,
  },
  mobileTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mobileTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 0,
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: '100%',
        overflowX: 'auto' as any,
      },
    }),
  },
  tabButton: {
    paddingVertical: Platform.select({ web: 16, default: 10 }),
    paddingHorizontal: Platform.select({ web: 24, default: 16 }),
    borderBottomWidth: 3,
    minWidth: Platform.select({ web: 120, default: 80 }),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Platform.select({ web: 0, default: 20 }),
    backgroundColor: Platform.select({ 
      web: 'transparent', 
      default: 'transparent',
    }),
    ...Platform.select({
      web: {
        flexShrink: 0 as any,
        cursor: 'pointer' as any,
        userSelect: 'none' as any,
      },
      default: {
        marginRight: 8,
      },
    }),
  },
  tabButtonActive: {
    fontWeight: '700',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    ...Platform.select({
      web: {
        whiteSpace: 'nowrap' as any,
      },
    }),
  },
  // ==================== FIGMA DESIGN STYLES ====================
  figmaContent: {
    flex: 1,
    paddingHorizontal: CONTAINER_PADDING,
    paddingTop: 16,
  },
  figmaTitleSection: {
    marginBottom: 16,
  },
  figmaTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#003867', // FIGMA_COLORS.textHeaders
    marginBottom: 4,
  },
  figmaSubtitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#383838', // FIGMA_COLORS.textBody
  },
  figmaSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6EFF7', // FIGMA_COLORS.primary10
    borderWidth: 0.5,
    borderColor: '#003867', // FIGMA_COLORS.primary100
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 43,
    gap: 12,
    marginBottom: 16,
  },
  figmaSearchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '200',
    color: '#003867', // FIGMA_COLORS.primary100
    height: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  figmaViewAllRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  figmaViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  figmaViewAllText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#003867', // FIGMA_COLORS.primary100
    marginRight: 4,
  },
  figmaGridContainer: {
    paddingBottom: 80, // Space for FAB
  },
  figmaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  figmaProjectCard: {
    width: '48%',
    minWidth: 150,
    height: 100,
    borderWidth: 1,
    borderColor: '#00549B', // FIGMA_COLORS.primary70
    borderRadius: 8,
    padding: 8,
    marginBottom: CARD_GAP,
    justifyContent: 'center',
  },
  figmaProjectTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#383838', // FIGMA_COLORS.textBody
    marginBottom: 6,
  },
  figmaProjectDescription: {
    fontSize: 14,
    fontWeight: '300',
    color: '#A3A3A3', // FIGMA_COLORS.textSecondary
  },
  figmaFab: {
    position: 'absolute',
    right: 20,
    bottom: 100, // Above navigation bar
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF2CF', // FIGMA_COLORS.amber10
    borderWidth: 2,
    borderColor: '#FFB703', // FIGMA_COLORS.amber60
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 999,
    elevation: 4,
  },
  figmaEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  figmaEmptyText: {
    fontSize: 16,
    color: '#A3A3A3', // FIGMA_COLORS.textSecondary
    marginTop: 16,
  },
  // Android Design Styles
  androidContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  androidHeader: {
    backgroundColor: '#1e5a9e',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  androidLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  androidLogoBox: {
    width: 40,
    height: 40,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  androidLogoText: {
    marginLeft: 12,
  },
  androidLogoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  androidLogoSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  androidHeaderIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  androidHeaderIcon: {
    padding: 4,
  },
  androidContent: {
    flex: 1,
  },
  androidContentContainer: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  androidListContentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  androidListEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidHeaderSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#f8fafc',
  },
  androidDropdownOverlay: {
    position: 'absolute',
    top: 130, // Position below the filter button
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 999,
  },
  androidDropdownBackdrop: {
    position: 'absolute',
    top: -200,
    left: -100,
    right: -100,
    bottom: -1000,
    backgroundColor: 'transparent',
  },
  androidFilterDropdownOverlay: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  androidTitleSection: {
    marginBottom: 8,
  },
  androidPageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  androidProjectCount: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6b7280',
    marginBottom: 16,
  },
  androidSearchContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  androidSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1f2937',
  },
  androidViewAllContainer: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  androidViewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  androidPhaseFilterModalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  androidPhaseFilterModalSheet: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 400,
  },
  androidFilterContainer: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 10,
  },
  androidFilterButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  androidFilterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  androidFilterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  androidFilterDropdownContent: {
    flex: 1,
  },
  androidFilterDropdownContentContainer: {
    paddingVertical: 4,
    flexGrow: 1,
  },
  androidFilterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  androidFilterOptionActive: {
    backgroundColor: '#e6eff7',
  },
  androidFilterOptionText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6b7280',
  },
  androidFilterOptionTextActive: {
    fontWeight: '600',
    color: '#1e5a9e',
  },
  androidProjectGrid: {
    flexDirection: 'column',
  },
  androidProjectCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    paddingVertical: 20,
    marginBottom: 16,
    minHeight: 100,
  },
  androidCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  androidProjectId: {
    fontSize: 12,
    fontWeight: '500',
  },
  androidCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  androidProjectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  androidStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  androidStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  androidProjectDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9ca3af',
    marginBottom: 12,
  },
  androidCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  androidCardMetaText: {
    fontSize: 12,
    flex: 1,
  },
  androidCardStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  androidCardStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  androidCardStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  androidCardStatLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  androidPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  androidRiyalLogo: {
    width: 16,
    height: 16,
  },
  androidPriceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e5a9e',
  },
  androidFab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    backgroundColor: '#fbbf24',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  androidEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  androidEmptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  androidProjectTypeSelector: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
});

