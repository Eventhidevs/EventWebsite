import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copy } from 'fs-extra';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-data-files',
      writeBundle() {
        copy('data', 'dist/data');
      },
    },
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
