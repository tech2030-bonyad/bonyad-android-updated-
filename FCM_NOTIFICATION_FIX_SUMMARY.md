# FCM Notification Click Fix - Summary

## Problem
Android notifications were displaying but **tapping them did not navigate** to the relevant screen.

## Root Causes Identified

1. **No Background Message Handler**: The `setBackgroundMessageHandler` was missing, which is required for:
   - Handling notification taps when app is in background
   - Handling notification taps when app is quit

2. **Missing Notification Channel**: Android requires a notification channel for displaying notifications properly.

3. **No Local Notification Display**: Foreground notifications were only showing as alerts, not as actual system notifications.

4. **No Press Event Handler**: The notification press events weren't being caught and converted to navigation actions.

## Changes Made

### 1. Added `@notifee/react-native` Package
```bash
npm install @notifee/react-native
```
This library handles:
- Notification channels
- Local notification display
- Notification press events
- Foreground/background state handling

### 2. Updated `src/utils/useFCMNotifications.ts`

#### Key additions:
- **Notification Channel Creation**: Creates a high-priority notification channel on Android
- **Background Message Handler**: `registerBackgroundMessageHandler()` - registers global handler for background/quit state
- **Notifee Foreground Listener**: `setupNotifeeForegroundListener()` - catches notification press events
- **Local Notification Display**: Uses Notifee to display notifications with proper press actions
- **Data Persistence**: Stores notification data in AsyncStorage for processing when navigation is ready

#### Notification Flow:
```
1. Notification Received (Background/Quit)
   ↓
2. setBackgroundMessageHandler saves to AsyncStorage
   ↓
3. Notifee displays local notification
   ↓
4. User taps notification
   ↓
5. Notifee foreground event fires (EventType.PRESS)
   ↓
6. Data extracted and converted to Notification type
   ↓
7. handleNotificationNavigation called with proper deps
   ↓
8. App navigates to correct screen
```

### 3. Updated `App.tsx`
- Added import for `registerBackgroundMessageHandler`
- Called `registerBackgroundMessageHandler()` at top level before component renders

## Important: Requires Development Build

**FCM + Notifee will NOT work in Expo Go!** You must build a native development build:

```bash
eas build --platform android --profile development
```

Or for a preview/production build:
```bash
eas build --platform android --profile preview
```

## Build Instructions

1. **Clean and reinstall**:
```bash
cd bonyad-android-updated-
rm -rf node_modules android/ios
npm install
npx expo prebuild --platform android
```

2. **Build development APK**:
```bash
eas build --platform android --profile development
```

3. **Or build locally** (requires Android SDK):
```bash
cd android
./gradlew assembleDebug
```

## Testing Notification Clicks

### Test 1: Foreground Notification
1. Open the app
2. Send a test notification from backend/Postman
3. Notification should appear as a system notification (not just alert)
4. Tap the notification
5. **Expected**: App navigates to relevant screen

### Test 2: Background Notification
1. Open the app
2. Press home button (app goes to background)
3. Send a test notification
4. Tap the notification
5. **Expected**: App opens and navigates to relevant screen

### Test 3: Quit State Notification
1. Kill the app completely
2. Send a test notification
3. Tap the notification
4. **Expected**: App opens, initializes, and navigates to relevant screen

## Debugging

Enable verbose logging by checking logcat:
```bash
adb logcat -s "🔔 FCM" | grep "FCM"
```

You should see logs like:
```
[🔔 FCM] ========== BACKGROUND MESSAGE HANDLER CALLED ==========
[🔔 FCM] Background notification saved: 12345
[🔔 FCM] Local notification displayed via Notifee
[🔔 FCM] Notifee foreground event: { type: 1, detail: {...} }
[🔔 FCM] 🖱️ User pressed notification (Notifee)
[🔔 FCM] 🧭 Calling handleNotificationNavigation...
[🔔 FCM] ✅ Navigation completed successfully!
```

## Payload Structure Expected

The backend should send notifications with this data structure:
```json
{
  "notification": {
    "title": "New Bid Received",
    "body": "You have a new bid on your project"
  },
  "data": {
    "notificationType": "BID_RECEIVED",
    "projectId": "123",
    "bidId": "456",
    "actionUrl": "bonyad://project/123"
  }
}
```

## Troubleshooting

### Issue: Notifications not showing
- Check if notification channel was created (see logs)
- Verify notification permissions are granted
- Check if FCM token is valid

### Issue: Tapping notification doesn't navigate
- Check logs for `[🔔 FCM] 🖱️ User pressed notification`
- Verify `navigationDeps` are passed to the hook
- Check if `handleNotificationNavigation` is being called
- Verify the notification data structure matches expected format

### Issue: Works in foreground but not background
- Verify `setBackgroundMessageHandler` is registered
- Check if the handler is at top level (outside components)
- Ensure background execution is allowed in Android settings

## Files Modified

1. `src/utils/useFCMNotifications.ts` - Complete rewrite with Notifee integration
2. `App.tsx` - Added background handler registration at top level
3. `package.json` - Added `@notifee/react-native` dependency
