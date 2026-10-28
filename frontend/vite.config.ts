import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // Proxy WebSocket connections during local development so that the
      // browser talks to ws://localhost:5173/ws/voice and Vite forwards it
      // to the Spring Boot backend on port 8080.
      // In production this proxy is not used; VITE_WS_URL takes over.
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
