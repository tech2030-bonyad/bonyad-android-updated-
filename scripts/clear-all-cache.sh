#!/bin/bash
# Clear all caches and storage for fresh app start

echo "🧹 Clearing all caches and storage..."

echo "📦 Clearing node_modules cache..."
rm -rf node_modules/.cache 2>/dev/null

echo "📱 Clearing Expo cache..."
rm -rf .expo/web/cache 2>/dev/null
rm -rf .expo-shared 2>/dev/null

echo "🚀 Clearing Metro bundler cache..."
npx react-native start --reset-cache &
METRO_PID=$!

sleep 3

echo ""
echo "✅ All caches cleared!"
echo ""
echo "📋 To clear app storage (AsyncStorage) on your device:"
echo "   1. Uninstall the app from your device/simulator"
echo "   2. Or run: adb shell pm clear com.bonyad.hub (Android)"
echo ""
echo "🔄 Now you can restart the app with:"
echo "   npx expo start --clear"
echo ""

kill $METRO_PID 2>/dev/null
