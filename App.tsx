import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Platform, TouchableOpacity, ScrollView, AppState, Dimensions, Image, BackHandler } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { FontProvider } from './src/context/FontContext';
// Import API config early to ensure global fetch override is applied
import './src/config/api';
import { SplashScreen, WelcomeScreen, OverviewScreen, LoginScreen, SignupScreen, OTPVerificationScreen, ForgotPasswordScreen, ForgotPasswordOTPScreen, ResetPasswordScreen, UserHomeScreen, TechnicianHomeScreen, TechnicianOnboardingScreen, ProfileScreen, EditProfileScreen, MyDataScreen, ChangePhoneScreen, ChangePasswordScreen, PortfolioScreen, ServiceManagementScreen, AvailabilityScreen, SubscriptionScreen, NewProjectView, ManualProjectForm, ConversationalAIForm, ProjectsScreen, ChatRoomsListScreen, ChatDetailScreen, RunningProjectsScreen, NotificationsScreen, AppointmentsScreen, BookingScreen, TechnicianProfileViewScreen, RoomDesignScreen, VoiceAIScreen, CostExplorerScreen, RoomVisualizerScreen, AskBonyadAIScreen, ProjectsMapScreen, AboutScreen, ContactScreen, IntroToAppScreen, OnboardingScreen, TechnicianCompleteProfileScreen, WaitingApprovalScreen, ChatbotScreen, SupportChatScreen, TicketListScreen, CreateTicketScreen, TicketDetailScreen, ServiceProvidersScreen, CommissionPaymentScreen, PaymentCheckoutScreen, CategorySubcategoryScreen, CreationMethodScreen, PendingProjectScreen, BidReceivedProjectScreen, ApprovedProjectScreen, ContractSigningProjectScreen, InProgressProjectScreen, CompletedProjectViewPage, ChangeRequestListScreen, ChangeRequestDetailScreen, RequestModificationScreen } from './src/screens';
import i18n from './src/localization/i18n'; // Initialize i18n
import OnlineStatusService from './src/services/OnlineStatusService';
import { presenceService } from './src/services/PresenceService';
import { storage } from './src/utils/storage';
import CoachMarkProvider from './src/components/CoachMarkProvider';
import AnimatedLoadingScreen from './src/components/AnimatedLoadingScreen';
import { coachMarksStorage } from './src/utils/coachMarks';
import { useRouter, type Screen } from './src/utils/useRouter';
import {
  handleChatbotNavigationAndroid,
  handleChatbotTabAndroid,
  type ChatbotAndroidNavDeps,
  type HomeShellFromChatbotPayload,
  type ProfileSubviewForChatbot,
} from './src/utils/chatbotNavigateAndroid';
import { getOrCreateRoomId, tryParseChatRoomIdFromActionUrl } from './src/utils/chatUtils';
import * as SplashScreenNative from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
} from '@expo-google-fonts/cairo';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as ScreenOrientation from 'expo-screen-orientation';
import WebHeader from './src/components/WebHeader';
import { useAuthGuard } from './src/hooks/useAuthGuard';
import WebSocketNotificationService from './src/services/WebSocketNotificationService';
import NotificationPopup from './src/components/NotificationPopup';
import { getOnboardingStatus } from './src/services/onboardingApi';
import onboardingStorage from './src/services/onboardingStorage';
import {
  getTechnicianStatus,
  TECHNICIAN_STATUS_REJECTED,
  TECHNICIAN_STATUS_SUSPENDED_API,
} from './src/services/TechnicianStatusService';

function isTechnicianWaitingScreenApiError(err: unknown): boolean {
  const m = (err as Error)?.message;
  return m === TECHNICIAN_STATUS_REJECTED || m === TECHNICIAN_STATUS_SUSPENDED_API;
}
import GlobalAlertProvider from './src/components/GlobalAlertProvider';
import { globalAlertManager } from './src/utils/globalAlertManager';
import { CreateCheckoutRequest } from './src/services/PaymentService';
// import * as Notifications from 'expo-notifications';
// import { registerForPushNotificationsAsync } from './src/utils/useFCMToken';

// Lazy import Firebase Messaging (native push notification taps)
let messaging: any = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (error) {
  console.warn('⚠️ React Native Firebase Messaging not available:', error);
}

// Keep native splash screen visible while we show custom splash
SplashScreenNative.preventAutoHideAsync();

