import React, { useState, useEffect, useRef } from 'react';
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
  filter?: 'all' | 'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers';
  /** When set, filter available projects by this service category id (e.g. from Home → Category → View available projects) */
  initialServiceCategoryId?: number | null;
  onOpenChat?: (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => void;
  onViewTechnician?: (technicianId: number) => void;
  onBookAppointment?: (technicianId: number, technicianName: string, projectId?: number) => void;
  onRequestVisit?: (userId: number, userName: string, projectId?: number) => void;
  onFilterChange?: (filter: 'all' | 'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers') => void;
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
  /** Category (main service group) when using category/subcategory API */
  serviceCategory?: { id: number; nameEn?: string; nameAr?: string } | null;
  createdAt: string;
  timeRequiredDays?: number;
  requirements?: string[];
  needsVisit?: boolean;
  needsBooking?: boolean;
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

export default function ProjectsScreen({ onBack, filter = 'available', initialServiceCategoryId, onOpenChat, onViewTechnician, onBookAppointment, onRequestVisit, onFilterChange }: ProjectsScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  /** When set, list is filtered by this category id (from Home → Category → View available projects) */
  const [serviceCategoryFilterId, setServiceCategoryFilterId] = useState<number | null>(initialServiceCategoryId ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showBidForm, setShowBidForm] = useState(false);
  const [showVisitRequest, setShowVisitRequest] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [localFilter, setLocalFilter] = useState<'all' | 'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers'>(filter || 'available');
  const [projectType, setProjectType] = useState<'large' | 'small'>('large'); // Large or Small projects
  const [selectedTaskType, setSelectedTaskType] = useState<any>(null);
  const [smallTasksRefreshTrigger, setSmallTasksRefreshTrigger] = useState(0);
  // New pages for technicians and users
  const [currentPage, setCurrentPage] = useState<'list' | 'contract-signing' | 'progress' | 'user-phase-view' | 'user-contract-signing' | 'user-progress' | 'completed-project' | 'technician-profile' | 'project-detail' | 'owner-edit' | 'project-detail-screen' | 'pending-project' | 'bid-received-project' | 'technician-pending-project' | 'technician-bid-received' | 'approved-project' | 'technician-approved-project' | 'new-project' | 'project-type-selection' | 'small-task-type-selection' | 'small-task-request-form' | 'ai-form' | 'manual-form' | 'small-tasks-list' | 'small-task-detail' | 'pending-small-task' | 'assigned-small-task' | 'small-task-payment' | 'in-progress-small-task' | 'completed-small-task'>('list');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [smallTaskPaymentAmount, setSmallTaskPaymentAmount] = useState<number>(0);
  
  // Android Filter Dropdown State
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const dropdownAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;
  
  // Calculate fixed dropdown height for ScrollView
  const getFixedDropdownHeight = () => {
    const uniqueStatuses = getUniqueStatuses();
    const optionCount = 1 + uniqueStatuses.length; // "All" + statuses
    const screenHeight = Dimensions.get('window').height;
    const maxVisibleHeight = Math.min(screenHeight * 0.5, 300);
    const totalHeight = optionCount * 48; // 48px per option
    return totalHeight > maxVisibleHeight ? maxVisibleHeight : totalHeight;
  };
  
  // Custom popup hooks
  const { alertState, showError, showSuccess, hideAlert } = useAlertPopup();
  const { confirmState, showDeleteConfirmation, hideConfirmation } = useConfirmationPopup();

  // Update local filter when prop changes
  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);

  // When navigating from Home → Category → View available projects, apply category filter
  useEffect(() => {
    if (initialServiceCategoryId != null) {
      setServiceCategoryFilterId(initialServiceCategoryId);
    }
  }, [initialServiceCategoryId]);

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
  const handleFilterChange = (newFilter: 'all' | 'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers') => {
    setLocalFilter(newFilter);
    if (onFilterChange) {
      onFilterChange(newFilter);
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setShowProjectDetail(false);
    setCurrentPage('owner-edit');
  };

  const handleDeleteProject = async (project: Project) => {
    showDeleteConfirmation(
      t('Delete Project'),
      t('Are you sure you want to delete this project? This action cannot be undone.'),
      async () => {
        try {
          const token = await storage.getAuthToken();
          if (!token) {
            showError(t('Please login again'), t('Error'));
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
            showSuccess(t('Project deleted successfully'), t('Success'));
            loadProjects();
          } else {
            const errorText = await response.text();
            throw new Error(errorText || t('Failed to delete project'));
          }
        } catch (error: any) {
          console.error('❌ Failed to delete project:', error);
          showError(error.message || t('Failed to delete project'), t('Error'));
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
  }, []);

  // Android Filter Dropdown Animation
  useEffect(() => {
    if (showFilterDropdown) {
      Animated.parallel([
        Animated.timing(dropdownAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(dropdownAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(rotateAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showFilterDropdown]);

  const toggleFilterDropdown = () => {
    setShowFilterDropdown(!showFilterDropdown);
  };

  // Get unique project statuses from projects
  const getUniqueStatuses = () => {
    const statuses = new Set<string>();
    projects.forEach(project => {
      const status = (project.status || '').trim().toUpperCase();
      if (status) {
        statuses.add(status);
      }
    });
    return Array.from(statuses).sort();
  };

  const handleStatusSelect = (statusValue: string) => {
    // Create a filter state for status
    if (statusValue === 'All') {
      setSelectedCategory('All');
    } else {
      setSelectedCategory(statusValue);
    }
    setShowFilterDropdown(false);
  };

  const getStatusFilterLabel = (statusValue: string) => {
    if (statusValue === 'All') {
      return t('All');
    }
    return getStatusLabel(statusValue);
  };

  // Calculate dropdown height based on number of status options
  const getDropdownHeight = () => {
    const uniqueStatuses = getUniqueStatuses();
    const optionCount = 1 + uniqueStatuses.length; // "All" + statuses
    const screenHeight = Dimensions.get('window').height;
    // Show up to 6 items visible (288px), then enable scrolling
    // Max 50% of screen height to ensure it doesn't take too much space
    const maxVisibleHeight = Math.min(screenHeight * 0.5, 300);
    const totalHeight = optionCount * 48; // 48px per option
    
    // If we have more than 6 items, use maxVisibleHeight to enable scrolling
    if (totalHeight > maxVisibleHeight) {
      return maxVisibleHeight;
    }
    return totalHeight;
  };

  const dropdownHeight = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, getDropdownHeight()],
  });

  const dropdownOpacity = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const rotateInterpolate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Load projects on mount and when filter changes
  useEffect(() => {
    loadProjects();
  }, [localFilter]);

  const loadUserRole = async () => {
    const role = await storage.getUserRole();
    setUserRole(role);
  };

  useEffect(() => {
    filterProjects();
  }, [selectedCategory, projects, userRole, localFilter, searchQuery, serviceCategoryFilterId]);

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

  const loadProjects = async () => {
    try {
      // Get user role to determine which endpoint to use
      const role = await storage.getUserRole();
      const token = await storage.getAuthToken();
      const isTechnician = role?.toUpperCase() === 'TECHNICIAN';
      const currentFilter = localFilter;
      
      console.log('👤 User role:', role);
      console.log('🔍 Current filter:', currentFilter);

      let url: string;
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json',
      };

      // Add auth token for all authenticated endpoints
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Determine API endpoint based on role and filter
      if (isTechnician) {
        // TECHNICIAN ENDPOINTS (same as web: use auth for available projects)
        if (currentFilter === 'available') {
          // Available projects to bid on - same as web getAvailableProjects (with auth)
          url = buildApiUrl(API_ENDPOINTS.PROJECTS.LIST);
          // Keep Authorization - web uses it for GET /projects
        } else if (currentFilter === 'direct_offers') {
          // Direct Offers - Projects directly assigned to technician
          url = buildApiUrl(`${API_ENDPOINTS.PROJECTS.MY_ASSIGNED}?type=DIRECT_ASSIGNMENT`);
        } else if (currentFilter === 'running') {
          // My Assigned Projects - Projects where bid was accepted
          url = buildApiUrl(API_ENDPOINTS.PROJECTS.MY_ASSIGNED);
        } else if (currentFilter === 'bid_received') {
          // My Bids - This uses bids API, not projects API
          url = buildApiUrl(API_ENDPOINTS.BIDS.MY_BIDS);
        } else if (currentFilter === 'completed') {
          // Completed Projects - Filter from my-assigned
          url = buildApiUrl(API_ENDPOINTS.PROJECTS.MY_ASSIGNED);
        } else {
          // Default to available projects (with auth)
          url = buildApiUrl(API_ENDPOINTS.PROJECTS.LIST);
        }
      } else {
        // USER ENDPOINTS - All use /projects/my
        url = buildApiUrl(API_ENDPOINTS.PROJECTS.MY_PROJECTS);
        if (!token) {
          console.error('❌ No auth token found for /projects/my');
          setIsLoading(false);
          setRefreshing(false);
          return;
        }
      }

      console.log('🔍 Fetching from:', url);
      console.log('🎯 Filter:', currentFilter);
      console.log('🎯 Role:', role);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      console.log('📥 API Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded data:', data);
        const rawList = Array.isArray(data)
          ? data
          : (data && typeof data === 'object' && Array.isArray((data as any).projects))
            ? (data as any).projects
            : (data && typeof data === 'object' && Array.isArray((data as any).data))
              ? (data as any).data
              : [];
        console.log('📊 Number of items:', rawList.length);

        // For bid_received filter, we get bids, not projects
        if (currentFilter === 'bid_received' && isTechnician) {
          const bidsAsProjects = rawList.map((bid: any) => ({
            id: bid.projectId,
            description: bid.projectDescription || bid.comment || 'Project',
            budget: bid.projectBudget || bid.proposedBudget || 0,
            status: bid.status,
            address: '',
            serviceNameEn: 'Bid',
            serviceNameAr: 'عرض',
            serviceId: 0,
            bidId: bid.id,
            proposedBudget: bid.proposedBudget,
            comment: bid.comment,
            estimatedDurationDays: bid.estimatedDurationDays,
            createdAt: bid.createdAt,
          }));
          setProjects(bidsAsProjects);
        } else {
          setProjects(rawList);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load - Status:', response.status);
        console.error('❌ Error response:', errorText);
        setProjects([]);
      }
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
    const isAndroid = Platform.OS === 'android';

    // Step 1: Apply localFilter status filtering (available/running/completed/etc.)
    // On Android we skip this so all projects show; user filters via the status dropdown only.
    if (!isAndroid) {
      if (localFilter === 'available') {
        if (isTechnician) {
          filtered = filtered.filter(p => (p.status || '').toUpperCase() === 'PENDING');
        } else {
          filtered = filtered.filter(p => {
            const status = (p.status || '').toUpperCase();
            return status === 'PENDING' || status === 'BID_RECEIVED';
          });
        }
      } else if (localFilter === 'running') {
        if (userRole?.toUpperCase() === 'TECHNICIAN') {
          filtered = filtered.filter(p => {
            const status = (p.status || '').toUpperCase();
            return status !== 'PENDING' && status !== 'COMPLETED';
          });
        } else {
          const runningStatuses = [
            'APPROVED',
            'PHASE_PLANNING',
            'PHASE_PLANNING_APPROVED',
            'CONTRACT_SIGNING',
            'IN_PROGRESS'
          ];
          filtered = filtered.filter(p => {
            const status = (p.status || '').toUpperCase();
            return runningStatuses.includes(status);
          });
        }
      } else if (localFilter === 'completed') {
        filtered = filtered.filter(p => 
          (p.status || '').toUpperCase() === 'COMPLETED'
        );
      } else if (localFilter === 'bid_received') {
        filtered = filtered;
      } else if (localFilter === 'direct_offers') {
        filtered = filtered;
      }
    }

    // Step 2: Apply additional filters based on platform
    if (isAndroid) {
      // Android: Filter by project status from dropdown (if a specific status is selected)
      console.log('🔍 [filterProjects] Android - selectedCategory:', selectedCategory, 'projects count:', filtered.length);
      if (selectedCategory !== 'All') {
        filtered = filtered.filter(p => {
          const projectStatus = (p.status || '').toUpperCase().trim();
          const selectedStatus = selectedCategory.toUpperCase().trim();
          const matches = projectStatus === selectedStatus;
          console.log('🔍 [filterProjects] Comparing:', projectStatus, 'vs', selectedStatus, '=', matches);
          return matches;
        });
      }
      console.log('🔍 [filterProjects] After filter:', filtered.length, 'projects');
    } else {
      // Non-Android: Filter by service category (dropdown)
      if (selectedCategory !== 'All') {
        const serviceId = parseInt(selectedCategory);
        if (!isNaN(serviceId)) {
          filtered = filtered.filter(p => p.serviceId === serviceId);
        }
      }
    }

    // Step 2b: Filter by service category when opened from Home → Category → View available projects
    if (serviceCategoryFilterId != null) {
      filtered = filtered.filter(p => {
        const categoryId = (p as Project).serviceCategory?.id;
        return categoryId === serviceCategoryFilterId;
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
    if (!status) return t('Unknown');
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
      name: `${t('Phase')} ${phase.phaseNumber}`,
      value: Math.max(1, Math.round((phase.moneySpent / totalBudget) * 100)),
    }));

    const budgetData = phases.map((phase) => ({
      label: `${t('P')} ${phase.phaseNumber}`,
      value: phase.moneySpent,
    }));

    return {
      totalPercent: 100,
      totalSpent: totalBudget,
      percentData,
      budgetData,
    };
  };

  // Handler for project card press
  const handleProjectCardPress = (item: Project) => {
    const status = item.status?.toUpperCase();
    const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
    const isAndroid = Platform.OS === 'android';
    
    console.log('🔵 [ProjectsScreen] Card pressed - Status:', status, 'isTechnician:', isTechnician, 'isAndroid:', isAndroid);
    setSelectedProject(item);

    // On Android: Route purely by project status (no localFilter tabs)
    if (isAndroid) {
      if (status === 'PENDING') {
        if (isTechnician) {
          setCurrentPage('technician-pending-project');
        } else {
          setCurrentPage('pending-project');
        }
      } else if (status === 'BID_RECEIVED') {
        if (isTechnician) {
          setCurrentPage('technician-bid-received');
        } else {
          setCurrentPage('bid-received-project');
        }
      } else if (status === 'APPROVED' || status === 'PHASE_PLANNING' || status === 'PHASE_PLANNING_APPROVED') {
        if (isTechnician) {
          setCurrentPage('technician-approved-project');
        } else {
          setCurrentPage('approved-project');
        }
      } else if (status === 'CONTRACT_SIGNING') {
        if (isTechnician) {
          setCurrentPage('contract-signing');
        } else {
          setCurrentPage('user-contract-signing');
        }
      } else if (status === 'IN_PROGRESS') {
        if (isTechnician) {
          setCurrentPage('progress');
        } else {
          setCurrentPage('user-progress');
        }
      } else if (status === 'COMPLETED') {
        setCurrentPage('completed-project');
      } else {
        // Fallback to ProjectDetailModal for unknown statuses
        setShowProjectDetail(true);
      }
      return;
    }
    
    // Non-Android: Route based on localFilter + status (original logic)
    if (isTechnician && localFilter === 'running') {
      console.log('🔵 [ProjectsScreen] Technician clicked on running project');
      if (status === 'APPROVED') {
        setCurrentPage('technician-approved-project');
      } else if (status === 'PHASE_PLANNING') {
        setCurrentPage('technician-approved-project');
      } else if (status === 'CONTRACT_SIGNING') {
        setCurrentPage('contract-signing');
      } else if (status === 'IN_PROGRESS') {
        setCurrentPage('progress');
      } else {
        setShowProjectDetail(true);
      }
    } 
    else if (!isTechnician && localFilter === 'running') {
      console.log('🔵 [ProjectsScreen] User clicked on running project');
      if (status === 'APPROVED') {
        setCurrentPage('approved-project');
      } else if (status === 'PHASE_PLANNING') {
        setCurrentPage('approved-project');
      } else if (status === 'CONTRACT_SIGNING') {
        setCurrentPage('user-contract-signing');
      } else if (status === 'IN_PROGRESS') {
        setCurrentPage('user-progress');
      } else {
        setShowProjectDetail(true);
      }
    }
    else if (localFilter === 'completed' || status === 'COMPLETED') {
      setCurrentPage('completed-project');
    }
    else if (isTechnician && localFilter === 'available') {
      setCurrentPage('technician-pending-project');
    }
    else if (isTechnician && localFilter === 'bid_received') {
      setCurrentPage('technician-bid-received');
    }
    else if (!isTechnician && localFilter === 'available' && status === 'PENDING') {
      setCurrentPage('pending-project');
    }
    else if (!isTechnician && localFilter === 'available' && status === 'BID_RECEIVED') {
      setCurrentPage('bid-received-project');
    }
    else {
      setShowProjectDetail(true);
    }
  };

  // Figma-styled project card for grid layout
  const renderFigmaProjectCard = ({ item, index }: { item: Project; index: number }) => {
    const serviceName = i18n.language === 'ar' ? item.serviceNameAr : item.serviceNameEn;
    
    return (
      <TouchableOpacity
        style={[
          styles.figmaProjectCard,
          { marginRight: index % 2 === 0 ? CARD_GAP : 0 },
        ]}
        onPress={() => handleProjectCardPress(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.figmaProjectTitle} numberOfLines={1}>
          {serviceName || t('Project')}
        </Text>
        <Text style={styles.figmaProjectDescription} numberOfLines={2}>
          {item.description || t('project description')}
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
                {serviceName || t('Project')}
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
                  {t('Phases')}: {phasesCount}
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
                {t('Ask for Visit')}
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
                {t('Bid Now')}
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
                {t('Edit')}
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
                {t('Delete')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
          {onBack ? (
            <TouchableOpacity onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
            {localFilter === 'available' ? (isTechnician ? t('Available') : t('Available Projects')) :
             localFilter === 'running' ? (isTechnician ? t('In-Progress') : t('Running Projects')) :
             localFilter === 'bid_received' ? t('Bidding') :
             localFilter === 'direct_offers' ? t('Direct Assigned') :
             localFilter === 'completed' ? (isTechnician ? t('Completed') : t('Completed Projects')) :
             t('Projects')}
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
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
    <>
      {/* New Pages for Technicians in Running Projects */}
      
      {/* Approved Project Screen - Technician View (handles both APPROVED and PHASE_PLANNING) */}
      {userRole?.toUpperCase() === 'TECHNICIAN' && 
       (Platform.OS === 'android' || localFilter === 'running') && 
       selectedProject && 
       currentPage === 'technician-approved-project' && (
        <ApprovedProjectScreen
          project={selectedProject}
          isTechnician={true}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from ApprovedProjectScreen (Technician)');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] ApprovedProjectScreen (Technician) success - reloading projects');
            loadProjects();
          }}
          onOpenChat={onOpenChat}
        />
      )}

      {userRole?.toUpperCase() === 'TECHNICIAN' && 
       (Platform.OS === 'android' || localFilter === 'running') && 
       selectedProject && 
       currentPage === 'contract-signing' && (
        <ContractSigningProjectScreen
          project={selectedProject}
          isTechnician={true}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from ContractSigningProjectScreen (Technician)');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] ContractSigningProjectScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() === 'TECHNICIAN' && 
       (Platform.OS === 'android' || localFilter === 'running') && 
       selectedProject && 
       currentPage === 'progress' && (
        <InProgressProjectScreen
          project={selectedProject}
          isTechnician={true}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from InProgressProjectScreen (Technician)');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
       (Platform.OS === 'android' || localFilter === 'running') && 
       selectedProject && 
       currentPage === 'approved-project' && (
        <ApprovedProjectScreen
          project={selectedProject}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from ApprovedProjectScreen (User)');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
       (Platform.OS === 'android' || localFilter === 'running') && 
       selectedProject && 
       currentPage === 'user-phase-view' && (
        <UserPhaseViewPage
          project={selectedProject}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from UserPhaseViewPage');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
       (Platform.OS === 'android' || localFilter === 'running') && 
       selectedProject && 
       currentPage === 'user-contract-signing' && (
        <ContractSigningProjectScreen
          project={selectedProject}
          isTechnician={false}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from ContractSigningProjectScreen (User)');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
          onSuccess={() => {
            console.log('🔵 [ProjectsScreen] ContractSigningProjectScreen success - reloading projects');
            loadProjects();
            setCurrentPage('list');
            setSelectedProject(null);
          }}
        />
      )}

      {userRole?.toUpperCase() !== 'TECHNICIAN' && 
       (Platform.OS === 'android' || localFilter === 'running') && 
       selectedProject && 
       currentPage === 'user-progress' && (
        <InProgressProjectScreen
          project={selectedProject}
          isTechnician={false}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from InProgressProjectScreen (User)');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from CompletedProjectScreen');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from OwnerProjectEditScreen');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from PendingProjectScreen');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from BidReceivedProjectScreen');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from TechnicianBidReceivedProjectScreen');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from TechnicianPendingProjectScreen');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from TechnicianProfileView');
            setCurrentPage('list');
            setSelectedTechnicianId(null);
          }}
        />
      )}

      {/* Projects List - Only show if not on a specific page */}
      {currentPage === 'list' && (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Android Design - New Redesign */}
      {Platform.OS === 'android' ? (
        <View style={styles.androidContainer}>
          {/* Project Type Selector - Toggle (always visible) */}
          <View style={styles.androidProjectTypeSelector}>
            <AnimatedProjectTypeToggle
              selectedType={projectType}
              onTypeChange={(type) => {
                setProjectType(type);
                if (type === 'small') setLocalFilter('available');
              }}
            />
          </View>

          {/* Show Small Tasks or Large Projects */}
          {projectType === 'small' ? (
            <ScrollView
              style={styles.androidContent}
              contentContainerStyle={styles.androidContentContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#1e5a9e"
                />
              }
            >
              <SmallTasksListScreen
                onBack={onBack}
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
              {/* Header Section - Outside FlatList */}
              <View style={styles.androidHeaderSection}>
                <View style={styles.androidTitleSection}>
                  <Text style={styles.androidPageTitle}>{t('My Projects')}</Text>
                  <Text style={styles.androidProjectCount}>
                    {filteredProjects.length} {t('Total Projects')}
                  </Text>
                </View>
                <View style={styles.androidSearchContainer}>
                  <Feather name="search" size={20} color="#9ca3af" />
                  <TextInput
                    style={styles.androidSearchInput}
                    placeholder={t('search for project..')}
                    placeholderTextColor="#9ca3af"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                <View style={styles.androidFilterContainer}>
                  <TouchableOpacity
                    style={styles.androidFilterButton}
                    onPress={toggleFilterDropdown}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.androidFilterButtonText}>
                      {getStatusFilterLabel(selectedCategory)}
                    </Text>
                    <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                      <Feather name="chevron-down" size={20} color="#1e5a9e" />
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Project Cards List */}
              <FlatList
                data={filteredProjects}
                extraData={[selectedCategory, searchQuery]}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item: project }) => {
                  const truncateDescription = (text: string): string => {
                    if (!text) return t('project description');
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
                      style={[styles.androidProjectCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                      onPress={() => handleProjectCardPress(project)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.androidCardHeaderRow, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.androidProjectId, { color: colors.textSecondary }]}>#{project.id}</Text>
                        <View style={[styles.androidStatusBadge, { backgroundColor: statusColor + '20' }]}>
                          <Text style={[styles.androidStatusText, { color: statusColor }]}>
                            {statusLabel}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.androidCardHeader, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.androidProjectTitle, { color: colors.text }]} numberOfLines={1}>
                          {project.serviceNameEn || project.serviceNameAr || `Project ${project.id}`}
                        </Text>
                        <View style={[styles.androidPriceContainer, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
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
                        <View style={[styles.androidCardMetaRow, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
                          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                          <Text style={[styles.androidCardMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {project.address}
                          </Text>
                        </View>
                      ) : null}
                      <View style={[styles.androidCardMetaRow, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.androidCardMetaText, { color: colors.textSecondary }]}>
                          {formatCardDate(project.createdAt)}
                        </Text>
                      </View>
                      {(bidsCount > 0 || visitsCount > 0) ? (
                        <View style={[styles.androidCardStatsRow, { flexDirection: i18n.language === 'ar' ? 'row-reverse' : 'row' }]}>
                          <View style={[styles.androidCardStatItem, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="hand-left-outline" size={14} color={colors.primary} />
                            <Text style={[styles.androidCardStatValue, { color: colors.primary }]}>{bidsCount}</Text>
                            <Text style={[styles.androidCardStatLabel, { color: colors.textSecondary }]}>{t('Bids')}</Text>
                          </View>
                          <View style={[styles.androidCardStatItem, { backgroundColor: '#FF9500' + '15' }]}>
                            <Ionicons name="calendar-outline" size={14} color="#FF9500" />
                            <Text style={[styles.androidCardStatValue, { color: '#FF9500' }]}>{visitsCount}</Text>
                            <Text style={[styles.androidCardStatLabel, { color: colors.textSecondary }]}>{t('Visits')}</Text>
                          </View>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.androidEmptyContainer}>
                    <Ionicons name="folder-outline" size={80} color="#9ca3af" />
                    <Text style={styles.androidEmptyText}>
                      {t('No projects found')}
                    </Text>
                  </View>
                }
                contentContainerStyle={[styles.androidListContentContainer, filteredProjects.length === 0 && styles.androidListEmptyContent]}
                style={styles.androidContent}
                showsVerticalScrollIndicator={true}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#1e5a9e"
                  />
                }
              />

              {/* Filter Dropdown Overlay - Rendered at container level for proper z-index */}
              {showFilterDropdown && (
                <View style={styles.androidDropdownOverlay}>
                  <TouchableOpacity 
                    style={styles.androidDropdownBackdrop} 
                    activeOpacity={1} 
                    onPress={() => setShowFilterDropdown(false)}
                  />
                  <Animated.View
                    style={[
                      styles.androidFilterDropdownOverlay,
                      { opacity: dropdownOpacity },
                    ]}
                  >
                    <ScrollView
                      style={{ maxHeight: getFixedDropdownHeight() }}
                      contentContainerStyle={styles.androidFilterDropdownContentContainer}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                      bounces={false}
                    >
                      <TouchableOpacity
                        style={[
                          styles.androidFilterOption,
                          selectedCategory === 'All' && styles.androidFilterOptionActive,
                        ]}
                        onPress={() => handleStatusSelect('All')}
                      >
                        <Text
                          style={[
                            styles.androidFilterOptionText,
                            selectedCategory === 'All' && styles.androidFilterOptionTextActive,
                          ]}
                        >
                          {t('All')}
                        </Text>
                        {selectedCategory === 'All' && (
                          <Feather name="check" size={16} color="#1e5a9e" />
                        )}
                      </TouchableOpacity>
                      {getUniqueStatuses().map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.androidFilterOption,
                            selectedCategory === status && styles.androidFilterOptionActive,
                          ]}
                          onPress={() => handleStatusSelect(status)}
                        >
                          <Text
                            style={[
                              styles.androidFilterOptionText,
                              selectedCategory === status && styles.androidFilterOptionTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {getStatusLabel(status)}
                          </Text>
                          {selectedCategory === status && (
                            <Feather name="check" size={16} color="#1e5a9e" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </Animated.View>
                </View>
              )}
            </View>
            )}

          {/* FAB - Floating Action Button */}
          <TouchableOpacity
            style={styles.androidFab}
            onPress={() => setCurrentPage('project-type-selection')}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Original Header - For non-Android platforms */}
      {!IS_LARGE_WEB && (() => {
        const isTechnician = userRole?.toUpperCase() === 'TECHNICIAN';
        return (
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 50), borderBottomColor: colors.border }]}>
            {onBack ? (
              <TouchableOpacity onPress={onBack}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaledSize(18) }]}>
              {localFilter === 'available' ? (isTechnician ? t('Available') : t('Available Projects')) :
               localFilter === 'running' ? (isTechnician ? t('In-Progress') : t('Running Projects')) :
               localFilter === 'bid_received' ? t('Bidding') :
               localFilter === 'direct_offers' ? t('Direct Assigned') :
               localFilter === 'completed' ? (isTechnician ? t('Completed') : t('Completed Projects')) :
               t('Projects')}
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
                  {t('Available')}
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
                  {isTechnician ? t('In-Progress') : t('Running')}
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
                    {t('Direct Assigned')}
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
                    {t('Bidding')}
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
                  {t('Completed')}
                </Text>
              </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        );
      })()}

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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from ProjectTypeSelection');
            setCurrentPage('list');
          }}
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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from SmallTaskTypeSelection');
            setCurrentPage('project-type-selection');
          }}
        />
      )}

      {/* Small Task Request Form */}
      {currentPage === 'small-task-request-form' && selectedTaskType && (
        <SmallTaskRequestForm
          taskType={selectedTaskType}
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from SmallTaskRequestForm');
            setCurrentPage('small-task-type-selection');
          }}
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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from NewProjectView');
            setCurrentPage('project-type-selection');
          }}
        />
      )}

      {/* AI Project Creation Form */}
      {currentPage === 'ai-form' && (
        <ConversationalAIForm
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from AI Form');
            setCurrentPage('new-project');
          }}
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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from Manual Form');
            setCurrentPage('new-project');
          }}
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
          onBack={() => {
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
          onBack={() => {
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
          onBack={() => {
            setCurrentPage('assigned-small-task');
          }}
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
          onBack={() => {
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
          onBack={() => {
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
          onBack={() => {
            console.log('🔵 [ProjectsScreen] Back from Small Task Detail');
            setCurrentPage('list');
            setSelectedProject(null);
          }}
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
    </>
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

