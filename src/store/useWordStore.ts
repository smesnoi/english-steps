import { useMemo } from 'react';
import { create } from 'zustand';
import { STARTER_WORDS } from '@/data/words';
import type { Box, Level, SrsMap, SrsState, Word, WordStatus } from '@/types';
import { calculateStreak, toDayKey } from '@/utils/date';
import {
  applyAnswer,
  buildStudyQueue,
  getStatus,
  isDue,
  type StudyQueueOptions,
} from '@/utils/srs';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '@/utils/storage';

// ───────────────────────────── Типы ─────────────────────────────

/** Статистика за один день. */
export interface DayStats {
  /** Сколько слов просмотрено (сейчас растёт на 1 с каждым ответом, как и total) */
  studied: number;
  /** Сколько ответов было верных */
  correct: number;
  /** Сколько всего ответов */
  total: number;
  /**
   * Сколько слов было в статусе «выучено» на конец этого дня (снимок, а не прирост).
   * Нужен для графика прогресса. Слово может и войти в learned, и выйти из него.
   */
  learnedCount: number;
}

/** Ключ — день в формате toDayKey(): "2026-10-13". */
export type DailyStats = Record<string, DayStats>;

export interface NewWordInput {
  en: string;
  ru: string;
  transcription: string;
  level: Level;
  example: string;
  exampleTranslation: string;
}

/** Слово + вычисленные из srs статус и коробка (для страницы словаря). */
export type WordWithStatus = Word & { srsStatus: WordStatus; box: Box | null };

// ───────────────────────── Валидаторы ─────────────────────────
// Данные из localStorage могут быть повреждены или устареть — проверяем форму.

const LEVELS: readonly Level[] = ['A1', 'A2', 'B1'];
const STATUSES: readonly WordStatus[] = ['new', 'learning', 'learned'];
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isLevel(value: unknown): value is Level {
  return (LEVELS as readonly unknown[]).includes(value);
}

function isWordStatus(value: unknown): value is WordStatus {
  return (STATUSES as readonly unknown[]).includes(value);
}

function isWord(value: unknown): value is Word {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.en) &&
    isNonEmptyString(value.ru) &&
    typeof value.transcription === 'string' &&
    typeof value.example === 'string' &&
    typeof value.exampleTranslation === 'string' &&
    isLevel(value.level) &&
    isWordStatus(value.status) &&
    isCount(value.correctCount) &&
    isCount(value.wrongCount)
  );
}

function isWordArray(value: unknown): value is Word[] {
  if (!Array.isArray(value)) return false;
  const items: unknown[] = value;
  if (!items.every(isWord)) return false;
  // Одинаковые id сломали бы прогресс: такие данные считаем повреждёнными
  return new Set(items.map((item) => (item as Word).id)).size === items.length;
}

function isSrsState(value: unknown): value is SrsState {
  if (!isRecord(value)) return false;
  const { box, nextReviewAt } = value;
  return (
    typeof box === 'number' &&
    Number.isInteger(box) &&
    box >= 0 &&
    box <= 5 &&
    typeof nextReviewAt === 'number' &&
    Number.isFinite(nextReviewAt)
  );
}

function isSrsMap(value: unknown): value is SrsMap {
  return isRecord(value) && Object.values(value).every(isSrsState);
}

/** День из хранилища: старые записи могут быть без learnedCount. */
type StoredDayStats = Omit<DayStats, 'learnedCount'> & { learnedCount?: number };
type StoredDailyStats = Record<string, StoredDayStats>;

function isStoredDayStats(value: unknown): value is StoredDayStats {
  if (!isRecord(value)) return false;
  return (
    isCount(value.studied) &&
    isCount(value.correct) &&
    isCount(value.total) &&
    (value.learnedCount === undefined || isCount(value.learnedCount))
  );
}

function isStoredDailyStats(value: unknown): value is StoredDailyStats {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(
    ([dayKey, day]) => DAY_KEY_PATTERN.test(dayKey) && isStoredDayStats(day),
  );
}

/** Старым записям без learnedCount подставляем 0. */
function normalizeDailyStats(stored: StoredDailyStats): DailyStats {
  const result: DailyStats = {};
  for (const [dayKey, day] of Object.entries(stored)) {
    result[dayKey] = {
      studied: day.studied,
      correct: day.correct,
      total: day.total,
      learnedCount: day.learnedCount ?? 0,
    };
  }
  return result;
}

// ───────────────────────── Вспомогательное ─────────────────────────

