import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Animated,
  I18nManager,
  InteractionManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Surface, Card, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Image as ExpoImage } from 'expo-image';
import BonyadLogo from '../components/BonyadLogo';
import AppTopBar from '../components/AppTopBar';
import GlassTabBar, { type UserTabId } from '../components/GlassTabBar';
import AnimatedLoadingScreen from '../components/AnimatedLoadingScreen';
import { coachMarksStorage } from '../utils/coachMarks';
import ScreenTourOverlay from '../components/tour/ScreenTourOverlay';
import { useSimpleScreenTour } from '../hooks/useSimpleScreenTour';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';

import AppointmentsScreen from './AppointmentsScreen';
import ProjectsScreen from './ProjectsScreen';
import ChatRoomsListScreen from './ChatRoomsListScreen';
import ChatDetailScreen from './ChatDetailScreen';
import ProfileScreen from './ProfileScreen';
import NewProjectView from './NewProjectView';
import ProjectTypeSelectionScreen from './ProjectTypeSelectionScreen';
import SmallTaskTypeSelectionScreen from './SmallTaskTypeSelectionScreen';
import SmallTaskRequestForm from './SmallTaskRequestForm';
import NotificationsScreen from './NotificationsScreen';
import MyDataScreen from './MyDataScreen';
import EditProfileScreen from './EditProfileScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import ChangePhoneScreen from './ChangePhoneScreen';
import VerifyPhoneChangeScreen from './VerifyPhoneChangeScreen';
import PortfolioManagement from '../components/PortfolioManagement';
import SubscriptionScreen from './SubscriptionScreen';
import ServiceManagementScreen from './ServiceManagementScreen';
import AvailabilityScreen from './AvailabilityScreen';
import RegionsManagementScreen from './RegionsManagementScreen';
import SmallTaskTypesScreen from './SmallTaskTypesScreen';
import PaymentTransactionScreen from './PaymentTransactionScreen';
import ConversationalAIForm from './ConversationalAIForm';
import ManualProjectForm from './ManualProjectForm';
import CreationMethodScreen from './CreationMethodScreen';
import ServiceTechniciansScreen from './ServiceTechniciansScreen';
import TechnicianProfileView from './TechnicianProfileView';
import CategoryTechniciansScreen from './CategoryTechniciansScreen';
import Footer from '../components/Footer';
import { buildApiUrl, API_ENDPOINTS, getApiUrl, getServerBaseUrl } from '../config/api';
import { storage } from '../utils/storage';
import { FontFamily, FontWeights } from '../constants/Fonts';
import UserHomeScreenContent from './home/UserHomeScreenContent';
import ChatbotScreen from './ChatbotScreen';
import type { CategoryInfo } from './CategorySubcategoryScreen';
import CategorySubcategoryScreen from './CategorySubcategoryScreen';
import type { ProfileSubviewForChatbot, HomeShellFromChatbotPayload } from '../utils/chatbotNavigateAndroid';

interface UserHomeScreenProps {
  onShowProfile: () => void;
  onLogout: () => void;
  /** When true, open profile tab on mount so nav bar stays visible */
  openProfileOnMount?: boolean;
  /** Deep-link profile subview from chatbot (id bumps on each request) */
  profileNavFromChatbot?: { id: number; subView: ProfileSubviewForChatbot } | null;
  /** Open a main tab / embedded flow from chatbot while keeping home chrome */
  homeShellFromChatbot?: (HomeShellFromChatbotPayload & { id: number }) | null;
  /** Called when user switches away from profile tab */
  onProfileTabClosed?: () => void;
  onRequestProject?: () => void;
  onShowProjects?: (filter: 'available' | 'running' | 'completed') => void;
  onShowChat?: () => void;
  onShowNotifications?: () => void;
  onShowAppointments?: () => void;
  onShowBooking?: (technicianId: number, technicianName: string, projectId?: number) => void;
  onChatbotNavigateToTab?: (tabName: string) => void;
  onChatbotNavigateToScreen?: (screenName: string, params?: Record<string, unknown>) => void;
  onChatbotRequestLiveAgent?: (subject: string, aiHistory: any[], firstUserMessage: string) => void;
  onShowSupportTickets?: () => void;
  onShowServiceProviders?: () => void;
  userName?: string;
  // Props for embedded screens
  userId?: number;
  authToken?: string;
  onNavigateToChatDetail?: (roomId: string, receiverId: number, receiverName: string) => void;
  onNavigateToEditProfile?: () => void;
  onNavigateToPortfolio?: () => void;
  onNavigateToSubscription?: () => void;
  onNavigateToServices?: () => void;
  onNavigateToAvailability?: () => void;
  onNavigateToTechnicianProfile?: (technicianId: number) => void;
  projectsFilter?: 'available' | 'running' | 'completed';
  onNavigateToAIForm?: () => void;
  onNavigateToManualForm?: () => void;
  onPressCategory?: (category: CategoryInfo) => void;
  onNavigateFromNotification?: (notification: any) => void | Promise<void>;
}

