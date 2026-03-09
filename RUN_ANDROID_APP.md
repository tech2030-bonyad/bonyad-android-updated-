# Run the Android app (with latest changes)

All code changes (project flow, filters, visit accept/reject, create project backend, etc.) live in **this folder** (`bonyad-android-updated-/`). You must start the app from here to see them.

## From terminal

```bash
# 1. Go into the Android app folder
cd bonyad-android-updated-

# 2. Install dependencies (if needed)
npm install

# 3. Start with cache cleared (so you see latest code)
npx expo start --clear
```

**Connect the enumerator on port 8083:**

```bash
cd bonyad-android-updated-
npm run start:enumerator
```

This runs the dev server on **port 8083** with cache cleared. On the enumerator device (same Wi‑Fi as your machine), open Expo Go and connect to `exp://<your-machine-ip>:8083`, or scan the QR code shown in the terminal.

Then:

- Press **`a`** to open on Android emulator, or
- Scan the QR code with Expo Go on a physical device (same network), or
- Run `npx expo run:android` in another terminal for a native debug build.

## If you still don’t see changes

- In the Expo dev client / Expo Go: **shake device** → **Reload**, or press **`r`** in the terminal.
- Or run again with cache clear: `npx expo start --clear`.

## Don’t run from repo root

If you run `npm start` or `expo start` from `website-bonyad/` (repo root), you get the **root** app, which is a different codebase and does **not** include the Android-specific changes.
