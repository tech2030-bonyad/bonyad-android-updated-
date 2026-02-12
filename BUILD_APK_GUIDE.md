# 📱 Building APK for Bonyad Android App

This guide will help you build an APK file for your Android app. You have two options:

## 🚀 Option 1: EAS Build (Cloud-based, Recommended)

**Pros:** No local setup needed, builds in the cloud  
**Cons:** Requires Expo account and internet connection

### Steps:

1. **Login to Expo (if not already logged in):**
   ```bash
   eas login
   ```

2. **Build APK using preview profile:**
   ```bash
   eas build --profile preview --platform android
   ```
   
   This will build an APK file. The build happens in the cloud and takes about 10-15 minutes.

3. **Download the APK:**
   - After the build completes, you'll get a download link
   - Or run: `eas build:list` to see all your builds
   - Download the APK from the Expo dashboard

---

## 🛠️ Option 2: Local Build (Requires Setup)

**Pros:** Faster builds, no internet needed after setup  
**Cons:** Requires JDK and Android SDK installation

### Prerequisites:

You need to install:
1. **Java Development Kit (JDK) 17 or higher**
2. **Android SDK** (usually comes with Android Studio)

### Step 1: Install JDK

**On macOS, choose one method:**

#### Method A: Using Homebrew (Recommended)
```bash
brew install openjdk@17
```

Then set JAVA_HOME:
```bash
# Add to ~/.zshrc
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
source ~/.zshrc
```

#### Method B: Download from Oracle/Adoptium
1. Visit: https://adoptium.net/
2. Download JDK 17 for macOS
3. Install the .pkg file
4. Set JAVA_HOME:
   ```bash
   echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
   source ~/.zshrc
   ```

### Step 2: Verify Java Installation

```bash
java -version
# Should show: openjdk version "17.x.x" or similar

echo $JAVA_HOME
# Should show: /Library/Java/JavaVirtualMachines/... or similar
```

### Step 3: Verify Android SDK

The `android/local.properties` file should already exist with:
```
sdk.dir=/Users/user/Library/Android/sdk
```

If Android SDK is not installed:
1. Download and install **Android Studio** from: https://developer.android.com/studio
2. Open Android Studio → SDK Manager
3. Install:
   - Android SDK Platform (latest)
   - Android SDK Build-Tools
   - Android SDK Platform-Tools

### Step 4: Build the APK

Once Java and Android SDK are set up:

```bash
cd /Users/user/bonyad-android-updated-ui
npm run build:apk
```

The APK will be created at:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📋 Quick Reference

### Check Current Setup:
```bash
# Check Java
java -version
echo $JAVA_HOME

# Check Android SDK
echo $ANDROID_HOME
cat android/local.properties

# Check if Gradle wrapper exists
ls android/gradlew
```

### Build Commands:

**Using npm script:**
```bash
npm run build:apk
```

**Direct Gradle command:**
```bash
cd android
./gradlew assembleRelease
```

**APK Location:**
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## ⚠️ Important Notes

1. **Release Keystore:** The current build uses a debug keystore. For production, you should:
   - Generate a release keystore
   - Update `android/app/build.gradle` to use it
   - See: https://reactnative.dev/docs/signed-apk-android

2. **APK Size:** The release APK will be optimized and smaller than debug builds

3. **Testing:** Install the APK on a device:
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

---

## 🐛 Troubleshooting

### "Unable to locate a Java Runtime"
- Install JDK (see Step 1 above)
- Set JAVA_HOME environment variable

### "SDK location not found"
- Check `android/local.properties` exists
- Verify Android SDK is installed at the path specified
- Install Android Studio if needed

### "Gradle build failed"
- Clean and rebuild:
  ```bash
  cd android
  ./gradlew clean
  ./gradlew assembleRelease
  ```

### "Permission denied" on gradlew
```bash
chmod +x android/gradlew
```

---

## ✅ Recommended Approach

**For first-time builds:** Use **Option 1 (EAS Build)** - it's the easiest and doesn't require any local setup.

**For frequent builds:** Set up **Option 2 (Local Build)** - it's faster once configured.
