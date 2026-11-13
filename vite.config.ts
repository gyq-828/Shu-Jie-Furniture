import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://shu-jie-furniture.pages.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
