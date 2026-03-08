import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const validateAuth = async () => {
      // Skip check for public screens
      if (PUBLIC_SCREENS.includes(currentScreen)) {
        setIsCheckingAuth(false);
        return;
      }

      // Check if screen is protected
      if (!PROTECTED_SCREENS.includes(currentScreen)) {
        setIsCheckingAuth(false);
        return;
      }

      setIsCheckingAuth(true);

      try {
        // Check authentication using token validation
        const authResult = await checkAuthentication();
        
        if (authResult) {
          // User is authenticated - set auth state
          console.log('✅ User authenticated - allowing access to protected screen');
          console.log('   Onboarded:', authResult.onboarded);
          console.log('   Profile Complete:', authResult.profileComplete);
          
          setIsAuthenticated(true);
          setAuthToken(authResult.token);
          setUserId(authResult.userId);
          setUserRole(authResult.role.toLowerCase() as 'user' | 'technician');
          
          // Check if user needs to complete onboarding or profile
          const role = authResult.role.toLowerCase() as 'user' | 'technician';
          
          if (role === 'technician' && !authResult.onboarded) {
            // Technician needs to complete onboarding - force to onboarding screen
            console.log('📍 Technician not onboarded - redirecting to onboarding');
            if (currentScreen !== 'technicianOnboarding') {
              if (Platform.OS === 'web' && router) {
                router.navigate('technicianOnboarding');
              } else {
                setCurrentScreen('technicianOnboarding');
              }
            }
          } else if (role === 'technician' && authResult.onboarded && currentScreen === 'technicianOnboarding') {
            // Technician IS onboarded but somehow on onboarding screen - redirect to home
            console.log('📍 Technician already onboarded - leaving onboarding screen');
            if (Platform.OS === 'web' && router) {
              router.navigate('home');
            } else {
              setCurrentScreen('home');
            }
          } else if (!authResult.profileComplete) {
            // User/Technician needs to complete profile
            console.log('📍 Profile incomplete - redirecting to profile edit');
            if (currentScreen !== 'editProfile') {
              if (Platform.OS === 'web' && router) {
                router.navigate('editProfile');
              } else {
                setCurrentScreen('editProfile');
              }
            }
          }
          // Otherwise, allow access to the requested screen
        } else {
          // User is not authenticated - redirect to login
          console.log('❌ User not authenticated - redirecting to login');
          setIsAuthenticated(false);
          
          // Clear any invalid auth state
          setAuthToken('');
          setUserId(0);
          setUserRole('user');
          
          // Redirect to login
          if (Platform.OS === 'web' && router) {
            router.navigate('login');
          } else {
            setCurrentScreen('login');
          }
        }
      } catch (error) {
        console.error('❌ Auth guard error:', error);
        // On error, redirect to login for safety
        setIsAuthenticated(false);
        setAuthToken('');
        setUserId(0);
        setUserRole('user');
        
        if (Platform.OS === 'web' && router) {
          router.navigate('login');
        } else {
          setCurrentScreen('login');
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    validateAuth();
  }, [currentScreen, setCurrentScreen, router, setAuthToken, setUserId, setUserRole]);

  return { isCheckingAuth, isAuthenticated };
};
