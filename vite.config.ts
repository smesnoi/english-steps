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
  worker: {
    format: 'es',
    plugins: () => [
      {
        name: 'externalize-web-llm',
        resolveId(id) {
          if (id === '@mlc-ai/web-llm') {
            return { id, external: true };
          }
        },
      },
    ],
  },
  build: {
    rollupOptions: {
      external: ['@mlc-ai/web-llm'],
    },
  },
});