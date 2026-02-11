# ✅ Fix RNFBAppModule Native Module Error

## 🔍 Problem
The error `Native module RNFBAppModule not found` occurs because the native code hasn't been regenerated after adding React Native Firebase plugins.

## 🔧 Solution: Regenerate Native Code

### Step 1: Run Expo Prebuild (Required)
This regenerates the native Android/iOS code with Firebase properly integrated:

```bash
npx expo prebuild --clean
```

**Important**: The `--clean` flag removes existing native directories and regenerates them fresh.

### Step 2: Clean Android Build
```bash
cd android
./gradlew clean
cd ..
```

### Step 3: Rebuild the App
```bash
npx expo run:android
```

## 🚀 Quick Fix (All-in-One Command)

Run this single command to fix everything:

```bash
npx expo prebuild --clean && cd android && ./gradlew clean && cd .. && npx expo run:android
```

## 📝 What `expo prebuild` Does

1. **Reads `app.json`** - Gets plugin configuration
2. **Generates native code** - Creates Android/iOS native projects
3. **Links plugins** - Properly integrates Firebase native modules
4. **Configures build files** - Sets up Gradle files with Firebase

## ⚠️ Important Notes

- **Backup first**: `expo prebuild --clean` will regenerate native code. Any manual changes to native files will be lost.
- **Plugins configured**: Your `app.json` already has Firebase plugins configured correctly:
  ```json
  "plugins": [
    "@react-native-firebase/app",
    ["@react-native-firebase/messaging", {...}]
  ]
  ```

## 🔍 Verification

After running prebuild, check:
1. ✅ `android/app/build.gradle` should have Google Services plugin
2. ✅ `android/build.gradle` should have Google Services classpath
3. ✅ Native modules should be properly linked

## 🐛 If Error Persists

1. **Clear all caches**:
   ```bash
   rm -rf node_modules
   npm install
   npx expo prebuild --clean
   ```

2. **Check Firebase packages**:
   ```bash
   npm list @react-native-firebase/app @react-native-firebase/messaging
   ```

3. **Verify google-services.json**:
   - Ensure `google-services.json` exists in project root
   - Check it's properly configured for your Firebase project

## ✅ Expected Result

After running prebuild, the native module should be found and the app should build successfully.
