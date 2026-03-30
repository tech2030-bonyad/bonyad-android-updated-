# FCM Build Fix

## Issue
Build failed with:
```
SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path in your project's local.properties file
```

## Fix Applied

Created `android/local.properties` with SDK path:
```bash
echo "sdk.dir=/Users/$USER/Library/Android/sdk" > android/local.properties
```

## Build Instructions

### Option 1: Using npx expo run:android (Recommended)
```bash
cd /Users/user/website-bonyad/bonyad-android-updated-

# Set Android SDK environment
export ANDROID_HOME=/Users/$USER/Library/Android/sdk

# Run the build (first build will take 5-10 minutes)
npx expo run:android
```

### Option 2: Using Gradle directly
```bash
cd /Users/user/website-bonyad/bonyad-android-updated-/android

# Set Android SDK environment
export ANDROID_HOME=/Users/$USER/Library/Android/sdk

# Build debug APK (first build will take 5-10 minutes)
./gradlew :app:assembleDebug

# Or with more output
./gradlew :app:assembleDebug --console=plain
```

### Option 3: Using EAS Build (Cloud)
```bash
cd /Users/user/website-bonyad/bonyad-android-updated-
eas build --platform android --profile development
```

## First Build Notes

The first build after `rm -rf android` will:
1. Download dependencies (Gradle, Android SDK components)
2. Compile all native modules
3. Take 5-15 minutes depending on your machine

Subsequent builds will be much faster (30-60 seconds).

## Make SDK Path Permanent

Add to your `~/.zshrc` or `~/.bash_profile`:
```bash
export ANDROID_HOME=/Users/$USER/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

Then reload:
```bash
source ~/.zshrc  # or ~/.bash_profile
```

## Current Status

✅ Package name fixed: `com.bonyadapp`
✅ FCM hook updated (pure FCM, no Notifee)
✅ Notifee removed from dependencies
✅ Android SDK path configured
⏳ Ready to build

Run the build command now - it will take several minutes for the first build.
