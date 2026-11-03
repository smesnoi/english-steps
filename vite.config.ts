import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: '/english-steps/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
  },
  build: {
    minify: false,
    rollupOptions: {
      external: ['@mlc-ai/web-llm'],
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      external: ['@mlc-ai/web-llm'],
    },
  },
});