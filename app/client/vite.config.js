import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({

  envDir: '../../',
  
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['robot-fondo-negro.svg', 'robot-arrow.svg'], 
      manifest: {
        name: 'AgroSkopos',
        short_name: 'AgroSkopos',
        description: 'Robot Agrícola',
        theme_color: '#10b981',
        background_color: '#1e293b',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-icons/android/launchericon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-icons/android/launchericon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4000000 
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    host: true, 
    port: 5173
  }
})