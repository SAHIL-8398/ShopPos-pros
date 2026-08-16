V6import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shoppos.pro',
  appName: 'ShopPOS Pro',
  webDir: 'dist',
  backgroundColor: '#00000000',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    Filesystem: {}
  }
};

export default config;
