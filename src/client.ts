import { registerSW } from 'virtual:pwa-register';

// PWA Service Worker の登録
// 'virtual:pwa-register' は Vite プラグインによって提供されます
if (typeof registerSW === 'function') {
  try {
    registerSW({
      onNeedRefresh() {
        if (import.meta.env.DEV) {
          console.debug('New content is available; it will be used on the next reload.');
        }
      },
      onOfflineReady() {
        if (import.meta.env.DEV) {
          console.debug('App is offline-ready');
        }
      },
    });
  } catch (error) {
    console.error('PWA registration failed:', error);
  }
} else if (import.meta.env.DEV) {
  console.warn('PWA registerSW is not available. This is expected in some development environments.');
}
