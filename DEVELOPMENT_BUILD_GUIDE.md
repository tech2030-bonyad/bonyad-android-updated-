# 🚀 Development Build Setup & Installation Guide

## ✅ Prerequisites Check

Your project already has:
- ✅ `expo-dev-client` installed (v6.0.16)
- ✅ Firebase plugins configured
- ✅ EAS project configured

## 🔧 Step 1: Fix Native Modules (Required First)

Before building, we need to regenerate native code with Firebase:

```bash
# Regenerate native code with Firebase
npx expo prebuild --clean --platform android
```

This will:
- Regenerate Android native code
- Properly link Firebase native modules (RNFBAppModule)
- Configure Google Services

## 📦 Step 2: Build Development APK Locally (Fastest)

### Option A: Build Locally (Recommended - Fastest)

```bash
# 1. Clean build
cd android
./gradlew clean
cd ..

# 2. Build development APK
npx expo run:android --variant debug
```

The APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Option B: Build with EAS (Cloud Build - Slower but No Local Setup)

```bash
# Build development build on EAS servers
eas build --profile development --platform android
```

**Note**: This requires EAS account setup. The build will be uploaded to EAS servers.

## 📱 Step 3: Install on Mobile Device

### Method 1: Direct Install via ADB (Recommended)

```bash
# Connect your Android device via USB
# Enable USB Debugging on your phone

# Install the APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or if device is connected wirelessly
adb connect <device-ip>:5555
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Method 2: Transfer APK to Phone

1. **Copy APK to phone**:
   ```bash
   # Find the APK
   ls -lh android/app/build/outputs/apk/debug/app-debug.apk
   ```

2. **Transfer to phone**:
   - Email it to yourself
   - Use Google Drive/Dropbox
   - Use `adb push`:
     ```bash
     adb push android/app/build/outputs/apk/debug/app-debug.apk /sdcard/Download/
     ```

3. **Install on phone**:
   - Open Files app on Android
   - Navigate to Downloads
   - Tap the APK file
   - Allow installation from unknown sources if prompted
   - Install

### Method 3: Install via EAS Build

If you used EAS build:
```bash
# After build completes, install via QR code or link
eas build:run -p android
```

## 🎯 Step 4: Run Development Server

After installing the development build on your phone:

```bash
# Start Expo development server
npx expo start --dev-client

# Or
npm start
```

Then:
1. **Open the app** on your phone (the development build you just installed)
2. **Scan the QR code** shown in terminal, OR
3. **Shake your device** to open developer menu
4. **Enter the connection URL** manually if needed

## 🔍 Troubleshooting

### Issue: "RNFBAppModule not found" after install

**Solution**: Make sure you ran `npx expo prebuild --clean` before building.

### Issue: Build fails with NDK error

**Solution**: Install NDK version 27.0.12077973 via Android Studio SDK Manager.

### Issue: Can't connect to development server

**Solution**: 
- Ensure phone and computer are on same WiFi network
- Check firewall settings
- Try using tunnel: `npx expo start --dev-client --tunnel`

### Issue: APK installation fails

**Solution**:
- Enable "Install from unknown sources" in Android settings
- Uninstall any existing version first: `adb uninstall com.bonyaddandroid.ahmed`

## 🚀 Quick Start (All Commands)

```bash
# 1. Regenerate native code
npx expo prebuild --clean --platform android

# 2. Build development APK
cd android && ./gradlew clean && cd ..
npx expo run:android --variant debug

# 3. Install on connected device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 4. Start development server
npx expo start --dev-client
```

## 📝 Notes

- **Development builds** include all native modules (Firebase, etc.)
- **First build** takes longer (5-10 minutes)
- **Subsequent builds** are faster (1-2 minutes)
- **Hot reload** works after connecting to dev server
- **Native changes** require rebuilding the APK

## ✅ Verification

After installation, you should see:
- ✅ App opens on your phone
- ✅ Can connect to development server
- ✅ Firebase modules work (no RNFBAppModule error)
- ✅ Hot reload works
