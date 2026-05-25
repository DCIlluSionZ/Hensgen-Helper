import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hensgen.helper',
  appName: 'Hensgen Helper',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
