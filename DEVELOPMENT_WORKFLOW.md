# Development Workflow Guide

## Quick Start - Choose Your Device

### Option 1: Run on Laptop (Simulator)

#### iOS Simulator (Mac only)
```bash
npm run ios
# or
npx expo run:ios
```

#### Android Simulator
```bash
npm run android
# or
npx expo run:android
```

---

### Option 2: Run on Physical Mobile Device

#### Step 1: Start the development server
```bash
npx expo start --clear
```

#### Step 2: Choose how to run

**For iOS Device:**
- Scan the QR code with your iPhone Camera app
- Or open "Expo Go" app and scan the QR code

**For Android Device:**
- Open "Expo Go" app
- Tap "Scan QR Code"
- Scan the QR code shown in terminal

---

### Option 3: Web Browser (Fastest for UI testing)
```bash
npm run web
# or
npx expo start --web
```
Then open: http://localhost:8081

---

## 🔁 Switching Between Devices

### Quick Switch Commands

```bash
# 1. Start the metro bundler (keep this running)
npx expo start --clear

# 2. In the terminal menu, press:
#   - 'i' → Launch iOS Simulator
#   - 'a' → Launch Android Simulator
#   - 'w' → Launch Web
#   - 'r' → Reload all connected apps
#   - 'm' → Toggle menu on device
#   - 'j' → Open debugger
```

### Running Multiple Devices at Once

You can run the app on **multiple devices simultaneously**:

```bash
# Terminal 1: Start the bundler
npx expo start

# The app will now be available on:
# - iOS Simulator (press 'i')
# - Android Simulator (press 'a')
# - Physical devices (scan QR code)
# - Web browser (press 'w')
```

---

## 📱 Device-Specific Setup

### Physical iOS Device

1. Install **Expo Go** from App Store
2. Connect to same WiFi as your laptop
3. Scan QR code from terminal

### Physical Android Device

1. Install **Expo Go** from Play Store
2. Connect to same WiFi as your laptop
3. Scan QR code from terminal

**OR use USB (faster):**
```bash
# Connect Android via USB, enable USB debugging
adb devices  # Should show your device
npx expo run:android --device
```

---

## 🚀 Fast Development Tips

### 1. Use Web for Rapid UI Development
```bash
npm run web
```
- Fastest refresh (no simulator startup time)
- Easy to resize browser for responsive testing
- Keyboard shortcuts work

### 2. Test on Real Device for Native Features
Use physical device when testing:
- Camera
- Push notifications
- Maps / GPS
- File uploads
- Biometrics

### 3. Use Simulator for
- Fast iteration on business logic
- Testing different screen sizes
- Screenshot generation
- Automated testing

---

## 🔧 Troubleshooting

### "Metro bundler already running"
```bash
# Kill existing processes
npx kill-port 8081
# or
lsof -ti:8081 | xargs kill -9
```

### Clear cache when switching devices
```bash
npx expo start --clear
```

### Reset everything
```bash
# Clear all caches
rm -rf node_modules
rm -rf .expo
npm install
npx expo start --clear
```

---

## 📋 Summary Commands

| What you want | Command |
|---------------|---------|
| iOS Simulator | `npx expo run:ios` |
| Android Simulator | `npx expo run:android` |
| Web Browser | `npm run web` |
| Start bundler only | `npx expo start` |
| Physical device | `npx expo start` then scan QR |
| All at once | `npx expo start` then press i/a/w |

---

## 💡 Pro Tip: Use the Expo Dev Client

Since you have `expo-dev-client` installed, you can also use:

```bash
# Build development client for your device
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

This gives you a custom app with native modules built-in (no Expo Go needed).
