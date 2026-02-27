# Reminder App – Setup & Run (First Time on This Device)

This project is an **Ionic 8 + Angular 19 + Capacitor 7** app. Follow these steps to install tools and run it on your machine and (optionally) on an Android device or emulator.

---

## 1. Prerequisites

- **Node.js** – LTS 20.x or 22.x (Angular 19 works with Node 18.19+, 20.11+, or 22+).  
  - Check: `node -v`  
  - Install from [nodejs.org](https://nodejs.org/) or use [nvm-windows](https://github.com/coreybutler/nvm-windows) / [fnm](https://github.com/Schniz/fnm).

- **npm** – Comes with Node. Check: `npm -v`

- **For Android device/emulator only:**  
  - **Android Studio** (includes Android SDK and emulator): [developer.android.com/studio](https://developer.android.com/studio)  
  - **Java 17** (usually bundled with Android Studio)

---

## 2. Install project dependencies

Open a terminal in the project root (`reminderApp`) and run:

```bash
npm install
```

This installs Angular CLI, Ionic, Capacitor, and all app dependencies. You do **not** need to install the Ionic CLI globally for normal development.

---

## 3. Run in the browser (fastest way to try the app)

From the project root:

```bash
npm start
```

Or:

```bash
npx ng serve
```

- App will be at **http://localhost:4200**
- Open it in a browser. Some features (e.g. local notifications, SQLite) behave differently or are limited in the browser; for full behavior use an Android device or emulator.

---

## 4. Run on an Android device or emulator (Capacitor)

### 4.1 Build the web app

```bash
npm run build
```

(or `npx ng build`). Output goes to the `www` folder.

### 4.2 Sync native project (first time and after adding Capacitor plugins)

```bash
npx cap sync android
```

This copies the built app from `www` into the Android project and updates native dependencies.

### 4.3 Open in Android Studio and run

```bash
npx cap open android
```

- Android Studio will open with the `android` project.
- Wait for Gradle sync to finish.
- Choose either:
  - **Device**: Connect a phone via USB with USB debugging enabled, and click **Run** (green play).
  - **Emulator**: Create/start an AVD (Device Manager), then click **Run**.

The app will install and launch on the device/emulator. This is the first-time flow for running on “this device” (your machine + Android).

### Optional: run from the command line (after sync)

If you already have an emulator running or a device connected:

```bash
npx cap run android
```

---

## 5. Useful commands

| Command | Purpose |
|--------|--------|
| `npm start` | Run dev server at http://localhost:4200 |
| `npm run build` | Production build → `www/` |
| `npx cap sync android` | Copy `www` to Android and sync plugins |
| `npx cap open android` | Open Android project in Android Studio |
| `npx cap run android` | Build and run on connected device/emulator |
| `npm run lint` | Run ESLint |

---

## 6. First run on the device

- **Notifications**: When you open the app on a real device, it may ask for **notification permission**. Allow it so reminders can be shown.
- **If notifications don’t appear on a real phone** (but work in emulator/browser): Rebuild and reinstall after code changes. Then: (1) **Allow** when the app asks for notification permission at first launch. (2) **Settings → Apps → [RoutineLoop] → Notifications** — ensure they’re on. (3) On Android 12+, **Settings → Apps → [RoutineLoop]** — if you see **Alarms & reminders**, allow it so exact reminders can fire. (4) **Settings → Battery** (or **Battery → [App]**) → set app to **Unrestricted** (or “Don’t optimize”) so the app can run in the background.
- **Data**: The app uses **local SQLite** (no backend). Data stays on the device.
- If the app was built before with a different `appId`, you may need to uninstall the old app from the device before installing again.

---

## 7. Troubleshooting

- **`ng` not found**  
  Use `npx ng` (e.g. `npx ng serve`, `npx ng build`) so the project’s local Angular CLI is used.

- **Gradle / Android build errors**  
  Open the project in Android Studio (`npx cap open android`), use **File → Invalidate Caches / Restart** if needed, and ensure Android SDK and Java 17 are installed.

- **"Java home supplied is invalid" (org.gradle.java.home)**  
  The project no longer hardcodes a JDK path. Use one of these:
  - Let Android Studio use its **embedded JDK**: **File → Settings → Build, Execution, Deployment → Build Tools → Gradle** → set **Gradle JDK** to a valid JDK (e.g. "jbr-17" or "Embedded JDK").
  - Or set **JAVA_HOME** to a Java 17 install (e.g. `C:\Program Files\Android\Android Studio\jbr` or your own JDK 17).
  Then **File → Invalidate Caches / Restart** and sync again.

- **App shows blank screen on device**  
  Run `npm run build` then `npx cap sync android` again and redeploy from Android Studio.

- **Node version**  
  If you see Node-related errors, switch to Node 20 LTS or 22 and run `npm install` again.
