import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.alhessan.routineloop',
  appName: 'RoutineLoop',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      // IMPORTANT: 0 disables launch-time SplashScreen plugin handling (incl. Android 12 API hold).
      // We rely on AppTheme.NoActionBarLaunch windowBackground for a full-page native splash.
      launchShowDuration: 0,
      launchAutoHide: true,
      showSpinner: false,
      // Match launch background tone for smoother Android 12 transition.
      backgroundColor: '#1F3442',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      // Programmatic overlay (if SplashScreen.show() is used at runtime)
      androidSplashResourceName: 'splash_man',
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
