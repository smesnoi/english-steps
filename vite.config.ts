import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { webllmAssistant } from '@arronqzy/abuilder/vite';

export default defineConfig({
  base: '/english-steps/',
  plugins: [
    react(),
    webllmAssistant(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // Отключаем минификацию, чтобы Vite не "вырезал" внутренние переменные WebLLM
    minify: false, 
  },
});