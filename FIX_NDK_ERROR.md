# ✅ Fix NDK Configuration Error

## 🔧 Change Made

Updated the NDK version in `android/build.gradle` to match what React Native expects:
- **Changed from**: `27.0.12077987`
- **Changed to**: `27.0.12077973` (matches React Native requirement)

## 📦 Install NDK

The error indicates the NDK is not installed. Here are the solutions:

### Option 1: Install via Android Studio (Recommended)

1. **Open Android Studio**
2. **Go to**: Tools → SDK Manager (or Android Studio → Preferences → Appearance & Behavior → System Settings → Android SDK)
3. **Click on**: SDK Tools tab
4. **Check**: Show Package Details (checkbox at bottom right)
5. **Expand**: NDK (Side by side)
6. **Check**: NDK version `27.0.12077973`
7. **Click**: Apply → OK
8. **Wait** for installation to complete

### Option 2: Install via Command Line

```bash
# Set your Android SDK path (usually in ~/Library/Android/sdk on macOS)
export ANDROID_HOME=~/Library/Android/sdk

# Install NDK using sdkmanager
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "ndk;27.0.12077973"
```

### Option 3: Let Gradle Download Automatically

Gradle should automatically download the NDK if it's specified. Try building again:

```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

If it still fails, use Option 1 or 2 above.

## 🔍 Verify NDK Installation

Check if NDK is installed:

```bash
# Check if NDK directory exists
ls ~/Library/Android/sdk/ndk/

# Or check specific version
ls ~/Library/Android/sdk/ndk/27.0.12077973
```

## 🚀 After Installing NDK

1. **Clean the build**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

2. **Rebuild the app**:
   ```bash
   npx expo run:android
   ```

## 📝 Alternative: Make NDK Optional (Not Recommended)

If you don't need native code compilation, you can make NDK optional by modifying `android/app/build.gradle`:

```gradle
android {
    // Comment out or make conditional
    // ndkVersion rootProject.ext.ndkVersion
    
    // Or make it optional:
    if (project.hasProperty('ndkVersion')) {
        ndkVersion rootProject.ext.ndkVersion
    }
    
    // ... rest of config
}
```

**Note**: This may cause issues if your app uses native modules that require NDK.

## ✅ Quick Fix Command

After installing NDK via Android Studio, run:

```bash
cd android && ./gradlew clean && cd .. && npx expo run:android
```