export default function App() {
  const initialScreen: Screen = Platform.OS === 'web' ? 'welcome' : 'splash';
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialScreen);
  /** On Android: stack so back goes to previous screen (e.g. Home → Create project → back → Home). */
  const [screenStack, setScreenStack] = useState<Screen[]>([initialScreen]);
  const [showProfile, setShowProfile] = useState(false);
  /** When portfolio is opened from profile, back should return to profile; otherwise to home. */
  const [portfolioReturnTo, setPortfolioReturnTo] = useState<'home' | 'profile' | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'technician'>('user');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [userId, setUserId] = useState<number>(0);
  // Forgot password flow state
  const [forgotPasswordPhone, setForgotPasswordPhone] = useState('');
  const [forgotPasswordRole, setForgotPasswordRole] = useState<'USER' | 'TECHNICIAN'>('USER');
  const [forgotPasswordOTP, setForgotPasswordOTP] = useState('');
  const [expoPushToken, setExpoPushToken] = useState('');
  const [projectsFilter, setProjectsFilter] = useState<
    'all' | 'available' | 'running' | 'approved' | 'completed' | 'bid_received' | 'direct_offers'
  >('available');
  const [projectsBootstrap, setProjectsBootstrap] = useState<{
    initialSmallTask?: any;
    initialProjectType?: 'large' | 'small';
  } | null>(null);
  const [projectsRemountKey, setProjectsRemountKey] = useState(0);
  const [profileNavFromChatbot, setProfileNavFromChatbot] = useState<{
    id: number;
    subView: ProfileSubviewForChatbot;
  } | null>(null);

  const bumpProfileNavFromChatbot = useCallback((subView: ProfileSubviewForChatbot) => {
    setProfileNavFromChatbot((prev) => ({ id: (prev?.id ?? 0) + 1, subView }));
  }, []);

  type HomeShellRequest = HomeShellFromChatbotPayload & { id: number };
  const [homeShellFromChatbot, setHomeShellFromChatbot] = useState<HomeShellRequest | null>(null);
  const openInHomeShell = useCallback((payload: HomeShellFromChatbotPayload) => {
    setHomeShellFromChatbot((prev) => ({ ...payload, id: (prev?.id ?? 0) + 1 }));
  }, []);

  // Chatbot & Live Agent state
  const [chatbotSubject, setChatbotSubject] = useState('');
  const [chatbotAIHistory, setChatbotAIHistory] = useState<any[]>([]);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  
  // Support Ticket state
  const [selectedTicketId, setSelectedTicketId] = useState<number>(0);
  const [chatReceiverId, setChatReceiverId] = useState<number>(0);
  const [chatReceiverName, setChatReceiverName] = useState<string>('');
  const [selectedRunningProject, setSelectedRunningProject] = useState<any>(null);
  const [showRunningProjectDetails, setShowRunningProjectDetails] = useState(false);
  const [bookingTechnician, setBookingTechnician] = useState<{ id: number; name: string } | null>(null);
  const [bookingProjectId, setBookingProjectId] = useState<number | undefined>(undefined);
  const [viewTechnicianId, setViewTechnicianId] = useState<number | null>(null);
  const [serviceProvidersBookingTechnician, setServiceProvidersBookingTechnician] = useState<{ id: number; name: string } | null>(null);
  const [overviewUserType, setOverviewUserType] = useState<'user' | 'provider'>('user'); // For overview page toggle
  const [showOTPPopup, setShowOTPPopup] = useState(false); // OTP verification popup state
  const [currentNotification, setCurrentNotification] = useState<any | null>(null);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [isRouteTransitionLoading, setIsRouteTransitionLoading] = useState(false);
  const routeTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedNotificationId = useRef<number | null>(null); // Track last checked notification ID
  const notificationCheckInterval = useRef<NodeJS.Timeout | null>(null); // Store interval reference
  const [isAppReady, setAppReady] = useState(false);
  
  // Payment checkout state
  const [checkoutRequest, setCheckoutRequest] = useState<CreateCheckoutRequest | null>(null);
  const [checkoutDescription, setCheckoutDescription] = useState<string>('');
  
  // Category/Subcategory selection state for project creation flow
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; nameEn: string; nameAr?: string } | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<{ id: number; nameEn: string; nameAr?: string } | null>(null);
  
  // Project detail by status (from Running Projects tap – same flow as web)
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<any>(null);
  // Change requests flow (from approved/in-progress project)
  const [changeRequestProjectId, setChangeRequestProjectId] = useState<number | null>(null);
  const [changeRequestId, setChangeRequestId] = useState<number | null>(null);
  const [previousScreenBeforeChangeRequests, setPreviousScreenBeforeChangeRequests] = useState<Screen | null>(null);
  
  // After product-tour onboarding, navigate to this screen (for technicians who need complete profile / waiting approval etc.)
  const postOnboardingScreenRef = useRef<Screen | null>(null);

  // Bundle load error message (when Metro unreachable)
  const [bundleLoadError, setBundleLoadError] = useState<string | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string>(i18n.resolvedLanguage || i18n.language || 'en');
  const isAppRTL = activeLanguage.toLowerCase() === 'ar' || activeLanguage.toLowerCase().startsWith('ar-');
  
  // Router hook for URL-based routing on web
  const router = useRouter(currentScreen, setCurrentScreen);

  // Check session function - used by both useEffect and SplashScreen
  const checkSession = useCallback(async () => {
    const setScreen = (screen: Screen) => {
      setCurrentScreen(screen);
      if (Platform.OS === 'android') setScreenStack([screen]);
    };
    try {
      console.log('🔍 Checking for stored session and onboarding status...');

      // Onboarding shows only: (1) after user signup, (2) after technician completes profile + 5 steps.
      // Never show onboarding at login — go to welcome/login when not authenticated.
      const hasSeenOnboarding = await storage.hasSeenOnboarding();

      // Use checkAuthentication to validate token
      const { checkAuthentication } = await import('./src/utils/authGuard');
      const authResult = await checkAuthentication();

      if (authResult) {
        console.log('✅ Valid session found - loading user data');
        console.log('   User ID:', authResult.userId);
        console.log('   Role:', authResult.role);
        console.log('   Onboarded:', authResult.onboarded);
        console.log('   Profile Complete:', authResult.profileComplete);

        // Set app state from validated token
        setAuthToken(authResult.token);
        setUserId(authResult.userId);
        setUserRole(authResult.role.toLowerCase() as 'user' | 'technician');

        // Mark user as online when app opens with valid session (same as web)
        if (authResult.token) {
          presenceService.markOnline().catch(() => {});
        }

        // Connect to WebSocket services if authenticated
        if (authResult.token) {
          console.log('🔌 Connecting to WebSocket services...');
          const connectionResult = await OnlineStatusService.connect(authResult.token);
          if (connectionResult.connected) {
            console.log('✅ WebSocket connected - User is now online');

            // Connect to WebSocket notifications (web only)
            if (Platform.OS === 'web') {
              WebSocketNotificationService.connect(
                authResult.token,
                authResult.userId,
                (notification) => {
                  console.log('📬 [App] Notification received via WebSocket:', notification);
                  setCurrentNotification(notification);
                  setShowNotificationPopup(true);

                  // Request browser notification permission and show notification
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    if (Notification.permission === 'granted') {
                      new Notification(notification.title, {
                        body: notification.message,
                        icon: '/favicon.ico',
                      });
                    } else if (Notification.permission === 'default') {
                      Notification.requestPermission().then((permission) => {
                        if (permission === 'granted') {
                          new Notification(notification.title, {
                            body: notification.message,
                            icon: '/favicon.ico',
                          });
                        }
                      });
                    }
                  }
                }
              );
            }
          } else {
            if (connectionResult.error) {
              console.error('❌ Failed to connect WebSocket:', connectionResult.error);
            }
          }
        }

        // Navigate based on onboarded and profileComplete status (technician: same order as web)
        const role = authResult.role.toLowerCase() as 'user' | 'technician';

        const hasSeenTour = await storage.hasSeenOnboarding();

        if (role === 'technician') {
          const status = authResult.user?.status;
          if (!authResult.profileComplete) {
            console.log('📍 Technician profile incomplete - redirecting to complete profile');
            setScreen('technicianCompleteProfile');
          } else if (status === 'WAITING_ADMIN_APPROVAL' || status === 'PENDING') {
            console.log('📍 Technician waiting for admin approval');
            setScreen('waitingApproval');
          } else if (!authResult.onboarded) {
            console.log('📍 Technician not onboarded - redirecting to onboarding');
            setScreen('technicianOnboarding');
          } else {
            console.log('📍 Technician fully onboarded - going to home');
            setScreen('home');
          }
        } else {
          if (!authResult.profileComplete) {
            console.log('📍 User profile incomplete - redirecting to profile edit');
            setScreen('editProfile');
          } else {
            // User: onboarding only after signup (handled in handleOTPVerificationSuccess), not on login
            console.log('📍 User profile complete - going to home');
            setScreen('home');
          }
        }
      } else {
        console.log('❌ No valid session found - user needs to login');
        // Clear any invalid auth state + reset onboarding counters
        await storage.clearAuthData();
        setAuthToken('');
        setUserId(0);
        setUserRole('user');
        // Navigate to login
        setScreen('login');
      }
    } catch (error: any) {
      const message = error?.message ?? String(error ?? '');
      const errorName = error?.name ?? error?.constructor?.name ?? '';
      const isBundleOrNetworkError =
        message.includes('Could not load bundle') ||
        message.includes('LoadBundleFromServerRequestError') ||
        errorName === 'LoadBundleFromServerRequestError' ||
        message.includes('Network request failed') ||
        message.includes('Unable to resolve');

      if (isBundleOrNetworkError) {
        setBundleLoadError(
          Platform.OS === 'web'
            ? 'Could not load. Check the dev server and refresh.'
            : 'Could not connect to dev server. Run "npm start" in the project, then reload the app (shake device → Reload).'
        );
        setScreen('welcome');
        return;
      }

      console.error('❌ Error checking stored session:', error);
      setBundleLoadError(null);
      setAuthToken('');
      setUserId(0);
      setUserRole('user');
      setScreen('login');
    }
  }, []);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        await SplashScreenNative.preventAutoHideAsync();

        await Font.loadAsync({
          // Arabic — Cairo (same as web, from @expo-google-fonts/cairo)
          Cairo_400Regular,
          Cairo_500Medium,
          Cairo_600SemiBold,
          Cairo_700Bold,
          Cairo_800ExtraBold,
          // English — Poppins (from @expo-google-fonts/poppins)
          Poppins_400Regular,
          Poppins_600SemiBold,
          Poppins_700Bold,
        });

        const localAssets = [
          require('./assets/user/IMG_4784.png'),
          require('./assets/user/IMG_4785.png'),
          require('./assets/user/IMG_4786.png'),
          require('./assets/technician_screenshots/IMG_4776.png'),
          require('./assets/technician_screenshots/IMG_4777.png'),
        ];

        await Asset.loadAsync(localAssets);

        // Apply saved language so UI and RTL are correct on load (no refresh needed after toggle)
        const savedLang = await storage.getLanguage();
        if (savedLang) {
          await i18n.changeLanguage(savedLang);
        }

        if (Platform.OS === 'web') {
          await Promise.all([
            Image.prefetch('https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800'),
            Image.prefetch('https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800'),
          ]);
        }
      } catch (error) {
        console.warn('⚠️ Failed to preload assets:', error);
      } finally {
        setAppReady(true);
      }
    };

    prepareApp();
  }, []);

  // React immediately to language toggles so translated text/RTL styles update without manual reload.
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setActiveLanguage(lng || 'en');
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isAppReady) {
      await SplashScreenNative.hideAsync();
    }
  }, [isAppReady]);


  // Check for new notifications from API
  const checkForNewNotifications = async () => {
    const isAuthScreen =
      currentScreen === 'welcome' ||
      currentScreen === 'overview' ||
      currentScreen === 'introToApp' ||
      currentScreen === 'onboarding' ||
      currentScreen === 'login' ||
      currentScreen === 'signup' ||
      currentScreen === 'otpVerification' ||
      currentScreen === 'forgotPassword' ||
      currentScreen === 'resetPassword';

    // Never show popups / run notification polling while user is on auth screens.
    if (isAuthScreen) {
      return;
    }

    if (!authToken || !userId) {
      return;
    }

    try {
      const { buildApiUrl, API_ENDPOINTS } = await import('./src/config/api');
      const response = await fetch(buildApiUrl(API_ENDPOINTS.NOTIFICATIONS.MY_NOTIFICATIONS), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      // API may return array or { content: [] } / { data: [] } – ensure we have an array
      const rawList = Array.isArray(data) ? data : (data?.content ?? data?.data ?? []);
      const notifications = Array.isArray(rawList) ? rawList : [];

      const unreadNotifications = notifications.filter((n: any) => n && !(n.read === true || n.isRead === true));

      // If we have unread notifications and haven't checked before, or there's a new one
      if (unreadNotifications.length > 0) {
        // Sort by ID descending to get the latest
        unreadNotifications.sort((a: any, b: any) => (b?.id ?? 0) - (a?.id ?? 0));
        const latestNotification = unreadNotifications[0];

        if (!latestNotification || latestNotification.id == null) {
          return;
        }

        // Check if this is a new notification (different from last checked)
        if (lastCheckedNotificationId.current === null || latestNotification.id > lastCheckedNotificationId.current) {
          console.log('📬 [App] New unread notification found:', latestNotification.id);

          // Only show popup if we haven't shown it for this notification yet
          if (currentNotification?.id !== latestNotification.id) {
            setCurrentNotification(latestNotification);
            // Avoid showing notification popups on auth screens (extra safety).
            setShowNotificationPopup(true);

            // Request browser notification permission and show notification (web only)
            if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification(latestNotification.title ?? '', {
                  body: latestNotification.message ?? '',
                  icon: '/favicon.ico',
                });
              } else if (Notification.permission === 'default') {
                Notification.requestPermission().then((permission) => {
                  if (permission === 'granted') {
                    new Notification(latestNotification.title ?? '', {
                      body: latestNotification.message ?? '',
                      icon: '/favicon.ico',
                    });
                  }
                });
              }
            }
          }

          lastCheckedNotificationId.current = latestNotification.id;
        }
      }
    } catch (error: any) {
      const msg = error?.message ?? String(error ?? '');
      const isBundleError =
        msg.includes('Could not load bundle') ||
        msg.includes('LoadBundleFromServerRequestError') ||
        error?.name === 'LoadBundleFromServerRequestError';
      const isNetworkError =
        msg.includes('Network request failed') ||
        msg.includes('Failed to fetch') ||
        msg.toLowerCase().includes('network');
      if (!isBundleError) {
        if (isNetworkError) {
          // Backend unreachable or device offline – expected when API is down or no connection; skip log to avoid spam
        } else {
          console.error('❌ Failed to check for new notifications:', error);
        }
      }
    }
  };

  // Start periodic notification checking when authenticated
  useEffect(() => {
    if (authToken && userId) {
      // Check immediately
      checkForNewNotifications();

      // Then check every 30 seconds
      notificationCheckInterval.current = setInterval(() => {
        checkForNewNotifications();
      }, 30000); // 30 seconds

      return () => {
        if (notificationCheckInterval.current) {
          clearInterval(notificationCheckInterval.current);
        }
      };
    } else {
      // Clear interval if not authenticated
      if (notificationCheckInterval.current) {
        clearInterval(notificationCheckInterval.current);
        notificationCheckInterval.current = null;
      }
      lastCheckedNotificationId.current = null;
    }
  }, [authToken, userId, currentScreen]);

  // Track screen changes
  useEffect(() => {
    console.log('📱 Screen changed to:', currentScreen);
    if (Platform.OS === 'web') {
      console.log('🌐 Current URL path:', router.currentPath);
    }
  }, [currentScreen, router.currentPath]);

  useEffect(() => {
    console.log('🚀 App mounted - Platform:', Platform.OS, 'Initial screen:', initialScreen);

    // Allow screen rotation on all platforms
    if (Platform.OS !== 'web') {
      // Unlock screen orientation to allow rotation
      // Check if module is available before calling
      const unlockOrientation = async () => {
        try {
          // Check if the module is available
          if (ScreenOrientation && ScreenOrientation.unlockAsync) {
            await ScreenOrientation.unlockAsync();
            console.log('✅ Screen orientation unlocked - rotation enabled');
          } else {
            console.warn('⚠️ ScreenOrientation module not available - will work after rebuild');
          }
        } catch (error: any) {
          // Silently fail - the AndroidManifest.xml change will handle rotation
          console.warn('⚠️ ScreenOrientation unlock failed (manifest setting will handle rotation):', error?.message || error);
        }
      };

      // Call after a small delay to ensure native modules are ready
      setTimeout(() => {
        unlockOrientation();
      }, 100);
    }

    // Call checkSession on mount to restore auth (token, userId) from storage on both native and web
    // So portfolio and other screens always have the current user id (e.g. after web refresh)
    checkSession();
  }, [checkSession]);

  // Handle app lifecycle for WebSocket (Android only) and check notifications on active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      console.log('📱 AppState changed to:', nextAppState);

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Mark user as offline when app closes or goes to background (same as web)
        if (authToken) {
          presenceService.markOffline().catch(() => {});
        }
        if (Platform.OS === 'android') {
          console.log('📱 App entered background');
          if (OnlineStatusService.isConnected()) {
            console.log('🔌 Disconnecting WebSocket (background)...');
            await OnlineStatusService.disconnect();
          }
        }
      } else if (nextAppState === 'active' && authToken) {
        // Mark user as online when app is used / comes to foreground (same as web)
        presenceService.markOnline().catch(() => {});
        if (Platform.OS === 'android') {
          console.log('📱 App entering foreground');

          // Add small delay to ensure app is fully active
          setTimeout(async () => {
            console.log('🔌 Checking WebSocket status...');

            if (!OnlineStatusService.isConnected()) {
              console.log('🔌 WebSocket not connected, reconnecting...');

              try {
                const connectionResult = await OnlineStatusService.connect(authToken);

                if (connectionResult.connected) {
                  // Check after 2 seconds if we're connected
                  setTimeout(() => {
                    if (!OnlineStatusService.isConnected()) {
                      console.log('⚠️ Not connected - reinitializing connection');
                      OnlineStatusService.connect(authToken);
                    }
                  }, 2000);
                } else {
                  console.log('⚠️ Not connected - reinitializing connection');
                }
              } catch (error) {
                console.log('⚠️ Not connected - reinitializing connection');
              }
            } else {
              console.log('✅ WebSocket already connected');
            }
          }, 300); // Small delay to ensure app state is stable
        }

        // Check for new notifications when app becomes active (all platforms)
        console.log('🔔 Checking for new notifications on app active...');
        checkForNewNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [authToken, userId]);

  const navigateToScreen = (screen: Screen, replace?: boolean) => {
    if (Platform.OS === 'web') {
      router.navigate(screen);
    }
    if (replace) {
      setScreenStack([screen]);
    } else {
      setScreenStack((prev) => [...prev, screen]);
    }
    setCurrentScreen(screen);
  };

  // Handle successful login
  const handleLoginSuccess = async (role: 'user' | 'technician', token: string, id: number) => {
    setUserRole(role);
    setAuthToken(token);
    setUserId(id);

    presenceService.markOnline().catch(() => {});
    await storage.incrementLoginCount();

    if (role === 'technician') {
      try {
        const technicianStatus = await getTechnicianStatus();
        if (!technicianStatus.profileComplete) {
          console.log('📍 Technician profile incomplete - redirecting to complete profile');
          navigateToScreen('technicianCompleteProfile', true);
          return;
        }
        if (technicianStatus.status === 'WAITING_ADMIN_APPROVAL' || technicianStatus.status === 'PENDING') {
          console.log('📍 Technician waiting for admin approval');
          navigateToScreen('waitingApproval', true);
          return;
        }
        if (technicianStatus.status === 'REJECTED') {
          console.log('📍 Technician application rejected');
          navigateToScreen('waitingApproval', true);
          return;
        }
        if (technicianStatus.status === 'APPROVED' && !technicianStatus.onboarded) {
          console.log('📍 Technician approved but not onboarded - redirecting to onboarding');
          try {
            const status = await getOnboardingStatus(token, id);
            if (status && !status.completed) {
              const nextStep = status.currentStep && status.currentStep >= 1 && status.currentStep <= 4 ? status.currentStep : 1;
              await onboardingStorage.set('currentStep', String(nextStep));
            } else {
              await onboardingStorage.clear();
            }
          } catch (e) {
            console.warn('⚠️ Failed to fetch onboarding status:', e);
          }
          navigateToScreen('technicianOnboarding', true);
          return;
        }
        console.log('📍 Technician ready - going to home');
        navigateToScreen('home', true);
        return;
      } catch (err: unknown) {
        if (isTechnicianWaitingScreenApiError(err)) {
          console.log('📍 Technician rejected/suspended (status API) — waiting approval');
          navigateToScreen('waitingApproval', true);
          return;
        }
        console.warn('⚠️ getTechnicianStatus failed, defaulting to home:', err);
        navigateToScreen('home', true);
        return;
      }
    }

    // Connect to WebSocket for online status tracking (user)
    console.log('🔌 Connecting to WebSocket after login...');
    const connectionResult = await OnlineStatusService.connect(token);
    if (connectionResult.connected) {
      console.log('✅ WebSocket connected - User is now online');

      // Connect to WebSocket notifications (web only)
      if (Platform.OS === 'web') {
        WebSocketNotificationService.connect(
          token,
          id,
          (notification) => {
            console.log('📬 [App] Notification received via WebSocket:', notification);
            setCurrentNotification(notification);
            setShowNotificationPopup(true);

            // Request browser notification permission and show notification
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification(notification.title, {
                  body: notification.message,
                  icon: '/favicon.ico',
                });
              } else if (Notification.permission === 'default') {
                Notification.requestPermission().then((permission) => {
                  if (permission === 'granted') {
                    new Notification(notification.title, {
                      body: notification.message,
                      icon: '/favicon.ico',
                    });
                  }
                });
              }
            }
          }
        );
      }
    } else {
      if (connectionResult.error) {
        console.error('❌ Failed to connect WebSocket:', connectionResult.error);
      }
    }

    navigateToScreen('home', true);
  };

  // Handle showing OTP popup after signup
  const handleNavigateToOTP = (phone: string, role: 'user' | 'technician') => {
    setPhoneNumber(phone);
    setUserRole(role);
    setShowOTPPopup(true);
  };

  // Handle successful OTP verification (same flow as web: Complete Profile → Waiting Approval → Onboarding → Home)
  const handleOTPVerificationSuccess = async (token: string, id: number, role: string, profileComplete?: boolean) => {
    setShowOTPPopup(false);
    setAuthToken(token);
    setUserId(id);
    setUserRole(role.toLowerCase() as 'user' | 'technician');

    presenceService.markOnline().catch(() => {});
    const prevLoginCount = await storage.getLoginCount();
    await storage.incrementLoginCount();
    // Show product-tour onboarding after first signup (count was 0 before increment), regardless of hasSeenOnboarding
    const isFirstSignup = prevLoginCount === 0;

    if (role.toLowerCase() === 'technician') {
      try {
        const technicianStatus = await getTechnicianStatus(token);
        if (!technicianStatus.profileComplete) {
          console.log('📍 Technician profile incomplete - redirecting to complete profile');
          navigateToScreen('technicianCompleteProfile', true);
          return;
        }
        if (technicianStatus.status === 'WAITING_ADMIN_APPROVAL' || technicianStatus.status === 'PENDING' || technicianStatus.recommendedPage === 'WAITING_APPROVAL') {
          console.log('📍 Technician waiting for admin approval');
          navigateToScreen('waitingApproval', true);
          return;
        }
        if (technicianStatus.status === 'REJECTED') {
          console.log('📍 Technician application rejected');
          navigateToScreen('waitingApproval', true);
          return;
        }
        if (technicianStatus.status === 'APPROVED' && !technicianStatus.onboarded) {
          console.log('📍 Technician approved but not onboarded - redirecting to onboarding');
          try {
            const status = await getOnboardingStatus(token, id);
            if (status && !status.completed) {
              const nextStep = status.currentStep && status.currentStep >= 1 && status.currentStep <= 4 ? status.currentStep : 1;
              await onboardingStorage.set('currentStep', String(nextStep));
            } else {
              await onboardingStorage.clear();
            }
          } catch (e) {
            console.warn('⚠️ Failed to fetch onboarding status (signup):', e);
          }
          navigateToScreen('technicianOnboarding', true);
          return;
        }
        console.log('📍 Technician ready - going to home');
        navigateToScreen('home', true);
        return;
      } catch (err: unknown) {
        if (isTechnicianWaitingScreenApiError(err)) {
          console.log('📍 Technician rejected/suspended (status API after OTP)');
          navigateToScreen('waitingApproval', true);
          return;
        }
        console.warn('⚠️ getTechnicianStatus failed after OTP:', err);
        navigateToScreen('technicianCompleteProfile', true);
        return;
      }
    }

    // User: connect WebSocket
    console.log('🔌 Connecting to WebSocket after signup verification...');
    const connectionResult = await OnlineStatusService.connect(token);
    if (connectionResult.connected) {
      console.log('✅ WebSocket connected - User is now online');

      // Connect to WebSocket notifications (web only)
      if (Platform.OS === 'web') {
        WebSocketNotificationService.connect(
          token,
          id,
          (notification) => {
            console.log('📬 [App] Notification received via WebSocket:', notification);
            setCurrentNotification(notification);
            setShowNotificationPopup(true);

            // Request browser notification permission and show notification
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification(notification.title, {
                  body: notification.message,
                  icon: '/favicon.ico',
                });
              } else if (Notification.permission === 'default') {
                Notification.requestPermission().then((permission) => {
                  if (permission === 'granted') {
                    new Notification(notification.title, {
                      body: notification.message,
                      icon: '/favicon.ico',
                    });
                  }
                });
              }
            }
          }
        );
      }
    } else {
      if (connectionResult.error) {
        console.error('❌ Failed to connect WebSocket:', connectionResult.error);
      }
    }

    if (isFirstSignup && Platform.OS !== 'web') {
      console.log('📍 First signup - showing onboarding');
      postOnboardingScreenRef.current = 'home';
      navigateToScreen('onboarding', true);
    } else {
      navigateToScreen('home', true);
    }
  };

  // Handle logout with WebSocket disconnection
  const handleLogout = async () => {
    // Mark user as offline when logout (same as web) – call before clearing auth so token is still available
    await presenceService.markOffline();

    // Clear notification check interval
    if (notificationCheckInterval.current) {
      clearInterval(notificationCheckInterval.current);
      notificationCheckInterval.current = null;
    }
    lastCheckedNotificationId.current = null;

    // Disconnect WebSocket
    await OnlineStatusService.disconnect();

    // Disconnect notification WebSocket (web only)
    if (Platform.OS === 'web') {
      WebSocketNotificationService.disconnect();
    }

    // Clear notification popup
    setCurrentNotification(null);
    setShowNotificationPopup(false);

    console.log('🔌 WebSocket disconnected - User is now offline');

    // Clear auth data from storage
    await storage.clearAuthData();
    await storage.clearLoginCount();
    await storage.clearOnboardingStatus();
    console.log('✅ Auth data cleared from storage');

    await onboardingStorage.clear();

    // Clear auth data from state
    setAuthToken('');
    setUserId(0);
    setUserRole('user');

    // Navigate based on platform using router
    if (Platform.OS === 'web') {
      router.navigate('welcome');
    } else {
      router.navigate('login');
    }
    setShowProfile(false);
  };

  if (!isAppReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <FontProvider>
        <GlobalAlertProvider>
          <View style={{ flex: 1, direction: isAppRTL ? 'rtl' : 'ltr' }} onLayout={onLayoutRootView}>
            <AppContent
              currentScreen={currentScreen}
              setCurrentScreen={setCurrentScreen}
              screenStack={screenStack}
              setScreenStack={setScreenStack}
              router={router}
              checkSession={checkSession}
              showProfile={showProfile}
              setShowProfile={setShowProfile}
              portfolioReturnTo={portfolioReturnTo}
              setPortfolioReturnTo={setPortfolioReturnTo}
              userRole={userRole}
              setUserRole={setUserRole}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              userId={userId}
              setUserId={setUserId}
              authToken={authToken}
              setAuthToken={setAuthToken}
              handleLoginSuccess={handleLoginSuccess}
              handleNavigateToOTP={handleNavigateToOTP}
              handleOTPVerificationSuccess={handleOTPVerificationSuccess}
              handleLogout={handleLogout}
              projectsFilter={projectsFilter}
              setProjectsFilter={setProjectsFilter}
              projectsBootstrap={projectsBootstrap}
              setProjectsBootstrap={setProjectsBootstrap}
              projectsRemountKey={projectsRemountKey}
              setProjectsRemountKey={setProjectsRemountKey}
              profileNavFromChatbot={profileNavFromChatbot}
              bumpProfileNavFromChatbot={bumpProfileNavFromChatbot}
              homeShellFromChatbot={homeShellFromChatbot}
              openInHomeShell={openInHomeShell}
              chatRoomId={chatRoomId}
              setChatRoomId={setChatRoomId}
              chatReceiverId={chatReceiverId}
              setChatReceiverId={setChatReceiverId}
              chatReceiverName={chatReceiverName}
              setChatReceiverName={setChatReceiverName}
              bookingTechnician={bookingTechnician}
              setBookingTechnician={setBookingTechnician}
              bookingProjectId={bookingProjectId}
              setBookingProjectId={setBookingProjectId}
              viewTechnicianId={viewTechnicianId}
              setViewTechnicianId={setViewTechnicianId}
              showOTPPopup={showOTPPopup}
              setShowOTPPopup={setShowOTPPopup}
              currentNotification={currentNotification}
              setCurrentNotification={setCurrentNotification}
              showNotificationPopup={showNotificationPopup}
              setShowNotificationPopup={setShowNotificationPopup}
              forgotPasswordPhone={forgotPasswordPhone}
              setForgotPasswordPhone={setForgotPasswordPhone}
              forgotPasswordRole={forgotPasswordRole}
              setForgotPasswordRole={setForgotPasswordRole}
              forgotPasswordOTP={forgotPasswordOTP}
              setForgotPasswordOTP={setForgotPasswordOTP}
              chatbotSubject={chatbotSubject}
              setChatbotSubject={setChatbotSubject}
              chatbotAIHistory={chatbotAIHistory}
              setChatbotAIHistory={setChatbotAIHistory}
              selectedTicketId={selectedTicketId}
              setSelectedTicketId={setSelectedTicketId}
              selectedProjectForDetail={selectedProjectForDetail}
              setSelectedProjectForDetail={setSelectedProjectForDetail}
              changeRequestProjectId={changeRequestProjectId}
              setChangeRequestProjectId={setChangeRequestProjectId}
              changeRequestId={changeRequestId}
              setChangeRequestId={setChangeRequestId}
              previousScreenBeforeChangeRequests={previousScreenBeforeChangeRequests}
              setPreviousScreenBeforeChangeRequests={setPreviousScreenBeforeChangeRequests}
              checkoutRequest={checkoutRequest}
              setCheckoutRequest={setCheckoutRequest}
              checkoutDescription={checkoutDescription}
              setCheckoutDescription={setCheckoutDescription}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedSubcategory={selectedSubcategory}
              setSelectedSubcategory={setSelectedSubcategory}
              serviceProvidersBookingTechnician={serviceProvidersBookingTechnician}
              setServiceProvidersBookingTechnician={setServiceProvidersBookingTechnician}
              bundleLoadError={bundleLoadError}
              setBundleLoadError={setBundleLoadError}
              postOnboardingScreenRef={postOnboardingScreenRef}
              setIsRouteTransitionLoading={setIsRouteTransitionLoading}
              isRouteTransitionLoading={isRouteTransitionLoading}
              routeTransitionTimerRef={routeTransitionTimerRef}
            />
          </View>
        </GlobalAlertProvider>
      </FontProvider>
    </ThemeProvider>
  );
}

