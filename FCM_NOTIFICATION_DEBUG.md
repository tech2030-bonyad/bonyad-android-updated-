# FCM Notification Debug Guide

## Backend FCM Payload Structure

Based on `NotificationService.java`, the backend sends FCM notifications with this data structure:

```json
{
  "notification": {
    "title": "Arabic Title (for backward compatibility)",
    "body": "Arabic Message (for backward compatibility)"
  },
  "data": {
    "notificationType": "PROJECT_ASSIGNED|BID_RECEIVED|BID_ACCEPTED|MESSAGE|...",
    "type": "newProject|newOffer|chatMessage|...",
    "category": "PROJECT_ASSIGNED|BID_RECEIVED|CHAT_MESSAGE|...",
    
    "projectId": "123",
    "bidId": "456",
    "offerId": "456",
    "phaseId": "789",
    "appointmentId": "101",
    "timeRequestId": "102",
    "reviewId": "103",
    
    "roomId": "room-23-24",
    
    "fromUserId": "23",
    "fromUserName": "John Doe",
    
    "titleAr": "Arabic Title",
    "titleEn": "English Title",
    "messageAr": "Arabic Message",
    "messageEn": "English Message"
  }
}
```

## Notification Types & Navigation Mapping

| NotificationType | Data Fields | Navigation Target |
|-----------------|-------------|-------------------|
| `PROJECT_ASSIGNED` | `projectId` | Project detail (direct assignment) |
| `PROJECT_CREATED` | `projectId` | Project detail (new open project) |
| `BID_RECEIVED` | `projectId`, `bidId` | Project detail with bid |
| `BID_ACCEPTED` | `projectId`, `bidId` | Project detail (accepted) |
| `BID_REJECTED` | `projectId`, `bidId` | Project detail |
| `MESSAGE` | `roomId`, `fromUserId` | Chat room |
| `PHASE_PAYMENT_PENDING` | `projectId`, `phaseId` | Project detail (payment) |
| `PHASE_PAYMENT_RECEIVED` | `projectId`, `phaseId` | Project detail |
| `TIME_REQUEST_RECEIVED` | `projectId`, `timeRequestId` | Appointments |
| `APPOINTMENT_CONFIRMED` | `projectId`, `appointmentId` | Appointments |
| `PHASE_CHANGE_REQUESTED` | `projectId` | Project detail |
| `PHASE_CHANGE_RESOLVED` | `projectId` | Project detail |
| `PHASE_APPROVED` | `projectId` | Project detail |
| `PROJECT_APPROVED` | `projectId` | Project detail (contract) |
| `PROJECT_COMPLETED` | `projectId` | Project detail |
| `PHASE_COMPLETED` | `projectId`, `phaseId` | Project detail |

## Debug Steps

### 1. Check if FCM Token is Registered

```bash
# Look for these logs in logcat:
adb logcat -s "🔔 FCM" | grep "FCM Token"

# Expected:
[🔔 FCM] ✅ FCM Token obtained (first 50 chars): fcm_token_here...
```

### 2. Check if Notification is Received (Foreground)

```bash
# Look for these logs:
adb logcat -s "🔔 FCM" | grep "FOREGROUND NOTIFICATION"

# Expected:
[🔔 FCM] ========== FOREGROUND NOTIFICATION RECEIVED ==========
[🔔 FCM] RemoteMessage: {...}
[🔔 FCM] Raw data after extraction: {...}
[🔔 FCM] Normalized notification: {...}
```

### 3. Check if Notification Tap is Detected (Background/Quit)

```bash
# Look for these logs:
adb logcat -s "🔔 FCM" | grep "APP OPENED FROM"

# Expected for background:
[🔔 FCM] ========== APP OPENED FROM BACKGROUND NOTIFICATION ==========

# Expected for quit state:
[🔔 FCM] ========== APP OPENED FROM QUIT STATE NOTIFICATION ==========
```

### 4. Check Navigation

```bash
# Look for navigation logs:
adb logcat -s "🧭 NAV" | grep "handleNotificationNavigation"

# Expected:
[🧭 NAV] ========== handleNotificationNavigation START ==========
[🧭 NAV] Notification: {id, type, title, relatedProjectId, ...}
[🧭 NAV] User role: technician|user
[🧭 NAV] Parsed type: {...}
[🧭 NAV] Project ID: {...}
[🧭 NAV] Routing: projectId -> openProjectById, technicianBid: true|false
[🧭 NAV] ========== handleNotificationNavigation END ==========
```

## Common Issues

### Issue: Notification received but not navigating

**Check:**
1. Is `navigationDeps` passed to the hook? Look for `[🔔 FCM] Navigation deps: PRESENT`
2. Is the notification type recognized? Check `[🧭 NAV] Parsed type:`
3. Is the projectId extracted? Check `[🧭 NAV] Project ID:`

### Issue: Notification tap does nothing (background/quit)

**Check:**
1. Is `onNotificationOpenedApp` firing? Look for `[🔔 FCM] ========== APP OPENED FROM BACKGROUND NOTIFICATION ==========`
2. Is `getInitialNotification` firing? Look for `[🔔 FCM] ========== APP OPENED FROM QUIT STATE NOTIFICATION ==========`
3. Is the notification saved to storage? Look for `[🔔 FCM] Background notification saved:`

### Issue: Wrong screen opened

**Check:**
1. What is the `notificationType`? Check `[🧭 NAV] Parsed type:`
2. What is the routing decision? Check `[🧭 NAV] Routing: ...`
3. Check `handleNotificationNavigation` logic in `notificationNavigationFromPayload.ts`

## Test Notification (cURL)

Send a test notification using FCM HTTP v1 API:

```bash
curl -X POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "DEVICE_FCM_TOKEN",
      "notification": {
        "title": "Test Notification",
        "body": "Tap to open project"
      },
      "data": {
        "notificationType": "BID_RECEIVED",
        "type": "newOffer",
        "category": "BID_RECEIVED",
        "projectId": "123",
        "bidId": "456",
        "fromUserId": "789",
        "fromUserName": "Test User",
        "titleAr": "عرض جديد",
        "titleEn": "New Bid Received",
        "messageAr": "تم تقديم عرض جديد",
        "messageEn": "New bid received on your project"
      },
      "android": {
        "priority": "high",
        "notification": {
          "channelId": "default",
          "sound": "default"
        }
      }
    }
  }'
```

## Build & Run

```bash
# Clean and rebuild
cd /Users/user/website-bonyad/bonyad-android-updated-
rm -rf android
npx expo prebuild --platform android

# Set Android SDK
export ANDROID_HOME=/Users/$USER/Library/Android/sdk

# Run on device
npx expo run:android

# Or build APK
cd android
./gradlew :app:assembleDebug
```

## Logcat Commands

```bash
# All FCM logs
adb logcat -s "🔔 FCM"

# All navigation logs
adb logcat -s "🧭 NAV"

# Both
adb logcat -s "🔔 FCM" "🧭 NAV"

# All React Native logs
adb logcat | grep -E "(ReactNative|FCM|NAV)"

# Clear logs and start fresh
adb logcat -c && adb logcat -s "🔔 FCM" "🧭 NAV"
```
