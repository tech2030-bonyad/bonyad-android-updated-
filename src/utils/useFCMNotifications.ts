import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { remoteMessageDataToNotificationRaw } from './fcmNotificationPayload';
import { normalizeNotificationFromApi } from './normalizeNotificationPayload';
import type { Notification } from '../services/NotificationService';

const FCM_TOKEN_KEY = '@fcm_token';
const PENDING_NOTIFICATION_KEY = '@pending_notification';

// Global state
let isBackgroundHandlerRegistered = false;
let globalPendingNotification: Notification | null = null;

// Callbacks set by App component (like web's routeIncomingNotification)
let onFCMNotificationReceived: ((notification: Notification) => void) | null = null;
let onFCMNotificationTapped: ((notification: Notification) => void) | null = null;

/**
 * Set callback for when FCM notification is received (foreground)
 * This is like web's WebSocket notification callback
 */
export function setFCMNotificationCallbacks(
  onReceived: (notification: Notification) => void,
  onTapped: (notification: Notification) => void
) {
  onFCMNotificationReceived = onReceived;
  onFCMNotificationTapped = onTapped;
}

/**
 * 🔥 BACKGROUND MESSAGE HANDLER
 * This MUST be registered outside any component
 */
export const registerBackgroundMessageHandler = () => {
  if (isBackgroundHandlerRegistered || Platform.OS === 'web') return;
  
  try {
    import('@react-native-firebase/messaging').then((module) => {
      const messaging = module.default;
      
      console.log('[🔔 FCM] Registering background message handler...');
      
      messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
        console.log('[🔔 FCM] ========== BACKGROUND MESSAGE HANDLER ==========');
        
        try {
          const rawData = remoteMessageDataToNotificationRaw(remoteMessage);
          const notification = normalizeNotificationFromApi(rawData);
          
          await AsyncStorage.setItem(PENDING_NOTIFICATION_KEY, JSON.stringify(notification));
          globalPendingNotification = notification;
          
          console.log('[🔔 FCM] Background notification saved:', notification.id);
        } catch (e) {
          console.error('[🔔 FCM] Error:', e);
        }
        
        return Promise.resolve();
      });
      
      isBackgroundHandlerRegistered = true;
      console.log('[🔔 FCM] Background handler registered');
    }).catch((err) => {
      console.error('[🔔 FCM] Failed to register:', err);
    });
  } catch (error) {
    console.error('[🔔 FCM] Error:', error);
  }
};

let firebaseApp: any = null;
let firebaseMessaging: any = null;

const initializeFirebaseModules = async () => {
  const { getApp, getApps, initializeApp } = await import('@react-native-firebase/app');
  const { getMessaging } = await import('@react-native-firebase/messaging');
  
  const apps = getApps();
  if (apps.length === 0) {
    firebaseApp = initializeApp();
  } else {
    firebaseApp = apps[0];
  }
  
  firebaseMessaging = getMessaging(firebaseApp);
  return { app: firebaseApp, messaging: firebaseMessaging };
};

/**
 * 🔥 FCM Hook - Works like WebSocket on web
 */
export const useFCMNotifications = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    registerBackgroundMessageHandler();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    
    const init = async () => {
      if (Platform.OS === 'web') return;
      
      if (isCancelled) return;

      try {
        const { messaging: messagingModule } = await initializeFirebaseModules();
        
        if (isCancelled) return;
        
        console.log('[🔔 FCM] Firebase initialized');
        setIsInitialized(true);
        
        // Request permissions
        const authStatus = await messagingModule.requestPermission();
        const enabled = authStatus === messagingModule.AuthorizationStatus?.AUTHORIZED || 
                       authStatus === 1 || authStatus === 2;
        setHasPermission(enabled);
        
        if (enabled) {
          console.log('[🔔 FCM] Permissions granted');
          
          // Get token
          const token = await messagingModule.getToken();
          if (token) {
            console.log('[🔔 FCM] Token obtained');
            setFcmToken(token);
            await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
          }
          
          // Set up handlers
          const unsubscribeForeground = messagingModule.onMessage(async (remoteMessage: any) => {
            console.log('[🔔 FCM] ========== FOREGROUND MESSAGE ==========');
            
            const rawData = remoteMessageDataToNotificationRaw(remoteMessage);
            const notification = normalizeNotificationFromApi(rawData);
            
            console.log('[🔔 FCM] Notification received:', notification.id, notification.notificationType);
            
            // Call callback like web's WebSocket handler
            if (onFCMNotificationReceived) {
              onFCMNotificationReceived(notification);
            }
          });
          
          // Handle notification tap (background)
          const unsubscribeBackground = messagingModule.onNotificationOpenedApp(async (remoteMessage: any) => {
            console.log('[🔔 FCM] ========== NOTIFICATION TAPPED (BACKGROUND) ==========');
            
            const rawData = remoteMessageDataToNotificationRaw(remoteMessage);
            const notification = normalizeNotificationFromApi(rawData);
            
            console.log('[🔔 FCM] Notification tapped:', notification.id);
            
            // Call callback like web; if callback handles it, clear pending to avoid double navigation
            if (onFCMNotificationTapped) {
              onFCMNotificationTapped(notification);
              // Clear pending since callback handled it
              await AsyncStorage.removeItem(PENDING_NOTIFICATION_KEY);
              globalPendingNotification = null;
            } else {
              // No callback yet — save for later pickup
              await AsyncStorage.setItem(PENDING_NOTIFICATION_KEY, JSON.stringify(notification));
              globalPendingNotification = notification;
            }
          });
          
          // Handle notification tap (quit state)
          const remoteMessage = await messagingModule.getInitialNotification();
          if (remoteMessage) {
            console.log('[🔔 FCM] ========== NOTIFICATION TAPPED (QUIT STATE) ==========');
            
            const rawData = remoteMessageDataToNotificationRaw(remoteMessage);
            const notification = normalizeNotificationFromApi(rawData);
            
            await AsyncStorage.setItem(PENDING_NOTIFICATION_KEY, JSON.stringify(notification));
            globalPendingNotification = notification;
            
            console.log('[🔔 FCM] Initial notification:', notification.id);
            
            // Delay to let app initialize, then navigate
            setTimeout(async () => {
              if (onFCMNotificationTapped) {
                onFCMNotificationTapped(notification);
                // Clear pending since callback handled it
                await AsyncStorage.removeItem(PENDING_NOTIFICATION_KEY);
                globalPendingNotification = null;
              }
            }, 1500);
          }
          
          unsubscribeRef.current = () => {
            unsubscribeForeground();
            unsubscribeBackground();
          };
        }
      } catch (error) {
        console.error('[🔔 FCM] Init error:', error);
      }
    };

    init();
    
    return () => {
      isCancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Check pending notifications when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[🔔 FCM] App active, checking pending...');
        
        const pending = await AsyncStorage.getItem(PENDING_NOTIFICATION_KEY);
        if (pending) {
          const notification: Notification = JSON.parse(pending);
          console.log('[🔔 FCM] Found pending:', notification.id);
          
          if (onFCMNotificationTapped) {
            onFCMNotificationTapped(notification);
          }
          
          await AsyncStorage.removeItem(PENDING_NOTIFICATION_KEY);
        }
      }
    });

    return () => subscription.remove();
  }, []);

  return {
    fcmToken,
    hasPermission,
    isInitialized,
  };
};

export default useFCMNotifications;
