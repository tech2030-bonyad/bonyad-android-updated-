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
# Drop Metro cache so removed/changed image assets are not re-emitted into the JS bundle.
rm -rf "$ROOT/node_modules/.cache/metro" "$ROOT/.expo/cache" 2>/dev/null || true
# Remove app build output so stale drawable-mdpi copies cannot linger after clean fails.
rm -rf "$ROOT/android/app/build"
./gradlew clean

./gradlew bundleRelease
echo "✅ AAB built at android/app/build/outputs/bundle/release/app-release.aab"
