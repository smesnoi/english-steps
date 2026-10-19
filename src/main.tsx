import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { useWordStore } from '@/store/useWordStore';
import './index.css';

// Тема применяется при импорте useThemeStore (его подключает Navbar), отдельный вызов не нужен.

// Загружаем слова и прогресс до первого рендера: localStorage синхронный,
// поэтому на экране не будет мигания пустого состояния.
useWordStore.getState().hydrate();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Не найден корневой элемент #root в index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
