# Choner Mobile App

An **Expo React Native** app (iOS + Android, with web support) backed by **Supabase** (auth, database, storage, realtime, Edge Functions), **RevenueCat** (in-app purchases), **Sentry** + **PostHog** (observability), and **Resend** (transactional email).

- **Framework:** Expo SDK 52 · React Native 0.76 · Expo Router 4
- **Language:** TypeScript
- **State/data:** TanStack Query · Zustand · React Hook Form + Zod

---

## Run it locally

The fastest way to run the app is with **Expo Go** on a physical phone — no Xcode or Android Studio required. Native builds (`run:ios` / `run:android`) are only needed when you change native code or native dependencies.

### 1. Prerequisites (Windows & macOS)

| Tool | Version | Notes |
| --- | --- | --- |
| **Node.js** | 20 LTS or newer (22 recommended) | Use [nvm](https://github.com/nvm-sh/nvm) (macOS) / [nvm-windows](https://github.com/coreybutler/nvm-windows) (Windows) |
| **Git** | any recent | |
| **Expo Go app** | latest | Install on your iOS/Android phone from the App Store / Play Store |
| **Watchman** _(macOS only, optional)_ | latest | `brew install watchman` — improves file watching |

> **Tip:** Verify your setup at any time with `npx expo-doctor`.

### 2. Clone & install

**macOS / Linux (Terminal):**

```bash
git clone https://github.com/gayanSandamal/choner-reimagined.git
cd choner-reimagined
npm install
cp .env.example .env
```

**Windows (PowerShell):**

```powershell
git clone https://github.com/gayanSandamal/choner-reimagined.git
cd choner-reimagined
npm install
Copy-Item .env.example .env
```

### 3. Configure environment variables

Open the newly created `.env` and fill in at least the **required** values:

```ini
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
EXPO_PUBLIC_ENV=development
```

The remaining keys (RevenueCat, Sentry, PostHog, Resend) are optional for local development — the app degrades gracefully when they're blank. See [Supabase setup](#supabase-setup) below if you need your own backend.

### 4. Start the dev server

```bash
npm run start
```

This launches the Expo dev server and shows a **QR code** plus a menu in the terminal.

- **On a phone:** open **Expo Go** and scan the QR code (iOS: use the Camera app; Android: scan from inside Expo Go). Phone and computer must be on the **same Wi-Fi network**.
- **Press `w`** in the terminal to open the app in your **web browser**.
- **Press `i`** to open the **iOS Simulator** (macOS only — requires Xcode).
- **Press `a`** to open the **Android Emulator** (requires Android Studio).

That's it for everyday development. 🎉

---

## Platform-specific native builds (optional)

You only need these if you're modifying native modules or want a full native build instead of Expo Go.

### macOS — iOS

1. Install **Xcode** from the App Store, then its command-line tools:
   ```bash
   xcode-select --install
   ```
2. Install CocoaPods:
   ```bash
   sudo gem install cocoapods
   ```
3. Build & run on the iOS Simulator:
   ```bash
   npm run ios
   ```

> iOS builds are **macOS-only** — Apple does not support building iOS apps on Windows.

### Windows & macOS — Android

1. Install **[Android Studio](https://developer.android.com/studio)** and, via its SDK Manager, the latest **Android SDK** + a **virtual device (AVD)**.
2. Set the `ANDROID_HOME` environment variable and add platform tools to your `PATH`:
   - **macOS** (`~/.zshrc`):
     ```bash
     export ANDROID_HOME=$HOME/Library/Android/sdk
     export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
     ```
   - **Windows** (System Environment Variables): set `ANDROID_HOME` to `C:\Users\<you>\AppData\Local\Android\Sdk` and add `%ANDROID_HOME%\platform-tools` to `Path`.
3. Start an emulator (or plug in a device with USB debugging enabled), then:
   ```bash
   npm run android
   ```

---

## Available scripts

| Command | What it does |
| --- | --- |
| `npm run start` | Start the Expo dev server (QR code / dev menu) |
| `npm run ios` | Build & run on the iOS Simulator (macOS only) |
| `npm run android` | Build & run on the Android emulator/device |
| `npm run web` | Run the app in a browser |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Run the Jest test suite |
| `npm run format` | Format the codebase with Prettier |

---

## Supabase setup

To run against your own backend:

1. Create a project at [supabase.com](https://supabase.com) and copy its **URL** and **anon key** into `.env`.
2. Apply the SQL migrations in [`supabase/migrations/`](supabase/migrations/) (via the Supabase SQL editor or the [Supabase CLI](https://supabase.com/docs/guides/cli)).
3. Deploy the Edge Functions in [`supabase/functions/`](supabase/functions/) (e.g. `invite-email`, `ai-coach`, `send-push`, `revenuecat-webhook`).
4. Set server-only secrets (never put these in `.env`):
   ```bash
   supabase secrets set RESEND_API_KEY=... OPENAI_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=...
   ```
   See the commented section at the bottom of `.env.example` for the full list.

---

## Troubleshooting

- **Metro bundler acting up / stale cache:** restart with `npx expo start -c` to clear the cache.
- **Phone can't reach the dev server:** ensure phone and computer are on the same network; on restrictive networks try `npx expo start --tunnel`.
- **Environment check:** run `npx expo-doctor` to diagnose version/dependency issues.
- **Native build errors after dependency changes:** delete `node_modules` and reinstall (`npm install`), and on iOS re-run `pod install` inside `ios/`.

---

## Project structure

```
app/          Screens & routes (Expo Router)
components/    Reusable UI + feature components
features/     Feature modules
providers/    App-wide context providers
lib/          Utilities (haptics, motion, clients, etc.)
constants/    Theme and shared constants
supabase/     SQL migrations & Edge Functions
docs/         Architecture notes & shipping checklist
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/SHIPPING_CHECKLIST.md`](docs/SHIPPING_CHECKLIST.md) for deeper detail.
