import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      base: './',
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: [
        'icons/apple-touch-icon.svg',
        'icons/favicon.svg',
        'icons/hk-icon-192.svg',
        'icons/hk-icon-512.svg',
      ],
      manifest: {
        name: 'Hollow Knight Damage Tracker',
        short_name: 'HK Damage',
        description:
          'Track Hollow Knight damage values and plan combat strategies on the go.',
        start_url: '/hollow-knight-damage-tracker/',
        scope: '/hollow-knight-damage-tracker/',
        display: 'standalone',
        background_color: '#0b0d1c',
        theme_color: '#0b0d1c',
        icons: [
          {
            src: './icons/hk-icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: './icons/hk-icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,txt,woff2}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    open: true,
  },
  preview: {
    port: 4173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Resolve setup file relative to this config file to avoid monorepo root issues
    setupFiles: fileURLToPath(new URL('./vitest.setup.ts', import.meta.url)),
    css: true,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/vite-env.d.ts'],
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
});
