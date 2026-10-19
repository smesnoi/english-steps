/**
 * Безопасная обёртка над localStorage.
 * localStorage может быть недоступен (приватный режим, запрет в настройках),
 * переполнен или содержать повреждённые данные — во всех этих случаях
 * приложение не должно падать, а просто работает со значениями по умолчанию.
 */

/** Все ключи в одном месте, чтобы не разъезжались строки по проекту. */
export const STORAGE_KEYS = {
  /** Хранится как обычная строка "light" | "dark" — её читает скрипт в index.html */
  theme: 'english-app:theme',
  words: 'english-app:words',
  srs: 'english-app:srs',
  dailyStats: 'english-app:daily-stats',
  /** true, когда стартовый набор уже записан в words: так удалённые слова не возвращаются после перезагрузки */
  seeded: 'english-app:seeded',
} as const;

/** Читает JSON и проверяет форму данных. При любой проблеме возвращает fallback. */
export function loadFromStorage<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** Сохраняет значение как JSON. Возвращает false, если записать не удалось. */
export function saveToStorage(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Читает «сырую» строку без JSON-разбора (нужно для темы). */
export function loadString(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Сохраняет «сырую» строку без JSON-кодирования. */
export function saveString(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeFromStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ничего не делаем: удалять нечего или хранилище недоступно */
  }
}
