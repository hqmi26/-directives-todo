import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.directives.todo',
  appName: 'Directives',
  webDir: 'public',
  server: {
    url: 'https://directives-todo.vercel.app',
    cleartext: true
  }
};

export default config;
