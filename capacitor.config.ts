import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.routineloop',
  appName: 'RoutineLoop',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0, // Skip Capacitor splash — use native splash only
      launchAutoHide: true,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher_foreground',
    },
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
  },
};

export default config;
