import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.routineloop',
  appName: 'RoutineLoop',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000, // Give it time to show
      launchAutoHide: true,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP', // Use CENTER_CROP to fill the screen
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
