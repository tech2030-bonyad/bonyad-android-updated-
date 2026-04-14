import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  Image,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Surface, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import BonyadLogo from '../components/BonyadLogo';
import AppTopBar from '../components/AppTopBar';
import GlassTabBar, { TECHNICIAN_TABS } from '../components/GlassTabBar';
import ScreenTransition from '../components/ScreenTransition';
import { useTheme } from '../context/ThemeContext';
import { useFontFamily } from '../context/FontContext';
import ProjectsScreen from './ProjectsScreen';
import ChatRoomsListScreen from './ChatRoomsListScreen';
import ChatDetailScreen from './ChatDetailScreen';
import NotificationsScreen from './NotificationsScreen';
import ProfileScreen from './ProfileScreen';
import OnboardingScreen from './OnboardingScreen';
import MyDataScreen from './MyDataScreen';
import EditProfileScreen from './EditProfileScreen';
import ChangePasswordScreen from './ChangePasswordScreen';
import ChangePhoneScreen from './ChangePhoneScreen';
import VerifyPhoneChangeScreen from './VerifyPhoneChangeScreen';
import PortfolioScreen from './PortfolioScreen';
import SubscriptionScreen from './SubscriptionScreen';
import ServiceManagementScreen from './ServiceManagementScreen';
import AvailabilityScreen from './AvailabilityScreen';
import CommissionPaymentScreen from './CommissionPaymentScreen';
import PaymentCheckoutScreen from './PaymentCheckoutScreen';
import MySmallTaskBidsScreen from './MySmallTaskBidsScreen';
import ServiceSuggestionFormScreen from './ServiceSuggestionFormScreen';
import MyServiceSuggestionsScreen from './MyServiceSuggestionsScreen';
import RegionsManagementScreen from './RegionsManagementScreen';
import SmallTaskTypesScreen from './SmallTaskTypesScreen';
import PaymentTransactionScreen from './PaymentTransactionScreen';
import Footer from '../components/Footer';
import { buildApiUrl, API_ENDPOINTS, getServerBaseUrl } from '../config/api';
import { storage } from '../utils/storage';
import { checkHasPortfolio } from '../services/PortfolioService';
import TechnicalHomeScreenContent from './home/TechnicalHomeScreen';
import ChatbotScreen from './ChatbotScreen';
import TicketListScreen from './TicketListScreen';
import TicketDetailScreen from './TicketDetailScreen';
import CreateTicketScreen from './CreateTicketScreen';
import { SmallTaskRequest } from '../types/smallTasks';
import type { HomeShellFromChatbotPayload } from '../utils/chatbotNavigateAndroid';

interface TechnicianHomeScreenProps {
  onShowProfile: () => void;
  onLogout: () => void;
  /** When true, open profile tab on mount so nav bar stays visible */
  openProfileOnMount?: boolean;
  /** Called when user switches away from profile tab */
  onProfileTabClosed?: () => void;
  onShowProjects?: (filter?: 'all' | 'available') => void;
  onShowChat?: () => void;
  onShowRunningProjects?: () => void;
  onShowNotifications?: () => void;
  onShowAppointments?: () => void;
  onShowChatbot?: () => void;
  onChatbotNavigateToTab?: (tabName: string) => void;
  onChatbotNavigateToScreen?: (screenName: string, params?: Record<string, unknown>) => void;
  onChatbotRequestLiveAgent?: (subject: string, aiHistory: any[], firstUserMessage: string) => void;
  onShowSupportTickets?: () => void;
  onShowServiceProviders?: () => void;
  onShowCommissionPayment?: () => void;
  userName?: string;
  // Props for embedded screens
  userId?: number;
  authToken?: string;
  onNavigateToEditProfile?: () => void;
  onNavigateToPortfolio?: () => void;
  onNavigateToSubscription?: () => void;
  onNavigateToServices?: () => void;
  onNavigateToAvailability?: () => void;
  projectsFilter?: 'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers';
  onNavigateFromNotification?: (notification: any) => void | Promise<void>;
  initialProjectToOpen?: any;
  initialSmallTaskToOpen?: any;
  profileNavFromChatbot?: { id: number; subView: 'myData' | 'paymentHistory' | 'smallTaskTypes' | 'regions' } | null;
  homeShellFromChatbot?: (HomeShellFromChatbotPayload & { id: number }) | null;
}

