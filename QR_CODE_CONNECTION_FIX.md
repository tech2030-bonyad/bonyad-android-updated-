# 🔧 Fix: "Failed to Connect" When Scanning QR Code

## Common Causes & Solutions

### 1. Phone and Computer Not on Same WiFi Network
**Solution:**
- Ensure both devices are connected to the **same WiFi network**
- Check WiFi settings on both devices
- Try disconnecting and reconnecting to WiFi

### 2. Firewall Blocking Connection
**Solution:**
- Check your computer's firewall settings
- Allow Node.js/Expo through firewall
- On Mac: System Settings > Network > Firewall
- On Windows: Windows Defender Firewall > Allow an app

### 3. Development Server Not Running
**Solution:**
```bash
# Make sure Expo dev server is running
npx expo start --dev-client

# Or
npm start
```

### 4. Use Tunnel Mode (If Same WiFi Doesn't Work)
**Solution:**
```bash
# Start with tunnel mode (works even if not on same network)
npx expo start --dev-client --tunnel

# This will create a public URL that works from anywhere
```

### 5. Manual Connection (Alternative)
**Solution:**
1. Shake your device to open developer menu
2. Tap "Enter URL manually"
3. Enter the connection URL shown in terminal (e.g., `exp://192.168.1.100:8081`)

### 6. Check Network Configuration
**Solution:**
```bash
# Find your computer's local IP address
# On Mac/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1

# On Windows:
ipconfig | findstr IPv4

# Make sure the IP in the QR code matches your computer's IP
```

### 7. Restart Everything
**Solution:**
```bash
# 1. Stop the dev server (Ctrl+C)
# 2. Clear cache and restart
npx expo start --dev-client --clear

# 3. On your phone, close and reopen the app
# 4. Try scanning QR code again
```

### 8. Use USB Connection (Android)
**Solution:**
```bash
# Connect phone via USB
# Enable USB debugging
adb reverse tcp:8081 tcp:8081

# Then start dev server
npx expo start --dev-client
```

## Quick Fix Commands

```bash
# Option 1: Clear cache and restart
npx expo start --dev-client --clear

# Option 2: Use tunnel (works from any network)
npx expo start --dev-client --tunnel

# Option 3: Specify LAN connection explicitly
npx expo start --dev-client --lan
```

## Still Not Working?

1. Check terminal for error messages
2. Verify your phone can access the internet
3. Try connecting from a different network
4. Check if antivirus is blocking the connection
5. Restart your router if needed
