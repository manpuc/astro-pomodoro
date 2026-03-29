import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import AstroPwa from '@vite-pwa/astro';

// アダプターや出力環境に応じた出力先ディレクトリ判定
const getGlobDirectory = () => {
  if (process.env.VERCEL) return '.vercel/output/static';
  if (process.env.NETLIFY) return 'dist';
  return 'dist';
};

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [
    react(),
    AstroPwa({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Pomodoro Timer',
        short_name: 'Pomodoro',
        description: 'A simple Pomodoro timer',
        theme_color: '#1a1b26',
        background_color: '#1a1b26',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globDirectory: getGlobDirectory(),
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => 
              request.destination === 'document' || 
              request.destination === 'script' || 
              request.destination === 'style',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-css-js-network-first',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30日
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: ({ request }) => 
              request.destination === 'image' || 
              request.destination === 'manifest' ||
              request.destination === 'audio',
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets-cache-first',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 60 // 60日
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/(css2|icon).*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],
  vite: {
    plugins: [
      tailwindcss(),
    ]
  }
});
