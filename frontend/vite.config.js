import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path for production deployment (cPanel)
const base = process.env.NODE_ENV === 'production' 
  ? (process.env.VITE_BASE_PATH || '/statement/')
  : '/';

export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});