export default function UserHomeScreen({
  onLogout,
  onShowProfile,
  openProfileOnMount = false,
  profileNavFromChatbot,
  homeShellFromChatbot,
  onProfileTabClosed,
  onRequestProject,
  onShowProjects,
  onShowChat,
  onShowNotifications,
  onShowAppointments,
  onShowBooking,
  onChatbotNavigateToTab,
  onChatbotNavigateToScreen,
  onChatbotRequestLiveAgent,
  onShowSupportTickets,
  onShowServiceProviders,
  userName,
  userId = 0,
  authToken = '',
  onNavigateToChatDetail,
  onNavigateToEditProfile,
  onNavigateToPortfolio,
  onNavigateToSubscription,
  onNavigateToServices,
  onNavigateToAvailability,
  onNavigateToTechnicianProfile,
  projectsFilter = 'available',
  onNavigateToAIForm,
  onNavigateToManualForm,
  onPressCategory,
  onNavigateFromNotification,
}: UserHomeScreenProps) {
  // Responsive state - updates on window resize
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  // Update screen width on resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, boldFontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | 'home'
    | 'projects'
    | 'chat'
    | 'profile'
    | 'notifications'
    | 'appointments'
    | 'new'
    | 'service-technicians'
    | 'category-technicians'
    | 'technician-profile'
    | 'services-list'
    | 'chatbot'
  >(openProfileOnMount ? 'profile' : 'home');

  // Animation values for dropdowns and tab content transition
  const mobileDropdownAnim = useRef(new Animated.Value(0)).current;
  const desktopDropdownAnim = useRef(new Animated.Value(0)).current;
  const tabContentOpacity = useRef(new Animated.Value(1)).current;
  const tabContentTranslateY = useRef(new Animated.Value(0)).current;
  const tabScrollRef = useRef<ScrollView>(null);
  const prevActiveTabRef = useRef(activeTab);
  const [showServicesList, setShowServicesList] = useState(false);

  // Helper to get tab index
  const getTabIndex = (tab: string) => {
    const tabs = ['home', 'projects', 'profile'];
    return tabs.indexOf(tab);
  };

  // Card width for tab bar
  const CARD_WIDTH = screenWidth * 0.32;

  // Helper to scroll to tab
  const scrollToTab = (index: number) => {
    tabScrollRef.current?.scrollTo({ x: index * CARD_WIDTH, animated: true });
  };
  const [currentProjectsFilter, setCurrentProjectsFilter] = useState<'available' | 'running' | 'completed'>(projectsFilter || 'available');
  const [profileSubView, setProfileSubView] = useState<'myData' | 'editProfile' | 'portfolio' | 'subscription' | 'services' | 'availability' | 'regions' | 'smallTaskTypes' | 'paymentHistory' | 'changePassword' | 'changePhone' | 'verifyPhoneChange' | null>(null);
  const [phoneChangeNumber, setPhoneChangeNumber] = useState<string>('');
  const [newProjectSubView, setNewProjectSubView] = useState<'project-type-selection' | 'creation-method' | 'ai' | 'manual' | 'small-task-type-selection' | 'small-task-request-form' | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<any>(null);
  const [selectedChat, setSelectedChat] = useState<{ roomId: string; receiverId: number; receiverName: string; projectId?: number | null } | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const [chatReturnContext, setChatReturnContext] = useState<'home' | 'service-technicians' | null>(null);
  const [serviceTechniciansView, setServiceTechniciansView] = useState<{ serviceId: number; serviceName?: string; source?: 'search' | 'lookForBonyaders' | 'category' } | null>(null);
  const [categoryTechniciansView, setCategoryTechniciansView] = useState<{ categoryId: number; categoryName?: string; source?: 'search' } | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [hiringTechnician, setHiringTechnician] = useState<{ id: number; name?: string } | null>(null);
  const [hireReturnTab, setHireReturnTab] = useState<string | null>(null);
  const [techProfileReturnTab, setTechProfileReturnTab] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryInfo | null>(null);
  const [projectsScreenCategoryId, setProjectsScreenCategoryId] = useState<number | null>(null);
  const [pendingOpenProject, setPendingOpenProject] = useState<any>(null);
  const [projectsReturnTabOnBack, setProjectsReturnTabOnBack] = useState<UserTabId | null>(null);
  const [pendingOpenSmallTask, setPendingOpenSmallTask] = useState<any>(null);
  const [projectsTabEmbeddedType, setProjectsTabEmbeddedType] = useState<'large' | 'small' | null>(null);
  const [manualFormInitial, setManualFormInitial] = useState<{
    categoryId: number;
    categoryNameEn: string;
    categoryNameAr?: string;
    subcategoryId?: number;
    subcategoryNameEn?: string;
    subcategoryNameAr?: string;
  } | null>(null);
  const insets = useSafeAreaInsets();
  const homeContentControl = useRef<{ startTour: () => void } | null>(null);
  const projectsTourControl = useRef<{ startTour: () => void } | null>(null);
  const chatTourControl = useRef<{ startTour: () => void } | null>(null);
  /** Stable reference so ChatRoomsListScreen’s expose effect does not re-fire every parent render. */
  const exposeChatTourControl = useCallback((c: { startTour: () => void }) => {
    chatTourControl.current = c;
  }, []);
  const profileTourControl = useRef<{ startTour: () => void } | null>(null);
  const notificationsTourControl = useRef<{ startTour: () => void } | null>(null);
  const appointmentsTourControl = useRef<{ startTour: () => void } | null>(null);
  const projectTypeSelectionTourControl = useRef<{ startTour: () => void } | null>(null);

  const newTabTourSteps = useMemo(
    () => [{ id: 'panel', i18nSuffix: 'overview' as const }],
    [],
  );
  const newTabTour = useSimpleScreenTour(newTabTourSteps, 'userNewTab');
  const [userProfile, setUserProfile] = useState<{ name?: string; avatar?: string; profileImage?: string } | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isInHomeTransitionLoading, setIsInHomeTransitionLoading] = useState(false);
  const homeTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevProfileSubViewRef = useRef<typeof profileSubView>(profileSubView);
  const prevNewProjectSubViewRef = useRef<typeof newProjectSubView>(newProjectSubView);

  // Auto-start the coach tour ONLY on the Home tab (prevents tour showing on Notifications tab).
  useEffect(() => {
    if (activeTab !== 'home') return;
    let cancelled = false;
    let timer: any = null;
    (async () => {
      const hasSeen = await coachMarksStorage.hasSeenTutorial('userHome');
      if (cancelled) return;
      if (!hasSeen) {
        timer = setTimeout(() => {
          if (cancelled) return;
          homeContentControl.current?.startTour();
        }, 2500);
      }
    })();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeTab]);

  // Reset sub-views when switching tabs and sync tab bar scroll
  useEffect(() => {
    // Sync tab bar scroll position with active tab
    const tabIndex = getTabIndex(activeTab);
    if (tabIndex !== -1) {
      scrollToTab(tabIndex);
    }

    if (activeTab !== 'profile') {
      setProfileSubView(null);
    }
    if (activeTab !== 'new') {
      setNewProjectSubView(null);
    }
    if (activeTab !== 'chat') {
      setSelectedChat(null);
      setShowChatList(true);
    }
    if (activeTab !== 'service-technicians' && chatReturnContext !== 'service-technicians' && hireReturnTab !== 'service-technicians' && techProfileReturnTab !== 'service-technicians') {
      setServiceTechniciansView(null);
    }
    if (activeTab !== 'chat') {
      setChatReturnContext(null);
    }
    if (activeTab !== 'technician-profile' && hireReturnTab !== 'technician-profile') {
      setSelectedTechnicianId(null);
    }
    if (activeTab !== 'technician-profile') {
      setTechProfileReturnTab(null);
    }
    if (activeTab !== 'new') {
      setHiringTechnician(null);
      setHireReturnTab(null);
    }
    if (activeTab !== 'home') {
      setSelectedCategory(null);
    }
    if (activeTab !== 'projects') {
      setProjectsScreenCategoryId(null);
      setPendingOpenProject(null);
      setPendingOpenSmallTask(null);
      setProjectsTabEmbeddedType(null);
    }
  }, [activeTab, chatReturnContext, hireReturnTab, techProfileReturnTab]);

  // Animate tab content transition when tab changes (slide-up + fade); stronger motion for assistant tab
  useEffect(() => {
    if (prevActiveTabRef.current === activeTab) return;
    const previousTab = prevActiveTabRef.current;
    prevActiveTabRef.current = activeTab;
    setIsInHomeTransitionLoading(true);
    if (homeTransitionTimerRef.current) clearTimeout(homeTransitionTimerRef.current);
    homeTransitionTimerRef.current = setTimeout(() => setIsInHomeTransitionLoading(false), 280);
    tabContentOpacity.setValue(0);
    const chatbotMotion =
      previousTab === 'chatbot' || activeTab === 'chatbot';
    tabContentTranslateY.setValue(chatbotMotion ? 32 : 18);
    Animated.parallel([
      Animated.timing(tabContentOpacity, {
        toValue: 1,
        duration: chatbotMotion ? 300 : 280,
        useNativeDriver: true,
      }),
      Animated.spring(tabContentTranslateY, {
        toValue: 0,
        tension: chatbotMotion ? 300 : 280,
        friction: chatbotMotion ? 22 : 20,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab]);

  // Show the same loader when switching profile subviews (top nav actions inside Profile tab)
  useEffect(() => {
    if (prevProfileSubViewRef.current === profileSubView) return;
    prevProfileSubViewRef.current = profileSubView;
    if (activeTab !== 'profile') return;
    setIsInHomeTransitionLoading(true);
    if (homeTransitionTimerRef.current) clearTimeout(homeTransitionTimerRef.current);
    homeTransitionTimerRef.current = setTimeout(() => setIsInHomeTransitionLoading(false), 240);
  }, [activeTab, profileSubView]);

  // Show loader when stepping through new-project subviews inside the New tab
  useEffect(() => {
    if (prevNewProjectSubViewRef.current === newProjectSubView) return;
    prevNewProjectSubViewRef.current = newProjectSubView;
    if (activeTab !== 'new') return;
    setIsInHomeTransitionLoading(true);
    if (homeTransitionTimerRef.current) clearTimeout(homeTransitionTimerRef.current);
    homeTransitionTimerRef.current = setTimeout(() => setIsInHomeTransitionLoading(false), 240);
  }, [activeTab, newProjectSubView]);

  const exposeProjectTypeTourControl = useCallback((c: { startTour: () => void } | null) => {
    projectTypeSelectionTourControl.current = c;
  }, []);

  // Info button: restart the tour for whichever main tab is currently open (same overlay style as Home).
  const handleRestartCoachTour = async () => {
    const delayStart = (fn: () => void) => {
      requestAnimationFrame(() => setTimeout(fn, 150));
    };

    if (activeTab === 'home') {
      await coachMarksStorage.clearTutorial('userHome');
      setSelectedCategory(null);
      delayStart(() => homeContentControl.current?.startTour());
      return;
    }

    if (activeTab === 'projects') {
      const projectTypeTour = projectTypeSelectionTourControl.current;
      if (projectTypeTour) {
        await coachMarksStorage.clearTutorial('userProjectTypeSelection');
        delayStart(() => projectTypeTour.startTour());
      } else {
        await coachMarksStorage.clearTutorial('userProjectsTab');
        delayStart(() => projectsTourControl.current?.startTour());
      }
      return;
    }

    if (activeTab === 'chat') {
      await coachMarksStorage.clearTutorial('userChatTab');
      setSelectedChat(null);
      setShowChatList(true);
      let started = false;
      const runChatTour = () => {
        if (started) return;
        started = true;
        requestAnimationFrame(() => chatTourControl.current?.startTour());
      };
      InteractionManager.runAfterInteractions(runChatTour);
      setTimeout(runChatTour, 420);
      return;
    }

    if (activeTab === 'profile' && profileSubView === null) {
      await coachMarksStorage.clearTutorial('userProfileTab');
      delayStart(() => profileTourControl.current?.startTour());
      return;
    }

    if (activeTab === 'new') {
      if (newProjectSubView === 'project-type-selection') {
        await coachMarksStorage.clearTutorial('userProjectTypeSelection');
        delayStart(() => projectTypeSelectionTourControl.current?.startTour());
      } else {
        await coachMarksStorage.clearTutorial('userNewTab');
        delayStart(() => newTabTour.startTour());
      }
      return;
    }

    if (activeTab === 'notifications') {
      await coachMarksStorage.clearTutorial('userNotificationsTab');
      delayStart(() => notificationsTourControl.current?.startTour());
      return;
    }

    if (activeTab === 'appointments') {
      await coachMarksStorage.clearTutorial('appointments');
      delayStart(() => appointmentsTourControl.current?.startTour());
      return;
    }
  };

  // Sync currentProjectsFilter when projectsFilter prop changes
  useEffect(() => {
    if (
      projectsFilter === 'available' ||
      projectsFilter === 'running' ||
      projectsFilter === 'completed'
    ) {
      setCurrentProjectsFilter(projectsFilter);
    }
  }, [projectsFilter]);

  // When openProfileOnMount is true (e.g. from profile icon tap), switch to profile tab so nav bar stays visible
  useEffect(() => {
    if (openProfileOnMount) {
      setActiveTab('profile');
    }
  }, [openProfileOnMount]);

  useEffect(() => {
    if (!profileNavFromChatbot) return;
    setActiveTab('profile');
    onShowProfile();
    setProfileSubView(profileNavFromChatbot.subView);
  }, [profileNavFromChatbot?.id, profileNavFromChatbot, onShowProfile]);

  useEffect(() => {
    if (!homeShellFromChatbot) return;
    const { tab, returnTabOnBack, embeddedChat, newProjectSubView, embeddedProjects, technicianAppointments } = homeShellFromChatbot;
    if (technicianAppointments) return;
    if (tab === 'wallet') return;

    const userTabs = ['home', 'projects', 'chat', 'profile', 'notifications', 'appointments', 'new', 'chatbot'] as const;
    if (userTabs.includes(tab as (typeof userTabs)[number])) {
      setActiveTab(tab as (typeof activeTab));
    }

    // If this navigation came from notifications (or another tab) and wants a custom back target.
    if (returnTabOnBack && userTabs.includes(returnTabOnBack as any)) {
      setProjectsReturnTabOnBack(returnTabOnBack as any);
    }

    if (tab === 'chat' && embeddedChat?.roomId) {
      // Open the exact chat thread inside the Chat tab (inline behavior, keeps top/bottom chrome).
      setActiveTab('chat');
      setSelectedChat({
        roomId: embeddedChat.roomId,
        receiverId: embeddedChat.receiverId,
        receiverName: embeddedChat.receiverName,
        projectId: embeddedChat.projectId ?? undefined,
      });
      setChatReturnContext(null);
      setShowChatList(false);
    }

    if (tab === 'projects') {
      if (embeddedProjects?.initialSmallTask != null) {
        setPendingOpenSmallTask(embeddedProjects.initialSmallTask);
        setPendingOpenProject(null);
        setProjectsTabEmbeddedType('small');
      } else if (embeddedProjects?.initialProject != null) {
        setPendingOpenSmallTask(null);
        setPendingOpenProject(embeddedProjects.initialProject);
        setProjectsTabEmbeddedType('large');
      } else if (embeddedProjects?.initialProjectType != null) {
        setPendingOpenSmallTask(null);
        setPendingOpenProject(null);
        setProjectsTabEmbeddedType(embeddedProjects.initialProjectType);
      } else {
        setPendingOpenSmallTask(null);
        setPendingOpenProject(null);
        setProjectsTabEmbeddedType(null);
      }
    } else {
      setProjectsTabEmbeddedType(null);
    }

    if (tab === 'new' && newProjectSubView !== undefined) {
      if (newProjectSubView === null) {
        setNewProjectSubView(null);
        setManualFormInitial(null);
        setSelectedTaskType(null);
        setHiringTechnician(null);
      } else {
        setNewProjectSubView(newProjectSubView);
      }
    }
  }, [homeShellFromChatbot?.id, homeShellFromChatbot]);

  // Animate mobile dropdown
  useEffect(() => {
    Animated.timing(mobileDropdownAnim, {
      toValue: showProjectsDropdown ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // height animation doesn't support native driver
    }).start();
  }, [showProjectsDropdown, mobileDropdownAnim]);

  // Animate desktop dropdown
  useEffect(() => {
    Animated.timing(desktopDropdownAnim, {
      toValue: showProjectsDropdown ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showProjectsDropdown, desktopDropdownAnim]);

  // Search state
  const [searchText, setSearchText] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const isAISearching = false;
  const aiMessage = '';
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const resolveServiceImageSource = (service: any) => {
    if (!service) {
      return null;
    }

    const candidate =
      service.imageUrl ||
      service.image ||
      service.iconUrl ||
      service.icon ||
      service.thumbnailUrl;

    if (!candidate) {
      return null;
    }

    if (typeof candidate === 'number') {
      return candidate;
    }

    if (typeof candidate === 'object' && candidate.uri) {
      return candidate;
    }

    const candidateStr = String(candidate).trim();

    if (!candidateStr) {
      return null;
    }

    if (
      candidateStr.startsWith('http://') ||
      candidateStr.startsWith('https://') ||
      candidateStr.startsWith('data:')
    ) {
      return { uri: candidateStr };
    }

    const baseUrl = getServerBaseUrl();
    const normalizedPath = candidateStr.startsWith('/') ? candidateStr : `/${candidateStr}`;

    return { uri: `${baseUrl}${normalizedPath}` };
  };

  // Debug: Log when unread count changes
  useEffect(() => {
    console.log(`🔔 Unread notification count changed to: ${unreadNotificationCount}`);
  }, [unreadNotificationCount]);



  // Calculate responsive breakpoints
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1200;
  const IS_MEDIUM_WEB = IS_WEB && screenWidth >= 768 && screenWidth < 1200;
  const IS_SMALL_WEB = IS_WEB && screenWidth < 768;

  // Fetch user profile for navigation bar (single effect, no duplicates)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = authToken || await storage.getAuthToken();
        if (!token) return;

        const response = await fetch(buildApiUrl(API_ENDPOINTS.USER.PROFILE), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Construct full URL for profile image
          if (data.profileImage && !data.profileImage.startsWith('http')) {
            data.profileImage = `${getServerBaseUrl()}${data.profileImage}`;
          }
          if (data.avatar && !data.avatar.startsWith('http')) {
            data.avatar = `${getServerBaseUrl()}${data.avatar}`;
          }
          setUserProfile({
            name: data.name || userName || 'User',
            avatar: data.profileImage || data.avatar,
            profileImage: data.profileImage || data.avatar,
          });
        }
      } catch (error) {
        // Network unreachable / offline - use fallback; avoid noisy logs in __DEV__
        if (__DEV__) {
          console.warn('User profile fetch failed (network may be unreachable):', (error as Error)?.message ?? error);
        }
        setUserProfile({ name: userName || 'User' });
      }
    };

    fetchProfile();
  }, [authToken, userName]);

  const openChat = useCallback(
    (
      roomId: string,
      receiverId: number,
      receiverName: string,
      options?: {
        returnContext?: 'home' | 'service-technicians' | null;
        projectId?: number | null;
      },
    ) => {
      const nextContext = options?.returnContext ?? null;
      const nextProjectId = options?.projectId ?? null;

      setActiveTab('chat');
      setSelectedChat({ roomId, receiverId, receiverName, projectId: nextProjectId ?? undefined });
      setChatReturnContext(nextContext);
      setShowChatList(IS_LARGE_WEB);
    },
    [IS_LARGE_WEB, setActiveTab, setSelectedChat, setChatReturnContext, setShowChatList],
  );

  const handleChatBackNavigation = useCallback(() => {
    if (true) {
      setSelectedChat(null);
      setChatReturnContext(null);
      setShowChatList(true);
      return;
    }

    if (chatReturnContext === 'service-technicians') {
      setSelectedChat(null);
      setShowChatList(true);
      setChatReturnContext(null);
      setActiveTab('service-technicians');
      return;
    }

    if (chatReturnContext === 'home') {
      setSelectedChat(null);
      setShowChatList(true);
      setChatReturnContext(null);
      setServiceTechniciansView((prev) => (prev?.source === 'search' ? null : prev));
      setActiveTab('home');
      return;
    }

    setSelectedChat(null);
    setShowChatList(true);
    setChatReturnContext(null);
  }, [IS_LARGE_WEB, chatReturnContext, setActiveTab, setSelectedChat, setShowChatList, setChatReturnContext, setServiceTechniciansView]);

  // Load services on mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(buildApiUrl(API_ENDPOINTS.SERVICES.LIST), {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          setAllServices(data);
          console.log(`✅ Loaded ${data.length} services`);
        }
      } catch (error) {
        console.error('❌ Error loading services:', error);
      }
    };

    loadServices();
  }, [authToken]);

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const token = authToken || await storage.getAuthToken();
      if (!token) {
        // Silently skip if no token - user is not authenticated
        return 0;
      }

      const url = buildApiUrl(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        // API might return {count: number} or just a number
        const count = typeof data === 'number' ? data : (data.count || data.unreadCount || data.unread_count || 0);
        setUnreadNotificationCount(count);
        return count;
      } else {
        const errorText = await response.text();
        // Only log error if it's not a 401 (unauthorized) - that's expected when not logged in
        if (response.status !== 401) {
          console.error('❌ Failed to fetch unread count. Status:', response.status);
          console.error('   Error body:', errorText);
        }
        // Set to 0 on error to avoid showing stale data
        setUnreadNotificationCount(0);
      }
    } catch (error: any) {
      // Only log network errors if we have a token (meaning user is authenticated)
      const token = authToken || await storage.getAuthToken();
      if (token) {
        // Check if it's a network error
        if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
          // Network error - might be offline, silently handle (no log to avoid spam)
        } else {
          console.error('❌ Error fetching unread count:', error);
        }
      }
      // Silently set to 0 if no token or on network error
      setUnreadNotificationCount(0);
    }
    return 0;
  };

  // Load unread count on component mount
  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const loadCount = async () => {
      if (!mounted) return;
      await fetchUnreadCount();
    };

    // Call immediately on mount with a small delay to ensure token is available
    const timeoutId = setTimeout(() => {
      loadCount();

      // Set up interval to refresh periodically (every 30 seconds)
      intervalId = setInterval(() => {
        if (mounted) {
          loadCount();
        }
      }, 30000);
    }, 500); // 500ms delay to ensure token is loaded

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []); // Empty dependency array - only runs on mount

  // Also refresh when authToken becomes available (if it wasn't available on mount)
  useEffect(() => {
    if (authToken) {
      fetchUnreadCount();
    }
  }, [authToken]);

  // Refresh unread count when notifications tab becomes active
  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchUnreadCount();
    }
  }, [activeTab]);

  // Levenshtein distance for fuzzy search
  const levenshteinDistance = (s1: string, s2: string): number => {
    const len1 = s1.length;
    const len2 = s2.length;
    if (s1 === s2) return 0;
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    const distance: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) distance[i][0] = i;
    for (let j = 0; j <= len2; j++) distance[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          distance[i][j] = distance[i - 1][j - 1];
        } else {
          distance[i][j] = Math.min(
            distance[i - 1][j] + 1,
            distance[i][j - 1] + 1,
            distance[i - 1][j - 1] + 1
          );
        }
      }
    }
    return distance[len1][len2];
  };

  // Search functions
  const performExactSearch = (query: string): any[] => {
    const queryLower = query.toLowerCase();
    return allServices.filter((service: any) =>
      service.nameEn?.toLowerCase().includes(queryLower) ||
      service.nameAr?.toLowerCase().includes(queryLower) ||
      service.description?.toLowerCase().includes(queryLower)
    );
  };

  const performFuzzySearch = (query: string): any[] => {
    const queryLower = query.toLowerCase();
    const maxDistance = query.length <= 3 ? 1 : query.length <= 6 ? 2 : 3;

    const matched = allServices
      .map((service: any) => {
        const fields = [
          service.nameEn?.toLowerCase() || '',
          service.nameAr?.toLowerCase() || '',
          service.description?.toLowerCase() || '',
        ];
        let minDistance = Infinity;

        for (const field of fields) {
          const words = field.split(/\s+/);
          for (const word of words) {
            if (word.length >= 3) {
              const distance = levenshteinDistance(queryLower, word);
              minDistance = Math.min(minDistance, distance);
            }
          }
          const fieldDistance = levenshteinDistance(queryLower, field);
          minDistance = Math.min(minDistance, fieldDistance);
        }
        return { service, distance: minDistance };
      })
      .filter((item) => item.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .map((item) => item.service);

    return matched;
  };

  // AI Search function
  // Handle search text change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchText || searchText.trim().length === 0) {
      setShowSearchResults(false);
      setFilteredServices([]);
      return;
    }

    setShowSearchResults(true);
    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(() => {
      const trimmedQuery = searchText.trim();
      const exactMatches = performExactSearch(trimmedQuery);

      if (exactMatches.length > 0) {
        setFilteredServices(exactMatches);
        setIsSearching(false);
      } else {
        const fuzzyMatches = performFuzzySearch(trimmedQuery);
        setFilteredServices(fuzzyMatches);
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, allServices]);

  // Handle service selection
  const handleSelectService = (service: any) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔵 [UserHomeScreen] Service clicked!');
    console.log('🔵 [UserHomeScreen] Selected service:', service);
    console.log('🔵 [UserHomeScreen] Service ID:', service?.id);
    console.log('🔵 [UserHomeScreen] Service Name (EN):', service?.nameEn);
    console.log('🔵 [UserHomeScreen] Service Name (AR):', service?.nameAr);
    console.log('🔵 [UserHomeScreen] Current language:', i18n.language);

    if (!service || !service.id) {
      console.error('❌ [UserHomeScreen] Invalid service object:', service);
      return;
    }

    // Navigate to service technicians screen in tab
    const serviceName = i18n.language === 'ar' && service.nameAr ? service.nameAr : (service.nameEn || 'Service');

    console.log('🔵 [UserHomeScreen] Setting serviceTechniciansView with:', {
      serviceId: service.id,
      serviceName: serviceName,
    });

    setServiceTechniciansView({
      serviceId: service.id,
      serviceName: serviceName,
      source: 'search',
    });

    // Switch to service-technicians tab
    setActiveTab('service-technicians');

    // Close search results
    setShowSearchResults(false);
    setSearchText('');

    console.log('✅ [UserHomeScreen] Navigation triggered to tab');
    console.log('═══════════════════════════════════════════════════════════');
  };

  // Dummy data based on guide

  // Render Android style (always mobile) OR Web small/medium screen style
  const shouldRenderMobile = Platform.OS !== 'web' || IS_SMALL_WEB || IS_MEDIUM_WEB;

  // Render mobile layout — iOS-style: on home tab, content owns full screen (top bar inside home content)
  if (shouldRenderMobile) {
    const isHomeTabOnly = activeTab === 'home' && !selectedCategory;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top bar — same as home screen (logo + Chat | Info | Notifications) */}
        {!isHomeTabOnly && (
          <AppTopBar
            primaryColor={isDarkMode ? colors.primary : (colors.primary || '#00A5F4')}
            isDark={isDarkMode}
            backgroundColor={colors.background}
            unreadNotificationCount={unreadNotificationCount}
            onPressChat={() => setActiveTab('chat')}
            onPressInfo={handleRestartCoachTour}
            onPressNotifications={() => setActiveTab('notifications')}
          />
        )}

        {/* Render content based on active tab — animated transition */}
        <Animated.View style={{ flex: 1, opacity: tabContentOpacity, transform: [{ translateY: tabContentTranslateY }] }}>
        {/* Home tab - always mounted to preserve state when navigating back */}
        <View style={{ flex: 1, display: activeTab === 'home' ? 'flex' : 'none', pointerEvents: activeTab === 'home' ? 'auto' : 'none' }}>
        {selectedCategory ? (
            <CategorySubcategoryScreen
              category={selectedCategory}
              onBack={() => setSelectedCategory(null)}
              onViewProjects={(categoryId) => {
                setProjectsScreenCategoryId(categoryId);
                setSelectedCategory(null);
                setCurrentProjectsFilter('available');
                setActiveTab('projects');
              }}
            />
          ) : (
            <UserHomeScreenContent
              userName={userProfile?.name}
              unreadNotificationCount={unreadNotificationCount}
              onExposeControl={(ctrl) => { homeContentControl.current = ctrl; }}
              onPressSearch={(query: string) => {
                setSearchText(query);
                if (query.trim().length > 0) {
                  setShowSearchResults(true);
                }
              }}
              onPressOpenServices={() => setShowServicesList(true)}
              onPressServiceProvidersAll={onShowServiceProviders}
              onPressMyProjects={() => {
                setActiveTab('projects');
                setCurrentProjectsFilter('running');
              }}
              onPressMyTasks={() => {
                setActiveTab('projects');
                setCurrentProjectsFilter('available');
              }}
              onPressPremiumUpgrade={() => {
                setActiveTab('profile');
                setProfileSubView('subscription');
              }}
              onPressNotifications={() => setActiveTab('notifications')}
              onPressMessages={() => setActiveTab('chat')}
              onPressInfo={handleRestartCoachTour}
              onPressFab={() => {
                setActiveTab('new');
                setNewProjectSubView('project-type-selection');
              }}
              onPressProjectStatus={(status: 'pending' | 'running' | 'completed') => {
                if (status === 'pending') {
                  setCurrentProjectsFilter('available');
                } else if (status === 'running') {
                  setCurrentProjectsFilter('running');
                } else if (status === 'completed') {
                  setCurrentProjectsFilter('completed');
                }
                setActiveTab('projects');
              }}
              onPressCategory={(cat: CategoryInfo) => {
                if (onPressCategory) {
                  onPressCategory(cat);
                } else {
                  setSelectedCategory(cat);
                }
              }}
              onPressSearchCategory={(cat: CategoryInfo) => {
                // Web behavior: category search click shows technicians for that whole category.
                const categoryName = i18n.language === 'ar' && cat.nameAr ? cat.nameAr : cat.nameEn;
                setCategoryTechniciansView({ categoryId: cat.id, categoryName, source: 'search' });
                setActiveTab('category-technicians');
              }}
              onPressSubcategory={(sub) => {
                const serviceName = i18n.language === 'ar' && sub.nameAr ? sub.nameAr : sub.nameEn;
                setServiceTechniciansView({ serviceId: sub.id, serviceName, source: 'category' });
                setActiveTab('service-technicians');
              }}
              onPressTechnician={(technicianId) => {
                setTechProfileReturnTab('home');
                setSelectedTechnicianId(technicianId);
                setActiveTab('technician-profile');
              }}
              onPressCategoryForManual={(category) => {
                setManualFormInitial({
                  categoryId: category.id,
                  categoryNameEn: category.nameEn || '',
                  categoryNameAr: category.nameAr,
                });
                setActiveTab('new');
                setNewProjectSubView('creation-method');
              }}
              onPressSubcategoryForManual={(category, subcategory) => {
                setManualFormInitial({
                  categoryId: category.id,
                  categoryNameEn: category.nameEn || '',
                  categoryNameAr: category.nameAr,
                  subcategoryId: subcategory.id,
                  subcategoryNameEn: subcategory.nameEn || '',
                  subcategoryNameAr: subcategory.nameAr,
                });
                setActiveTab('new');
                setNewProjectSubView('creation-method');
              }}
              onPressChatbot={() => setActiveTab('chatbot')}
              onPressProject={(project) => {
                setPendingOpenProject(project);
                setActiveTab('projects');
                setCurrentProjectsFilter('running');
              }}
              onPressSmallTask={(task) => {
                setPendingOpenSmallTask(task);
                setActiveTab('projects');
                setCurrentProjectsFilter('available');
              }}
              onPressAppointments={() => setActiveTab('appointments')}
              onPressCreateProject={() => {
                setActiveTab('new');
                setNewProjectSubView('project-type-selection');
              }}
              onPressCreateSmallTask={() => {
                setActiveTab('new');
                setNewProjectSubView('small-task-type-selection');
              }}
              onPressMySmallTasks={() => {
                setActiveTab('projects');
                setCurrentProjectsFilter('available');
              }}
            />
          )}
        </View>

        {activeTab === 'projects' && (
          <View style={{ flex: 1 }}>
            <ProjectsScreen
              filter={currentProjectsFilter}
              initialServiceCategoryId={projectsScreenCategoryId}
              initialProject={pendingOpenProject}
              initialSmallTask={pendingOpenSmallTask}
              initialProjectType={projectsTabEmbeddedType ?? undefined}
              onExposeTourControl={(c) => {
                projectsTourControl.current = c;
              }}
              onExposeProjectTypeTourControl={exposeProjectTypeTourControl}
              onBack={() => {
                if (projectsReturnTabOnBack) {
                  setActiveTab(projectsReturnTabOnBack as any);
                  setProjectsReturnTabOnBack(null);
                } else {
                  setActiveTab('home');
                }
                setProjectsScreenCategoryId(null);
              }}
              onFilterChange={(newFilter) => {
                setCurrentProjectsFilter(newFilter as any);
              }}
              onOpenChat={(roomId, receiverId, receiverName) => {
                console.log('🔵 [UserHomeScreen] Opening chat from ProjectsScreen:', receiverId, 'roomId:', roomId, 'receiverName:', receiverName);
                openChat(roomId, receiverId, receiverName);
              }}
              onViewTechnician={onNavigateToTechnicianProfile || (() => { })}
              onBookAppointment={(technicianId, technicianName, projectId) => {
                console.log('🔵 [UserHomeScreen] Book Appointment clicked:', { technicianId, technicianName, projectId });
                onShowBooking?.(technicianId, technicianName, projectId);
              }}
            />
          </View>
        )}

        {activeTab === 'appointments' && (
          <View style={{ flex: 1 }}>
            <AppointmentsScreen
              onExposeTourControl={(c) => {
                appointmentsTourControl.current = c;
              }}
            />
          </View>
        )}

        {activeTab === 'service-technicians' && serviceTechniciansView && (
          <View style={{ flex: 1 }}>
            <ServiceTechniciansScreen
              serviceId={serviceTechniciansView.serviceId}
              serviceName={serviceTechniciansView.serviceName}
              onBack={() => {
                console.log('🔵 [UserHomeScreen] Back from ServiceTechniciansScreen');
                setActiveTab('home');
                setServiceTechniciansView(null);
              }}
              onNavigateToTechnicianProfile={(technicianId) => {
                console.log('🔵 [UserHomeScreen] Navigating to technician profile:', technicianId);
                setTechProfileReturnTab('service-technicians');
                setSelectedTechnicianId(technicianId);
                setActiveTab('technician-profile');
              }}
              onNavigateToChat={(roomId, receiverId, receiverName) => {
                console.log('🔵 [UserHomeScreen] Opening chat with technician:', receiverId, 'roomId:', roomId, 'receiverName:', receiverName);
                const source = serviceTechniciansView?.source;
                const returnContext =
                  source === 'lookForBonyaders'
                    ? 'service-technicians'
                    : source === 'search'
                      ? 'home'
                      : null;
                openChat(roomId, receiverId, receiverName, { returnContext });
              }}
              onNavigateToBooking={(technicianId, technicianName) => {
                setHireReturnTab('service-technicians');
                setHiringTechnician({ id: technicianId, name: technicianName });
                setManualFormInitial({ categoryId: 0, categoryNameEn: 'All services', categoryNameAr: 'كل الخدمات' });
                setNewProjectSubView('creation-method');
                setActiveTab('new');
              }}
            />
          </View>
        )}

        {activeTab === 'category-technicians' && categoryTechniciansView && (
          <View style={{ flex: 1 }}>
            <CategoryTechniciansScreen
              categoryId={categoryTechniciansView.categoryId}
              categoryName={categoryTechniciansView.categoryName}
              onBack={() => {
                setActiveTab('home');
                setCategoryTechniciansView(null);
              }}
              onNavigateToTechnicianProfile={(technicianId) => {
                setTechProfileReturnTab('category-technicians');
                setSelectedTechnicianId(technicianId);
                setActiveTab('technician-profile');
              }}
              onNavigateToChat={(roomId, receiverId, receiverName) => {
                openChat(roomId, receiverId, receiverName, { returnContext: 'home' });
              }}
              onNavigateToBooking={(technicianId, technicianName) => {
                setHireReturnTab('category-technicians');
                setHiringTechnician({ id: technicianId, name: technicianName });
                setManualFormInitial({ categoryId: 0, categoryNameEn: 'All services', categoryNameAr: 'كل الخدمات' });
                setNewProjectSubView('creation-method');
                setActiveTab('new');
              }}
            />
          </View>
        )}

        {activeTab === 'technician-profile' && selectedTechnicianId && (
          <View style={{ flex: 1 }}>
            <TechnicianProfileView
              technicianId={selectedTechnicianId}
              onBack={() => {
                const returnTab = techProfileReturnTab || 'home';
                setTechProfileReturnTab(null);
                setSelectedTechnicianId(null);
                setActiveTab(returnTab as any);
              }}
              onChat={(roomId, receiverId, receiverName) => {
                const returnContext = (techProfileReturnTab as any) || null;
                setSelectedTechnicianId(null);
                openChat(roomId, receiverId, receiverName, { returnContext });
              }}
              onHire={(techId, techName) => {
                setHireReturnTab('technician-profile');
                setHiringTechnician({ id: techId, name: techName });
                setManualFormInitial({ categoryId: 0, categoryNameEn: 'All services', categoryNameAr: 'كل الخدمات' });
                setNewProjectSubView('creation-method');
                setActiveTab('new');
              }}
            />
          </View>
        )}

        {activeTab === 'chat' && (
          <View
            style={{
              flex: 1,
              flexDirection: IS_LARGE_WEB ? 'row' : 'column',
            }}
          >
            {/* Chat List - Only show if showChatList is true */}
            {(showChatList || IS_LARGE_WEB) && (
              <View style={[
                { flex: 1 },
                IS_LARGE_WEB && {
                  flex: 0.35,
                  borderRightWidth: 1,
                  borderRightColor: colors.border,
                  ...Platform.select({
                    web: {
                      maxWidth: 400,
                      minWidth: 300,
                    } as any,
                  }),
                }
              ]}>
                <ChatRoomsListScreen
                  stackedUnderAppTopBar
                  onExposeTourControl={exposeChatTourControl}
                  onOpenChat={(roomId, receiverId, receiverName, projectId) => {
                    openChat(roomId, receiverId, receiverName, { projectId });
                  }}
                  onBack={
                    IS_LARGE_WEB
                      ? undefined
                      : selectedChat
                        ? () => {
                          setSelectedChat(null);
                          setShowChatList(true);
                        }
                        : undefined
                  }
                />
              </View>
            )}

            {/* Chat Detail - Shows on right side on desktop, or replaces list on mobile */}
            {selectedChat && (
              <View style={[
                { flex: 1 },
                IS_LARGE_WEB && selectedChat && {
                  flex: 0.65,
                  ...Platform.select({
                    web: {
                      minWidth: 400,
                    } as any,
                  }),
                }
              ]}>
                <ChatDetailScreen
                  roomId={selectedChat.roomId}
                  receiverId={selectedChat.receiverId}
                  receiverName={selectedChat.receiverName}
                  projectId={selectedChat.projectId ?? undefined}
                  hasBottomTabBar
                  onBack={IS_LARGE_WEB ? undefined : handleChatBackNavigation}
                />
              </View>
            )}
          </View>
        )}

        {activeTab === 'notifications' && (
          <View style={{ flex: 1 }}>
            <NotificationsScreen
              onUnreadCountChange={setUnreadNotificationCount}
              onNavigateFromNotification={onNavigateFromNotification}
              onExposeTourControl={(c) => {
                notificationsTourControl.current = c;
              }}
            />
          </View>
        )}

        {activeTab === 'profile' && (
          <View style={{ flex: 1 }}>
            {profileSubView === null ? (
              <ProfileScreen
                onExposeTourControl={(c) => {
                  profileTourControl.current = c;
                }}
                onLogout={onLogout}
                onNavigateToEditProfile={() => setProfileSubView('myData')}
                onNavigateToPortfolio={() => setProfileSubView('portfolio')}
                onNavigateToSubscription={() => setProfileSubView('subscription')}
                onNavigateToServices={() => setProfileSubView('services')}
                onNavigateToAvailability={() => setProfileSubView('availability')}
                onNavigateToRegions={() => setProfileSubView('regions')}
                onNavigateToSmallTaskTypes={() => setProfileSubView('smallTaskTypes')}
                onNavigateToPaymentHistory={() => setProfileSubView('paymentHistory')}
                onNavigateToSupportTickets={() => {
                  setProfileSubView(null);
                  onShowSupportTickets?.();
                }}
              />
            ) : profileSubView === 'myData' ? (
              <MyDataScreen
                onBack={() => setProfileSubView(null)}
                onEditProfile={() => setProfileSubView('editProfile')}
                onChangePhone={() => setProfileSubView('changePhone')}
                onChangePassword={() => setProfileSubView('changePassword')}
                isTechnician={false}
              />
            ) : profileSubView === 'editProfile' ? (
              <EditProfileScreen
                userDetails={{}}
                onBack={() => setProfileSubView('myData')}
                onSave={() => setProfileSubView('myData')}
              />
            ) : profileSubView === 'portfolio' ? (
              <PortfolioManagement
                technicianId={userId}
                isOwnProfile={true}
                onBack={() => setProfileSubView(null)}
              />
            ) : profileSubView === 'subscription' ? (
              <SubscriptionScreen
                onBack={() => setProfileSubView(null)}
              />
            ) : profileSubView === 'services' ? (
              <ServiceManagementScreen
                onBack={() => setProfileSubView(null)}
              />
            ) : profileSubView === 'availability' ? (
              <AvailabilityScreen
                onBack={() => setProfileSubView(null)}
              />
            ) : profileSubView === 'regions' ? (
              <RegionsManagementScreen
                onBack={() => setProfileSubView(null)}
              />
            ) : profileSubView === 'smallTaskTypes' ? (
              <SmallTaskTypesScreen
                onBack={() => setProfileSubView(null)}
              />
            ) : profileSubView === 'paymentHistory' ? (
              <PaymentTransactionScreen
                onBack={() => setProfileSubView(null)}
              />
            ) : profileSubView === 'changePassword' ? (
              <ChangePasswordScreen
                onBack={() => setProfileSubView(null)}
              />
            ) : profileSubView === 'changePhone' ? (
              <ChangePhoneScreen
                onBack={() => setProfileSubView(null)}
                onOTPSent={(newPhoneNumber) => {
                  setPhoneChangeNumber(newPhoneNumber);
                  setProfileSubView('verifyPhoneChange');
                }}
              />
            ) : profileSubView === 'verifyPhoneChange' ? (
              <VerifyPhoneChangeScreen
                newPhoneNumber={phoneChangeNumber}
                onBack={() => setProfileSubView('changePhone')}
                onVerified={() => setProfileSubView(null)}
              />
            ) : null}
          </View>
        )}

        {activeTab === 'new' && (
          <View
            ref={newProjectSubView !== 'project-type-selection' ? newTabTour.register('panel') : undefined}
            collapsable={false}
            style={{ flex: 1 }}
          >
            {newProjectSubView === 'project-type-selection' ? (
              <ProjectTypeSelectionScreen
                onExposeTourControl={exposeProjectTypeTourControl}
                onSelectLarge={() => {
                  setSelectedTaskType(null);
                  setManualFormInitial({
                    categoryId: 0,
                    categoryNameEn: 'All services',
                    categoryNameAr: 'كل الخدمات',
                  });
                  setNewProjectSubView('creation-method');
                }}
                onSelectSmall={() => {
                  setNewProjectSubView('small-task-type-selection');
                }}
                onBack={() => {
                  setActiveTab('home');
                  setNewProjectSubView(null);
                }}
              />
            ) : newProjectSubView === 'small-task-type-selection' ? (
              <SmallTaskTypeSelectionScreen
                onSelectTaskType={(taskType) => {
                  console.log('Selected task type:', taskType);
                  setSelectedTaskType(taskType);
                  setNewProjectSubView('small-task-request-form');
                }}
                onBack={() => {
                  setNewProjectSubView('project-type-selection');
                }}
              />
            ) : newProjectSubView === 'small-task-request-form' && selectedTaskType ? (
              <SmallTaskRequestForm
                taskType={selectedTaskType}
                onBack={() => {
                  setNewProjectSubView('small-task-type-selection');
                }}
                onSuccess={() => {
                  setSelectedTaskType(null);
                  setActiveTab('home');
                  setNewProjectSubView(null);
                }}
              />
            ) : newProjectSubView === 'creation-method' && manualFormInitial ? (
              <CreationMethodScreen
                category={{
                  id: manualFormInitial.categoryId,
                  nameEn: manualFormInitial.categoryNameEn,
                  nameAr: manualFormInitial.categoryNameAr,
                }}
                subcategory={
                  manualFormInitial.subcategoryId != null
                    ? {
                        id: manualFormInitial.subcategoryId,
                        nameEn: manualFormInitial.subcategoryNameEn || '',
                        nameAr: manualFormInitial.subcategoryNameAr,
                      }
                    : { id: 0, nameEn: 'All services', nameAr: 'الكل' }
                }
                onBack={() => {
                  setManualFormInitial(null);
                  if (hireReturnTab) {
                    setActiveTab(hireReturnTab as any);
                    setHireReturnTab(null);
                    setHiringTechnician(null);
                    setNewProjectSubView(null);
                  } else {
                    setNewProjectSubView('project-type-selection');
                  }
                }}
                onChooseAI={() => setNewProjectSubView('ai')}
                onChooseManual={() => setNewProjectSubView('manual')}
              />
            ) : newProjectSubView === null ? (
              <NewProjectView
                onNavigateToAI={() => setNewProjectSubView('ai')}
                onNavigateToManual={() => setNewProjectSubView('manual')}
                onBack={() => {
                  setActiveTab('home');
                  setNewProjectSubView(null);
                  setHiringTechnician(null);
                }}
                technician={hiringTechnician}
              />
            ) : newProjectSubView === 'ai' ? (
              <ConversationalAIForm
                technician={hiringTechnician}
                initialCategoryId={manualFormInitial?.categoryId}
                initialCategoryName={i18n.language === 'ar' ? manualFormInitial?.categoryNameAr : manualFormInitial?.categoryNameEn}
                initialSubcategoryId={manualFormInitial?.subcategoryId}
                initialSubcategoryName={i18n.language === 'ar' ? manualFormInitial?.subcategoryNameAr : manualFormInitial?.subcategoryNameEn}
                onBack={() => {
                  if (manualFormInitial) {
                    setNewProjectSubView('creation-method');
                  } else {
                    setActiveTab('home');
                    setNewProjectSubView(null);
                    setHiringTechnician(null);
                  }
                }}
                onSuccess={() => {
                  setHiringTechnician(null);
                  setHireReturnTab(null);
                  setActiveTab('home');
                }}
              />
            ) : newProjectSubView === 'manual' ? (
              <ManualProjectForm
                technician={hiringTechnician}
                onBack={() => {
                  if (manualFormInitial) {
                    setNewProjectSubView('creation-method');
                  } else {
                    setActiveTab('home');
                    setNewProjectSubView(null);
                    setHiringTechnician(null);
                    setManualFormInitial(null);
                  }
                }}
                onSuccess={() => {
                  setHiringTechnician(null);
                  setHireReturnTab(null);
                  setManualFormInitial(null);
                  setActiveTab('home');
                }}
                initialCategoryId={manualFormInitial?.categoryId}
                initialCategoryName={i18n.language === 'ar' ? manualFormInitial?.categoryNameAr : manualFormInitial?.categoryNameEn}
                initialSubcategoryId={manualFormInitial?.subcategoryId}
                initialSubcategoryName={i18n.language === 'ar' ? manualFormInitial?.subcategoryNameAr : manualFormInitial?.subcategoryNameEn}
              />
            ) : null}
          </View>
        )}

        {activeTab === 'chatbot' && (
          <View style={{ flex: 1 }}>
            <ChatbotScreen
              onBack={() => setActiveTab('home')}
              userId={userId}
              userRole="user"
              onNavigateToTab={onChatbotNavigateToTab}
              onNavigateToScreen={onChatbotNavigateToScreen}
              onRequestLiveAgent={onChatbotRequestLiveAgent}
              hasBottomTabBar
            />
          </View>
        )}
        </Animated.View>

        {/* Glass tab bar — iOS-style with water-drop press */}
        <View style={styles.glassTabBarContainer}>
          <GlassTabBar
            activeTab={
              activeTab === 'chatbot'
                ? 'home'
                : ['home', 'projects', 'new', 'chat', 'profile'].includes(activeTab)
                  ? (activeTab as UserTabId)
                  : activeTab === 'notifications'
                    ? 'profile'
                    : activeTab === 'appointments'
                      ? 'home'
                      : 'home'
            }
            onTabPress={(tab) => {
              if (activeTab === 'profile' && tab !== 'profile') {
                onProfileTabClosed?.();
              }
              setActiveTab(tab as typeof activeTab);
            }}
            onNewPress={() => {
              setActiveTab('new');
              setNewProjectSubView('project-type-selection');
            }}
            primaryColor={colors.primary}
            primaryColorDark={colors.primaryDark || '#1A6DB4'}
            isDark={isDarkMode}
            bottomInset={insets.bottom}
            t={t}
          />
        </View>

        {activeTab === 'new' && (
          <ScreenTourOverlay
            visible={newTabTour.tourActive}
            tourStep={newTabTour.tourStep}
            stepRect={newTabTour.stepRect}
            totalSteps={newTabTourSteps.length}
            stepOrder={newTabTour.tourStep + 1}
            stepText={
              newTabTourSteps[newTabTour.tourStep]
                ? t(`tutorial.tab.new.${newTabTourSteps[newTabTour.tourStep].i18nSuffix}`)
                : ''
            }
            isFirst={newTabTour.tourStep === 0}
            isLast={newTabTour.tourStep === newTabTourSteps.length - 1}
            primaryColor={colors.primary}
            textColor={colors.text}
            secondaryTextColor={colors.textSecondary}
            bgColor={colors.cardBackground}
            isRTL={i18n.language === 'ar' || I18nManager.isRTL}
            fontFamily={fontFamily}
            boldFontFamily={boldFontFamily}
            onNext={() =>
              newTabTour.setTourStep((s: number) => Math.min(s + 1, newTabTourSteps.length - 1))
            }
            onPrev={() => newTabTour.setTourStep((s: number) => Math.max(s - 1, 0))}
            onSkip={newTabTour.endTour}
            onFinish={newTabTour.endTour}
            t={t}
          />
        )}

        <Modal
          visible={showServicesList}
          transparent
          animationType="fade"
          onRequestClose={() => setShowServicesList(false)}
        >
          <View style={styles.mobileServicesListModal}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowServicesList(false)}
            />
            <View
              style={[styles.mobileServicesListContainer, { backgroundColor: colors.cardBackground }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={[styles.mobileServicesListHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.mobileServicesListTitle, { color: colors.text }]}>{t('All Services')}</Text>
                <TouchableOpacity onPress={() => setShowServicesList(false)} style={styles.closeButton}>
                  <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={allServices}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.mobileServiceListItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setShowServicesList(false);
                      const serviceName =
                        i18n.language === 'ar' && item.nameAr ? item.nameAr : item.nameEn || 'Service';
                      setServiceTechniciansView({
                        serviceId: item.id,
                        serviceName,
                        source: 'lookForBonyaders',
                      });
                      setActiveTab('service-technicians');
                    }}
                  >
                    {(() => {
                      const serviceImageSource = resolveServiceImageSource(item);
                      return (
                        <View
                          style={[
                            styles.mobileServiceListIconContainer,
                            serviceImageSource ? styles.serviceListImageWrapper : styles.serviceListIconFallback,
                          ]}
                        >
                          {serviceImageSource ? (
                            <Image source={serviceImageSource} style={styles.serviceListImage} resizeMode="cover" />
                          ) : (
                            <Ionicons name="briefcase-outline" size={24} color={colors.primary || '#0080E0'} />
                          )}
                        </View>
                      );
                    })()}
                    <View style={styles.mobileServiceListTextContainer}>
                      <Text style={[styles.mobileServiceListName, { color: colors.text }]}>
                        {i18n.language === 'ar' ? item.nameAr : item.nameEn}
                      </Text>
                      {item.description ? (
                        <Text
                          style={[styles.mobileServiceListDescription, { color: colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.mobileEmptyContainer}>
                    <Ionicons name="briefcase-outline" size={48} color={colors.textSecondary} />
                    <Text style={[styles.mobileEmptyTitle, { color: colors.text }]}>{t('No services available')}</Text>
                  </View>
                }
                style={styles.mobileServicesListScroll}
                showsVerticalScrollIndicator
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Render desktop layout for large web screens
  return (
    <View style={[styles.desktopContainer, { backgroundColor: colors.background }]}>
      {/* New Horizontal Navigation Bar - Figma Design */}
      <View style={[styles.desktopNavBar, {
        backgroundColor: isDarkMode ? colors.cardBackground : colors.primary
      }]}>
        {/* Logo Section */}
        <View style={styles.desktopNavLogoSection}>
          <View style={styles.desktopNavLogoIcon}>
            <ExpoImage
              source={require('../../assets/bonyad-cube-logo.svg')}
              style={{ width: 80, height: 97 } as any}
              contentFit="contain"
            />
          </View>
          <View style={styles.desktopNavLogoTextContainer}>
            <Text style={[styles.desktopNavLogoText, {
              color: isDarkMode ? colors.text : '#E6EFF7'
            }]}>Bonyad</Text>
            <Text style={[styles.desktopNavLogoTextArabic, {
              color: isDarkMode ? colors.text : '#E6EFF7'
            }]}>بُنياد</Text>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.desktopNavTabs}>
          <TouchableOpacity
            style={[styles.desktopNavTab, activeTab === 'home' && {
              ...styles.desktopNavTabActive,
              borderBottomColor: isDarkMode ? colors.primary : '#FFFFFF'
            }]}
            onPress={() => setActiveTab('home')}
          >
            <Text style={[styles.desktopNavTabText, activeTab === 'home' && styles.desktopNavTabTextActive, {
              color: activeTab === 'home'
                ? (isDarkMode ? colors.primary : '#FFFFFF')
                : (isDarkMode ? colors.textSecondary : '#B3CEE6')
            }]}>
              {t('Dashboard')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.desktopNavTab, activeTab === 'projects' && {
              ...styles.desktopNavTabActive,
              borderBottomColor: isDarkMode ? colors.primary : '#FFFFFF'
            }]}
            onPress={() => setActiveTab('projects')}
          >
            <Text style={[styles.desktopNavTabText, activeTab === 'projects' && styles.desktopNavTabTextActive, {
              color: activeTab === 'projects'
                ? (isDarkMode ? colors.primary : '#FFFFFF')
                : (isDarkMode ? colors.textSecondary : '#B3CEE6')
            }]}>
              {t('Projects')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.desktopNavTab, activeTab === 'appointments' && {
              ...styles.desktopNavTabActive,
              borderBottomColor: isDarkMode ? colors.primary : '#FFFFFF'
            }]}
            onPress={() => setActiveTab('appointments')}
          >
            <Text style={[styles.desktopNavTabText, activeTab === 'appointments' && styles.desktopNavTabTextActive, {
              color: activeTab === 'appointments'
                ? (isDarkMode ? colors.primary : '#FFFFFF')
                : (isDarkMode ? colors.textSecondary : '#B3CEE6')
            }]}>
              {t('Appointments')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.desktopNavTab, activeTab === 'new' && {
              ...styles.desktopNavTabActive,
              borderBottomColor: isDarkMode ? colors.primary : '#FFFFFF'
            }]}
            onPress={() => setActiveTab('new')}
          >
            <Text style={[styles.desktopNavTabText, activeTab === 'new' && styles.desktopNavTabTextActive, {
              color: activeTab === 'new'
                ? (isDarkMode ? colors.primary : '#FFFFFF')
                : (isDarkMode ? colors.textSecondary : '#B3CEE6')
            }]}>
              {t('New Project')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Icons Section */}
        <View style={styles.desktopNavIcons}>
          <TouchableOpacity style={styles.desktopNavIconButton} onPress={handleRestartCoachTour}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={isDarkMode ? colors.text : '#E6EFF7'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.desktopNavIconButton}
            onPress={() => setActiveTab('chat')}
          >
            <Ionicons
              name="chatbubble-outline"
              size={24}
              color={isDarkMode ? colors.text : '#E6EFF7'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.desktopNavIconButton}
            onPress={() => setActiveTab('notifications')}
          >
            <View style={styles.desktopNavNotificationWrapper}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color={isDarkMode ? colors.text : '#E6EFF7'}
              />
              {unreadNotificationCount > 0 && (
                <View style={styles.desktopNavNotificationBadge}>
                  <View style={styles.desktopNavNotificationDot} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.desktopNavProfileSection}>
          <TouchableOpacity
            style={styles.desktopNavProfileButton}
            onPress={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <View style={styles.desktopNavProfileAvatar}>
              {userProfile?.avatar || userProfile?.profileImage ? (
                <Image
                  source={{ uri: userProfile.avatar || userProfile.profileImage }}
                  style={styles.desktopNavProfileAvatarImage}
                />
              ) : (
                <View style={[styles.desktopNavProfileAvatarPlaceholder, {
                  backgroundColor: isDarkMode ? colors.primary : '#4D8EC5'
                }]}>
                  <Text style={styles.desktopNavProfileAvatarText}>
                    {(userProfile?.name || userName || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.desktopNavProfileInfo}>
              <Text style={[styles.desktopNavProfileName, {
                color: isDarkMode ? colors.text : '#FFFFFF'
              }]}>
                {userProfile?.name || userName || t('User')}
              </Text>
              <Text style={[styles.desktopNavProfileRole, {
                color: isDarkMode ? colors.textSecondary : '#FFFFFF'
              }]}>{t('User')}</Text>
            </View>
            <Ionicons
              name="chevron-down"
              size={24}
              color={isDarkMode ? colors.text : '#FFFFFF'}
              style={{ transform: [{ rotate: showProfileDropdown ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {/* Profile Dropdown */}
          {showProfileDropdown && (
            <View style={[styles.desktopNavProfileDropdown, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.desktopNavProfileDropdownItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowProfileDropdown(false);
                  setActiveTab('profile');
                }}
              >
                <Ionicons name="person-outline" size={20} color={colors.text} />
                <Text style={[styles.desktopNavProfileDropdownText, { color: colors.text }]}>{t('Profile')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.desktopNavProfileDropdownItem}
                onPress={() => {
                  setShowProfileDropdown(false);
                  onLogout();
                }}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.desktopNavProfileDropdownText, { color: colors.textSecondary }]}>{t('Logout')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Main content - Render based on active tab */}
      <View style={styles.desktopMainContentWrapper}>
        {/* Home tab - always mounted to preserve state when navigating back */}
        <View style={{ flex: 1, display: activeTab === 'home' ? 'flex' : 'none', pointerEvents: activeTab === 'home' ? 'auto' : 'none' }}>
        {selectedCategory ? (
            <CategorySubcategoryScreen
              category={selectedCategory}
              onBack={() => setSelectedCategory(null)}
              onViewProjects={(categoryId) => {
                setProjectsScreenCategoryId(categoryId);
                setSelectedCategory(null);
                setCurrentProjectsFilter('available');
                setActiveTab('projects');
              }}
            />
          ) : (
            <UserHomeScreenContent
              userName={userProfile?.name}
              unreadNotificationCount={unreadNotificationCount}
              onExposeControl={(ctrl) => { homeContentControl.current = ctrl; }}
              onPressSearch={(query: string) => {
                setSearchText(query);
                if (query.trim().length > 0) {
                  setShowSearchResults(true);
                }
              }}
              onPressOpenServices={() => setShowServicesList(true)}
              onPressServiceProvidersAll={onShowServiceProviders}
              onPressMyProjects={() => {
                setActiveTab('projects');
                setCurrentProjectsFilter('running');
              }}
              onPressMyTasks={() => {
                setActiveTab('projects');
                setCurrentProjectsFilter('available');
              }}
              onPressPremiumUpgrade={() => {
                setActiveTab('profile');
                setProfileSubView('subscription');
              }}
              onPressNotifications={() => setActiveTab('notifications')}
              onPressMessages={() => setActiveTab('chat')}
              onPressInfo={handleRestartCoachTour}
              onPressFab={() => {
                setActiveTab('new');
                setNewProjectSubView('project-type-selection');
              }}
              onPressProjectStatus={(status: 'pending' | 'running' | 'completed') => {
                if (status === 'pending') {
                  setCurrentProjectsFilter('available');
                } else if (status === 'running') {
                  setCurrentProjectsFilter('running');
                } else if (status === 'completed') {
                  setCurrentProjectsFilter('completed');
                }
                setActiveTab('projects');
              }}
              onPressCategory={(cat: CategoryInfo) => {
                if (onPressCategory) {
                  onPressCategory(cat);
                } else {
                  setSelectedCategory(cat);
                }
              }}
              onPressSubcategory={(sub) => {
                const serviceName = i18n.language === 'ar' && sub.nameAr ? sub.nameAr : sub.nameEn;
                setServiceTechniciansView({ serviceId: sub.id, serviceName, source: 'category' });
                setActiveTab('service-technicians');
              }}
              onPressCategoryForManual={(category) => {
                setManualFormInitial({
                  categoryId: category.id,
                  categoryNameEn: category.nameEn || '',
                  categoryNameAr: category.nameAr,
                });
                setActiveTab('new');
                setNewProjectSubView('creation-method');
              }}
              onPressSubcategoryForManual={(category, subcategory) => {
                setManualFormInitial({
                  categoryId: category.id,
                  categoryNameEn: category.nameEn || '',
                  categoryNameAr: category.nameAr,
                  subcategoryId: subcategory.id,
                  subcategoryNameEn: subcategory.nameEn || '',
                  subcategoryNameAr: subcategory.nameAr,
                });
                setActiveTab('new');
                setNewProjectSubView('creation-method');
              }}
              onPressChatbot={() => setActiveTab('chatbot')}
              onPressProject={(project) => {
                setPendingOpenProject(project);
                setActiveTab('projects');
                setCurrentProjectsFilter('running');
              }}
              onPressSmallTask={(task) => {
                setPendingOpenSmallTask(task);
                setActiveTab('projects');
                setCurrentProjectsFilter('available');
              }}
              onPressAppointments={() => setActiveTab('appointments')}
              onPressCreateProject={() => {
                setActiveTab('new');
                setNewProjectSubView('project-type-selection');
              }}
              onPressCreateSmallTask={() => {
                setActiveTab('new');
                setNewProjectSubView('small-task-type-selection');
              }}
              onPressMySmallTasks={() => {
                setActiveTab('projects');
                setCurrentProjectsFilter('available');
              }}
            />
          )}
        </View>

        {activeTab === 'projects' && (
          <ScrollView
            style={styles.desktopMainContent}
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <ProjectsScreen
                filter={currentProjectsFilter}
                initialServiceCategoryId={projectsScreenCategoryId}
                initialProject={pendingOpenProject}
                initialSmallTask={pendingOpenSmallTask}
                initialProjectType={projectsTabEmbeddedType ?? undefined}
                onExposeTourControl={(c) => {
                  projectsTourControl.current = c;
                }}
                onExposeProjectTypeTourControl={exposeProjectTypeTourControl}
                onBack={() => {
                  setActiveTab('home');
                  setProjectsScreenCategoryId(null);
                }}
                onFilterChange={(newFilter) => {
                  setCurrentProjectsFilter(newFilter as any);
                }}
                onOpenChat={(roomId, receiverId, receiverName) => {
                  console.log('🔵 [UserHomeScreen] Opening chat from ProjectsScreen:', receiverId, 'roomId:', roomId, 'receiverName:', receiverName);
                  openChat(roomId, receiverId, receiverName);
                }}
                onViewTechnician={onNavigateToTechnicianProfile || (() => { })}
                onBookAppointment={(technicianId, technicianName, projectId) => {
                  console.log('🔵 [UserHomeScreen] Book Appointment clicked:', { technicianId, technicianName, projectId });
                  onShowBooking?.(technicianId, technicianName, projectId);
                }}
              />
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'appointments' && (
          <ScrollView
            style={styles.desktopMainContent}
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <AppointmentsScreen
                onExposeTourControl={(c) => {
                  appointmentsTourControl.current = c;
                }}
              />
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'service-technicians' && serviceTechniciansView && (
          <ScrollView
            style={styles.desktopMainContent}
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <ServiceTechniciansScreen
                serviceId={serviceTechniciansView.serviceId}
                serviceName={serviceTechniciansView.serviceName}
                onBack={() => {
                  console.log('🔵 [UserHomeScreen] Back from ServiceTechniciansScreen');
                  setActiveTab('home');
                  setServiceTechniciansView(null);
                }}
                onNavigateToTechnicianProfile={(technicianId) => {
                  console.log('🔵 [UserHomeScreen] Navigating to technician profile:', technicianId);
                  setTechProfileReturnTab('service-technicians');
                  setSelectedTechnicianId(technicianId);
                  setActiveTab('technician-profile');
                }}
                onNavigateToChat={(roomId, receiverId, receiverName) => {
                  console.log('🔵 [UserHomeScreen] Opening chat with technician:', receiverId, 'roomId:', roomId, 'receiverName:', receiverName);
                  const source = serviceTechniciansView?.source;
                  const returnContext =
                    source === 'lookForBonyaders'
                      ? 'service-technicians'
                      : source === 'search'
                        ? 'home'
                        : null;
                  openChat(roomId, receiverId, receiverName, { returnContext });
                }}
                onNavigateToBooking={(technicianId, technicianName) => {
                  setHireReturnTab('service-technicians');
                  setHiringTechnician({ id: technicianId, name: technicianName });
                  setManualFormInitial({ categoryId: 0, categoryNameEn: 'All services', categoryNameAr: 'كل الخدمات' });
                  setNewProjectSubView('creation-method');
                  setActiveTab('new');
                }}
              />
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'technician-profile' && selectedTechnicianId && (
          <ScrollView
            style={styles.desktopMainContent}
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <TechnicianProfileView
                technicianId={selectedTechnicianId}
                onBack={() => {
                  const returnTab = techProfileReturnTab || 'home';
                  setTechProfileReturnTab(null);
                  setSelectedTechnicianId(null);
                  setActiveTab(returnTab as any);
                }}
                onChat={(roomId, receiverId, receiverName) => {
                  const returnContext = (techProfileReturnTab as any) || null;
                  setSelectedTechnicianId(null);
                  openChat(roomId, receiverId, receiverName, { returnContext });
                }}
                onHire={(techId, techName) => {
                  setHireReturnTab('technician-profile');
                  setHiringTechnician({ id: techId, name: techName });
                  setManualFormInitial({ categoryId: 0, categoryNameEn: 'All services', categoryNameAr: 'كل الخدمات' });
                  setNewProjectSubView('creation-method');
                  setActiveTab('new');
                }}
              />
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'chat' && (
          <View
            style={[
              styles.desktopMainContent,
              {
                flexDirection: IS_LARGE_WEB && selectedChat ? 'row' : 'column',
              },
            ]}
          >
            {/* Chat List - Only show if showChatList is true */}
            {(showChatList || IS_LARGE_WEB) && (
              <View style={[
                { flex: 1 },
                selectedChat && IS_LARGE_WEB && {
                  flex: 0.35,
                  borderRightWidth: 1,
                  borderRightColor: colors.border,
                  ...Platform.select({
                    web: {
                      maxWidth: 400,
                      minWidth: 300,
                    } as any,
                  }),
                }
              ]}>
                <ChatRoomsListScreen
                  stackedUnderAppTopBar
                  onExposeTourControl={exposeChatTourControl}
                  onOpenChat={(roomId, receiverId, receiverName, projectId) => {
                    openChat(roomId, receiverId, receiverName, { projectId });
                  }}
                />
              </View>
            )}

            {/* Chat Detail - Shows on right side when chat is selected */}
            {selectedChat && (
              <View style={[
                { flex: 1 },
                IS_LARGE_WEB && {
                  flex: 0.65,
                  ...Platform.select({
                    web: {
                      minWidth: 400,
                    } as any,
                  }),
                }
              ]}>
                <ChatDetailScreen
                  roomId={selectedChat.roomId}
                  receiverId={selectedChat.receiverId}
                  receiverName={selectedChat.receiverName}
                  projectId={selectedChat.projectId ?? undefined}
                  onBack={IS_LARGE_WEB ? undefined : handleChatBackNavigation}
                />
              </View>
            )}
          </View>
        )}

        {activeTab === 'notifications' && (
          <ScrollView
            style={styles.desktopMainContent}
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <NotificationsScreen
                onUnreadCountChange={setUnreadNotificationCount}
                onNavigateFromNotification={onNavigateFromNotification}
                onExposeTourControl={(c) => {
                  notificationsTourControl.current = c;
                }}
              />
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'profile' && (
          <ScrollView
            style={styles.desktopMainContent}
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              {profileSubView === null ? (
                <ProfileScreen
                  onExposeTourControl={(c) => {
                    profileTourControl.current = c;
                  }}
                  onLogout={onLogout}
                  onNavigateToEditProfile={() => setProfileSubView('myData')}
                  onNavigateToPortfolio={() => setProfileSubView('portfolio')}
                  onNavigateToSubscription={() => setProfileSubView('subscription')}
                  onNavigateToServices={() => setProfileSubView('services')}
                  onNavigateToAvailability={() => setProfileSubView('availability')}
                  onNavigateToRegions={() => setProfileSubView('regions')}
                  onNavigateToSmallTaskTypes={() => setProfileSubView('smallTaskTypes')}
                  onNavigateToPaymentHistory={() => setProfileSubView('paymentHistory')}
                  onNavigateToSupportTickets={() => {
                    setProfileSubView(null);
                    onShowSupportTickets?.();
                  }}
                />
              ) : profileSubView === 'myData' ? (
                <MyDataScreen
                  onBack={() => setProfileSubView(null)}
                  onEditProfile={() => setProfileSubView('editProfile')}
                  onChangePhone={() => setProfileSubView('changePhone')}
                  onChangePassword={() => setProfileSubView('changePassword')}
                  isTechnician={false}
                />
              ) : profileSubView === 'editProfile' ? (
                <EditProfileScreen
                  userDetails={{}}
                  onBack={() => setProfileSubView('myData')}
                  onSave={() => setProfileSubView('myData')}
                />
              ) : profileSubView === 'portfolio' ? (
                <PortfolioManagement
                  technicianId={userId}
                  isOwnProfile={true}
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'subscription' ? (
                <SubscriptionScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'services' ? (
                <ServiceManagementScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'availability' ? (
                <AvailabilityScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'regions' ? (
                <RegionsManagementScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'smallTaskTypes' ? (
                <SmallTaskTypesScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'paymentHistory' ? (
                <PaymentTransactionScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'changePassword' ? (
                <ChangePasswordScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'changePhone' ? (
                <ChangePhoneScreen
                  onBack={() => setProfileSubView(null)}
                  onOTPSent={(newPhoneNumber) => {
                    setPhoneChangeNumber(newPhoneNumber);
                    setProfileSubView('verifyPhoneChange');
                  }}
                />
              ) : profileSubView === 'verifyPhoneChange' ? (
                <VerifyPhoneChangeScreen
                  newPhoneNumber={phoneChangeNumber}
                  onBack={() => setProfileSubView('changePhone')}
                  onVerified={() => setProfileSubView(null)}
                />
              ) : null}
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'new' && (
          <ScrollView
            style={styles.desktopMainContent}
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View ref={newTabTour.register('panel')} collapsable={false} style={styles.mainContentWrapper}>
              {newProjectSubView === 'creation-method' && manualFormInitial ? (
                <CreationMethodScreen
                  category={{
                    id: manualFormInitial.categoryId,
                    nameEn: manualFormInitial.categoryNameEn,
                    nameAr: manualFormInitial.categoryNameAr,
                  }}
                  subcategory={
                    manualFormInitial.subcategoryId != null
                      ? {
                          id: manualFormInitial.subcategoryId,
                          nameEn: manualFormInitial.subcategoryNameEn || '',
                          nameAr: manualFormInitial.subcategoryNameAr,
                        }
                      : { id: 0, nameEn: 'All services', nameAr: 'الكل' }
                  }
                  onBack={() => {
                    setManualFormInitial(null);
                    if (hireReturnTab) {
                      setActiveTab(hireReturnTab as any);
                      setHireReturnTab(null);
                      setHiringTechnician(null);
                      setNewProjectSubView(null);
                    } else {
                      setNewProjectSubView('project-type-selection');
                    }
                  }}
                  onChooseAI={() => setNewProjectSubView('ai')}
                  onChooseManual={() => setNewProjectSubView('manual')}
                />
              ) : newProjectSubView === null ? (
                <NewProjectView
                  onNavigateToAI={() => setNewProjectSubView('ai')}
                  onNavigateToManual={() => setNewProjectSubView('manual')}
                  onBack={() => {
                    setActiveTab('home');
                    setNewProjectSubView(null);
                    setHiringTechnician(null);
                  }}
                  technician={hiringTechnician}
                />
              ) : newProjectSubView === 'ai' ? (
                <ConversationalAIForm
                  technician={hiringTechnician}
                  initialCategoryId={manualFormInitial?.categoryId}
                  initialCategoryName={i18n.language === 'ar' ? manualFormInitial?.categoryNameAr : manualFormInitial?.categoryNameEn}
                  initialSubcategoryId={manualFormInitial?.subcategoryId}
                  initialSubcategoryName={i18n.language === 'ar' ? manualFormInitial?.subcategoryNameAr : manualFormInitial?.subcategoryNameEn}
                  onBack={() => {
                    if (manualFormInitial) {
                      setNewProjectSubView('creation-method');
                    } else {
                      setActiveTab('home');
                      setNewProjectSubView(null);
                      setHiringTechnician(null);
                    }
                  }}
                  onSuccess={() => {
                    setHiringTechnician(null);
                    setHireReturnTab(null);
                    setActiveTab('home');
                  }}
                />
              ) : newProjectSubView === 'manual' ? (
                <ManualProjectForm
                  technician={hiringTechnician}
                  onBack={() => {
                    if (manualFormInitial) {
                      setNewProjectSubView('creation-method');
                    } else {
                      setActiveTab('home');
                      setNewProjectSubView(null);
                      setHiringTechnician(null);
                      setManualFormInitial(null);
                    }
                  }}
                  onSuccess={() => {
                    setHiringTechnician(null);
                    setHireReturnTab(null);
                    setManualFormInitial(null);
                    setActiveTab('home');
                  }}
                  initialCategoryId={manualFormInitial?.categoryId}
                  initialCategoryName={i18n.language === 'ar' ? manualFormInitial?.categoryNameAr : manualFormInitial?.categoryNameEn}
                  initialSubcategoryId={manualFormInitial?.subcategoryId}
                  initialSubcategoryName={i18n.language === 'ar' ? manualFormInitial?.subcategoryNameAr : manualFormInitial?.subcategoryNameEn}
                />
              ) : null}
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'chatbot' && (
          <View style={[styles.desktopMainContent, { flex: 1 }]}>
            <ChatbotScreen
              onBack={() => setActiveTab('home')}
              userId={userId}
              userRole="user"
              onNavigateToTab={onChatbotNavigateToTab}
              onNavigateToScreen={onChatbotNavigateToScreen}
              onRequestLiveAgent={onChatbotRequestLiveAgent}
              hasBottomTabBar={false}
            />
          </View>
        )}
      </View>

      <Modal
        visible={showServicesList}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServicesList(false)}
      >
        <View style={styles.mobileServicesListModal}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowServicesList(false)}
          />
          <View
            style={[styles.mobileServicesListContainer, { backgroundColor: colors.cardBackground }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.mobileServicesListHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.mobileServicesListTitle, { color: colors.text }]}>{t('All Services')}</Text>
              <TouchableOpacity onPress={() => setShowServicesList(false)} style={styles.closeButton}>
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={allServices}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.mobileServiceListItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setShowServicesList(false);
                    const serviceName =
                      i18n.language === 'ar' && item.nameAr ? item.nameAr : item.nameEn || 'Service';
                    setServiceTechniciansView({
                      serviceId: item.id,
                      serviceName,
                      source: 'lookForBonyaders',
                    });
                    setActiveTab('service-technicians');
                  }}
                >
                  {(() => {
                    const serviceImageSource = resolveServiceImageSource(item);
                    return (
                      <View
                        style={[
                          styles.mobileServiceListIconContainer,
                          serviceImageSource ? styles.serviceListImageWrapper : styles.serviceListIconFallback,
                        ]}
                      >
                        {serviceImageSource ? (
                          <Image source={serviceImageSource} style={styles.serviceListImage} resizeMode="cover" />
                        ) : (
                          <Ionicons name="briefcase-outline" size={24} color={colors.primary || '#0080E0'} />
                        )}
                      </View>
                    );
                  })()}
                  <View style={styles.mobileServiceListTextContainer}>
                    <Text style={[styles.mobileServiceListName, { color: colors.text }]}>
                      {i18n.language === 'ar' ? item.nameAr : item.nameEn}
                    </Text>
                    {item.description ? (
                      <Text
                        style={[styles.mobileServiceListDescription, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.mobileEmptyContainer}>
                  <Ionicons name="briefcase-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.mobileEmptyTitle, { color: colors.text }]}>{t('No services available')}</Text>
                </View>
              }
              style={styles.mobileServicesListScroll}
              showsVerticalScrollIndicator
            />
          </View>
        </View>
      </Modal>

      {activeTab === 'new' && (
        <ScreenTourOverlay
          visible={newTabTour.tourActive}
          tourStep={newTabTour.tourStep}
          stepRect={newTabTour.stepRect}
          totalSteps={newTabTourSteps.length}
          stepOrder={newTabTour.tourStep + 1}
          stepText={
            newTabTourSteps[newTabTour.tourStep]
              ? t(`tutorial.tab.new.${newTabTourSteps[newTabTour.tourStep].i18nSuffix}`)
              : ''
          }
          isFirst={newTabTour.tourStep === 0}
          isLast={newTabTour.tourStep === newTabTourSteps.length - 1}
          primaryColor={colors.primary}
          textColor={colors.text}
          secondaryTextColor={colors.textSecondary}
          bgColor={colors.cardBackground}
          isRTL={i18n.language === 'ar' || I18nManager.isRTL}
          fontFamily={fontFamily}
          boldFontFamily={boldFontFamily}
          onNext={() =>
            newTabTour.setTourStep((s: number) => Math.min(s + 1, newTabTourSteps.length - 1))
          }
          onPrev={() => newTabTour.setTourStep((s: number) => Math.max(s - 1, 0))}
          onSkip={newTabTour.endTour}
          onFinish={newTabTour.endTour}
          t={t}
        />
      )}

      {/* Floating Chatbot Button (desktop web — same assistant as mobile FAB in home content) */}
      <TouchableOpacity
        style={[styles.chatbotFab, { backgroundColor: colors.primary }]}
        onPress={() => setActiveTab('chatbot')}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubbles" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Local transition loader for tab/subview switches (bottom nav / top nav / profile subviews) */}
      {isInHomeTransitionLoading && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]}>
          <AnimatedLoadingScreen showMessage={false} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Figma Top Bar Styles (Node 58:2467)
  figmaTopBar: {
    backgroundColor: '#00549B', // Blue-Primary/70
    paddingTop: 30,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    minHeight: 120,
  },
  figmaLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 66.56,
  },
  figmaLogoIcon: {
    width: 53,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  figmaLogoTextContainer: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  figmaLogoText: {
    fontSize: 20,
    fontWeight: '800', // Extra Bold
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  figmaLogoTextArabic: {
    fontSize: 20,
    fontWeight: '800', // Extra Bold
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  figmaTopBarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  figmaIconButton: {
    padding: 6,
  },
  figmaNotificationWrapper: {
    position: 'relative',
  },
  figmaNotificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  figmaNotificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFB703', // Amber/60
  },
  // Glass tab bar (iOS-style) container — floats at bottom
  glassTabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...Platform.select({
      web: { position: 'fixed' as any },
    }),
  },
  // ═══ Modern Tab Bar Styles (legacy, kept for ref) ═══
  modernTabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modernTabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  modernTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    position: 'relative',
    minWidth: 56,
  },
  modernTabActiveIndicator: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    bottom: 0,
    borderRadius: 14,
  },
  modernTabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
  },
  modernTabLabelActive: {
    fontWeight: '700',
  },
  modernTabCenterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  // Keep old styles for backward compat (unused but prevents crashes)
  compactTabBarContainer: { position: 'absolute' as any, bottom: 0 },
  tabScroll: { flex: 1 },
  tabScrollContent: { paddingHorizontal: 8 },
  tabCard: { width: 100, height: 58, borderRadius: 12 },
  tabCardActive: {},
  tabCardLabel: { fontSize: 12, fontWeight: '600' as any },
  tabCardActions: { flexDirection: 'row' as any },
  tabCardActionBtn: { width: 24, height: 24 },
  tabIndicators: { flexDirection: 'row' as any },
  tabIndicator: { width: 6, height: 6, borderRadius: 3 },
  tabIndicatorActive: { width: 18 },
  // Legacy Top Bar Styles (kept for desktop)
  topBar: {
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    height: 40,
    width: 120,
  },
  logoImage: {
    height: '100%',
    width: '100%',
  },
  topBarIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    padding: 5,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchText: {
    fontSize: 14,
  },
  searchResultsWrapper: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 120 : 100,
    left: 16,
    right: 16,
    zIndex: 9999,
    ...Platform.select({
      android: {
        elevation: 20,
      },
      ios: {
        zIndex: 9999,
      },
      web: {
        zIndex: 9999,
        position: 'absolute' as any,
      },
    }),
  },
  desktopSearchResultsWrapper: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  resultsContainer: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
    maxHeight: 450,
    zIndex: 10000,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    width: '100%',
    overflow: 'hidden',
    ...Platform.select({
      android: {
        elevation: 20,
        maxHeight: 400,
      },
      ios: {
        zIndex: 10000,
        maxHeight: 400,
      },
      web: {
        zIndex: 10000,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        position: 'relative' as any,
        maxHeight: 450,
      },
    }),
  },
  desktopResultsContainer: {
    maxWidth: 600,
    width: '90%',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  resultsCount: {
    fontSize: 12,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  aiStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  aiMessage: {
    fontSize: 12,
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  servicesList: {
    maxHeight: 300,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  searchServiceImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchServiceImageBorder: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: '#FFFFFF',
  },
  searchServiceImageFallback: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  searchServiceImage: {
    width: '100%',
    height: '100%',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  fixedButtons: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  // iOS Style Button
  iosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 0.5,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
      },
    }),
  },
  iosButtonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iosButtonTextContainer: {
    flex: 1,
  },
  iosButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  iosButtonSubtext: {
    fontSize: 13,
    fontWeight: '400',
    color: '#999999',
    marginTop: 2,
  },
  // iOS Style Dropdown
  iosDropdown: {
    marginBottom: 12,
    marginLeft: 0,
    marginRight: 0,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 0.5,
  },
  iosDropdownItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iosDropdownIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iosDropdownText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  // Legacy styles (keeping for backward compatibility)
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  dropdown: {
    marginBottom: 10,
    marginLeft: 20,
    marginRight: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownIcon: {
    marginRight: 0,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  storiesScroll: {
    flexDirection: 'row',
  },
  storyCircle: {
    alignItems: 'center',
    marginRight: 15,
    width: 80,
  },
  storyRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  storyRingNew: {
  },
  storyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyInitial: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  newBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF0000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  storyName: {
    fontSize: 12,
    marginTop: 4,
  },
  recommendationCard: {
    width: Dimensions.get('window').width * 0.75,
    marginRight: 15,
    elevation: 5,
  },
  matchBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  matchBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  techName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  techService: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 12,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  distanceText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  separator: {
    fontSize: 12,
  },
  quickHireButton: {
    paddingVertical: 10,
    borderRadius: 8,
  },
  quickHireText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  mapCard: {
    elevation: 5,
  },
  mapPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 14,
    marginTop: 10,
  },
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 25,
    backgroundColor: '#0080E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginHorizontal: 8,
    minHeight: 60,
    position: 'relative',
    overflow: 'visible',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabItemBeforeHome: {
    marginRight: 36, // Add space on right for home button (half of button width)
  },
  tabItemAfterHome: {
    marginLeft: 36, // Add space on left for home button (half of button width)
  },
  tabIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  homeButtonWrapper: {
    position: 'absolute',
    left: '50%',
    top: -8, // Lowered further from -12 to -8
    marginLeft: -36, // Half of button width (56/2) + padding (8*2/2)
    zIndex: 10,
    backgroundColor: 'transparent',
    width: 72, // 56 + 16 (8 padding on each side)
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 8, // Add padding from left and right
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  homeButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  tabLabel: {
    fontSize: 10,
    color: '#B0E0FF',
    fontWeight: '500',
    marginTop: 2,
  },
  tabItemActive: {
    // Active state styling
  },
  tabLabelActive: {
    fontWeight: '600',
  },
  // Desktop styles
  desktopContainer: {
    flex: 1,
    flexDirection: 'column',
    ...Platform.select({
      web: {
        position: 'relative' as any,
        overflow: 'visible' as any,
      },
    }),
  },
  desktopTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  desktopTopBarIcons: {
    flexDirection: 'row',
    gap: 15,
  },
  desktopIconButton: {
    padding: 8,
  },
  desktopContent: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopSidebar: {
    width: 250,
    paddingVertical: 20,
    paddingHorizontal: 20,
    ...Platform.select({
      web: {
        borderRightWidth: 1,
        borderRightColor: '#E0E0E0',
        display: 'flex' as any,
        flexDirection: 'column' as any,
      },
    }),
  },
  desktopSidebarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  desktopSidebarText: {
    fontSize: 16,
    fontWeight: '500',
  },
  desktopMainContentWrapper: {
    flex: 1,
    paddingTop: 0,
  },
  desktopMainContent: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: '100%',
  },
  scrollContentWithFooter: {
    flexGrow: 1,
    ...Platform.select({
      web: {
        minHeight: '100%',
      },
    }),
  },
  mainContentWrapper: {
    flex: 1,
  },
  // New Desktop Navigation Bar Styles
  desktopNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 110,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 1000,
      },
    }),
  },
  desktopNavLogoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 210,
  },
  desktopNavLogoIcon: {
    width: 80,
    height: 97,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopNavLogoTextContainer: {
    marginLeft: 11,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
  },
  desktopNavLogoText: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  desktopNavLogoTextArabic: {
    fontSize: 20,
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  desktopNavTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    flex: 1,
    justifyContent: 'center',
  },
  desktopNavTab: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: 0,
  },
  desktopNavTabActive: {
    borderBottomWidth: 3,
  },
  desktopNavTabText: {
    fontSize: 16,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  desktopNavTabTextActive: {
    // Color is set inline based on theme
  },
  desktopNavIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  desktopNavIconButton: {
    padding: 8,
  },
  desktopNavNotificationWrapper: {
    position: 'relative',
  },
  desktopNavNotificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  desktopNavNotificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFB703',
  },
  desktopNavProfileSection: {
    position: 'relative',
  },
  desktopNavProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderRadius: 6,
  },
  desktopNavProfileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#4D8EC5',
  },
  desktopNavProfileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  desktopNavProfileAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopNavProfileAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  desktopNavProfileInfo: {
    flexDirection: 'column',
    gap: 12,
    alignItems: 'flex-start',
  },
  desktopNavProfileName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  desktopNavProfileRole: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  desktopNavProfileDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 200,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' as any,
        zIndex: 1001,
      },
    }),
    elevation: 10,
  },
  desktopNavProfileDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  desktopNavProfileDropdownText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  desktopSearchBarContainer: {
    marginBottom: 20,
  },
  desktopButtonsContainer: {
    marginBottom: 30,
  },
  servicesListModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
    }),
  },
  servicesListContainer: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 1001,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' as any,
      },
    }),
    elevation: 10,
  },
  servicesListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  servicesListTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  servicesListScroll: {
    maxHeight: 500,
  },
  serviceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  serviceListIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  serviceListIconFallback: {
    backgroundColor: 'rgba(0, 128, 224, 0.1)',
  },
  serviceListImageWrapper: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: '#FFFFFF',
  },
  serviceListImage: {
    width: '100%',
    height: '100%',
  },
  serviceListTextContainer: {
    flex: 1,
  },
  serviceListName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceListDescription: {
    fontSize: 13,
  },
  // Mobile Services List Modal Styles
  mobileServicesListModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    ...Platform.select({
      android: {
        padding: 0,
      },
      ios: {
        padding: 0,
      },
      web: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      },
    }),
  },
  mobileServicesListContainer: {
    width: '100%',
    ...Platform.select({
      android: {
        maxHeight: '90%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        elevation: 10,
      },
      ios: {
        maxHeight: '90%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      web: {
        maxWidth: 500,
        maxHeight: '80%',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' as any,
      },
    }),
    overflow: 'hidden',
  },
  mobileServicesListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  mobileServicesListTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  mobileServicesListScroll: {
    maxHeight: 500,
  },
  mobileServiceListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  mobileServiceListIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mobileServiceListTextContainer: {
    flex: 1,
  },
  mobileServiceListName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mobileServiceListDescription: {
    fontSize: 13,
  },
  mobileEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  mobileEmptyTitle: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '500',
  },
  desktopSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    maxWidth: 600,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' as any,
      },
    }),
  },
  desktopSearchText: {
    fontSize: 16,
  },
  desktopSearchInput: {
    flex: 1,
    fontSize: 16,
  },
  desktopSection: {
    marginBottom: 40,
  },
  desktopSectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  desktopSectionSubtitle: {
    fontSize: 18,
  },
  desktopSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  desktopSeeAllText: {
    fontSize: 16,
    fontWeight: '600',
  },
  desktopHorizontalScroll: {
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  desktopStoryCard: {
    width: 180,
    marginRight: 16,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  desktopStoryContent: {
    alignItems: 'center',
  },
  desktopStoryAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  desktopStoryInitial: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  desktopStoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  desktopStoryProject: {
    fontSize: 14,
    marginBottom: 8,
  },
  desktopNewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  desktopNewBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  desktopRecommendationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -12,
    gap: 16,
  },
  desktopRecommendationCard: {
    width: 320,
    borderRadius: 16,
    marginBottom: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  desktopRecommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  desktopTechAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopTechInitial: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  desktopMatchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  desktopMatchBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  desktopTechName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  desktopTechService: {
    fontSize: 14,
    marginBottom: 12,
  },
  desktopRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  desktopRatingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  desktopReviewCount: {
    fontSize: 14,
  },
  desktopDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  desktopDistanceText: {
    fontSize: 14,
  },
  desktopStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  desktopStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  desktopStatNumber: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  desktopStatLabel: {
    fontSize: 12,
  },
  desktopStatSeparator: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
  },
  desktopQuickHireButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  desktopQuickHireText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  desktopDropdownContainer: {
    position: 'relative',
  },
  desktopDropdown: {
    marginTop: 4,
    marginLeft: 48,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' as any,
      },
    }),
  },
  desktopDropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      web: {
        cursor: 'pointer' as any,
        transition: 'background-color 0.2s' as any,
      },
    }),
  },
  desktopDropdownIcon: {
    marginRight: 0,
  },
  desktopDropdownText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  iconButtonWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  chatbotFab: {
    position: 'absolute',
    right: 20,
    bottom: 150,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' as any,
        cursor: 'pointer' as any,
      },
    }),
  },
});
