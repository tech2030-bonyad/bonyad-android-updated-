# Backend Fix Required for FCM Notification Taps

## Problem
When the backend sends FCM notifications with both `notification` and `data` payloads, the React Native Firebase SDK doesn't reliably detect notification taps via `onNotificationOpenedApp` and `getInitialNotification`.

## Root Cause
The backend's `FirebaseMessagingService.java` sends notifications without specifying a `click_action` in the Android notification config. This causes Android to launch the app in a way that doesn't always trigger the FCM handlers.

## Backend Fix

Modify `FirebaseMessagingService.java` line 42-46:

### Current Code:
```java
.setAndroidConfig(AndroidConfig.builder()
        .setPriority(AndroidConfig.Priority.HIGH)
        .setNotification(AndroidNotification.builder()
                .setSound("default")
                .setColor("#0080FF")
                .setChannelId("default")
                .build())
        .build())
```

### Fixed Code:
```java
.setAndroidConfig(AndroidConfig.builder()
        .setPriority(AndroidConfig.Priority.HIGH)
        .setNotification(AndroidNotification.builder()
                .setSound("default")
                .setColor("#0080FF")
                .setChannelId("default")
                .setClickAction("com.bonyadapp.NOTIFICATION_OPEN")  // ADD THIS LINE
                .build())
        .build())
```

## Alternative: Data-Only Notifications

If you don't want to show system notifications and only want to handle taps in-app, remove the `.setNotification(notification)` line and only send data:

```java
Message message = Message.builder()
        .setToken(user.getDeviceToken())
        // .setNotification(notification)  // REMOVE THIS
        .putAllData(data != null ? data : new HashMap<>())
        .setAndroidConfig(AndroidConfig.builder()
                .setPriority(AndroidConfig.Priority.HIGH)
                .setDirectBootOk(true)
                .build())
        .build();
```

With data-only notifications:
- The app handles showing the notification locally
- Taps are always detected by `onNotificationOpenedApp` and `getInitialNotification`

## Workaround (Mobile-Only Fix)

If backend changes are not possible immediately, the mobile app can use a workaround by:

1. Checking AsyncStorage periodically for pending notifications (already implemented)
2. Using a custom native module to intercept notification taps
3. Using Notifee library to display local notifications instead of relying on FCM's notification payload

The current implementation includes a periodic check every 3 seconds for 60 seconds after app launch to detect notifications stored by the background handler.

## Testing After Backend Fix

1. Update backend code
2. Redeploy backend
3. Send test notification
4. Tap notification
5. Check logs for:
   ```
   [🔔 FCM] ========== APP OPENED FROM BACKGROUND NOTIFICATION ==========
   [🧭 NAV] ========== handleNotificationNavigation START ==========
   ```
