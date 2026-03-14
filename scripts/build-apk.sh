#!/usr/bin/env bash
set -e
# Use Java 17 for Android build if JAVA_HOME is not set (e.g. macOS Homebrew)
if [ -z "$JAVA_HOME" ] && [ -d "/opt/homebrew/opt/openjdk@17" ]; then
  export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/android"

# Clean reanimated and app native build caches to avoid CMake "unreadable outputs" failures
rm -rf "$ROOT/node_modules/react-native-reanimated/android/build" 2>/dev/null || true
./gradlew --stop 2>/dev/null || true
./gradlew clean 2>/dev/null || true

./gradlew assembleRelease
echo "✅ APK built at android/app/build/outputs/apk/release/app-release.apk"
