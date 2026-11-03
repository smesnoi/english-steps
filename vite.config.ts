import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { webllmAssistant } from '@arronqzy/abuilder/vite';

export default defineConfig({
  base: '/english-steps/',
  plugins: [
    react(),
    webllmAssistant(), // <-- Плагин для WebLLM
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  // Убираем external, чтобы WebLLM собрался в бандл
});