export default function TechnicianHomeScreen({
  onLogout,
  onShowProfile,
  openProfileOnMount = false,
  onProfileTabClosed,
  onShowProjects,
  onShowChat,
  onShowRunningProjects,
  onShowNotifications,
  onShowAppointments,
  onShowChatbot,
  onShowSupportTickets,
  onShowServiceProviders,
  onShowCommissionPayment,
  userName,
  userId = 0,
  authToken = '',
  onNavigateToEditProfile,
  onNavigateToPortfolio,
  onNavigateToSubscription,
  onNavigateToServices,
  onNavigateToAvailability,
  projectsFilter = 'available',
  onNavigateFromNotification,
  initialProjectToOpen,
  initialSmallTaskToOpen,
  profileNavFromChatbot,
  homeShellFromChatbot,
  onChatbotNavigateToTab,
  onChatbotNavigateToScreen,
  onChatbotRequestLiveAgent,
}: TechnicianHomeScreenProps) {
  const { t, i18n } = useTranslation();
  const { colors, theme } = useTheme();
  const { fontFamily, scaledSize } = useFontFamily();
  const isDarkMode = theme === 'dark';
  const [isAvailable, setIsAvailable] = useState(true);
  const [showProjectsDropdown, setShowProjectsDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState(openProfileOnMount ? 'profile' : 'home');
  const [currentProjectsFilter, setCurrentProjectsFilter] = useState<'available' | 'running' | 'completed' | 'bid_received' | 'direct_offers'>(projectsFilter || 'available');
  const [profileSubView, setProfileSubView] = useState<'myData' | 'editProfile' | 'portfolio' | 'subscription' | 'services' | 'availability' | 'regions' | 'smallTaskTypes' | 'paymentHistory' | 'changePassword' | 'changePhone' | 'verifyPhoneChange' | 'serviceSuggestions' | 'onboarding' | null>(null);

  useEffect(() => {
    if (!profileNavFromChatbot) return;
    setActiveTab('profile');
    onShowProfile();
    setProfileSubView(profileNavFromChatbot.subView);
  }, [profileNavFromChatbot?.id, profileNavFromChatbot, onShowProfile]);

  useEffect(() => {
    if (!homeShellFromChatbot) return;
    const { tab, returnTabOnBack, embeddedChat, embeddedProjects, technicianAppointments } = homeShellFromChatbot;
    if (technicianAppointments) {
      setShowAppointmentsView(true);
      setActiveTab('home');
      setShowCommissionPayment(false);
      setCommissionCheckoutRequest(null);
      return;
    }

    const shellTabs = ['home', 'projects', 'chat', 'profile', 'notifications', 'wallet', 'chatbot'] as const;
    if (shellTabs.includes(tab as (typeof shellTabs)[number])) {
      setActiveTab(tab as 'home' | 'projects' | 'chat' | 'profile' | 'notifications' | 'wallet' | 'chatbot');
    }

    if (returnTabOnBack && shellTabs.includes(returnTabOnBack as any)) {
      setProjectsReturnTabOnBack(returnTabOnBack as any);
    }

    if (tab === 'chat' && embeddedChat?.roomId) {
      openEmbeddedChatFromProjects(
        embeddedChat.roomId,
        embeddedChat.receiverId,
        embeddedChat.receiverName,
        embeddedChat.projectId ?? null
      );
    }

    if (tab === 'projects') {
      if (embeddedProjects?.initialSmallTask != null) {
        setSelectedSmallTask(embeddedProjects.initialSmallTask);
        setProjectsInitialProjectType('small');
      } else if (embeddedProjects?.initialProject != null) {
        setSelectedSmallTask(null);
        setProjectsInitialProjectType('large');
        setInitialProjectForDetail(embeddedProjects.initialProject);
      } else if (embeddedProjects?.initialProjectType != null) {
        setSelectedSmallTask(null);
        setProjectsInitialProjectType(embeddedProjects.initialProjectType);
      } else {
        setSelectedSmallTask(null);
        setProjectsInitialProjectType(null);
      }
      if (embeddedProjects?.initialProject == null) setInitialProjectForDetail(null);
    } else {
      setSelectedSmallTask(null);
      setProjectsInitialProjectType(null);
    }

    if (!(tab === 'home' && technicianAppointments)) {
      setShowAppointmentsView(false);
    }
  }, [homeShellFromChatbot?.id, homeShellFromChatbot, openEmbeddedChatFromProjects]);

  /** When portfolio opened from home (Business gallery), back goes to home; from profile, back goes to profile */
  const [portfolioSource, setPortfolioSource] = useState<'home' | 'profile' | null>(null);
  const showAppointmentsView = false;
  const [phoneChangeNumber, setPhoneChangeNumber] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<{ roomId: string; receiverId: number; receiverName: string; projectId?: number | null } | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const insets = useSafeAreaInsets();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [projectsReturnTabOnBack, setProjectsReturnTabOnBack] = useState<
    'home' | 'projects' | 'chat' | 'profile' | 'notifications' | 'wallet' | 'chatbot' | null
  >(null);
  const [hasPortfolio, setHasPortfolio] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<{ name?: string; avatar?: string; profileImage?: string } | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Small Tasks state
  const [smallTasksView, setSmallTasksView] = useState<'myBids' | 'serviceSuggestion' | 'mySuggestions' | null>(null);
  const [selectedSmallTask, setSelectedSmallTask] = useState<SmallTaskRequest | null>(null);
  const [smallTasksRefreshTrigger, setSmallTasksRefreshTrigger] = useState(0);
  /** When set, Projects tab opens in small-tasks mode (from Home "Available small tasks") */
  const [projectsInitialProjectType, setProjectsInitialProjectType] = useState<'large' | 'small' | null>(null);

  // Initial project for auto-opening detail when tapping a card from home
  const [initialProjectForDetail, setInitialProjectForDetail] = useState<any>(null);

  // Commission Payment state
  const [showCommissionPayment, setShowCommissionPayment] = useState(false);
  const [commissionCheckoutRequest, setCommissionCheckoutRequest] = useState<any>(null);
  const [commissionCheckoutDescription, setCommissionCheckoutDescription] = useState('');

  // Support Tickets state
  const [showTicketList, setShowTicketList] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [showCreateTicket, setShowCreateTicket] = useState(false);


  // Bottom tab bar ref — passed to home content for tour guide highlighting
  const tabBarRef = useRef<View>(null);
  // Per-tab refs for individual tour steps
  const tabHomeRef = useRef<View>(null);
  const tabProjectsRef = useRef<View>(null);
  const tabWalletRef = useRef<View>(null);
  const tabProfileRef = useRef<View>(null);
  const tabRefs = { home: tabHomeRef, projects: tabProjectsRef, wallet: tabWalletRef, profile: tabProfileRef };

  // Animation values for dropdowns and tab transition
  const mobileDropdownAnim = useRef(new Animated.Value(0)).current;
  const desktopDropdownAnim = useRef(new Animated.Value(0)).current;
  const prevActiveTabRef = useRef(activeTab);

  // RTL detection
  const isRTL = i18n.language === 'ar';

  // Update document direction on web when language changes
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', i18n.language);
    }
  }, [isRTL, i18n.language]);

  // Check portfolio status on mount and when returning to home tab
  useEffect(() => {
    const fetchPortfolioStatus = async () => {
      try {
        const hasPortfolioStatus = await checkHasPortfolio();
        setHasPortfolio(hasPortfolioStatus);
      } catch (error) {
        setHasPortfolio(false);
      }
    };

    if (activeTab === 'home') {
      fetchPortfolioStatus();
    }
  }, [activeTab]);

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

  // Reset sub-views when switching tabs
  useEffect(() => {
    if (activeTab !== 'profile') {
      setProfileSubView(null);
    }
    if (activeTab !== 'chat') {
      setSelectedChat(null);
      setShowChatList(true);
    }
    if (activeTab !== 'projects') {
      setInitialProjectForDetail(null);
    }
  }, [activeTab]);

  // Handle auto-opening projects from props (e.g. notifications)
  useEffect(() => {
    if (initialProjectToOpen) {
      setInitialProjectForDetail(initialProjectToOpen);
      setActiveTab('projects');
    }
  }, [initialProjectToOpen]);

  useEffect(() => {
    if (initialSmallTaskToOpen) {
      setSelectedSmallTask(initialSmallTaskToOpen);
      setProjectsInitialProjectType('small');
      setActiveTab('projects');
    }
  }, [initialSmallTaskToOpen]);

  // Track previous tab (no animation — tabs stay mounted, instant switch)
  useEffect(() => {
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);

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

  // Calculate responsive breakpoints
  const IS_WEB = Platform.OS === 'web';
  const IS_LARGE_WEB = IS_WEB && screenWidth >= 1200;
  const IS_MEDIUM_WEB = IS_WEB && screenWidth >= 768 && screenWidth < 1200;
  const IS_SMALL_WEB = IS_WEB && screenWidth < 768;
  const shouldRenderMobile = !IS_WEB || IS_SMALL_WEB;

  const chatEnterOpac = useRef(new Animated.Value(1)).current;
  const chatEnterTy = useRef(new Animated.Value(0)).current;
  const chatDetailOpac = useRef(new Animated.Value(0)).current;
  const chatDetailTy = useRef(new Animated.Value(0)).current;

  const openEmbeddedChatFromProjects = useCallback(
    (roomId: string, receiverId: number, receiverName: string, projectId?: number | null) => {
      setActiveTab('chat');
      setSelectedChat({ roomId, receiverId, receiverName, projectId: projectId ?? undefined });
      setShowChatList(IS_LARGE_WEB);
    },
    [IS_LARGE_WEB],
  );

  useEffect(() => {
    if (activeTab !== 'chat') {
      chatEnterOpac.setValue(1);
      chatEnterTy.setValue(0);
      return;
    }
    chatEnterOpac.setValue(0);
    chatEnterTy.setValue(14);
    Animated.parallel([
      Animated.timing(chatEnterOpac, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(chatEnterTy, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [activeTab, chatEnterOpac, chatEnterTy]);

  useEffect(() => {
    if (activeTab !== 'chat' || IS_LARGE_WEB) {
      if (selectedChat) {
        chatDetailOpac.setValue(1);
        chatDetailTy.setValue(0);
      } else {
        chatDetailOpac.setValue(0);
        chatDetailTy.setValue(0);
      }
      return;
    }
    if (selectedChat) {
      chatDetailOpac.setValue(0);
      chatDetailTy.setValue(16);
      Animated.parallel([
        Animated.timing(chatDetailOpac, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(chatDetailTy, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      chatDetailOpac.setValue(0);
      chatDetailTy.setValue(0);
    }
  }, [activeTab, IS_LARGE_WEB, selectedChat, chatDetailOpac, chatDetailTy]);

  // Fetch user profile for navigation bar
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
          const baseUrl = getServerBaseUrl();
          if (data.profileImage && !data.profileImage.startsWith('http')) {
            data.profileImage = `${baseUrl}${data.profileImage}`;
          }
          if (data.avatar && !data.avatar.startsWith('http')) {
            data.avatar = `${baseUrl}${data.avatar}`;
          }
          setUserProfile({
            name: data.name || userName || 'Technician',
            avatar: data.profileImage || data.avatar,
            profileImage: data.profileImage || data.avatar,
          });
        }
      } catch (error) {
        setUserProfile({ name: userName || 'Technician' });
      }
    };

    fetchProfile();
  }, [authToken, userName, screenWidth, IS_WEB]);

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
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
        const count = typeof data === 'number' ? data : (data.count || data.unreadCount || data.unread_count || 0);
        setUnreadNotificationCount(count);
        return count;
      }
    } catch {
      // Silently handle fetch errors (network issues, auth failures)
    }
    return 0;
  }, [authToken]);

  // Load unread count on component mount
  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const loadCount = async () => {
      if (!mounted) return;
      await fetchUnreadCount();
    };

    const timeoutId = setTimeout(() => {
      loadCount();

      intervalId = setInterval(() => {
        if (mounted) {
          loadCount();
        }
      }, 30000);
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  // Also refresh when authToken becomes available
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

  // When openProfileOnMount is true (e.g. from profile icon tap), switch to profile tab so nav bar stays visible
  useEffect(() => {
    if (openProfileOnMount) {
      setActiveTab('profile');
    }
  }, [openProfileOnMount]);


  // Render mobile layout — iOS-style: on home tab (content only), hide parent top bar
  if (shouldRenderMobile) {
    const isHomeTabOnly = activeTab === 'home' && !smallTasksView && !showCommissionPayment && !commissionCheckoutRequest && !showAppointmentsView;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top bar — same as home screen (logo + Chat | Info | Notifications) */}
        {!isHomeTabOnly && (
          <AppTopBar
            primaryColor={isDarkMode ? colors.primary : (colors.primary || '#00A5F4')}
            isDark={isDarkMode}
            backgroundColor={colors.background}
            unreadNotificationCount={unreadNotificationCount}
            onPressChat={() => {
              setSelectedChat(null);
              setShowChatList(true);
              setActiveTab('chat');
            }}
                        // Open notifications INSIDE technician tabs so top/bottom nav stay visible.
            onPressNotifications={() => setActiveTab('notifications')}
          />
        )}

        {/* Render tab content */}
        <View style={{ flex: 1 }}>
        {/* Home dashboard - always mounted to preserve state when navigating back */}
        <View style={{ flex: 1, display: (activeTab === 'home' && !smallTasksView && !showCommissionPayment && !commissionCheckoutRequest && !showAppointmentsView && !showTicketList && selectedTicketId === null && !showCreateTicket) ? 'flex' : 'none', pointerEvents: (activeTab === 'home' && !smallTasksView && !showCommissionPayment && !commissionCheckoutRequest && !showAppointmentsView && !showTicketList && selectedTicketId === null && !showCreateTicket) ? 'auto' : 'none' }}>
          <TechnicalHomeScreenContent
            userName={userProfile?.name}
            unreadNotificationCount={unreadNotificationCount}
            onPressChat={() => {
              setSelectedChat(null);
              setShowChatList(true);
              setActiveTab('chat');
            }}
            // Open notifications INSIDE technician tabs so top/bottom nav stay visible.
            onPressNotifications={() => setActiveTab('notifications')}
                        onPressAvailableProject={(status) => {
              if (status === 'small_tasks') {
                setProjectsInitialProjectType('small');
                setActiveTab('projects');
              } else if (status === 'approved' || status === 'pending') {
                setCurrentProjectsFilter(status === 'approved' ? 'available' : 'available');
                setActiveTab('projects');
              } else if (status === 'in_progress') {
                setCurrentProjectsFilter('running');
                setActiveTab('projects');
              } else {
                setCurrentProjectsFilter('available');
                setActiveTab('projects');
              }
            }}
            onPressTaskCategory={(status) => {
              if (status === 'small_tasks') {
                setProjectsInitialProjectType('small');
                setActiveTab('projects');
              } else if (status === 'approved') {
                setCurrentProjectsFilter('available');
              } else if (status === 'direct') {
                setCurrentProjectsFilter('direct_offers');
              } else if (status === 'in_progress') {
                setCurrentProjectsFilter('running');
              } else if (status === 'bid_received') {
                setCurrentProjectsFilter('bid_received');
              }
              setActiveTab('projects');
            }}
            onPressSmallTask={(task) => {
              setSelectedSmallTask(task);
              setActiveTab('projects');
            }}
            onPressProject={(project) => {
              setInitialProjectForDetail(project);
              setCurrentProjectsFilter('available');
              setActiveTab('projects');
            }}
            onPressReferAndEarn={() => {
              setShowCommissionPayment(true);
            }}
            onPressFab={() => {
              setProjectsInitialProjectType('small');
              setActiveTab('projects');
            }}
            onPressChatbot={onShowChatbot ?? (() => setActiveTab('chatbot'))}
            onPressPortfolio={() => {
              setPortfolioSource('home');
              setProfileSubView('portfolio');
              setActiveTab('profile');
            }}
            onPressSchedule={() => {}}
            onPressAnalytics={() => {
              onShowAppointments?.();
            }}
            onPressSupport={() => setShowTicketList(true)}
            onPressSupportTickets={() => setShowTicketList(true)}
            onPressSupportTicket={(ticketId) => setSelectedTicketId(ticketId)}
            onPressCreateSupportTicket={() => setShowCreateTicket(true)}
            tabBarRef={tabBarRef}
            tabRefs={tabRefs}
          />
        </View>


        {/* Commission Payment Screen */}
        {activeTab === 'home' && showCommissionPayment && !commissionCheckoutRequest && (
          <CommissionPaymentScreen
            onBack={() => setShowCommissionPayment(false)}
            onNavigateToCheckout={(request, description) => {
              setCommissionCheckoutRequest(request);
              setCommissionCheckoutDescription(description);
            }}
          />
        )}

        {/* Payment Checkout Screen */}
        {activeTab === 'home' && showCommissionPayment && commissionCheckoutRequest && (
          <PaymentCheckoutScreen
            checkoutRequest={commissionCheckoutRequest}
            onBack={() => setCommissionCheckoutRequest(null)}
            onSuccess={(transactionId) => {
              // Payment succeeded
              setCommissionCheckoutRequest(null);
              setShowCommissionPayment(false);
            }}
          />
        )}

        {/* Small Tasks Screens */}
        {activeTab === 'home' && smallTasksView === 'myBids' && (
          <MySmallTaskBidsScreen
            onBack={() => setSmallTasksView(null)}
            onBidPress={(bid) => {
              if (bid.request) {
                setSelectedSmallTask(bid.request);
                setActiveTab('projects');
              }
            }}
          />
        )}

        {activeTab === 'home' && smallTasksView === 'serviceSuggestion' && (
          <ServiceSuggestionFormScreen
            onBack={() => setSmallTasksView(null)}
            onSuccess={() => {
              setSmallTasksView('mySuggestions');
            }}
          />
        )}

        {activeTab === 'home' && smallTasksView === 'mySuggestions' && (
          <MyServiceSuggestionsScreen
            onBack={() => setSmallTasksView(null)}
            onAddNew={() => setSmallTasksView('serviceSuggestion')}
          />
        )}

        {/* Support Ticket Screens */}
        {activeTab === 'home' && showTicketList && selectedTicketId === null && !showCreateTicket && (
          <TicketListScreen
            onBack={() => setShowTicketList(false)}
            onCreateTicket={() => setShowCreateTicket(true)}
            onTicketPress={(ticket) => setSelectedTicketId(ticket.id)}
          />
        )}
        {activeTab === 'home' && selectedTicketId !== null && (
          <TicketDetailScreen
            ticketId={selectedTicketId}
            onBack={() => setSelectedTicketId(null)}
          />
        )}
        {activeTab === 'home' && showCreateTicket && (
          <CreateTicketScreen
            onBack={() => setShowCreateTicket(false)}
            onSuccess={() => { setShowCreateTicket(false); setShowTicketList(true); }}
          />
        )}

        {/* Render other tabs */}
        <View style={{ flex: 1, display: activeTab === 'projects' ? 'flex' : 'none', pointerEvents: activeTab === 'projects' ? 'auto' : 'none' }}>
            <ProjectsScreen
              onBack={() => {
                if (projectsReturnTabOnBack) {
                  setActiveTab(projectsReturnTabOnBack);
                  setProjectsReturnTabOnBack(null);
                } else {
                  setActiveTab('home');
                }
                setProjectsInitialProjectType(null);
                setSelectedSmallTask(null);
                setInitialProjectForDetail(null);
              }}
              onRequestVisit={() => {}}
              filter={currentProjectsFilter}
              initialProject={initialProjectForDetail}
              initialSmallTask={selectedSmallTask ?? undefined}
              initialProjectType={projectsInitialProjectType ?? undefined}
              onFilterChange={(newFilter) => {
                setCurrentProjectsFilter(newFilter as any);
                setInitialProjectForDetail(null);
              }}
              onOpenChat={openEmbeddedChatFromProjects}
            />
        </View>


        {activeTab === 'chat' && (
          <Animated.View
            style={{
              flex: 1,
              flexDirection: IS_LARGE_WEB ? 'row' : 'column',
              opacity: chatEnterOpac,
              transform: [{ translateY: chatEnterTy }],
            }}
          >
            {(showChatList || IS_LARGE_WEB) && (
              <View
                style={[
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
                  },
                ]}
              >
                <ChatRoomsListScreen
                  stackedUnderAppTopBar
                  onOpenChat={(roomId, receiverId, receiverName, projectId) => {
                    setSelectedChat({ roomId, receiverId, receiverName, projectId: projectId ?? undefined });
                    setShowChatList(IS_LARGE_WEB);
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

            {selectedChat && (
              <Animated.View
                style={[
                  { flex: 1, opacity: chatDetailOpac, transform: [{ translateY: chatDetailTy }] },
                  IS_LARGE_WEB && {
                    flex: 0.65,
                    ...Platform.select({
                      web: {
                        minWidth: 400,
                      } as any,
                    }),
                  },
                ]}
              >
                <ChatDetailScreen
                  roomId={selectedChat.roomId}
                  receiverId={selectedChat.receiverId}
                  receiverName={selectedChat.receiverName}
                  projectId={selectedChat.projectId ?? undefined}
                  hasBottomTabBar={shouldRenderMobile}
                  onBack={
                    IS_LARGE_WEB
                      ? undefined
                      : () => {
                        setSelectedChat(null);
                        setShowChatList(true);
                      }
                  }
                />
              </Animated.View>
            )}
          </Animated.View>
        )}

        {activeTab === 'notifications' && (
          <ScreenTransition>
            <NotificationsScreen
              onUnreadCountChange={setUnreadNotificationCount}
              onNavigateFromNotification={onNavigateFromNotification}
            />
          </ScreenTransition>
        )}

        {activeTab === 'wallet' && (
          <ScreenTransition>
            <CommissionPaymentScreen
              onBack={() => setActiveTab('home')}
              onNavigateToCheckout={(request, description) => {
                setCommissionCheckoutRequest(request);
                setCommissionCheckoutDescription(description);
              }}
            />
          </ScreenTransition>
        )}

        <View style={{ flex: 1, display: activeTab === 'profile' ? 'flex' : 'none', pointerEvents: activeTab === 'profile' ? 'auto' : 'none' }}>
            {profileSubView === null ? (
              <ProfileScreen
                onLogout={onLogout}
                onNavigateToEditProfile={() => setProfileSubView('myData')}
                onNavigateToPortfolio={() => {
                  setPortfolioSource('profile');
                  setProfileSubView('portfolio');
                }}
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
                onNavigateToOnboarding={() => setProfileSubView('onboarding')}
              />
            ) : profileSubView === 'onboarding' ? (
              <Modal visible={true} animationType="slide" style={{ flex: 1 }}>
                <OnboardingScreen
                  variant="technician"
                  onFinish={() => setProfileSubView(null)}
                />
              </Modal>
            ) : profileSubView === 'myData' ? (
              <MyDataScreen
                onBack={() => setProfileSubView(null)}
                onEditProfile={() => setProfileSubView('editProfile')}
                onChangePhone={() => setProfileSubView('changePhone')}
                onChangePassword={() => setProfileSubView('changePassword')}
                onNavigateToSubscription={() => setProfileSubView('subscription')}
                onNavigateToServices={() => setProfileSubView('services')}
                onNavigateToAvailability={() => setProfileSubView('availability')}
                isTechnician={true}
              />
            ) : profileSubView === 'editProfile' ? (
              <EditProfileScreen
                userDetails={{}}
                onBack={() => setProfileSubView('myData')}
                onSave={() => setProfileSubView('myData')}
              />
            ) : profileSubView === 'portfolio' ? (
              <PortfolioScreen
                userId={userId}
                onBack={() => {
                  if (portfolioSource === 'home') setActiveTab('home');
                  setProfileSubView(null);
                  setPortfolioSource(null);
                }}
                onEditProfile={() => setProfileSubView('editProfile')}
              />
            ) : profileSubView === 'subscription' ? (
              <SubscriptionScreen
                onBack={() => setProfileSubView(null)}
              />
            ) : profileSubView === 'services' ? (
              <ServiceManagementScreen
                onBack={() => setProfileSubView(null)}
              />
            ) : profileSubView === 'serviceSuggestions' ? (
              <MyServiceSuggestionsScreen
                onBack={() => setProfileSubView('services')}
                onAddNew={() => setSmallTasksView('serviceSuggestion')}
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

        {activeTab === 'chatbot' && (
          <ScreenTransition>
            <ChatbotScreen
              onBack={() => setActiveTab('home')}
              userId={userId}
              userRole="technician"
              onNavigateToTab={onChatbotNavigateToTab}
              onNavigateToScreen={onChatbotNavigateToScreen}
              onRequestLiveAgent={onChatbotRequestLiveAgent}
              hasBottomTabBar
            />
          </ScreenTransition>
        )}
        </View>

        {/* Glass tab bar — iOS-style with water-drop press */}
        <View ref={tabBarRef} collapsable={false} style={styles.glassTabBarContainer}>
          <View style={{ width: '100%' }}>
            <GlassTabBar
              activeTab={
                activeTab === 'chatbot'
                  ? 'home'
                  : ['home', 'projects', 'wallet', 'profile'].includes(activeTab)
                    ? activeTab
                    : 'home'
              }
              onTabPress={(tab) => {
                if (activeTab === 'profile' && tab !== 'profile') {
                  onProfileTabClosed?.();
                }
                if (tab === 'projects') {
                  setInitialProjectForDetail(null);
                }
                setActiveTab(tab);
              }}
              tabs={TECHNICIAN_TABS}
              primaryColor={colors.primary}
              primaryColorDark={colors.primaryDark || '#1A6DB4'}
              isDark={isDarkMode}
              bottomInset={insets.bottom}
              t={t}
              tabRefs={tabRefs}
            />
          </View>
        </View>

      </View>
    );
  }

  // Render desktop/web layout
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* New Horizontal Navigation Bar - Figma Design */}
      <View style={[styles.desktopNavBar, {
        backgroundColor: isDarkMode ? colors.cardBackground : colors.primary
      }]}>
        {/* Logo Section */}
        <View style={styles.desktopNavLogoSection}>
          <BonyadLogo size="medium" />
        </View>

        {/* Navigation Tabs */}
        <View style={styles.desktopNavTabs}>
          <TouchableOpacity
            style={[styles.desktopNavTab, activeTab === 'home' && {
              ...styles.desktopNavTabActive,
              borderBottomColor: isDarkMode ? colors.primary : '#FFFFFF'
            }]}
            onPress={() => {
              if (activeTab === 'profile') onProfileTabClosed?.();
              setActiveTab('home');
            }}
          >
            <Text style={[styles.desktopNavTabText, activeTab === 'home' && styles.desktopNavTabTextActive, {
              fontSize: scaledSize(16),
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
            onPress={() => {
              if (activeTab === 'profile') onProfileTabClosed?.();
              setActiveTab('projects');
            }}
          >
            <Text style={[styles.desktopNavTabText, activeTab === 'projects' && styles.desktopNavTabTextActive, {
              fontSize: scaledSize(16),
              color: activeTab === 'projects'
                ? (isDarkMode ? colors.primary : '#FFFFFF')
                : (isDarkMode ? colors.textSecondary : '#B3CEE6')
            }]}>
              {t('Projects')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Icons removed - now only in header -->

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
                    {(userProfile?.name || userName || 'T').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.desktopNavProfileInfo}>
              <Text style={[styles.desktopNavProfileName, {
                color: isDarkMode ? colors.text : '#FFFFFF'
              }]}>
                {userProfile?.name || userName || t('Technician')}
              </Text>
              <Text style={[styles.desktopNavProfileRole, {
                color: isDarkMode ? colors.textSecondary : '#FFFFFF'
              }]}>{t('Technician')}</Text>
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
                <Text style={[styles.desktopNavProfileDropdownText, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Profile')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.desktopNavProfileDropdownItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setShowProfileDropdown(false);
                  setActiveTab('wallet');
                }}
              >
                <Ionicons name="wallet-outline" size={20} color={colors.text} />
                <Text style={[styles.desktopNavProfileDropdownText, { color: colors.text, fontSize: scaledSize(14) }]}>{t('Pay')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.desktopNavProfileDropdownItem}
                onPress={() => {
                  setShowProfileDropdown(false);
                  onLogout();
                }}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.desktopNavProfileDropdownText, { color: colors.textSecondary, fontSize: scaledSize(14) }]}>{t('Logout')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.desktopMainContentWrapper}>
        {/* Tab Content - Home dashboard always mounted to preserve state when navigating back */}
        <View style={{ flex: 1, display: (activeTab === 'home' && !showCommissionPayment && !commissionCheckoutRequest && !showAppointmentsView && !showTicketList && selectedTicketId === null && !showCreateTicket) ? 'flex' : 'none', pointerEvents: (activeTab === 'home' && !showCommissionPayment && !commissionCheckoutRequest && !showAppointmentsView && !showTicketList && selectedTicketId === null && !showCreateTicket) ? 'auto' : 'none' }}>
          <TechnicalHomeScreenContent
            userName={userProfile?.name}
            unreadNotificationCount={unreadNotificationCount}
            onPressChat={() => {
              setSelectedChat(null);
              setShowChatList(true);
              setActiveTab('chat');
            }}
            onPressNotifications={onShowNotifications}
                        onPressAvailableProject={(status) => {
              if (status === 'small_tasks') {
                setProjectsInitialProjectType('small');
                setActiveTab('projects');
              } else if (status === 'approved' || status === 'pending') {
                setCurrentProjectsFilter(status === 'approved' ? 'available' : 'available');
                setActiveTab('projects');
              } else if (status === 'in_progress') {
                setCurrentProjectsFilter('running');
                setActiveTab('projects');
              } else {
                setCurrentProjectsFilter('available');
                setActiveTab('projects');
              }
            }}
            onPressTaskCategory={(status) => {
              if (status === 'approved') {
                setCurrentProjectsFilter('available');
              } else if (status === 'direct') {
                setCurrentProjectsFilter('direct_offers');
              } else if (status === 'in_progress') {
                setCurrentProjectsFilter('running');
              } else if (status === 'bid_received') {
                setCurrentProjectsFilter('bid_received');
              }
              setActiveTab('projects');
            }}
            onPressSmallTask={(task) => {
              setSelectedSmallTask(task);
              setActiveTab('projects');
            }}
            onPressProject={(project) => {
              setInitialProjectForDetail(project);
              setCurrentProjectsFilter('available');
              setActiveTab('projects');
            }}
            onPressReferAndEarn={() => {
              setShowCommissionPayment(true);
            }}
            onPressFab={() => {
              setProjectsInitialProjectType('small');
              setActiveTab('projects');
            }}
            onPressChatbot={onShowChatbot ?? (() => setActiveTab('chatbot'))}
            onPressPortfolio={() => {
              setPortfolioSource('home');
              setProfileSubView('portfolio');
              setActiveTab('profile');
            }}
            onPressSchedule={() => {}}
            onPressAnalytics={() => {
              onShowAppointments?.();
            }}
            onPressSupport={() => setShowTicketList(true)}
            onPressSupportTickets={() => setShowTicketList(true)}
            onPressSupportTicket={(ticketId) => setSelectedTicketId(ticketId)}
            onPressCreateSupportTicket={() => setShowCreateTicket(true)}
            tabBarRef={tabBarRef}
            tabRefs={tabRefs}
          />
        </View>

        {/* Support Ticket Screens - Desktop */}
        {activeTab === 'home' && showTicketList && selectedTicketId === null && !showCreateTicket && (
          <TicketListScreen
            onBack={() => setShowTicketList(false)}
            onCreateTicket={() => setShowCreateTicket(true)}
            onTicketPress={(ticket) => setSelectedTicketId(ticket.id)}
          />
        )}
        {activeTab === 'home' && selectedTicketId !== null && (
          <TicketDetailScreen
            ticketId={selectedTicketId}
            onBack={() => setSelectedTicketId(null)}
          />
        )}
        {activeTab === 'home' && showCreateTicket && (
          <CreateTicketScreen
            onBack={() => setShowCreateTicket(false)}
            onSuccess={() => { setShowCreateTicket(false); setShowTicketList(true); }}
          />
        )}

        {/* Commission Payment Screen - Desktop */}
        {activeTab === 'home' && showCommissionPayment && !commissionCheckoutRequest && (
          <CommissionPaymentScreen
            onBack={() => setShowCommissionPayment(false)}
            onNavigateToCheckout={(request, description) => {
              setCommissionCheckoutRequest(request);
              setCommissionCheckoutDescription(description);
            }}
          />
        )}

        {/* Payment Checkout Screen - Desktop */}
        {activeTab === 'home' && showCommissionPayment && commissionCheckoutRequest && (
          <PaymentCheckoutScreen
            checkoutRequest={commissionCheckoutRequest}
            onBack={() => setCommissionCheckoutRequest(null)}
            onSuccess={(transactionId) => {
              // Payment succeeded
              setCommissionCheckoutRequest(null);
              setShowCommissionPayment(false);
            }}
          />
        )}

        <View style={{ flex: 1, display: activeTab === 'projects' ? 'flex' : 'none', pointerEvents: activeTab === 'projects' ? 'auto' : 'none' }}>
          <ScrollView
            style={styles.desktopMainContent}
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <ProjectsScreen
                onBack={() => {
                  if (projectsReturnTabOnBack) {
                    setActiveTab(projectsReturnTabOnBack);
                    setProjectsReturnTabOnBack(null);
                  } else {
                    setActiveTab('home');
                  }
                  setProjectsInitialProjectType(null);
                  setSelectedSmallTask(null);
                  setInitialProjectForDetail(null);
                }}
                onRequestVisit={() => {}}
                filter={currentProjectsFilter}
                initialProject={initialProjectForDetail}
                initialSmallTask={selectedSmallTask ?? undefined}
                initialProjectType={projectsInitialProjectType ?? undefined}
                onFilterChange={(newFilter) => {
                  setCurrentProjectsFilter(newFilter as any);
                  setInitialProjectForDetail(null);
                }}
                onOpenChat={openEmbeddedChatFromProjects}
              />
            </View>
            <Footer />
          </ScrollView>
        </View>

        {activeTab === 'chat' && (
          <Animated.View
            style={[
              styles.desktopMainContent,
              { flexDirection: selectedChat ? 'row' : 'column', opacity: chatEnterOpac, transform: [{ translateY: chatEnterTy }] },
            ]}
          >
            {/* Chat List - Always visible on left when chat is selected */}
            <View style={[
              { flex: 1 },
              selectedChat && {
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
                onOpenChat={(roomId, receiverId, receiverName, projectId) => {
                  setSelectedChat({ roomId, receiverId, receiverName, projectId: projectId ?? undefined });
                  setShowChatList(IS_LARGE_WEB);
                }}
              />
            </View>

            {/* Chat Detail - Shows on right side when chat is selected */}
            {selectedChat && (
              <Animated.View
                style={[
                  { flex: 1, opacity: chatDetailOpac, transform: [{ translateY: chatDetailTy }] },
                  {
                    flex: 0.65,
                    ...Platform.select({
                      web: {
                        minWidth: 400,
                      } as any,
                    }),
                  },
                ]}
              >
                <ChatDetailScreen
                  roomId={selectedChat.roomId}
                  receiverId={selectedChat.receiverId}
                  receiverName={selectedChat.receiverName}
                  projectId={selectedChat.projectId ?? undefined}
                  onBack={
                    IS_LARGE_WEB
                      ? undefined
                      : () => {
                        setSelectedChat(null);
                        setShowChatList(true);
                      }
                  }
                />
              </Animated.View>
            )}
          </Animated.View>
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
              />
            </View>
            <Footer />
          </ScrollView>
        )}

        {activeTab === 'wallet' && (
          <ScrollView
            style={styles.desktopMainContent}
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              <CommissionPaymentScreen
                onBack={() => setActiveTab('home')}
                onNavigateToCheckout={(request, description) => {
                  setCommissionCheckoutRequest(request);
                  setCommissionCheckoutDescription(description);
                }}
              />
            </View>
            <Footer />
          </ScrollView>
        )}

        <View style={{ flex: 1, display: activeTab === 'profile' ? 'flex' : 'none', pointerEvents: activeTab === 'profile' ? 'auto' : 'none' }}>
          <ScrollView
            style={styles.desktopMainContent}
            contentContainerStyle={styles.scrollContentWithFooter}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.mainContentWrapper}>
              {profileSubView === null ? (
                <ProfileScreen
                  onLogout={onLogout}
                  onNavigateToEditProfile={() => setProfileSubView('myData')}
                  onNavigateToPortfolio={() => {
                  setPortfolioSource('profile');
                  setProfileSubView('portfolio');
                }}
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
                  onNavigateToOnboarding={() => setProfileSubView('onboarding')}
                />
              ) : profileSubView === 'onboarding' ? (
                <Modal visible={true} animationType="slide" style={{ flex: 1 }}>
                  <OnboardingScreen
                    variant="technician"
                    onFinish={() => setProfileSubView(null)}
                  />
                </Modal>
              ) : profileSubView === 'myData' ? (
                <MyDataScreen
                  onBack={() => setProfileSubView(null)}
                  onEditProfile={() => setProfileSubView('editProfile')}
                  onChangePhone={() => setProfileSubView('changePhone')}
                  onChangePassword={() => setProfileSubView('changePassword')}
                  onNavigateToSubscription={() => setProfileSubView('subscription')}
                  onNavigateToServices={() => setProfileSubView('services')}
                  onNavigateToAvailability={() => setProfileSubView('availability')}
                  isTechnician={true}
                />
              ) : profileSubView === 'editProfile' ? (
                <EditProfileScreen
                  userDetails={{}}
                  onBack={() => setProfileSubView('myData')}
                  onSave={() => setProfileSubView('myData')}
                />
              ) : profileSubView === 'portfolio' ? (
                <PortfolioScreen
                  userId={userId}
                  onBack={() => {
                    if (portfolioSource === 'home') setActiveTab('home');
                    setProfileSubView(null);
                    setPortfolioSource(null);
                  }}
                  onEditProfile={() => setProfileSubView('editProfile')}
                />
              ) : profileSubView === 'subscription' ? (
                <SubscriptionScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'services' ? (
                <ServiceManagementScreen
                  onBack={() => setProfileSubView(null)}
                />
              ) : profileSubView === 'serviceSuggestions' ? (
                <MyServiceSuggestionsScreen
                  onBack={() => setProfileSubView('services')}
                  onAddNew={() => setSmallTasksView('serviceSuggestion')}
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
        </View>

        {activeTab === 'chatbot' && (
          <View style={[styles.desktopMainContent, { flex: 1 }]}>
            <ChatbotScreen
              onBack={() => setActiveTab('home')}
              userId={userId}
              userRole="technician"
              onNavigateToTab={onChatbotNavigateToTab}
              onNavigateToScreen={onChatbotNavigateToScreen}
              onRequestLiveAgent={onChatbotRequestLiveAgent}
              hasBottomTabBar={false}
            />
          </View>
        )}
      </View>

      {/* Floating Chatbot Button */}
      <TouchableOpacity
        style={[styles.chatbotFab, { backgroundColor: colors.primary }]}
        onPress={() => setActiveTab('chatbot')}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubbles" size={28} color="#fff" />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
    ...Platform.select({
      web: {
        position: 'relative' as any,
        overflow: 'visible' as any,
      },
    }),
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
  glassTabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...Platform.select({ web: { position: 'fixed' as any } }),
  },
  // Figma Bottom Tab Bar Styles (Node 58:2493) — legacy
  figmaTabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0.5,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  figmaTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 11.5,
    paddingBottom: 11.5,
    paddingHorizontal: 12,
    height: 59,
  },
  figmaTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    gap: 2,
  },
  figmaTabLabel: {
    fontSize: 10,
    fontWeight: '400', // Regular
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter',
  },
  // Legacy Top Bar Styles (kept for desktop)
  topBar: {
    backgroundColor: Colors.primary,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    padding: 5,
  },
  logoContainer: {
    height: 40,
    width: 120,
  },
  logoImage: {
    height: '100%',
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  availabilityCard: {
    elevation: 3,
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  availabilityStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  toggle: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  },
  iosButtonSubtext: {
    fontSize: 13,
    fontWeight: '400',
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
    backgroundColor: '#fff',
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
    color: '#333',
    flex: 1,
  },
  dropdown: {
    backgroundColor: '#fff',
    marginBottom: 10,
    marginLeft: 40,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  bidBadge: {
    color: '#FF0000',
    fontWeight: 'bold',
  },
  earningsCard: {
    elevation: 3,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  earningsCurrency: {
    fontSize: 18,
    marginBottom: 10,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    marginBottom: 15,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalProgress: {
    marginTop: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  goalText: {
    fontSize: 12,
    marginTop: 8,
  },
  levelCard: {
    elevation: 3,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  levelBadge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  levelNumber: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  levelStats: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  streakText: {
    fontSize: 12,
    color: '#666',
  },
  xpBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  xpText: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
  },
  hotProjectCard: {
    width: Dimensions.get('window').width * 0.8,
    marginRight: 15,
    elevation: 5,
  },
  hotProjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF0000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  hotProjectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  hotProjectCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  hotProjectDetails: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 10,
  },
  hotProjectDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hotProjectBudget: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  hotProjectDuration: {
    fontSize: 14,
    color: '#666',
  },
  hotProjectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 15,
  },
  postedTime: {
    fontSize: 12,
    color: '#999',
  },
  separator: {
    fontSize: 12,
    color: '#ccc',
  },
  biddersText: {
    fontSize: 12,
    color: '#999',
  },
  bidNowButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bidNowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiCard: {
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  aiIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  aiMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  aiButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#00549B',
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
    paddingHorizontal: 8, // Add horizontal padding for spacing
    marginHorizontal: 4, // Add margin between buttons
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
  // Badge styles
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
  desktopDropdown: {
    marginTop: 4,
    marginLeft: 48,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' as any,
        zIndex: 1000,
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
  // Desktop styles
  desktopContainer: {
    flex: 1,
    flexDirection: 'column',
    ...Platform.select({
      web: {
        minHeight: '100vh' as any,
        position: 'relative' as any,
        overflow: 'visible' as any,
      },
    }),
  },
  desktopContainerRTL: {
    flexDirection: 'row-reverse',
  },
  desktopSidebar: {
    width: 250,
    ...(Platform.OS === 'web' && {
      position: 'fixed' as any,
      top: 0,
      bottom: 0,
      height: '100vh' as any,
    }),
  },
  desktopSidebarHeader: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  desktopSidebarContent: {
    flex: 1,
    paddingVertical: 20,
  },
  desktopSidebarFooter: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  desktopSidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 12,
  },
  desktopSidebarItemActive: {
    // Active state handled by inline styles
  },
  desktopSidebarText: {
    fontSize: 16,
    fontWeight: '500',
  },
  desktopMainContainer: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      // Margin will be set dynamically based on RTL in component
    }),
  },
  desktopHeader: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  desktopHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
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
  desktopSection: {
    marginBottom: 40,
  },
  desktopCreatePortfolioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF9500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    ...Platform.select({
      web: {
        maxWidth: 600,
        cursor: 'pointer' as any,
        transition: 'all 0.3s ease' as any,
        ':hover': {
          transform: 'translateY(-2px)' as any,
          boxShadow: '0 4px 12px rgba(255, 149, 0, 0.2)' as any,
        },
      },
    }),
  },
  desktopCreatePortfolioIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  desktopCreatePortfolioTextContainer: {
    flex: 1,
  },
  desktopCreatePortfolioTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  desktopCreatePortfolioSubtitle: {
    fontSize: 14,
    fontWeight: '400',
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
  desktopRatingRow: {
    flexDirection: 'row',
    gap: 2,
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
  desktopHotProjectCard: {
    width: 350,
    marginRight: 16,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' as any,
      },
    }),
  },
  chatbotFab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
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
