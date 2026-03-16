import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',   // import '@/hooks/useAuth' au lieu de '../../hooks/useAuth'
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API vers Django en développement
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
});