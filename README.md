# 🏗️ Bonyad App - Web & Android

## 📋 Overview

React Native Expo app for Bonyad construction project management. Built to run on **Web** and **Android** platforms with all features from the iOS app.

---

## ✨ Current Features

### 🎉 Welcome Screen
- Beautiful landing page
- Platform detection (Web/Android)
- Feature showcase
- Get started button

### 🔐 Login Screen (Placeholder)
- Ready for implementation
- Will include all iOS features:
  - Phone authentication
  - Google Sign-In
  - Apple Sign-In
  - Biometric login

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** (installed globally: `npm install -g expo-cli`)
- **Android Studio** (for Android development)
- **Web browser** (for web development)

### Installation

```bash
cd "/Users/ahmedfarahat/Desktop/bonyad-cr-2/web&android/bonyad-app"
npm install
```

### Run on Web

```bash
npm run web
```

Opens at: `http://localhost:8081`

### Run on Android

```bash
npm run android
```

Requires:
- Android Studio installed
- Android emulator running OR
- Physical Android device connected

### Development Mode

```bash
npm start
```

Shows QR code to scan with Expo Go app or choose platform (web/android)

---

## 📁 Project Structure

```
bonyad-app/
├── App.tsx                 # Main app entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── assets/                # Images and icons
│   ├── icon.png
│   ├── splash-icon.png
│   └── favicon.png
├── src/                   # Source code (to be created)
│   ├── screens/           # App screens
│   ├── components/        # Reusable components
│   ├── services/          # API services
│   ├── utils/             # Utilities
│   └── types/             # TypeScript types
└── node_modules/          # Dependencies
```

---

## 🎨 Current Design

### Color Scheme
- **Primary Blue**: `#0080E0`
- **Background**: `#F5F7FA`
- **Text Dark**: `#1A1A1A`
- **Text Light**: `#666`
- **White**: `#FFF`

### Typography
- **App Name**: 36pt, bold
- **Title**: 32pt, bold
- **Subtitle**: 16pt
- **Body**: 14pt
- **Caption**: 12pt

---

## 📱 Platform Support

### ✅ Web
- Runs in any modern browser
- Responsive design
- Box shadows for depth
- Mouse/keyboard interactions
- `Platform.OS === 'web'`

### ✅ Android
- Native Android app
- Material Design components
- Touch interactions
- Elevation for depth
- `Platform.OS === 'android'`

### 🚧 iOS (Future)
- Will share 95% codebase
- Native iOS components
- Platform-specific styling

---

## 🔧 Technologies

### Core
- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **React Native Web** - Web support

### Planned Additions
- **React Navigation** - Navigation
- **Axios** - HTTP requests
- **Firebase** - Backend
- **SignIt SDK** - Digital signatures
- **AsyncStorage** - Local storage
- **OpenAI API** - AI features

---

## 📦 Available Scripts

```bash
# Start development server
npm start

# Run on Web
npm run web

# Run on Android
npm run android

# Run on iOS (future)
npm run ios

# Type checking
npx tsc --noEmit

# Install new package
npx expo install <package-name>

# Release bundle for Google Play (AAB) — see "Publishing to Google Play" below
npm run build:aab
```

---

## 📲 Publishing to Google Play (update an already published app)

Use this when the app **is already live** on Google Play and you are shipping a **new release** (bug fixes, features, etc.). Google only accepts **Android App Bundles (`.aab`)** for new uploads, signed with your **upload keystore** — not the debug key.

### Step 1 — Check the version code in Play Console

