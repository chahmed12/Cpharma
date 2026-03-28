import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API vers Django en développement
      '/api': {
        target: 'http://backend:8000',
        // Pas de changeOrigin pour que Django reçoive 'localhost' comme Host
        // et construise correctement les URLs absolues des médias.
      },
      '/ws': {
        target: 'ws://backend:8000',
        ws: true,
      },
      // Proxy pour les fichiers médias uploadés (ex: photos des docteurs)
      '/media': {
        target: 'http://backend:8000',
      },
    },
  },
});