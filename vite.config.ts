import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Alias ayarları (MUI + Recharts)
  resolve: {
    alias: {
      'recharts': 'recharts/es6'
    }
  },
  // Yerel geliştirme sırasında API çağrılarını backend'e iletmek için proxy tanımları
  server: {
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/yahoo/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      },
      '/api/exchangerate': {
        target: 'https://api.exchangerate-api.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/exchangerate/, '')
      },
      '/api/tefas': {
        target: 'https://www.tefas.gov.tr',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/tefas/, '')
      },
      '/api/swissquote': {
        target: 'https://forex-data-feed.swissquote.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/swissquote/, '')
      }
    }
  },
  optimizeDeps: {
    include: [
      '@mui/material',
      'recharts'
    ]
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  }
})
