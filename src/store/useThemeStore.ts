import { create } from 'zustand';
import { STORAGE_KEYS, loadString, saveString } from '@/utils/storage';

export type Theme = 'light' | 'dark' | 'system';
/** Реальная тема после разрешения 'system'. */
export type ResolvedTheme = 'light' | 'dark';

const THEMES: readonly Theme[] = ['light', 'dark', 'system'];
const DARK_QUERY = '(prefers-color-scheme: dark)';

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as readonly string[]).includes(value);
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DARK_QUERY).matches
  );
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return theme;
}

/** Тема хранится как обычная строка (не JSON): её читает скрипт в index.html. */
function loadTheme(): Theme {
  const saved = loadString(STORAGE_KEYS.theme);
  return isTheme(saved) ? saved : 'system';
}

interface ThemeState {
  theme: Theme;
  /** Тема, которая применена на самом деле (для иконки в переключателе) */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  /** Ставит или снимает класс "dark" на <html> согласно текущей теме */
  applyTheme: () => void;
}

const initialTheme = loadTheme();

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: initialTheme,
  resolvedTheme: resolveTheme(initialTheme),

  setTheme: (theme) => {
    set({ theme });
    // Если сохранить не удалось (например, приватный режим), тема всё равно применится до закрытия вкладки
    saveString(STORAGE_KEYS.theme, theme);
    get().applyTheme();
  },

  applyTheme: () => {
    const resolvedTheme = resolveTheme(get().theme);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
    }
    set({ resolvedTheme });
  },
}));

// При загрузке модуля: применяем тему и один раз подписываемся на смену системной.
// Слушатель живёт всё время работы приложения, поэтому отписка не нужна.
if (typeof window !== 'undefined') {
  useThemeStore.getState().applyTheme();

  if (typeof window.matchMedia === 'function') {
    window.matchMedia(DARK_QUERY).addEventListener('change', () => {
      const { theme, applyTheme } = useThemeStore.getState();
      if (theme === 'system') applyTheme();
    });
  }
}

export function useTheme(): Theme {
  return useThemeStore((state) => state.theme);
}

export function useResolvedTheme(): ResolvedTheme {
  return useThemeStore((state) => state.resolvedTheme);
}