function AppContent({
  currentScreen,
  setCurrentScreen,
  screenStack,
  setScreenStack,
  router,
  checkSession,
  showProfile,
  setShowProfile,
  portfolioReturnTo,
  setPortfolioReturnTo,
  userRole,
  setUserRole,
  phoneNumber,
  setPhoneNumber,
  userId,
  setUserId,
  handleLoginSuccess,
  handleNavigateToOTP,
  handleOTPVerificationSuccess,
  handleLogout,
  projectsFilter,
  setProjectsFilter,
  projectsBootstrap,
  setProjectsBootstrap,
  projectsRemountKey,
  setProjectsRemountKey,
  profileNavFromChatbot,
  bumpProfileNavFromChatbot,
  homeShellFromChatbot,
  openInHomeShell,
  chatRoomId,
  setChatRoomId,
  chatReceiverId,
  setChatReceiverId,
  chatReceiverName,
  setChatReceiverName,
  bookingTechnician,
  setBookingTechnician,
  bookingProjectId,
  setBookingProjectId,
  viewTechnicianId,
  setViewTechnicianId,
  overviewUserType,
  setOverviewUserType,
  showOTPPopup,
  setShowOTPPopup,
  authToken,
  setAuthToken,
  currentNotification,
  setCurrentNotification,
  showNotificationPopup,
  setShowNotificationPopup,
  forgotPasswordPhone,
  setForgotPasswordPhone,
  forgotPasswordRole,
  setForgotPasswordRole,
  forgotPasswordOTP,
  setForgotPasswordOTP,
  chatbotSubject,
  setChatbotSubject,
  chatbotAIHistory,
  setChatbotAIHistory,
  selectedTicketId,
  setSelectedTicketId,
  selectedProjectForDetail,
  setSelectedProjectForDetail,
  changeRequestProjectId,
  setChangeRequestProjectId,
  changeRequestId,
  setChangeRequestId,
  previousScreenBeforeChangeRequests,
  setPreviousScreenBeforeChangeRequests,
  checkoutRequest,
  setCheckoutRequest,
  checkoutDescription,
  setCheckoutDescription,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  serviceProvidersBookingTechnician,
  setServiceProvidersBookingTechnician,
  bundleLoadError,
  setBundleLoadError,
  postOnboardingScreenRef,
  setIsRouteTransitionLoading,
  isRouteTransitionLoading,
  routeTransitionTimerRef,
}: any) {
  const { colors } = useTheme();

  // Track screen width for responsive header on web
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

  // Calculate if we're on a small web screen (< 1024px)
  const IS_SMALL_WEB = Platform.OS === 'web' && screenWidth < 1024;

  // Authentication guard - validates token for protected screens
  const { isCheckingAuth } = useAuthGuard(
    currentScreen,
    setCurrentScreen,
    router,
    authToken,
    setAuthToken,
    setUserId,
    setUserRole,
  );

  // Navigate: push to stack so back always goes to the previous screen.
  // replaceCurrent: swap the top screen (e.g. after create ticket → list, back must not return to create).
  const navigate = (screen: Screen, options?: { replace?: boolean; replaceCurrent?: boolean }) => {
    // Global transition loader (brief) for navigation.
    // On native, this loader feels like an unnecessary "loading screen" at app start,
    // so keep it web-only.
    if (Platform.OS === 'web') {
      setIsRouteTransitionLoading(true);
      if (routeTransitionTimerRef.current) {
        clearTimeout(routeTransitionTimerRef.current);
      }
      routeTransitionTimerRef.current = setTimeout(() => {
        setIsRouteTransitionLoading(false);
      }, 280);
    }

    if (Platform.OS === 'web' && router) {
      router.navigate(screen, undefined, !!(options?.replace || options?.replaceCurrent));
    }
    if (options?.replace) {
      setScreenStack([screen]);
    } else if (options?.replaceCurrent) {
      setScreenStack((prev: Screen[]) => {
        if (prev.length === 0) return [screen];
        const withoutTop = prev.slice(0, -1);
        // e.g. [home, ticketList, createTicket] → ticketList: drop create, keep single list (no duplicate list)
        if (withoutTop.length > 0 && withoutTop[withoutTop.length - 1] === screen) {
          return withoutTop;
        }
        return [...withoutTop, screen];
      });
    } else {
      setScreenStack((prev: Screen[]) => [...prev, screen]);
    }
    setCurrentScreen(screen);
  };

  // Show the same transition loader for async notification routing (before navigate() happens).
  const showTransitionLoader = useCallback(() => {
    if (Platform.OS !== 'web') return;
    setIsRouteTransitionLoading(true);
    if (routeTransitionTimerRef.current) {
      clearTimeout(routeTransitionTimerRef.current);
    }
    routeTransitionTimerRef.current = setTimeout(() => {
      setIsRouteTransitionLoading(false);
    }, 280);
  }, [setIsRouteTransitionLoading, routeTransitionTimerRef]);

  const pendingNotificationTapRef = useRef<any | null>(null);
  const returnHomeTabOnBackRef = useRef<
    'home' | 'projects' | 'chat' | 'profile' | 'new' | 'appointments' | 'notifications' | 'wallet' | 'chatbot' | null
  >(null);

  const tryParseSmallTaskRequestId = (actionUrl: unknown): number | null => {
    if (typeof actionUrl !== 'string') return null;
    const m = actionUrl.trim().match(/^smalltask:\/\/request\/(\d+)(?:\/bid\/(\d+))?$/i);
    if (!m) return null;
    const id = Number(m[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  };

  const openHomeShellFromNotification = useCallback(
    (args: {
      tab: 'home' | 'projects' | 'chat' | 'profile' | 'notifications' | 'appointments' | 'wallet' | 'chatbot';
      embeddedProjects?: { initialSmallTask?: any; initialProject?: any; initialProjectType?: 'large' | 'small' };
      embeddedChat?: { roomId: string; receiverId: number; receiverName: string; projectId?: number | null };
      returnTabOnBack?: 'home' | 'projects' | 'chat' | 'profile' | 'new' | 'appointments' | 'notifications' | 'wallet' | 'chatbot';
    }) => {
      setShowProfile(false);
      openInHomeShell({
        tab: args.tab,
        returnTabOnBack: args.returnTabOnBack,
        embeddedChat: args.embeddedChat,
        embeddedProjects: args.embeddedProjects,
      });
      navigate('home', { replaceCurrent: true });
    },
    [navigate, openInHomeShell, setShowProfile]
  );

  const handleNotificationTap = useCallback(
    async (raw: any) => {
      // Ensure notification-triggered routing uses the new loader too.
      showTransitionLoader();

      const data = raw?.data ?? raw ?? {};
      console.log('🔔 [handleNotificationTap] called with data:', JSON.stringify(data, null, 2));

      if (!authToken) {
        console.log('🔔 [handleNotificationTap] No auth token — storing for later replay');
        pendingNotificationTapRef.current = data;
        navigate('login', { replace: true });
        return;
      }

      // ── Normalize every ID the backend may send ──────────────────────────
      // Backend NotificationService.java FCM data keys:
      //   notificationType, projectId, phaseId, bidId/offerId,
      //   appointmentId, timeRequestId, ticketId, requestId,
      //   roomId, otherUserId/otherUserName, fromUserId/fromUserName
      // The REST /notifications/my-notifications response uses:
      //   relatedProjectId, relatedPhaseId, relatedBidId, relatedAppointmentId,
      //   relatedTimeRequestId, relatedSupportTicketId, relatedChatRoomId, actionUrl

      const typeUpper = String(
        data?.notificationType ?? data?.type ?? data?.notification_type ?? data?.category ?? ''
      ).toUpperCase().trim();

      const actionUrl: string | undefined =
        data?.actionUrl ?? data?.action_url ?? data?.url ?? data?.link;

      const num = (v: unknown): number | null => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      const str = (v: unknown): string | null => {
        if (v == null) return null;
        const s = String(v).trim();
        return s.length > 0 ? s : null;
      };

      const projectId =
        num(data?.projectId) ?? num(data?.project_id) ??
        num(data?.relatedProjectId) ?? num(data?.related_project_id);

      const phaseId =
        num(data?.phaseId) ?? num(data?.phase_id) ??
        num(data?.relatedPhaseId) ?? num(data?.related_phase_id);

      const bidId =
        num(data?.bidId) ?? num(data?.bid_id) ??
        num(data?.offerId) ?? num(data?.offer_id) ??
        num(data?.relatedBidId) ?? num(data?.related_bid_id);

      const appointmentId =
        num(data?.appointmentId) ?? num(data?.appointment_id) ??
        num(data?.relatedAppointmentId) ?? num(data?.related_appointment_id);

      const timeRequestId =
        num(data?.timeRequestId) ?? num(data?.time_request_id) ??
        num(data?.relatedTimeRequestId) ?? num(data?.related_time_request_id);

      // Backend Notification entity has NO `relatedSupportTicketId` column. For ticket
      // notifications (SLA, escalation, etc.), the ticket id exists only in the FCM push
      // payload (`ticketId`) or embedded in the text ("Ticket #5 …" / "تذكرة #5 …").
      // When the notification comes from the REST list, we fall back to parsing the text.
      const parseTicketIdFromText = (text: unknown): number | null => {
        if (typeof text !== 'string') return null;
        const m = text.match(/(?:ticket|تذكرة)\s*#(\d+)/i);
        if (!m) return null;
        const id = Number(m[1]);
        return Number.isFinite(id) && id > 0 ? id : null;
      };

      const isTicketType = typeUpper.includes('TICKET') || typeUpper.includes('SLA_') || typeUpper === 'LOW_CSAT_ALERT' || typeUpper === 'CSAT_SURVEY';

      const ticketId =
        num(data?.ticketId) ?? num(data?.ticket_id) ??
        num(data?.relatedSupportTicketId) ?? num(data?.related_support_ticket_id) ??
        num(data?.supportTicketId) ?? num(data?.support_ticket_id) ??
        (isTicketType
          ? (parseTicketIdFromText(data?.title) ?? parseTicketIdFromText(data?.titleEn) ??
             parseTicketIdFromText(data?.message) ?? parseTicketIdFromText(data?.messageEn))
          : null);

      const requestId =
        num(data?.requestId) ?? num(data?.request_id) ??
        num(data?.relatedSmallTaskRequestId) ?? num(data?.related_small_task_request_id);

      const roomId: string | null =
        str(data?.roomId) ?? str(data?.room_id) ??
        str(data?.relatedChatRoomId) ?? str(data?.related_chat_room_id) ??
        str(data?.chatRoomId) ?? str(data?.chat_room_id) ??
        str(data?.chatRoomRoomId);

      const fromUserId = num(data?.fromUserId) ?? num(data?.from_user_id) ?? num(data?.otherUserId) ?? num(data?.other_user_id) ?? num(data?.senderId) ?? num(data?.sender_id);
      const fromUserName = str(data?.fromUserName) ?? str(data?.from_user_name) ?? str(data?.otherUserName) ?? str(data?.other_user_name) ?? str(data?.senderName) ?? str(data?.sender_name) ?? '';

      const smallTaskRequestId = tryParseSmallTaskRequestId(actionUrl) ?? (
        (typeUpper.includes('SMALL_TASK') || (typeof actionUrl === 'string' && actionUrl.startsWith('smalltask://')))
          ? requestId
          : null
      );

      console.log('🔔 [handleNotificationTap] typeUpper:', typeUpper, 'projectId:', projectId, 'ticketId:', ticketId, 'smallTaskRequestId:', smallTaskRequestId, 'requestId:', requestId, 'roomId:', roomId, 'actionUrl:', actionUrl);

      // ── 1. CHAT MESSAGE → open exact chat thread ────────────────────────
      if (typeUpper === 'MESSAGE' || typeUpper === 'CHAT_MESSAGE' || typeUpper === 'CHATMESSAGE') {
        console.log('🔔 → open exact chat thread');
        let resolvedRoomId = roomId;
        let receiverId = fromUserId ?? 0;
        let receiverName = fromUserName;
        let projectIdClean: number | null = projectId;

        if (!resolvedRoomId) resolvedRoomId = tryParseChatRoomIdFromActionUrl(actionUrl);
        if (!resolvedRoomId && receiverId > 0) {
          resolvedRoomId = await getOrCreateRoomId(receiverId);
        }

        if (!resolvedRoomId) {
          openHomeShellFromNotification({ tab: 'chat' });
          return;
        }

        if (receiverId <= 0 || !receiverName || projectIdClean == null) {
          try {
            const token = await storage.getAuthToken();
            if (token) {
              const { API_ENDPOINTS, buildApiUrl } = await import('./src/config/api');
              const url = buildApiUrl(API_ENDPOINTS.CHAT.MY_CHATS);
              const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
              if (res.ok) {
                const text = await res.text();
                const json = text && text.trim() !== '' ? JSON.parse(text) : null;
                const rooms = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.rooms) ? json.rooms : (Array.isArray(json?.chatRooms) ? json.chatRooms : [])));
                const hit = rooms.find((r: any) => String(r?.roomId ?? r?.room_id ?? '') === String(resolvedRoomId));
                if (hit) {
                  const rid = num(hit.otherUserId) ?? num(hit.other_user_id) ?? num(hit.receiverId) ?? num(hit.receiver_id);
                  if (rid) receiverId = rid;
                  const rn = str(hit.otherUserName) ?? str(hit.other_user_name) ?? str(hit.receiverName) ?? str(hit.receiver_name);
                  if (rn) receiverName = rn;
                  const pid = num(hit.projectId) ?? num(hit.project_id);
                  if (pid) projectIdClean = pid;
                }
              }
            }
          } catch (e) {
            console.warn('⚠️ resolve chat room meta failed:', (e as any)?.message ?? e);
          }
        }

        openHomeShellFromNotification({
          tab: 'chat',
          embeddedChat: { roomId: resolvedRoomId, receiverId, receiverName, projectId: projectIdClean },
        });
        return;
      }

      // ── 2. SUPPORT TICKET → open TicketDetailScreen ─────────────────────
      // Backend sends `ticketId` for: SLA_BREACH, SLA_WARNING, TICKET_ESCALATED,
      // TICKET_CREATED, TICKET_MESSAGE_RECEIVED, TICKET_STATUS_CHANGED,
      // TICKET_ASSIGNED, TICKET_CLOSED, TICKET_REOPENED, LOW_CSAT_ALERT, etc.
      if (ticketId) {
        console.log('🔔 → open ticket detail', ticketId);
        setSelectedTicketId(ticketId);
        returnHomeTabOnBackRef.current = 'notifications';
        navigate('ticketDetail');
        return;
      }
      if (isTicketType) {
        console.log('🔔 → ticket-related notification without id → ticket list');
        returnHomeTabOnBackRef.current = 'notifications';
        navigate('ticketList');
        return;
      }

      // ── 3. SUPPORT CHAT REQUEST → open SupportChatScreen ────────────────
      // Backend sends `requestId` + `notificationType: SUPPORT_REQUEST_CREATED/ASSIGNED`
      // and `actionUrl: support://request/<id>`.
      if (typeUpper === 'SUPPORT_REQUEST_CREATED' || typeUpper === 'SUPPORT_REQUEST_ASSIGNED' ||
          (typeof actionUrl === 'string' && actionUrl.startsWith('support://request/'))) {
        console.log('🔔 → support chat request', requestId);
        navigate('supportChat');
        return;
      }

      // ── 4. SMALL TASK → open small task detail inside Projects tab ──────
      // Backend sends `requestId` + `actionUrl: smalltask://request/<id>` for
      // SMALL_TASK_REQUEST, bid notifications, assignment, completion, payment, etc.
      if (smallTaskRequestId) {
        console.log('🔔 → small task', smallTaskRequestId);
        openHomeShellFromNotification({
          tab: 'projects',
          returnTabOnBack: 'notifications',
          embeddedProjects: {
            initialSmallTask: { id: smallTaskRequestId },
            initialProjectType: 'small',
          },
        });
        return;
      }

      // ── 5. APPOINTMENT / TIME REQUEST → open appointments tab ───────────
      if (typeUpper.includes('APPOINTMENT') || typeUpper.includes('TIME_REQUEST')) {
        console.log('🔔 → appointments tab');
        openHomeShellFromNotification({ tab: 'appointments' });
        return;
      }

      // ── 5b. PROFILE-RELATED NOTIFICATIONS → open Profile tab ─────────────
      // Examples from backend NotificationType: ACCOUNT_*, PASSWORD_RESET_SUCCESS,
      // SUBSCRIPTION_*, SUGGESTION_*, ADMIN_REQUEST.
      if (
        typeUpper.includes('ACCOUNT_') ||
        typeUpper.includes('PASSWORD') ||
        typeUpper.includes('SUBSCRIPTION_') ||
        typeUpper.includes('SUGGESTION_') ||
        typeUpper === 'ADMIN_REQUEST'
      ) {
        // Deep-link to the most relevant profile sub-screen.
        // Note: backend doesn't always send an explicit actionUrl for these types.
        let subView: ProfileSubviewForChatbot = 'myData';
        if (typeUpper.includes('SUBSCRIPTION_')) subView = 'subscription';
        else if (typeUpper.includes('SUGGESTION_')) subView = 'services';
        else if (typeUpper.includes('PASSWORD')) subView = 'changePassword';
        else if (typeUpper === 'ADMIN_REQUEST') subView = 'myData';
        else if (typeUpper.includes('ACCOUNT_')) subView = 'myData';

        console.log('🔔 → profile-related notification → profile subview', subView);
        bumpProfileNavFromChatbot(subView);
        openHomeShellFromNotification({ tab: 'profile', returnTabOnBack: 'notifications' });
        return;
      }

      // ── 6. PROJECT-RELATED → open project detail inside Projects tab ────
      // Handles: PROJECT_CREATED, PROJECT_ASSIGNED, BID_RECEIVED, BID_ACCEPTED,
      // BID_REJECTED, PROJECT_APPROVED, PHASE_*, PROJECT_COMPLETED, etc.
      if (projectId) {
        console.log('🔔 → fetching project', projectId);
        try {
          const { fetchProjectById } = await import('./src/services/ProjectService');
          const project = await fetchProjectById(projectId);
          console.log('🔔 fetchProjectById result:', project ? `id=${project.id} status=${project.status}` : 'null');
          if (project) {
            openHomeShellFromNotification({
              tab: 'projects',
              returnTabOnBack: 'notifications',
              embeddedProjects: { initialProject: project, initialProjectType: 'large' },
            });
            return;
          }
        } catch (e) {
          console.warn('⚠️ fetchProjectById failed:', (e as any)?.message ?? e);
        }
        openHomeShellFromNotification({
          tab: 'projects',
          returnTabOnBack: 'notifications',
          embeddedProjects: { initialProject: { id: projectId }, initialProjectType: 'large' },
        });
        return;
      }

      // ── 7. Fallback → notifications tab ─────────────────────────────────
      console.log('🔔 → fallback notifications tab');
      openHomeShellFromNotification({ tab: 'notifications' });
    },
    [authToken, navigate, openHomeShellFromNotification, showTransitionLoader]
  );

  // Replay a notification tap that happened before auth/session restore
  useEffect(() => {
    if (!authToken) return;
    if (!pendingNotificationTapRef.current) return;
    const pending = pendingNotificationTapRef.current;
    pendingNotificationTapRef.current = null;
    void handleNotificationTap({ data: pending });
  }, [authToken, handleNotificationTap]);

  // Native: navigate on notification tap (background/quit → open app)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!messaging) return;

    const unsub = messaging().onNotificationOpenedApp((remoteMessage: any) => {
      console.log('🔔 [Android] App opened from notification (background)');
      void handleNotificationTap(remoteMessage);
    });

    messaging()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (!remoteMessage) return;
        console.log('🔔 [Android] App opened from notification (quit)');
        void handleNotificationTap(remoteMessage);
      })
      .catch((e: any) => {
        console.warn('⚠️ [Android] getInitialNotification failed:', e?.message ?? e);
      });

    return () => {
      try {
        unsub?.();
      } catch {
        // ignore
      }
    };
  }, [handleNotificationTap]);

  const getChatbotAndroidDeps = useCallback((): ChatbotAndroidNavDeps => {
    return {
      navigate,
      userRole,
      setShowProfile,
      setProjectsFilter,
      setProjectsBootstrap,
      setProjectsRemountKey,
      setChatRoomId,
      setChatReceiverId,
      setChatReceiverName,
      setViewTechnicianId,
      setSelectedProjectForDetail,
      setSelectedTicketId,
      bumpProfileNavFromChatbot,
      openHomeShellNav: openInHomeShell,
      onOpenSmallTaskInProjects: async (args) => {
        setShowProfile(false);
        openInHomeShell({
          tab: 'projects',
          embeddedProjects: {
            initialProjectType: 'small',
            initialSmallTask: args.mergedProject,
          },
        });
        navigate('home', { replaceCurrent: true });
      },
      setProjectsFilterState: (s) => {
        if (String(s?.projectTypeFilter || '').toLowerCase() !== 'small') return;
        const af = String(s?.activeFilter || 'all').toLowerCase().replace(/_/g, '-');
        if (af === 'pending') setProjectsFilter('available');
        else if (af === 'in-progress') setProjectsFilter('running');
        else if (af === 'completed') setProjectsFilter('completed');
        else setProjectsFilter('all');
      },
    };
  }, [
    navigate,
    userRole,
    setShowProfile,
    setProjectsFilter,
    setProjectsBootstrap,
    setProjectsRemountKey,
    setChatRoomId,
    setChatReceiverId,
    setChatReceiverName,
    setViewTechnicianId,
    setSelectedProjectForDetail,
    setSelectedTicketId,
    bumpProfileNavFromChatbot,
    openInHomeShell,
  ]);

  const onChatbotNavigateToScreen = useCallback(
    (screenName: string, params?: Record<string, unknown>) => {
      void handleChatbotNavigationAndroid(screenName, params, getChatbotAndroidDeps());
    },
    [getChatbotAndroidDeps]
  );

  const onChatbotNavigateToTab = useCallback(
    (tabName: string) => {
      handleChatbotTabAndroid(tabName, getChatbotAndroidDeps());
    },
    [getChatbotAndroidDeps]
  );

  // Pop stack so back goes to previous screen (e.g. Home → Create project → back → Home).
  const goBack = useCallback(() => {
    if (currentScreen === 'ticketDetail' && returnHomeTabOnBackRef.current) {
      const tab = returnHomeTabOnBackRef.current;
      returnHomeTabOnBackRef.current = null;
      setShowProfile(false);
      openInHomeShell({ tab });
      navigate('home', { replaceCurrent: true });
      return;
    }
    if (currentScreen === 'home' && showProfile) {
      setShowProfile(false);
      return;
    }
    if (screenStack.length <= 1) return;
    const current = screenStack[screenStack.length - 1];
    // Cleanup state tied to current screen before popping
    if ((current === 'pendingProject' || current === 'bidReceivedProject' || current === 'approvedProject' || current === 'contractSigningProject' || current === 'inProgressProject' || current === 'completedProject') && selectedProjectForDetail) setSelectedProjectForDetail(null);
    else if (current === 'changeRequestList' && changeRequestProjectId != null) { setChangeRequestProjectId(null); setPreviousScreenBeforeChangeRequests(null); }
    else if (current === 'changeRequestDetail' && changeRequestId != null) setChangeRequestId(null);
    else if (current === 'booking') { setBookingTechnician(null); setServiceProvidersBookingTechnician(null); setBookingProjectId(undefined); }
    else if (current === 'technicianProfile' && viewTechnicianId) setViewTechnicianId(null);
    else if (current === 'categorySubcategories') setSelectedCategory(null);
    else if (current === 'creationMethod' && selectedSubcategory) setSelectedSubcategory(null);
    else if (current === 'ticketDetail') setSelectedTicketId(0);
    else if (current === 'projects') setProjectsBootstrap(null);
    const newStack = screenStack.slice(0, -1);
    const prevScreen = newStack[newStack.length - 1];
    // Support Center is opened from Profile; header back sets showProfile — mirror that for hardware back.
    if (current === 'ticketList' && prevScreen === 'home') {
      setShowProfile(true);
    }
    setScreenStack(newStack);
    setCurrentScreen(prevScreen);
    if (Platform.OS === 'web' && router) {
      router.navigate(prevScreen);
    }
  }, [
    currentScreen,
    showProfile,
    screenStack,
    selectedProjectForDetail,
    changeRequestProjectId,
    changeRequestId,
    previousScreenBeforeChangeRequests,
    bookingTechnician,
    serviceProvidersBookingTechnician,
    viewTechnicianId,
    selectedCategory,
    selectedSubcategory,
    router,
    setProjectsBootstrap,
  ]);

  // Android hardware back button: pop the navigation stack.
  useEffect(() => {
    if (Platform.OS === 'web' || Platform.OS === 'ios') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentScreen === 'home' && showProfile) {
        setShowProfile(false);
        return true;
      }
      if (screenStack.length > 1) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [currentScreen, showProfile, screenStack.length, goBack]);

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <SafeAreaProvider>
        <PaperProvider>
          <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
            <StatusBar style="auto" />
            {/* Loading indicator will be shown here if needed */}
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <StatusBar style="auto" />

          {/* Global Web Header - Only on Login and Signup screens, and only on small web screens (< 1024px) */}
          {Platform.OS === 'web' && (currentScreen === 'login' || currentScreen === 'signup') && IS_SMALL_WEB && (
            <WebHeader
              currentScreen={currentScreen}
              onNavigateToHome={() => navigate('home')}
              onNavigateToOverview={() => navigate('overview')}
              onNavigateToLogin={() => navigate('login')}
              onLogout={handleLogout}
              isAuthenticated={!!authToken}
              userRole={userRole}
              showToggle={false}
              userType={overviewUserType}
              onToggleChange={setOverviewUserType}
            />
          )}

          {currentScreen === 'splash' && Platform.OS !== 'web' && (
            <SplashScreen
              onComplete={async () => {
                console.log('✅ SplashScreen onComplete called - checking session');
                // Onboarding/product-tour should NOT show just by opening the app.
                // Session restoration decides the correct next screen (login/home/tech flows).
                await checkSession();
              }}
              onNavigateToOverview={() => {
                console.log('🌐 SplashScreen onNavigateToOverview called - navigating to welcome');
                navigate('welcome');
              }}
            />
          )}

          {currentScreen === 'onboarding' && (
            <OnboardingScreen
              variant={userRole === 'technician' ? 'technician' : 'user'}
              onFinish={async () => {
                await storage.setOnboardingCompleted();
                const nextScreen = postOnboardingScreenRef.current;
                postOnboardingScreenRef.current = null;
                if (nextScreen) {
                  console.log('✅ Onboarding completed - navigating to:', nextScreen);
                  navigate(nextScreen, { replace: true });
                } else if (authToken) {
                  console.log('✅ Onboarding completed (authenticated) - navigating to home');
                  navigate('home', { replace: true });
                } else {
                  console.log('✅ Onboarding completed - navigating to login');
                  navigate('login', { replace: true });
                }
              }}
            />
          )}

          {currentScreen === 'welcome' && (
            <WelcomeScreen
              onComplete={() => navigate('overview')}
            />
          )}

          {currentScreen === 'overview' && (
            <OverviewScreen
              onNavigateToLogin={() => navigate('login')}
              onNavigateToDesign={() => navigate('roomDesign')}
              onNavigateToVoiceAI={() => navigate('voiceAI')}
              onNavigateToCostExplorer={() => navigate('costExplorer')}
              onNavigateToRoomVisualizer={() => navigate('roomVisualizer')}
              onNavigateToAskBonyadAI={() => navigate('askBonyadAI')}
              onNavigateToProjectsMap={() => navigate('projectsMap')}
              onNavigateToContact={() => navigate('contact')}
              onNavigateToAbout={() => navigate('about')}
              onNavigateToIntroToApp={() => navigate('introToApp')}
            />
          )}

          {currentScreen === 'about' && (
            <AboutScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'contact' && (
            <ContactScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'introToApp' && (
            <IntroToAppScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'voiceAI' && (
            <VoiceAIScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'costExplorer' && (
            <CostExplorerScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'roomVisualizer' && (
            <RoomVisualizerScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'askBonyadAI' && (
            <AskBonyadAIScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'chatbot' && (
            <ChatbotScreen
              onBack={goBack}
              userId={userId}
              userRole={userRole}
              onNavigateToTab={onChatbotNavigateToTab}
              onNavigateToScreen={onChatbotNavigateToScreen}
              onRequestLiveAgent={(subject, aiHistory) => {
                setChatbotSubject(subject);
                setChatbotAIHistory(aiHistory);
                navigate('supportChat');
              }}
            />
          )}

          {currentScreen === 'supportChat' && (
            <SupportChatScreen
              onBack={goBack}
              initialSubject={chatbotSubject}
              aiHistory={chatbotAIHistory}
            />
          )}

          {currentScreen === 'ticketList' && (
            <TicketListScreen
              onPressChat={() => navigate('chatRooms')}
              onPressInfo={() => navigate('about')}
              onPressNotifications={() => navigate('notifications')}
              onBack={() => {
                setShowProfile(true);
                goBack();
              }}
              onCreateTicket={() => navigate('createTicket')}
              onNavigateTab={(tab) => {
                if (tab === 'home') {
                  setShowProfile(false);
                  navigate('home', { replaceCurrent: true });
                } else if (tab === 'projects') {
                  setShowProfile(false);
                  navigate('projects');
                } else if (tab === 'chat') {
                  setShowProfile(false);
                  navigate('chatRooms');
                } else if (tab === 'profile') {
                  setShowProfile(true);
                  goBack();
                }
              }}
              onTicketPress={(ticket) => {
                setSelectedTicketId(ticket.id);
                navigate('ticketDetail');
              }}
            />
          )}

          {currentScreen === 'createTicket' && (
            <CreateTicketScreen
              onBack={goBack}
              onSuccess={() => navigate('ticketList', { replaceCurrent: true })}
            />
          )}

          {currentScreen === 'serviceProviders' && (
            <ServiceProvidersScreen
              onBack={goBack}
              onNavigateToProfile={(technicianId) => {
                setViewTechnicianId(technicianId);
                navigate('technicianProfile');
              }}
              onBook={(technicianId, technicianName) => {
                setServiceProvidersBookingTechnician({ id: technicianId, name: technicianName });
                navigate('booking');
              }}
            />
          )}

          {currentScreen === 'commissionPayment' && (
            <CommissionPaymentScreen
              onBack={goBack}
              onNavigateToCheckout={(request, description) => {
                setCheckoutRequest(request);
                setCheckoutDescription(description);
                navigate('paymentCheckout');
              }}
            />
          )}

          {currentScreen === 'paymentCheckout' && checkoutRequest && (
            <PaymentCheckoutScreen
              checkoutRequest={checkoutRequest}
              onBack={goBack}
              onSuccess={(transactionId) => {
                console.log('✅ Payment successful:', transactionId);
                navigate('home');
              }}
            />
          )}

          {currentScreen === 'ticketDetail' && (
            <TicketDetailScreen
              ticketId={selectedTicketId}
              onBack={goBack}
            />
          )}

          {currentScreen === 'projectsMap' && (
            <ProjectsMapScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'roomDesign' && (
            <RoomDesignScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'login' && (
            <LoginScreen
              onNavigateToSignup={() => navigate('signup')}
              onNavigateToForgotPassword={() => navigate('forgotPassword')}
              onLoginSuccess={handleLoginSuccess}
              onNavigateToOTP={handleNavigateToOTP}
              onNavigateToOverview={() => navigate('overview')}
            />
          )}

          {currentScreen === 'signup' && (
            <SignupScreen
              onNavigateToLogin={() => navigate('login')}
              onNavigateToOTP={handleNavigateToOTP}
              onNavigateToOverview={() => navigate('overview')}
            />
          )}

          {/* OTP Verification Popup - shown on top of login/signup */}
          <OTPVerificationScreen
            visible={showOTPPopup}
            phoneNumber={phoneNumber}
            role={userRole}
            onVerificationSuccess={handleOTPVerificationSuccess}
            onClose={() => setShowOTPPopup(false)}
          />

          {currentScreen === 'technicianOnboarding' && (
            <TechnicianOnboardingScreen
              token={authToken}
              userId={userId}
              onFinished={async () => {
                presenceService.markOnline().catch(() => {});
                const hasSeenTour = await storage.hasSeenOnboarding();
                if (!hasSeenTour && Platform.OS !== 'web') {
                  console.log('📍 Technician setup done - showing product tour before home');
                  postOnboardingScreenRef.current = 'home';
                  navigate('onboarding');
                } else {
                  navigate('home');
                }
              }}
            />
          )}

          {currentScreen === 'technicianCompleteProfile' && (
            <TechnicianCompleteProfileScreen
              authToken={authToken}
              userId={userId}
              onSuccess={async () => {
                console.log('✅ Tech Profile Complete - Checking technician status...');
                try {
                  const technicianStatus = await getTechnicianStatus();
                  if (technicianStatus.status === 'WAITING_ADMIN_APPROVAL' || technicianStatus.status === 'PENDING' || technicianStatus.recommendedPage === 'WAITING_APPROVAL') {
                    navigate('waitingApproval');
                    return;
                  }
                  if (technicianStatus.status === 'REJECTED') {
                    navigate('waitingApproval');
                    return;
                  }
                  if (technicianStatus.status === 'APPROVED' && !technicianStatus.onboarded) {
                    try {
                      const status = await getOnboardingStatus(authToken, userId);
                      if (status && !status.completed) {
                        const nextStep = status.currentStep && status.currentStep >= 1 && status.currentStep <= 4 ? status.currentStep : 1;
                        await onboardingStorage.set('currentStep', String(nextStep));
                      } else {
                        await onboardingStorage.clear();
                      }
                    } catch (e) {
                      console.warn('⚠️ Failed to fetch onboarding status:', e);
                    }
                    navigate('technicianOnboarding');
                    return;
                  }
                  navigate('home');
                } catch (err: unknown) {
                  console.warn('⚠️ getTechnicianStatus failed after complete profile:', err);
                  navigate('waitingApproval');
                }
              }}
            />
          )}

          {currentScreen === 'waitingApproval' && (
            <WaitingApprovalScreen
              onApproved={async () => {
                try {
                  const technicianStatus = await getTechnicianStatus();
                  if (technicianStatus.status === 'APPROVED' && !technicianStatus.onboarded) {
                    try {
                      const status = await getOnboardingStatus(authToken, userId);
                      if (status && !status.completed) {
                        const nextStep = status.currentStep && status.currentStep >= 1 && status.currentStep <= 4 ? status.currentStep : 1;
                        await onboardingStorage.set('currentStep', String(nextStep));
                      } else {
                        await onboardingStorage.clear();
                      }
                    } catch (e) {
                      console.warn('⚠️ Failed to fetch onboarding status:', e);
                    }
                    navigate('technicianOnboarding');
                    return;
                  }
                  navigate('home');
                } catch (err: unknown) {
                  if (isTechnicianWaitingScreenApiError(err)) {
                    return;
                  }
                  console.warn('⚠️ getTechnicianStatus failed on approval:', err);
                  navigate('home');
                }
              }}
              onBack={goBack}
              onLogout={handleLogout}
            />
          )}

          {currentScreen === 'forgotPassword' && (
            <ForgotPasswordScreen
              onBack={goBack}
              onOTPSent={(phone, role) => {
                setForgotPasswordPhone(phone);
                setForgotPasswordRole(role);
                navigate('otpVerification');
              }}
            />
          )}

          {currentScreen === 'otpVerification' && (
            <ForgotPasswordOTPScreen
              phoneNumber={forgotPasswordPhone}
              role={forgotPasswordRole}
              onBack={goBack}
              onOTPVerified={(otpCode) => {
                setForgotPasswordOTP(otpCode);
                navigate('resetPassword');
              }}
            />
          )}

          {currentScreen === 'resetPassword' && (
            <ResetPasswordScreen
              phoneNumber={forgotPasswordPhone}
              role={forgotPasswordRole}
              otpCode={forgotPasswordOTP}
              onBack={goBack}
              onPasswordReset={() => {
                // Reset forgot password state
                setForgotPasswordPhone('');
                setForgotPasswordRole('USER');
                setForgotPasswordOTP('');
                // Navigate to login
                navigate('login');
              }}
            />
          )}

          {currentScreen === 'home' && (
            <>
              {userRole === 'user' ? (
                <CoachMarkProvider>
                  <UserHomeScreen
                    onLogout={handleLogout}
                    onShowProfile={() => setShowProfile(true)}
                    openProfileOnMount={showProfile}
                    profileNavFromChatbot={profileNavFromChatbot}
                    homeShellFromChatbot={homeShellFromChatbot}
                    onProfileTabClosed={() => setShowProfile(false)}
                    onRequestProject={() => navigate('newProject')}
                    onShowProjects={(filter) => {
                      setProjectsFilter(filter);
                    }}
                    onShowChat={() => { }}
                    onShowNotifications={() => navigate('notifications')}
                    onShowAppointments={() => { }}
                    onShowBooking={(technicianId, technicianName, projectId) => {
                      setBookingTechnician({ id: technicianId, name: technicianName });
                      if (projectId) {
                        setBookingProjectId(projectId);
                      }
                      navigate('booking');
                    }}
                    userId={userId}
                    authToken={authToken}
                    projectsFilter={projectsFilter}
                    onNavigateToChatDetail={(roomId, receiverId, receiverName) => {
                      setChatRoomId(roomId);
                      setChatReceiverId(receiverId);
                      setChatReceiverName(receiverName);
                      navigate('chatDetail');
                    }}
                    onNavigateToEditProfile={() => {
                      setShowProfile(true);
                      navigate('myData');
                    }}
                    onNavigateToPortfolio={() => {
                      setPortfolioReturnTo('home');
                      navigate('portfolio');
                    }}
                    onNavigateToSubscription={() => navigate('subscription')}
                    onNavigateToServices={() => navigate('services')}
                    onNavigateToAvailability={() => navigate('availability')}
                    onNavigateToTechnicianProfile={(technicianId) => {
                      setViewTechnicianId(technicianId);
                      navigate('technicianProfile');
                    }}
                    onNavigateToAIForm={() => navigate('aiForm')}
                    onNavigateToManualForm={() => navigate('manualForm')}
                    onChatbotNavigateToTab={onChatbotNavigateToTab}
                    onChatbotNavigateToScreen={onChatbotNavigateToScreen}
                    onChatbotRequestLiveAgent={(subject, aiHistory) => {
                      setChatbotSubject(subject);
                      setChatbotAIHistory(aiHistory);
                      navigate('supportChat');
                    }}
                    onShowSupportTickets={() => navigate('ticketList')}
                    onShowServiceProviders={() => navigate('serviceProviders')}
                    onPressCategory={(category) => {
                      setSelectedCategory(category);
                      navigate('categorySubcategories');
                    }}
                    onNavigateFromNotification={async (n) => {
                      await handleNotificationTap({ data: n });
                    }}
                  />
                </CoachMarkProvider>
              ) : (
                <CoachMarkProvider>
                  <TechnicianHomeScreen
                    onLogout={handleLogout}
                    onShowProfile={() => setShowProfile(true)}
                    openProfileOnMount={showProfile}
                    profileNavFromChatbot={profileNavFromChatbot}
                    homeShellFromChatbot={homeShellFromChatbot}
                    onProfileTabClosed={() => setShowProfile(false)}
                    onShowProjects={(filter) => {
                      setProjectsFilter(filter || 'available');
                      openInHomeShell({ tab: 'projects' });
                      navigate('home', { replaceCurrent: true });
                    }}
                    onShowRunningProjects={() => navigate('runningProjects')}
                    onShowChat={() => navigate('chatRooms')}
                    onShowNotifications={() => navigate('notifications')}
                    onShowAppointments={() => navigate('appointments')}
                    onChatbotNavigateToTab={onChatbotNavigateToTab}
                    onChatbotNavigateToScreen={onChatbotNavigateToScreen}
                    onChatbotRequestLiveAgent={(subject, aiHistory) => {
                      setChatbotSubject(subject);
                      setChatbotAIHistory(aiHistory);
                      navigate('supportChat');
                    }}
                    onShowSupportTickets={() => navigate('ticketList')}
                    onShowServiceProviders={() => navigate('serviceProviders')}
                    onShowCommissionPayment={() => navigate('commissionPayment')}
                    userId={userId}
                    authToken={authToken}
                    projectsFilter={projectsFilter}
                    onNavigateFromNotification={async (n) => {
                      await handleNotificationTap({ data: n });
                    }}
                  />
                </CoachMarkProvider>
              )}
            </>
          )}


          {currentScreen === 'myData' && (
            <MyDataScreen
              onBack={goBack}
              onEditProfile={() => navigate('editProfile')}
              onChangePhone={() => navigate('changePhone')}
              onChangePassword={() => navigate('changePassword')}
              onNavigateToSubscription={() => navigate('subscription')}
              onNavigateToServices={() => navigate('services')}
              onNavigateToAvailability={() => navigate('availability')}
              isTechnician={userRole === 'technician'}
            />
          )}

          {currentScreen === 'editProfile' && (
            <EditProfileScreen
              userDetails={{ role: userRole }}
              onBack={goBack}
              onSave={() => navigate('myData')}
            />
          )}

          {currentScreen === 'changePhone' && (
            <ChangePhoneScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'changePassword' && (
            <ChangePasswordScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'portfolio' && (
            <PortfolioScreen
              userId={userId.toString()}
              onBack={() => {
                if (portfolioReturnTo === 'profile') setShowProfile(true);
                setPortfolioReturnTo(null);
                goBack();
              }}
              onNavigateTab={(tab) => {
                setPortfolioReturnTo(null);
                if (tab === 'home') navigate('home', { replace: true });
                else if (tab === 'projects') navigate('projects');
                else if (tab === 'payments') navigate('commissionPayment');
                else if (tab === 'profile') {
                  setShowProfile(true);
                  navigate('home', { replace: true });
                }
              }}
              onEditProfile={() => navigate('editProfile')}
            />
          )}

          {currentScreen === 'projects' && (
            <ProjectsScreen
              key={projectsRemountKey}
              filter={projectsFilter}
              initialProjectType={projectsBootstrap?.initialProjectType}
              initialSmallTask={projectsBootstrap?.initialSmallTask}
              onBack={() => {
                setProjectsBootstrap(null);
                goBack();
              }}
              onOpenChat={(roomId, receiverId, receiverName) => {
                setChatRoomId(roomId);
                setChatReceiverId(receiverId);
                setChatReceiverName(receiverName);
                navigate('chatDetail');
              }}
              onViewTechnician={(technicianId) => {
                setViewTechnicianId(technicianId);
                navigate('technicianProfile');
              }}
            />
          )}

          {currentScreen === 'runningProjects' && (
            <RunningProjectsScreen
              onBack={goBack}
              isTechnician={userRole === 'technician'}
              onShowProjectDetails={(project) => {
                if (!project) return;
                const status = (project.status || '').toUpperCase().trim();
                const isTech = userRole === 'technician';
                const userHasBid = !!(project as { userHasBid?: boolean }).userHasBid;
                const isBiddingPhase =
                  status === 'PENDING' ||
                  status === 'BID_RECEIVED' ||
                  (status.includes('BID') && status.includes('RECEIVED'));
                setSelectedProjectForDetail(project);
                if (isTech && isBiddingPhase) {
                  setCurrentScreen(userHasBid ? 'bidReceivedProject' : 'pendingProject');
                } else if (status === 'PENDING') {
                  setCurrentScreen('pendingProject');
                } else if (status === 'BID_RECEIVED' || (status.includes('BID') && status.includes('RECEIVED'))) {
                  setCurrentScreen('bidReceivedProject');
                } else if (status === 'APPROVED' || status === 'PHASE_PLANNING' || status === 'PHASE_PLANNING_APPROVED') {
                  setCurrentScreen('approvedProject');
                } else if (status === 'CONTRACT_SIGNING') {
                  setCurrentScreen('contractSigningProject');
                } else if (status === 'IN_PROGRESS') {
                  setCurrentScreen('inProgressProject');
                } else if (status === 'COMPLETED') {
                  setCurrentScreen('completedProject');
                } else {
                  setCurrentScreen('inProgressProject');
                }
              }}
              onOpenChat={(roomId, receiverId, receiverName) => {
                setChatRoomId(roomId);
                setChatReceiverId(receiverId);
                setChatReceiverName(receiverName);
                navigate('chatDetail');
              }}
            />
          )}

          {/* Project status screens (from Running Projects or direct nav – same flow as web) */}
          {currentScreen === 'pendingProject' && selectedProjectForDetail && (
            <PendingProjectScreen
              project={selectedProjectForDetail}
              isTechnician={userRole === 'technician'}
              onBack={goBack}
              onSuccess={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
            />
          )}
          {currentScreen === 'bidReceivedProject' && selectedProjectForDetail && (
            <BidReceivedProjectScreen
              project={selectedProjectForDetail}
              isTechnician={userRole === 'technician'}
              onBack={goBack}
              onSuccess={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
              onOpenChat={(roomId, receiverId, receiverName) => {
                setChatRoomId(roomId);
                setChatReceiverId(receiverId);
                setChatReceiverName(receiverName);
                setSelectedProjectForDetail(null);
                setCurrentScreen('chatDetail');
              }}
            />
          )}
          {currentScreen === 'approvedProject' && selectedProjectForDetail && (
            <ApprovedProjectScreen
              project={selectedProjectForDetail}
              onBack={goBack}
              onSuccess={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
              onProceedToContract={() => setCurrentScreen('contractSigningProject')}
              onOpenChat={(roomId, receiverId, receiverName) => {
                setChatRoomId(roomId);
                setChatReceiverId(receiverId);
                setChatReceiverName(receiverName);
                setCurrentScreen('chatDetail');
              }}
              onNavigateToChangeRequests={(projectId) => {
                setChangeRequestProjectId(projectId);
                setPreviousScreenBeforeChangeRequests(currentScreen);
                setCurrentScreen('changeRequestList');
              }}
            />
          )}
          {currentScreen === 'contractSigningProject' && selectedProjectForDetail && (
            <ContractSigningProjectScreen
              project={selectedProjectForDetail}
              isTechnician={userRole === 'technician'}
              onBack={goBack}
              onSuccess={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
            />
          )}
          {currentScreen === 'inProgressProject' && selectedProjectForDetail && (
            <InProgressProjectScreen
              project={selectedProjectForDetail}
              isTechnician={userRole === 'technician'}
              onBack={goBack}
              onOpenChat={(roomId, receiverId, receiverName) => {
                setChatRoomId(roomId);
                setChatReceiverId(receiverId);
                setChatReceiverName(receiverName);
                setCurrentScreen('chatDetail');
              }}
              onSuccess={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
              onNavigateToChangeRequests={(projectId) => {
                setChangeRequestProjectId(projectId);
                setPreviousScreenBeforeChangeRequests(currentScreen);
                setCurrentScreen('changeRequestList');
              }}
            />
          )}
          {currentScreen === 'completedProject' && selectedProjectForDetail && (
            <CompletedProjectViewPage
              project={selectedProjectForDetail}
              onBack={goBack}
              onSuccess={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
              onViewAllProjects={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
              onStartNewProject={() => { setSelectedProjectForDetail(null); setCurrentScreen('newProject'); }}
            />
          )}

          {/* Change request screens */}
          {currentScreen === 'changeRequestList' && changeRequestProjectId != null && (
            <ChangeRequestListScreen
              projectId={changeRequestProjectId}
              onBack={goBack}
              onViewDetail={(id) => {
                setChangeRequestId(id);
                setCurrentScreen('changeRequestDetail');
              }}
              onCreateRequest={() => setCurrentScreen('requestModification')}
            />
          )}
          {currentScreen === 'changeRequestDetail' && changeRequestId != null && changeRequestProjectId != null && (
            <ChangeRequestDetailScreen
              changeRequestId={changeRequestId}
              projectId={changeRequestProjectId}
              onBack={goBack}
              onSuccess={() => {}}
            />
          )}
          {currentScreen === 'requestModification' && changeRequestProjectId != null && (
            <RequestModificationScreen
              projectId={changeRequestProjectId}
              onBack={goBack}
              onSuccess={() => {}}
            />
          )}

          {currentScreen === 'services' && (
            <ServiceManagementScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'availability' && (
            <AvailabilityScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'subscription' && (
            <SubscriptionScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'newProject' && (
            <NewProjectView
              onNavigateToAI={() => navigate('aiForm')}
              onNavigateToManual={() => navigate('manualForm')}
              onBack={goBack}
            />
          )}

          {currentScreen === 'manualForm' && (
            <ManualProjectForm
              onBack={goBack}
              onSuccess={() => {
                navigate('home', { replace: true });
                globalAlertManager.showSuccess('Project submitted successfully!', 'Success');
              }}
            />
          )}

          {currentScreen === 'aiForm' && (
            <ConversationalAIForm
              onBack={goBack}
              onSuccess={() => {
                navigate('home', { replace: true });
                globalAlertManager.showSuccess('Project generated and submitted successfully!', 'Success');
              }}
            />
          )}

          {currentScreen === 'categorySubcategories' && selectedCategory && (
            <CategorySubcategoryScreen
              category={selectedCategory}
              onBack={() => {
                setSelectedCategory(null);
                navigate('home');
              }}
              onSelectSubcategory={(subcategory) => {
                setSelectedSubcategory({
                  id: subcategory.id,
                  nameEn: subcategory.nameEn,
                  nameAr: subcategory.nameAr,
                });
                navigate('creationMethod');
              }}
            />
          )}

          {currentScreen === 'creationMethod' && selectedCategory && selectedSubcategory && (
            <CreationMethodScreen
              category={selectedCategory}
              subcategory={selectedSubcategory}
              onBack={goBack}
              onChooseAI={(category, subcategory) => {
                navigate('aiForm');
              }}
              onChooseManual={(category, subcategory) => {
                navigate('manualForm');
              }}
            />
          )}

          {currentScreen === 'chatRooms' && (
            <ChatRoomsListScreen
              onBack={goBack}
              onOpenChat={(roomId, receiverId, receiverName) => {
                setChatRoomId(roomId);
                setChatReceiverId(receiverId);
                setChatReceiverName(receiverName);
                navigate('chatDetail');
              }}
            />
          )}

          {currentScreen === 'chatDetail' && chatRoomId && (
            <ChatDetailScreen
              roomId={chatRoomId}
              receiverId={chatReceiverId}
              receiverName={chatReceiverName}
              onBack={goBack}
            />
          )}

          {currentScreen === 'notifications' && (
            <NotificationsScreen
              onBack={goBack}
              onNavigateFromNotification={async (n) => {
                await handleNotificationTap({ data: n });
              }}
            />
          )}

          {currentScreen === 'appointments' && (
            <AppointmentsScreen
              onBack={goBack}
            />
          )}

          {currentScreen === 'booking' && (bookingTechnician || serviceProvidersBookingTechnician) && (
            <BookingScreen
              technicianId={(bookingTechnician || serviceProvidersBookingTechnician)?.id}
              technicianName={(bookingTechnician || serviceProvidersBookingTechnician)?.name}
              projectId={bookingProjectId}
              onBack={() => {
                goBack();
                setBookingTechnician(null);
                setServiceProvidersBookingTechnician(null);
                setBookingProjectId(undefined);
              }}
              onSuccess={() => {
                // Refresh appointments or show success message
                console.log('✅ Booking successful');
              }}
            />
          )}

          {currentScreen === 'technicianProfile' && viewTechnicianId && (
            <TechnicianProfileViewScreen
              technicianId={viewTechnicianId}
              onBack={() => {
                goBack();
                setViewTechnicianId(null);
              }}
              onBooking={(technicianId, technicianName) => {
                setBookingTechnician({ id: technicianId, name: technicianName });
                navigate('booking');
              }}
            />
          )}
        </View>
      </PaperProvider>

      {/* Notification Popup - Web only */}
      {Platform.OS === 'web' &&
        !(
          currentScreen === 'welcome' ||
          currentScreen === 'overview' ||
          currentScreen === 'introToApp' ||
          currentScreen === 'onboarding' ||
          currentScreen === 'login' ||
          currentScreen === 'signup' ||
          currentScreen === 'otpVerification' ||
          currentScreen === 'forgotPassword' ||
          currentScreen === 'resetPassword'
        ) && (
        <NotificationPopup
          notification={currentNotification}
          visible={showNotificationPopup}
          onClose={() => {
            setShowNotificationPopup(false);
            setCurrentNotification(null);
          }}
          onPress={() => {
            // Navigate to notification screen or related content
            if (currentNotification?.relatedProjectId) {
              navigate('projects');
            } else if (currentNotification?.relatedAppointmentId) {
              navigate('appointments');
            } else {
              navigate('notifications');
            }
          }}
        />
      )}

      {/* Global transition loader overlay (web-only) */}
      {Platform.OS === 'web' && isRouteTransitionLoading && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { zIndex: 9999 },
          ]}
        >
          <AnimatedLoadingScreen showMessage={false} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
