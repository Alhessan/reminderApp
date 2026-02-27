import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.routineloop',
  appName: 'RoutineLoop',
  webDir: 'www',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_launcher_foreground',
      iconColor: '#667eea',
    },
  },
};

export default config;
