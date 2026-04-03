import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  // nginx proxies with Host: leadstack.jp; Vite 5+ blocks unknown hosts unless allowed.
  preview: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    allowedHosts: true
  }
})
