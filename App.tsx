import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Platform, TouchableOpacity, ScrollView, AppState, Dimensions, Image } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { FontProvider } from './src/context/FontContext';
// Import API config early to ensure global fetch override is applied
import './src/config/api';
import { SplashScreen, WelcomeScreen, OverviewScreen, LoginScreen, SignupScreen, OTPVerificationScreen, ForgotPasswordScreen, ForgotPasswordOTPScreen, ResetPasswordScreen, UserHomeScreen, TechnicianHomeScreen, TechnicianOnboardingScreen, ProfileScreen, EditProfileScreen, MyDataScreen, ChangePhoneScreen, ChangePasswordScreen, PortfolioScreen, ServiceManagementScreen, AvailabilityScreen, SubscriptionScreen, NewProjectView, ManualProjectForm, ConversationalAIForm, ProjectsScreen, ChatRoomsListScreen, ChatDetailScreen, RunningProjectsScreen, NotificationsScreen, AppointmentsScreen, BookingScreen, TechnicianProfileViewScreen, RoomDesignScreen, VoiceAIScreen, CostExplorerScreen, RoomVisualizerScreen, AskBonyadAIScreen, ProjectsMapScreen, AboutScreen, ContactScreen, IntroToAppScreen, OnboardingScreen, TechnicianCompleteProfileScreen, ChatbotScreen, SupportChatScreen, TicketListScreen, CreateTicketScreen, TicketDetailScreen, ServiceProvidersScreen, CommissionPaymentScreen, PaymentCheckoutScreen, CategorySubcategoryScreen, CreationMethodScreen, PendingProjectScreen, BidReceivedProjectScreen, ApprovedProjectScreen, ContractSigningProjectScreen, InProgressProjectScreen, CompletedProjectViewPage, ChangeRequestListScreen, ChangeRequestDetailScreen, RequestModificationScreen } from './src/screens';
import './src/localization/i18n'; // Initialize i18n
import OnlineStatusService from './src/services/OnlineStatusService';
import { storage } from './src/utils/storage';
import CoachMarkProvider from './src/components/CoachMarkProvider';
import { coachMarksStorage } from './src/utils/coachMarks';
import { useRouter } from './src/utils/useRouter';
import * as SplashScreenNative from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import * as ScreenOrientation from 'expo-screen-orientation';
import WebHeader from './src/components/WebHeader';
import { useAuthGuard } from './src/hooks/useAuthGuard';
import WebSocketNotificationService from './src/services/WebSocketNotificationService';
import NotificationPopup from './src/components/NotificationPopup';
import { getOnboardingStatus } from './src/services/onboardingApi';
import onboardingStorage from './src/services/onboardingStorage';
import GlobalAlertProvider from './src/components/GlobalAlertProvider';
import { globalAlertManager } from './src/utils/globalAlertManager';
import { CreateCheckoutRequest } from './src/services/PaymentService';
// import * as Notifications from 'expo-notifications';
// import { registerForPushNotificationsAsync } from './src/utils/useFCMToken';

// Keep native splash screen visible while we show custom splash
SplashScreenNative.preventAutoHideAsync();

type Screen = 'splash' | 'onboarding' | 'welcome' | 'overview' | 'about' | 'contact' | 'introToApp' | 'login' | 'signup' | 'otp' | 'forgotPassword' | 'otpVerification' | 'resetPassword' | 'home' | 'profile' | 'editProfile' | 'myData' | 'changePhone' | 'changePassword' | 'portfolio' | 'services' | 'availability' | 'subscription' | 'newProject' | 'manualForm' | 'aiForm' | 'projects' | 'runningProjects' | 'chatRooms' | 'chatDetail' | 'notifications' | 'appointments' | 'booking' | 'technicianProfile' | 'technicianOnboarding' | 'technicianCompleteProfile' | 'roomDesign' | 'voiceAI' | 'costExplorer' | 'roomVisualizer' | 'askBonyadAI' | 'projectsMap' | 'chatbot' | 'supportChat' | 'ticketList' | 'createTicket' | 'ticketDetail' | 'serviceProviders' | 'commissionPayment' | 'paymentCheckout' | 'categorySubcategories' | 'creationMethod' | 'pendingProject' | 'bidReceivedProject' | 'approvedProject' | 'contractSigningProject' | 'inProgressProject' | 'completedProject' | 'changeRequestList' | 'changeRequestDetail' | 'requestModification';

