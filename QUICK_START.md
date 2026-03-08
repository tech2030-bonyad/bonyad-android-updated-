# 🚀 Quick Start - Run on Any Device

## ⚡ Fastest Way to Start

### Option A: Interactive Menu
```bash
./dev.sh
```
Then select your device from the menu.

### Option B: Direct Commands

| Device | Command |
|--------|---------|
| iOS Simulator | `./dev.sh ios` or `npx expo run:ios` |
| Android Simulator | `./dev.sh android` or `npx expo run:android` |
| Web Browser | `./dev.sh web` or `npm run web` |
| Physical Device | `./dev.sh device` then scan QR |

---

## 📱 Physical Device Setup

### 1. Install Expo Go
- **iPhone**: App Store → Search "Expo Go"
- **Android**: Play Store → Search "Expo Go"

### 2. Same WiFi
Make sure your phone and laptop are on the **same WiFi network**.

### 3. Start & Scan
```bash
npx expo start
```
Scan the QR code with Expo Go app.

---

## 🔄 Switching Between Devices

```bash
# Start the bundler (keep this running)
npx expo start

# In the terminal, press:
#   i → Open iOS Simulator
#   a → Open Android Simulator  
#   w → Open Web Browser
#   r → Reload all devices
#   m → Show developer menu
```

**All devices connect to the same bundler!** Changes sync instantly.

---

## 💻 Web Development (Fastest)

For quick UI changes, use web first:
```bash
npm run web
```
- Opens at http://localhost:8081
- Fastest hot reload
- Easy to resize window
- Keyboard shortcuts work

Then test on mobile when ready.

---

## 🆘 Troubleshooting

### App won't connect?
```bash
# Clear and restart
./dev.sh clear
```

### Port already in use?
```bash
npx kill-port 8081
```

### Need to reinstall?
```bash
rm -rf node_modules .expo
npm install
npx expo start --clear
```

---

## ✅ Checklist

- [ ] `./dev.sh` works and shows menu
- [ ] Can run on iOS Simulator
- [ ] Can run on Android Simulator
- [ ] Can run on Web
- [ ] Physical device connects via QR code
