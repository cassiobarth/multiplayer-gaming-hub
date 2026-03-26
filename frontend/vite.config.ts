import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Super Serious Family Game Hub',
        short_name: 'GameHub',
        description: 'Prepare to humiliate your family in these highly competitive (but totally chill) games.',
        theme_color: '#1e1b4b',
        background_color: '#1e1b4b',
        display: 'standalone',
        icons: [
          {
             src: 'favicon.svg',
             sizes: '512x512',
             type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  server: {
    allowedHosts: true
  }
})