/** Сколько слов сейчас в статусе «выучено». */
function countLearned(srs: Readonly<SrsMap>): number {
  return Object.values(srs).filter((state) => getStatus(state) === 'learned').length;
}

/** Убирает записи srs для слов, которых нет в списке (например, после сброса повреждённого words). */
function pruneSrs(srs: Readonly<SrsMap>, words: readonly Word[]): SrsMap {
  const ids = new Set(words.map((word) => word.id));
  const result: SrsMap = {};
  for (const [id, state] of Object.entries(srs)) {
    if (ids.has(id)) result[id] = state;
  }
  return result;
}

/** crypto.randomUUID есть только в защищённом контексте (https / localhost), поэтому нужен запасной вариант. */
function createWordId(): string {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  // Префикс отличает свои слова от стартовых (starter-...)
  return `custom-${unique}`;
}

/** Сохраняет один ключ. Если не вышло — состояние остаётся в памяти, приложение работает дальше. */
function persist(key: string, value: unknown): void {
  if (!saveToStorage(key, value)) {
    console.warn(`[english-app] Не удалось сохранить "${key}" в localStorage`);
    // TODO: показать баннер «не удалось сохранить прогресс» на странице прогресса
  }
}

// ───────────────────────────── Store ─────────────────────────────

interface WordState {
  /** Стартовый набор + добавленные пользователем слова */
  words: Word[];
  /** Состояние повторения по id слова — единственный источник правды о статусе */
  srs: SrsMap;
  dailyStats: DailyStats;
  /** true после первой загрузки из localStorage */
  hydrated: boolean;

  hydrate: () => void;
  answerWord: (id: string, correct: boolean, now?: Date) => void;
  addWord: (input: NewWordInput) => void;
  removeWord: (id: string) => void;
  resetProgress: () => void;
}

/**
 * Поля Word.status / correctCount / wrongCount здесь НЕ обновляются и в UI не читаются:
 * статус всегда считается через getStatus(srs[id]).
 * Действия до hydrate() ничего не делают, чтобы пустым состоянием
 * не перезаписать данные в localStorage.
 */
export const useWordStore = create<WordState>()((set, get) => ({
  words: [],
  srs: {},
  dailyStats: {},
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;

    const storedWords = loadFromStorage<Word[]>(STORAGE_KEYS.words, [], isWordArray);
    const storedSrs = loadFromStorage<SrsMap>(STORAGE_KEYS.srs, {}, isSrsMap);
    const storedStats = loadFromStorage<StoredDailyStats>(
      STORAGE_KEYS.dailyStats,
      {},
      isStoredDailyStats,
    );

    const seeded = loadFromStorage<boolean>(
      STORAGE_KEYS.seeded,
      false,
      (value): value is boolean => typeof value === 'boolean',
    );

    // Стартовый набор записываем в хранилище один раз (первый запуск).
    // Дальше источник правды — сохранённый список, даже если он пуст,
    // иначе удалённые пользователем слова воскресали бы при перезагрузке.
    let words: Word[];
    if (seeded) {
      words = storedWords;
    } else {
      words = [...STARTER_WORDS];
      persist(STORAGE_KEYS.words, words);
      persist(STORAGE_KEYS.seeded, true);
    }

    set({
      words,
      srs: pruneSrs(storedSrs, words),
      dailyStats: normalizeDailyStats(storedStats),
      hydrated: true,
    });
  },

  answerWord: (id, correct, now = new Date()) => {
    const { words, srs, dailyStats, hydrated } = get();
    if (!hydrated || !words.some((word) => word.id === id)) return;

    const previous = srs[id];
    const next = applyAnswer(previous, correct, now);
    const wasLearned = getStatus(previous) === 'learned';
    const isLearned = getStatus(next) === 'learned';

    const nextSrs: SrsMap = { ...srs, [id]: next };

    const dayKey = toDayKey(now);
    const day = dailyStats[dayKey];
    // Первый ответ за день: стартуем не с 0, а с текущего числа выученных слов
    // (считаем по srs до применения ответа), иначе график «провалится» в ноль.
    const baseLearned = day?.learnedCount ?? countLearned(srs);
    // Слово могло войти в learned (+1) или выйти из него (−1) — тогда меняем счётчик
    const delta = Number(isLearned) - Number(wasLearned);

    const nextDay: DayStats = {
      studied: (day?.studied ?? 0) + 1,
      correct: (day?.correct ?? 0) + (correct ? 1 : 0),
      total: (day?.total ?? 0) + 1,
      learnedCount: Math.max(0, baseLearned + delta),
    };
    const nextStats: DailyStats = { ...dailyStats, [dayKey]: nextDay };

    set({ srs: nextSrs, dailyStats: nextStats });
    persist(STORAGE_KEYS.srs, nextSrs);
    persist(STORAGE_KEYS.dailyStats, nextStats);
  },

  addWord: (input) => {
    if (!get().hydrated) return;

    const en = input.en.trim();
    const ru = input.ru.trim();
    // Проверку дубликатов делает форма добавления; пустые слова не принимаем вообще
    if (!en || !ru) return;

    const word: Word = {
      id: createWordId(),
      en,
      ru,
      transcription: input.transcription.trim(),
      level: input.level,
      example: input.example.trim(),
      exampleTranslation: input.exampleTranslation.trim(),
      status: 'new',
      correctCount: 0,
      wrongCount: 0,
    };

    const words = [...get().words, word];
    set({ words });
    persist(STORAGE_KEYS.words, words);
  },

  removeWord: (id) => {
    const { words, srs, hydrated } = get();
    if (!hydrated || !words.some((word) => word.id === id)) return;

    const nextWords = words.filter((word) => word.id !== id);
    const nextSrs: SrsMap = { ...srs };
    delete nextSrs[id];

    // dailyStats — история «что было в тот день», удаление слова её не переписывает
    set({ words: nextWords, srs: nextSrs });
    persist(STORAGE_KEYS.words, nextWords);
    persist(STORAGE_KEYS.srs, nextSrs);
  },

  resetProgress: () => {
    if (!get().hydrated) return;

    set({ srs: {}, dailyStats: {} });
    persist(STORAGE_KEYS.srs, {});
    persist(STORAGE_KEYS.dailyStats, {});
  },
}));

