# Run the Android app (with latest changes)

All code changes (project flow, filters, visit accept/reject, create project backend, etc.) live in **this folder** (`bonyad-android-updated-/`). You must start the app from here to see them.

## Android: use only the enumerator server

**For Android, use only the enumerator dev server (port 8083).** Do not use the default `npm start` (port 8081) for Android.

```bash
cd bonyad-android-updated-
npm install   # if needed
npm run start:enumerator
```

This runs the dev server on **port 8083** with cache cleared. Then:

- On the enumerator device (same Wi‑Fi as your machine): open Expo Go and connect to `exp://<your-machine-ip>:8083`, or scan the QR code.
- Press **`a`** to open on Android emulator, or
- Run `npx expo run:android` in another terminal for a native debug build.

## Web / other (default port 8081)

For web or when you don’t need Android, you can use:

```bash
cd bonyad-android-updated-
npx expo start --clear
```

Use this for web or iOS. **Do not use this run for Android** — use `npm run start:enumerator` for Android.

## If you still don’t see changes

- In the Expo dev client / Expo Go: **shake device** → **Reload**, or press **`r`** in the terminal.
- For Android: run again with `npm run start:enumerator` (enumerator server on 8083).

## Don’t run from repo root

If you run `npm start` or `expo start` from `website-bonyad/` (repo root), you get the **root** app, which is a different codebase and does **not** include the Android-specific changes. For Android, always run from `bonyad-android-updated-/` with `npm run start:enumerator`.
