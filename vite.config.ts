import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Deadline Dashboard',
        short_name: 'Deadlines',
        description: 'Track deadlines, tasks, Pomodoro sessions, notes, and milestones.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        shortcuts: [
          {
            name: 'Today',
            short_name: 'Today',
            description: "View today's plan",
            url: '/?view=today',
            icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
          },
          {
            name: 'New task',
            short_name: 'New task',
            description: 'Quick capture a new task',
            url: '/?view=inbox&capture=1',
            icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
          },
          {
            name: 'Focus mode',
            short_name: 'Focus',
            description: 'Start a focus session',
            url: '/?view=today&focus=1',
            icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
          },
        ],
        share_target: {
          action: '/?share-target',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
});