1. Open [Google Play Console](https://play.google.com/console) and select your app.
2. Go to **Release** → **Production** (or the track you use), or open **App bundle explorer** / the latest release details.
3. Note the **Version code** of the build that is currently live (or the highest version code you have ever uploaded).

**Rule:** Your next upload must use a **higher** `versionCode` than that number. If the live app is version code `5`, set `6` (or higher) in the project.

### Step 2 — Bump versions in the project

Edit these so they stay in sync:

1. **`android/app/build.gradle`** — inside `defaultConfig`:
   - `versionCode` — integer, **must be greater** than Play Console’s latest.
   - `versionName` — string users see (e.g. `"1.0.2"`).

2. **`app.json`** — top-level `"version"` should match your marketing version (e.g. `"1.0.2"`), and under `expo.android` set `"versionCode"` to the **same integer** as in `build.gradle`.

3. **`package.json`** — optional but recommended: `"version"` aligned with `versionName`.

### Step 3 — Configure release signing (upload keystore)

Without this, Gradle signs **release** builds with the **debug** keystore. Play will reject the upload with an error like *“signed with the wrong key”* (debug certificate SHA1 vs your registered upload certificate).

1. Locate your **upload keystore** file (`.jks` or `.keystore`) — the same one used for **previous successful uploads** of this app. Keep backups in a safe place; **do not commit** it to git.

2. Copy `android/keystore.properties.example` to **`android/keystore.properties`**.

3. Edit `android/keystore.properties`:

   ```properties
   storeFile=your-upload-key.jks
   storePassword=your_store_password
   keyAlias=your_key_alias
   keyPassword=your_key_password
   ```

   - **`storeFile`**: path **relative to the `android/` folder** (e.g. if the file is `android/upload-key.jks`, use `upload-key.jks`).
   - Use the real **alias** and passwords for that keystore.

4. Confirm the keystore matches what Play expects (compare **SHA1** with Play Console if you have the expected fingerprint on file):

   ```bash
   keytool -list -v -keystore /path/to/your-upload-key.jks
   ```

   The **SHA1** in the output must match the **upload certificate** Google Play shows for your app (not the Android Debug default).

#### If you forgot the keystore file or passwords

- **You have the `.jks` / `.keystore` but forgot a password** — Keystores cannot be “unlocked” without the correct secrets. Check a password manager, old docs, the teammate who created the key, or the machine that was used for the first Play upload. If you still know the **keystore (store) password**, list aliases with:  
  `keytool -list -keystore /path/to/your-upload-key.jks`  
  then use that **alias** in `keystore.properties`. The **key password** is often the same as the store password (but not always).

- **You forgot where the keystore file is** — Search your computer and backups; ask your team or agency that shipped the first version; check **CI/CD** (GitLab CI variables, GitHub Actions secrets), **EAS** credentials (`eas credentials`), or a company secrets vault. The file is **not** stored inside this git repo (and should not be).

- **The file is lost, or no one has the passwords** — You **cannot** switch to a random new keystore and still update the same Play listing. For most apps, **Google Play App Signing** is on: then you request an **[upload key reset](https://support.google.com/googleplay/android-developer/answer/9842756)** in Play Console (**Release** → **Setup** → **App integrity** / **App signing**, or use Help and search “upload key”). After Google approves, you create a **new** upload keystore, register its certificate with Play, and put that in `keystore.properties` for every future build. If the app was **never** enrolled in Play App Signing and the **original** signing key is gone, contact **[Google Play support](https://support.google.com/googleplay/android-developer/gethelp)** — recovery may not be possible.

#### Upload key reset — what to do in Play Console + generate PEM

Use this when Console shows **Request upload key reset** and asks for a **PEM** (same flow as Google’s `keytool -export -rfc ...` example).

1. **Play Console** → **App integrity** → **Request upload key reset**.
2. **Reason** — Pick the one that matches your situation, for example **I lost my upload key** or **I forgot the password to my keystore** (any honest option is fine).
3. **Generate the new key on your Mac** (from the **repository root**):

   ```bash
   ./scripts/generate-play-upload-key.sh
   ```

   Enter a **strong password** twice when prompted and **save it** (password manager). The script creates:
   - `android/upload-keystore.jks` — private keystore (**never commit**; already in `.gitignore`)
   - `android/upload_certificate.pem` — **upload this file** when Play asks for the new upload certificate

   The script uses **alias `upload`** and the same idea as Google’s command:

   `keytool -export -rfc -keystore upload-keystore.jks -alias upload -file upload_certificate.pem`

4. **Submit** the reset in Play Console with the PEM attached / uploaded as instructed.
5. **Wait for approval** (email from Google). Do **not** upload a new AAB signed with the new key until the reset is **approved** — until then Play still expects the old upload certificate.
6. **After approval**, create `android/keystore.properties`. If you moved the keystore into `android/seceett/` (recommended local backup folder; that directory is **gitignored**), use:

   ```properties
   storeFile=seceett/upload-keystore.jks
   storePassword=YOUR_PASSWORD_FROM_THE_SCRIPT
   keyAlias=upload
   keyPassword=YOUR_PASSWORD_FROM_THE_SCRIPT
   ```

   If the `.jks` stays in `android/`, use `storeFile=upload-keystore.jks` instead.

7. Bump `versionCode` if needed, run `npm run build:aab`, then upload `app-release.aab` to your release track.

### Step 4 — Android SDK path (local build)

Gradle needs the Android SDK. If `android/local.properties` is missing, create it (this file is gitignored):

```properties
sdk.dir=/path/to/your/Android/sdk
```

On many Macs: `sdk.dir=/Users/YOUR_USER/Library/Android/sdk`

### Step 5 — Install dependencies and build the AAB

From the **repository root**:

```bash
# Use JDK 17 or 21 (adjust path if yours differs)
export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home"

npm install
npm run build:aab
```

This runs `scripts/build-aab.sh`, which cleans relevant caches and runs `./gradlew bundleRelease`.

**Output file:**

`android/app/build/outputs/bundle/release/app-release.aab`

### Step 6 — Quick check before upload

- If you still get “wrong key” on Play, you are almost certainly signing with **debug**. Verify `android/keystore.properties` exists, paths/passwords/alias are correct, and rebuild.
- Optional: inspect signing on the bundle (look for your certificate, not `CN=Android Debug`):

  ```bash
  jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab 2>&1 | head -50
  ```

### Step 7 — Upload in Google Play Console

1. Open [Play Console](https://play.google.com/console) → your app.
2. Go to **Release** → choose **Production** (or **Testing** track first if you prefer internal/closed testing).
3. **Create new release**.
4. **Upload** `app-release.aab`.
5. Wait for processing. Fix any **errors** (red). Warnings may be acceptable; read each one.
6. Add **Release notes** (per language as required).
7. **Review release** → **Start rollout to Production** (or save to testing track first).

Google may take from hours up to a few days to **review** the update; you will get notifications when the release is approved or if something is rejected.

### If you lost the upload keystore entirely

See **If you forgot the keystore file or passwords** under Step 3 above (upload key reset with Play App Signing, where to look for backups, and when to contact Play support).

**Security:** Never commit `keystore.properties`, `.jks`, or `.keystore` files. They are listed in `android/.gitignore`.

---

## 🌟 Features to Implement

Based on iOS app, these features will be added:

### 1. **Authentication** 🔐
- [ ] Phone number login
- [ ] Google OAuth
- [ ] Apple Sign-In (iOS only)
- [ ] Biometric authentication
- [ ] Session management

### 2. **AI Project Generator** 🤖
- [ ] Conversational AI flow
- [ ] OpenAI integration
- [ ] Phase generation
- [ ] Budget calculation

### 3. **Project Management** 📋
- [ ] Create projects
- [ ] View projects
- [ ] Phase tracking
- [ ] Budget breakdown

### 4. **Digital Signatures** ✍️
- [ ] SignIt API integration
- [ ] Document upload
- [ ] Signature requests
- [ ] Status tracking

### 5. **Notifications** 🔔
- [ ] Firebase notifications
- [ ] Push notifications
- [ ] Real-time updates
- [ ] Notification center

### 6. **Payments** 💰
- [ ] Phase-based payments
- [ ] Payment processing
- [ ] Transaction history
- [ ] Invoice generation

### 7. **Chat** 💬
- [ ] Real-time messaging
- [ ] Firebase Firestore
- [ ] Media sharing
- [ ] Chat history

---

## 🎯 Development Roadmap

### Phase 1: Foundation ✅ (Current)
- [x] Initialize Expo app
- [x] Setup web support
- [x] Setup Android support
- [x] Create welcome screen
- [x] Basic navigation

### Phase 2: Authentication 🔄 (Next)
- [ ] Login screen UI
- [ ] Phone authentication
- [ ] Social logins
- [ ] Session management
- [ ] Protected routes

### Phase 3: Core Features
- [ ] Home screen
- [ ] Project creation
- [ ] AI integration
- [ ] Project listing

### Phase 4: Advanced Features
- [ ] Digital signatures
- [ ] Phase management
- [ ] Notifications
- [ ] Chat system

### Phase 5: Payments & Polish
- [ ] Payment integration
- [ ] UI refinements
- [ ] Performance optimization
- [ ] Testing

---

## 🌐 Running on Web

### Start Web Server
```bash
npm run web
```

### Features on Web:
- ✅ Full React Native code runs in browser
- ✅ Responsive design
- ✅ CSS box-shadows
- ✅ Mouse interactions
- ✅ Keyboard navigation
- ✅ Works on any modern browser

### Web-Specific Styling
```typescript
Platform.select({
  web: {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
})
```

---

## 🤖 Running on Android

### Prerequisites
1. **Android Studio** installed
2. **Android SDK** installed
3. **Emulator** created OR **physical device** connected

### Start Android App
```bash
npm run android
```

### First Time Setup
1. Install Android Studio
2. Open Android Studio → SDK Manager
3. Install Android SDK (API 34 or higher)
4. Create virtual device (AVD)
5. Start emulator
6. Run `npm run android`

### Android-Specific Features
- ✅ Native Android components
- ✅ Material Design
- ✅ Touch gestures
- ✅ Elevation shadows
- ✅ Android navigation

---

## 🔄 Platform Detection

The app uses `Platform.OS` to detect platform:

```typescript
if (Platform.OS === 'web') {
  // Web-specific code
} else if (Platform.OS === 'android') {
  // Android-specific code
} else if (Platform.OS === 'ios') {
  // iOS-specific code
}
```

---

## 📸 Screenshots

### Welcome Screen
```
┌─────────────────────────────────────┐
│                                     │
│          🏗️ (Blue Circle)          │
│                                     │
│           Bonyad                    │
│  Construction Project Management    │
│                                     │
│     🌐 Web Version                  │
│                                     │
│  🤖 AI Project Generator            │
│  💰 Phase-based Payments            │
│  ✍️ Digital Signatures              │
│  🔔 Real-time Notifications         │
│                                     │
│  [ Get Started ]                    │
│                                     │
│  Ready for Web & Android            │
└─────────────────────────────────────┘
```

---

## 🛠️ Next Steps

### Immediate (After Setup)
1. Create folder structure (`src/screens`, `src/components`, etc.)
2. Install navigation library
3. Setup API configuration
4. Create design system

### Short Term
1. Implement login screen
2. Add Firebase integration
3. Create home screen
4. Add navigation

### Long Term
1. Port all iOS features
2. Add Android-specific features
3. Optimize for web
4. Deploy to production

---

## 📚 Resources

### Expo Documentation
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)

### Tutorials
- [Expo Web Setup](https://docs.expo.dev/workflow/web/)
- [Android Development](https://docs.expo.dev/workflow/android-studio-emulator/)
- [TypeScript with React Native](https://reactnative.dev/docs/typescript)

---

## 🎉 Success!

Your React Native Expo app is ready! 

✅ **Initialized** - Expo app created  
✅ **Web Support** - Runs in browser  
✅ **Android Support** - Runs on Android  
✅ **TypeScript** - Type safety enabled  
✅ **Welcome Screen** - Beautiful landing page  
✅ **Ready** - Foundation for all iOS features  

**Run `npm run web` to see it live!** 🚀