// ──────────────────────────── Селекторы ────────────────────────────
// Подписываемся на «сырые» поля и считаем результат в useMemo:
// селектор, который сам создаёт новый массив/объект, в Zustand 5 вызывает бесконечные перерисовки.

type StudyQueueParams = Pick<StudyQueueOptions, 'limit' | 'newLimit'>;

/**
 * Очередь слов для сессии. Пересчитывается при любом изменении words/srs,
 * поэтому страницы тренировок должны зафиксировать очередь в начале сессии.
 */
export function useStudyQueue(options: StudyQueueParams = {}): Word[] {
  const words = useWordStore((state) => state.words);
  const srs = useWordStore((state) => state.srs);
  const { limit, newLimit } = options;

  return useMemo(
    () => buildStudyQueue(words, srs, { limit, newLimit }),
    [words, srs, limit, newLimit],
  );
}

/** Сколько слов пора повторить. */
export function useDueCount(): number {
  const words = useWordStore((state) => state.words);
  const srs = useWordStore((state) => state.srs);

  return useMemo(
    () => words.filter((word) => isDue(srs[word.id])).length,
    [words, srs],
  );
}

/** Сколько слов ещё не изучалось. */
export function useNewCount(): number {
  const words = useWordStore((state) => state.words);
  const srs = useWordStore((state) => state.srs);

  return useMemo(
    () => words.filter((word) => srs[word.id] === undefined).length,
    [words, srs],
  );
}

/** Сколько дней подряд были занятия. */
export function useStreak(): number {
  const dailyStats = useWordStore((state) => state.dailyStats);

  return useMemo(() => calculateStreak(Object.keys(dailyStats)), [dailyStats]);
}

/** Статистика за сегодня. Если ответов ещё не было — нули, а learnedCount равен текущему числу выученных. */
export function useTodayStats(): DayStats {
  const dailyStats = useWordStore((state) => state.dailyStats);
  const srs = useWordStore((state) => state.srs);
  const today = toDayKey(new Date());

  return useMemo(
    () =>
      dailyStats[today] ?? {
        studied: 0,
        correct: 0,
        total: 0,
        learnedCount: countLearned(srs),
      },
    [dailyStats, srs, today],
  );
}

/** Слова с вычисленным статусом и коробкой — для страницы словаря. */
export function useWordsWithStatus(): WordWithStatus[] {
  const words = useWordStore((state) => state.words);
  const srs = useWordStore((state) => state.srs);

  return useMemo(
    () =>
      words.map((word) => {
        const state = srs[word.id];
        return { ...word, srsStatus: getStatus(state), box: state?.box ?? null };
      }),
    [words, srs],
  );
}
