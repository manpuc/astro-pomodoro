import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import AstroPwa from '@vite-pwa/astro'
import vercel from '@astrojs/vercel'

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://pomodoro.manpuc.me',
  output: 'static',
  adapter: vercel({
    webAnalytics: {
      enabled: false, // Using Cloudflare instead
    },
  }),
  integrations: [react(), AstroPwa({
    registerType: 'autoUpdate',
    injectRegister: false,
    workbox: {
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
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30日
            },
            cacheableResponse: { statuses: [0, 200] },
          },
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
              maxAgeSeconds: 60 * 60 * 24 * 60, // 60日
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/(css2|icon).*/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
            },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
  }), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
})