export default function App() {
  const initialScreen: Screen = Platform.OS === 'web' ? 'welcome' : 'splash';
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialScreen);
  const [showProfile, setShowProfile] = useState(false);
  const [userRole, setUserRole] = useState<'user' | 'technician'>('user');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [userId, setUserId] = useState<number>(0);
  // Forgot password flow state
  const [forgotPasswordPhone, setForgotPasswordPhone] = useState('');
  const [forgotPasswordRole, setForgotPasswordRole] = useState<'USER' | 'TECHNICIAN'>('USER');
  const [forgotPasswordOTP, setForgotPasswordOTP] = useState('');
  const [expoPushToken, setExpoPushToken] = useState('');
  const [projectsFilter, setProjectsFilter] = useState<'available' | 'running' | 'completed'>('available');
  
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
  
  // Router hook for URL-based routing on web
  const router = useRouter(currentScreen, setCurrentScreen);

  // Check session function - used by both useEffect and SplashScreen
  const checkSession = useCallback(async () => {
    try {
      console.log('🔍 Checking for stored session and onboarding status...');

      // Check login count (onboarding only shows if count is 0)
      const loginCount = await storage.getLoginCount();
      const hasSeenOnboarding = await storage.hasSeenOnboarding();
      console.log('📱 Login count:', loginCount);
      console.log('📱 Has seen onboarding:', hasSeenOnboarding);

      // Only show onboarding for brand new users who have NEVER logged in or signed up
      if (loginCount === 0 && !hasSeenOnboarding) {
        console.log('📍 Brand new user - showing onboarding');
        setCurrentScreen('onboarding');
        return;
      }

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
            console.error('❌ Failed to connect WebSocket:', connectionResult.error);
          }
        }

        // Navigate based on onboarded and profileComplete status
        const role = authResult.role.toLowerCase() as 'user' | 'technician';

        if (role === 'technician') {
          if (!authResult.onboarded) {
            console.log('📍 Technician not onboarded - redirecting to onboarding');
            setCurrentScreen('technicianOnboarding');
          } else if (!authResult.profileComplete) {
            console.log('📍 Technician profile incomplete - redirecting to complete profile');
            setCurrentScreen('technicianCompleteProfile');
          } else {
            console.log('📍 Technician fully onboarded - going to home');
            setCurrentScreen('home');
          }
        } else {
          // User role
          if (!authResult.profileComplete) {
            console.log('📍 User profile incomplete - redirecting to profile edit');
            setCurrentScreen('editProfile');
          } else {
            console.log('📍 User profile complete - going to home');
            setCurrentScreen('home');
          }
        }
      } else {
        console.log('❌ No valid session found - user needs to login');
        // Clear any invalid auth state
        setAuthToken('');
        setUserId(0);
        setUserRole('user');
        // Navigate to login
        setCurrentScreen('login');
      }
    } catch (error) {
      console.error('❌ Error checking stored session:', error);
      // Clear session on error
      setAuthToken('');
      setUserId(0);
      setUserRole('user');
      // Navigate to login on error
      setCurrentScreen('login');
    }
  }, []);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        await SplashScreenNative.preventAutoHideAsync();

        await Font.loadAsync({
          // Sakkal Majalla font family - Primary app font (Arabic-friendly)
          // Download from: https://alfont.com/sakkal-majalla-arabic-font-download.html
          'SakkalMajalla': require('./assets/fonts/alfont_com_majalla.ttf'),
          'SakkalMajalla-Regular': require('./assets/fonts/alfont_com_majalla.ttf'),
          'SakkalMajalla-Bold': require('./assets/fonts/alfont_com_majalla.ttf'),
        });

        const localAssets = [
          require('./assets/user/IMG_4784.png'),
          require('./assets/user/IMG_4785.png'),
          require('./assets/user/IMG_4786.png'),
          require('./assets/technician_screenshots/IMG_4776.png'),
          require('./assets/technician_screenshots/IMG_4777.png'),
        ];

        await Asset.loadAsync(localAssets);

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

  const onLayoutRootView = useCallback(async () => {
    if (isAppReady) {
      await SplashScreenNative.hideAsync();
    }
  }, [isAppReady]);


  // Check for new notifications from API
  const checkForNewNotifications = async () => {
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

      if (response.ok) {
        const notifications = await response.json();

        // Filter for unread notifications
        const unreadNotifications = notifications.filter((n: any) => !n.read);

        // If we have unread notifications and haven't checked before, or there's a new one
        if (unreadNotifications.length > 0) {
          // Sort by ID descending to get the latest
          unreadNotifications.sort((a: any, b: any) => b.id - a.id);
          const latestNotification = unreadNotifications[0];

          // Check if this is a new notification (different from last checked)
          if (lastCheckedNotificationId.current === null || latestNotification.id > lastCheckedNotificationId.current) {
            console.log('📬 [App] New unread notification found:', latestNotification);

            // Only show popup if we haven't shown it for this notification yet
            if (currentNotification?.id !== latestNotification.id) {
              setCurrentNotification(latestNotification);
              setShowNotificationPopup(true);

              // Request browser notification permission and show notification (web only)
              if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
                if (Notification.permission === 'granted') {
                  new Notification(latestNotification.title, {
                    body: latestNotification.message,
                    icon: '/favicon.ico',
                  });
                } else if (Notification.permission === 'default') {
                  Notification.requestPermission().then((permission) => {
                    if (permission === 'granted') {
                      new Notification(latestNotification.title, {
                        body: latestNotification.message,
                        icon: '/favicon.ico',
                      });
                    }
                  });
                }
              }
            }

            // Update last checked ID
            lastCheckedNotificationId.current = latestNotification.id;
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to check for new notifications:', error);
      // Don't show error to user, just log it
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
  }, [authToken, userId]);

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

    // Call checkSession on mount (only on native, web goes directly to welcome)
    if (Platform.OS !== 'web') {
      checkSession();
    }
  }, [checkSession]);

  // Handle app lifecycle for WebSocket (Android only) and check notifications on active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      console.log('📱 AppState changed to:', nextAppState);

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background - disconnect WebSocket (Android only)
        if (Platform.OS === 'android') {
          console.log('📱 App entered background');
          if (OnlineStatusService.isConnected()) {
            console.log('🔌 Disconnecting WebSocket (background)...');
            await OnlineStatusService.disconnect();
          }
        }
      } else if (nextAppState === 'active' && authToken) {
        // App came to foreground - reconnect WebSocket if user is authenticated (Android only)
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

  const navigateToScreen = (screen: Screen) => {
    if (Platform.OS === 'web') {
      router.navigate(screen);
    } else {
      setCurrentScreen(screen);
    }
  };

  // Handle successful login
  const handleLoginSuccess = async (role: 'user' | 'technician', token: string, id: number) => {
    setUserRole(role);
    setAuthToken(token);
    setUserId(id);

    // Increment login count (for onboarding logic - tracks logins and signups)
    await storage.incrementLoginCount();

    let requiresOnboarding = false;

    if (role === 'technician') {
      try {
        const status = await getOnboardingStatus(token, id);
        if (status && !status.completed) {
          requiresOnboarding = true;
          const nextStep = status.currentStep && status.currentStep >= 1 && status.currentStep <= 4 ? status.currentStep : 1;
          await onboardingStorage.set('currentStep', String(nextStep));
        } else {
          await onboardingStorage.clear();
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch onboarding status:', error);
      }
    }

    // Connect to WebSocket for online status tracking
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
      console.error('❌ Failed to connect WebSocket:', connectionResult.error);
    }

    navigateToScreen(requiresOnboarding ? 'technicianOnboarding' : 'home');
  };

  // Handle showing OTP popup after signup
  const handleNavigateToOTP = (phone: string, role: 'user' | 'technician') => {
    setPhoneNumber(phone);
    setUserRole(role);
    setShowOTPPopup(true);
  };

  // Handle successful OTP verification
  const handleOTPVerificationSuccess = async (token: string, id: number, role: string, profileComplete?: boolean) => {
    setShowOTPPopup(false); // Close the OTP popup
    setAuthToken(token);
    setUserId(id);
    setUserRole(role.toLowerCase() as 'user' | 'technician');

    // Increment login count (for onboarding logic - tracks logins and signups)
    await storage.incrementLoginCount();

    // Check profile completion for technicians
    if (role.toLowerCase() === 'technician' && profileComplete === false) {
      console.log('📍 Technician profile incomplete - redirecting to complete profile');
      navigateToScreen('technicianCompleteProfile');
      return;
    }

    let requiresOnboarding = false;

    if (role.toLowerCase() === 'technician') {
      try {
        const status = await getOnboardingStatus(token, id);
        if (status && !status.completed) {
          requiresOnboarding = true;
          const nextStep = status.currentStep && status.currentStep >= 1 && status.currentStep <= 4 ? status.currentStep : 1;
          await onboardingStorage.set('currentStep', String(nextStep));
        } else {
          await onboardingStorage.clear();
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch onboarding status (signup):', error);
      }
    }

    // Connect to WebSocket for online status tracking
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
      console.error('❌ Failed to connect WebSocket:', connectionResult.error);
    }

    navigateToScreen(requiresOnboarding ? 'technicianOnboarding' : 'home');
  };

  // Handle logout with WebSocket disconnection
  const handleLogout = async () => {
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
          <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <AppContent
              currentScreen={currentScreen}
              setCurrentScreen={setCurrentScreen}
              router={router}
              showProfile={showProfile}
              setShowProfile={setShowProfile}
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
  router,
  showProfile,
  setShowProfile,
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

  // Helper function to navigate - uses router on web, setCurrentScreen on mobile
  const navigate = (screen: Screen) => {
    if (Platform.OS === 'web' && router) {
      router.navigate(screen);
    } else {
      setCurrentScreen(screen);
    }
  };

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
                // Check if user has ever logged in before
                const loginCount = await storage.getLoginCount();
                const hasSeenOnboarding = await storage.hasSeenOnboarding();

                // Only show onboarding for brand new users who have NEVER logged in or signed up
                if (loginCount === 0 && !hasSeenOnboarding) {
                  console.log('📍 Brand new user - showing onboarding');
                  setCurrentScreen('onboarding');
                } else {
                  // User has logged in before or seen onboarding, go to login
                  setCurrentScreen('login');
                }
              }}
              onNavigateToOverview={() => {
                console.log('🌐 SplashScreen onNavigateToOverview called - navigating to welcome');
                navigate('welcome');
              }}
            />
          )}

          {currentScreen === 'onboarding' && (
            <OnboardingScreen
              onFinish={async () => {
                console.log('✅ Onboarding completed - navigating to login');
                await storage.setOnboardingCompleted();
                navigate('login');
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
              onBack={() => navigate('overview')}
            />
          )}

          {currentScreen === 'contact' && (
            <ContactScreen
              onBack={() => navigate('overview')}
            />
          )}

          {currentScreen === 'introToApp' && (
            <IntroToAppScreen
              onBack={() => navigate('overview')}
            />
          )}

          {currentScreen === 'voiceAI' && (
            <VoiceAIScreen
              onBack={() => navigate('overview')}
            />
          )}

          {currentScreen === 'costExplorer' && (
            <CostExplorerScreen
              onBack={() => navigate('overview')}
            />
          )}

          {currentScreen === 'roomVisualizer' && (
            <RoomVisualizerScreen
              onBack={() => navigate('overview')}
            />
          )}

          {currentScreen === 'askBonyadAI' && (
            <AskBonyadAIScreen
              onBack={() => navigate('overview')}
            />
          )}

          {currentScreen === 'chatbot' && (
            <ChatbotScreen
              onBack={() => navigate('home')}
              onRequestLiveAgent={(subject, aiHistory) => {
                setChatbotSubject(subject);
                setChatbotAIHistory(aiHistory);
                navigate('supportChat');
              }}
            />
          )}

          {currentScreen === 'supportChat' && (
            <SupportChatScreen
              onBack={() => navigate('home')}
              initialSubject={chatbotSubject}
              aiHistory={chatbotAIHistory}
            />
          )}

          {currentScreen === 'ticketList' && (
            <TicketListScreen
              onBack={() => navigate('home')}
              onCreateTicket={() => navigate('createTicket')}
              onTicketPress={(ticket) => {
                setSelectedTicketId(ticket.id);
                navigate('ticketDetail');
              }}
            />
          )}

          {currentScreen === 'createTicket' && (
            <CreateTicketScreen
              onBack={() => navigate('ticketList')}
              onSuccess={() => navigate('ticketList')}
            />
          )}

          {currentScreen === 'serviceProviders' && (
            <ServiceProvidersScreen
              onBack={() => navigate('home')}
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
              onBack={() => navigate('home')}
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
              onBack={() => navigate('commissionPayment')}
              onSuccess={(transactionId) => {
                console.log('✅ Payment successful:', transactionId);
                navigate('home');
              }}
            />
          )}

          {currentScreen === 'ticketDetail' && (
            <TicketDetailScreen
              ticketId={selectedTicketId}
              onBack={() => navigate('ticketList')}
              onNavigateToChat={(roomId, adminName) => {
                setChatRoomId(roomId);
                setChatReceiverName(adminName);
                navigate('chatDetail');
              }}
            />
          )}

          {currentScreen === 'projectsMap' && (
            <ProjectsMapScreen
              onBack={() => navigate('overview')}
            />
          )}

          {currentScreen === 'roomDesign' && (
            <RoomDesignScreen
              onBack={() => navigate('overview')}
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
              onFinished={() => navigate('home')}
            />
          )}

          {currentScreen === 'technicianCompleteProfile' && (
            <TechnicianCompleteProfileScreen
              authToken={authToken}
              userId={userId}
              onSuccess={() => {
                console.log('✅ Tech Profile Complete - Going to Onboarding');
                navigate('technicianOnboarding');
              }}
            />
          )}

          {currentScreen === 'forgotPassword' && (
            <ForgotPasswordScreen
              onBack={() => navigate('login')}
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
              onBack={() => navigate('forgotPassword')}
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
              onBack={() => navigate('otpVerification')}
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

          {currentScreen === 'home' && !showProfile && (
            <>
              {userRole === 'user' ? (
                <CoachMarkProvider>
                  <UserHomeScreen
                    onLogout={handleLogout}
                    onShowProfile={() => setShowProfile(true)}
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
                    onNavigateToPortfolio={() => navigate('portfolio')}
                    onNavigateToSubscription={() => navigate('subscription')}
                    onNavigateToServices={() => navigate('services')}
                    onNavigateToAvailability={() => navigate('availability')}
                    onNavigateToTechnicianProfile={(technicianId) => {
                      setViewTechnicianId(technicianId);
                      navigate('technicianProfile');
                    }}
                    onNavigateToAIForm={() => navigate('aiForm')}
                    onNavigateToManualForm={() => navigate('manualForm')}
                    onShowChatbot={() => navigate('chatbot')}
                    onShowSupportTickets={() => navigate('ticketList')}
                    onShowServiceProviders={() => navigate('serviceProviders')}
                    onPressCategory={(category) => {
                      setSelectedCategory(category);
                      navigate('categorySubcategories');
                    }}
                  />
                </CoachMarkProvider>
              ) : (
                <CoachMarkProvider>
                  <TechnicianHomeScreen
                    onLogout={handleLogout}
                    onShowProfile={() => setShowProfile(true)}
                    onShowProjects={(filter) => {
                      setProjectsFilter(filter || 'available');
                      navigate('projects');
                    }}
                    onShowRunningProjects={() => navigate('runningProjects')}
                    onShowChat={() => navigate('chatRooms')}
                    onShowNotifications={() => navigate('notifications')}
                    onShowAppointments={() => navigate('appointments')}
                      onShowChatbot={() => navigate('chatbot')}
                      onShowSupportTickets={() => navigate('ticketList')}
                      onShowServiceProviders={() => navigate('serviceProviders')}
                      onShowCommissionPayment={() => navigate('commissionPayment')}
                      userId={userId}
                    authToken={authToken}
                    projectsFilter={projectsFilter}
                    onNavigateToChatDetail={(roomId, receiverId, receiverName) => {
                      setChatRoomId(roomId);
                      setChatReceiverId(receiverId);
                      setChatReceiverName(receiverName);
                      navigate('chatDetail');
                    }}
                  />
                </CoachMarkProvider>
              )}
            </>
          )}

          {currentScreen === 'home' && showProfile && (
            <ProfileScreen
              onLogout={handleLogout}
              onBack={() => setShowProfile(false)}
              onNavigateToEditProfile={() => navigate('myData')}
              onNavigateToPortfolio={() => navigate('portfolio')}
              onNavigateToSubscription={() => navigate('subscription')}
              onNavigateToServices={() => navigate('services')}
              onNavigateToAvailability={() => navigate('availability')}
              onNavigateToSupportTickets={() => {
                console.log('🎧 Navigating to Support Tickets...');
                setShowProfile(false);
                // Small delay to ensure profile modal closes before navigation
                setTimeout(() => {
                  navigate('ticketList');
                }, 100);
              }}
            />
          )}

          {currentScreen === 'myData' && (
            <MyDataScreen
              onBack={() => navigate('home')}
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
              onBack={() => navigate('myData')}
              onSave={() => navigate('myData')}
            />
          )}

          {currentScreen === 'changePhone' && (
            <ChangePhoneScreen
              onBack={() => navigate('myData')}
            />
          )}

          {currentScreen === 'changePassword' && (
            <ChangePasswordScreen
              onBack={() => navigate('myData')}
            />
          )}

          {currentScreen === 'portfolio' && (
            <PortfolioScreen
              userId={userId.toString()}
              onBack={() => navigate('home')}
            />
          )}

          {currentScreen === 'projects' && (
            <ProjectsScreen
              filter={projectsFilter}
              onBack={() => navigate('home')}
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
              onBack={() => navigate('home')}
              isTechnician={userRole === 'technician'}
              onShowProjectDetails={(project) => {
                if (!project) return;
                const status = (project.status || '').toUpperCase().trim();
                setSelectedProjectForDetail(project);
                if (status === 'PENDING') setCurrentScreen('pendingProject');
                else if (status === 'BID_RECEIVED' || (status.includes('BID') && status.includes('RECEIVED'))) setCurrentScreen('bidReceivedProject');
                else if (status === 'APPROVED' || status === 'PHASE_PLANNING' || status === 'PHASE_PLANNING_APPROVED') setCurrentScreen('approvedProject');
                else if (status === 'CONTRACT_SIGNING') setCurrentScreen('contractSigningProject');
                else if (status === 'IN_PROGRESS') setCurrentScreen('inProgressProject');
                else if (status === 'COMPLETED') setCurrentScreen('completedProject');
                else setCurrentScreen('inProgressProject');
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
              onBack={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
              onSuccess={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
            />
          )}
          {currentScreen === 'bidReceivedProject' && selectedProjectForDetail && (
            <BidReceivedProjectScreen
              project={selectedProjectForDetail}
              onBack={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
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
              onBack={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
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
              onBack={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
              onSuccess={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
            />
          )}
          {currentScreen === 'inProgressProject' && selectedProjectForDetail && (
            <InProgressProjectScreen
              project={selectedProjectForDetail}
              isTechnician={userRole === 'technician'}
              onBack={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
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
              onBack={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
              onSuccess={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
              onViewAllProjects={() => { setSelectedProjectForDetail(null); setCurrentScreen('runningProjects'); }}
              onStartNewProject={() => { setSelectedProjectForDetail(null); setCurrentScreen('newProject'); }}
            />
          )}

          {/* Change request screens */}
          {currentScreen === 'changeRequestList' && changeRequestProjectId != null && (
            <ChangeRequestListScreen
              projectId={changeRequestProjectId}
              onBack={() => {
                setChangeRequestProjectId(null);
                setCurrentScreen(previousScreenBeforeChangeRequests || 'runningProjects');
                setPreviousScreenBeforeChangeRequests(null);
              }}
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
              onBack={() => { setChangeRequestId(null); setCurrentScreen('changeRequestList'); }}
              onSuccess={() => {}}
            />
          )}
          {currentScreen === 'requestModification' && changeRequestProjectId != null && (
            <RequestModificationScreen
              projectId={changeRequestProjectId}
              onBack={() => setCurrentScreen('changeRequestList')}
              onSuccess={() => {}}
            />
          )}

          {currentScreen === 'services' && (
            <ServiceManagementScreen
              onBack={() => navigate('home')}
            />
          )}

          {currentScreen === 'availability' && (
            <AvailabilityScreen
              onBack={() => navigate('home')}
            />
          )}

          {currentScreen === 'subscription' && (
            <SubscriptionScreen
              onBack={() => navigate('home')}
            />
          )}

          {currentScreen === 'newProject' && (
            <NewProjectView
              onNavigateToAI={() => navigate('aiForm')}
              onNavigateToManual={() => navigate('manualForm')}
              onBack={() => navigate('home')}
            />
          )}

          {currentScreen === 'manualForm' && (
            <ManualProjectForm
              onBack={() => navigate('newProject')}
              onSuccess={() => {
                navigate('home');
                globalAlertManager.showSuccess('Project submitted successfully!', 'Success');
              }}
            />
          )}

          {currentScreen === 'aiForm' && (
            <ConversationalAIForm
              onBack={() => navigate('newProject')}
              onSuccess={() => {
                navigate('home');
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
              onBack={() => {
                setSelectedSubcategory(null);
                navigate('categorySubcategories');
              }}
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
              onBack={() => navigate('home')}
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
              onBack={() => navigate('chatRooms')}
            />
          )}

          {currentScreen === 'notifications' && (
            <NotificationsScreen
              onBack={() => navigate('home')}
            />
          )}

          {currentScreen === 'appointments' && (
            <AppointmentsScreen
              onBack={() => navigate('home')}
            />
          )}

          {currentScreen === 'booking' && (bookingTechnician || serviceProvidersBookingTechnician) && (
            <BookingScreen
              technicianId={(bookingTechnician || serviceProvidersBookingTechnician)?.id}
              technicianName={(bookingTechnician || serviceProvidersBookingTechnician)?.name}
              projectId={bookingProjectId}
              onBack={() => {
                navigate('home');
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
                navigate('home');
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
      {Platform.OS === 'web' && (
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
