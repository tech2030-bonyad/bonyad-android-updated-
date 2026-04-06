import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { checkAuthentication, AuthResult } from '../utils/authGuard';

type Screen = 'splash' | 'onboarding' | 'welcome' | 'overview' | 'about' | 'contact' | 'introToApp' | 'login' | 'signup' | 'otp' | 'forgotPassword' | 'otpVerification' | 'resetPassword' | 'home' | 'profile' | 'editProfile' | 'myData' | 'changePhone' | 'changePassword' | 'portfolio' | 'services' | 'availability' | 'subscription' | 'newProject' | 'manualForm' | 'aiForm' | 'projects' | 'runningProjects' | 'chatRooms' | 'chatDetail' | 'notifications' | 'appointments' | 'booking' | 'technicianProfile' | 'technicianOnboarding' | 'roomDesign' | 'voiceAI' | 'costExplorer' | 'roomVisualizer' | 'askBonyadAI' | 'projectsMap';

// Public screens that don't require authentication
const PUBLIC_SCREENS: Screen[] = [
  'splash',
  'welcome',
  'overview',
  'login',
  'signup',
  'otp',
  'forgotPassword',
  'otpVerification',
  'resetPassword',
  'about',
  'contact',
  'introToApp',
];

// Protected screens that require authentication
const PROTECTED_SCREENS: Screen[] = [
  'home',
  'profile',
  'editProfile',
  'myData',
  'changePhone',
  'changePassword',
  'portfolio',
  'services',
  'availability',
  'subscription',
  'newProject',
  'manualForm',
  'aiForm',
  'projects',
  'runningProjects',
  'chatRooms',
  'chatDetail',
  'notifications',
  'appointments',
  'booking',
  'technicianProfile',
  'technicianOnboarding',
  'roomDesign',
  'voiceAI',
  'costExplorer',
  'roomVisualizer',
  'askBonyadAI',
  'projectsMap',
];

/**
 * Custom hook to guard protected routes
 * Validates authentication and redirects based on auth status and user state
 */
export const useAuthGuard = (
  currentScreen: Screen,
  setCurrentScreen: (screen: Screen) => void,
  router: any,
  authToken: string,
  setAuthToken: (token: string) => void,
  setUserId: (id: number) => void,
  setUserRole: (role: 'user' | 'technician') => void,
) => {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!authToken);

  // Keep router in a ref so it's accessible inside the effect without being a dependency.
  // router's reference changes on every App render; adding it to the dep array would
  // re-trigger auth validation (and the loading flash) on every language toggle or
  // theme change — keeping it in a ref avoids that entirely.
  const routerRef = useRef(router);
  routerRef.current = router;

  // Track whether we've confirmed authentication at least once so we can skip the
  // loading-screen flash on subsequent screen transitions.
  const confirmedAuthRef = useRef(false);

  useEffect(() => {
    const validateAuth = async () => {
      // Skip check for public screens
      if (PUBLIC_SCREENS.includes(currentScreen)) {
        setIsCheckingAuth(false);
        return;
      }

      // Skip check for unrecognised screens
      if (!PROTECTED_SCREENS.includes(currentScreen)) {
        setIsCheckingAuth(false);
        return;
      }

      // Only show the loading overlay on the very first check (or if we've never
      // confirmed auth). Subsequent navigations between protected screens don't
      // need to flash a loader — the user is already inside the app.
      if (!confirmedAuthRef.current) {
        setIsCheckingAuth(true);
      }

      try {
        const authResult = await checkAuthentication();

        if (authResult) {
          console.log('✅ User authenticated - allowing access to protected screen');
          console.log('   Onboarded:', authResult.onboarded);
          console.log('   Profile Complete:', authResult.profileComplete);

          confirmedAuthRef.current = true;
          setIsAuthenticated(true);
          setAuthToken(authResult.token);
          setUserId(authResult.userId);
          setUserRole(authResult.role.toLowerCase() as 'user' | 'technician');

          const role = authResult.role.toLowerCase() as 'user' | 'technician';

          if (role === 'technician' && !authResult.onboarded) {
            console.log('📍 Technician not onboarded - redirecting to onboarding');
            if (currentScreen !== 'technicianOnboarding') {
              if (Platform.OS === 'web' && routerRef.current) {
                routerRef.current.navigate('technicianOnboarding');
              } else {
                setCurrentScreen('technicianOnboarding');
              }
            }
          } else if (role === 'technician' && authResult.onboarded && currentScreen === 'technicianOnboarding') {
            console.log('📍 Technician already onboarded - leaving onboarding screen');
            if (Platform.OS === 'web' && routerRef.current) {
              routerRef.current.navigate('home');
            } else {
              setCurrentScreen('home');
            }
          } else if (!authResult.profileComplete) {
            console.log('📍 Profile incomplete - redirecting to profile edit');
            if (currentScreen !== 'editProfile') {
              if (Platform.OS === 'web' && routerRef.current) {
                routerRef.current.navigate('editProfile');
              } else {
                setCurrentScreen('editProfile');
              }
            }
          }
        } else {
          console.log('❌ User not authenticated - redirecting to login');
          confirmedAuthRef.current = false;
          setIsAuthenticated(false);
          setAuthToken('');
          setUserId(0);
          setUserRole('user');

          if (Platform.OS === 'web' && routerRef.current) {
            routerRef.current.navigate('login');
          } else {
            setCurrentScreen('login');
          }
        }
      } catch (error) {
        console.error('❌ Auth guard error:', error);
        confirmedAuthRef.current = false;
        setIsAuthenticated(false);
        setAuthToken('');
        setUserId(0);
        setUserRole('user');

        if (Platform.OS === 'web' && routerRef.current) {
          routerRef.current.navigate('login');
        } else {
          setCurrentScreen('login');
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    validateAuth();
  // router intentionally excluded: it's accessed via routerRef so changes to its
  // reference (which happen on every parent render) don't retrigger auth checks.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, setCurrentScreen, setAuthToken, setUserId, setUserRole]);

  return { isCheckingAuth, isAuthenticated };
};
