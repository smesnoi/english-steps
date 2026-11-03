import type { Level, SrsMap, SrsState, StoredSrsState, Word, WordStatus } from '@/types';
import { addDays, startOfDay } from './date';

/*
 * Адаптивное интервальное повторение — упрощённый вариант FSRS.
 *
 * У каждого слова своя стабильность памяти S (в днях) и сложность D (1–10).
 * Интервал до следующего показа растёт вместе с S, поэтому лёгкие слова повторяются
 * всё реже, а трудные остаются «на коротком поводке».
 *
 * R = 1 / (1 + t / (9·S))   — вероятность вспомнить слово через t дней после ответа;
 *                              при t = S она равна 0,9 (так определена стабильность)
 *
 * верно:   S' = S · (1 + G · (11 − D) · S^−0,14 · (e^(1,05·(1 − R)) − 1))
 *          D' = D − 0,2,  repetitions + 1
 *          Чем позже повторили (ниже R), тем сильнее слово закрепилось; в тот же день
 *          (R = 1) стабильность не растёт, так что накрутить её повторами нельзя.
 *          Чем выше сложность, тем медленнее рост.
 * неверно: S' = S · (0,6 − 0,05·D),  D' = D + 1,  repetitions = 0,  lapses + 1
 *          Чем выше сложность, тем сильнее падает стабильность.
 *
 * интервал = округление(S' · factor), от 1 до 365 дней; factor при целевой вероятности
 * 90% равен 1. После неверного ответа слово возвращается на следующий день.
 */

// ───────────────────────────── Параметры ─────────────────────────────

/** Целевая вероятность вспомнить слово в момент повторения. */
export const REQUESTED_RETENTION = 0.9;
/** Константа кривой забывания R(t) = 1 / (1 + t / (FORGETTING_SCALE · S)). */
const FORGETTING_SCALE = 9;
/** interval = stability · INTERVAL_FACTOR; при REQUESTED_RETENTION = 0,9 множитель равен 1. */
export const INTERVAL_FACTOR = FORGETTING_SCALE * (1 / REQUESTED_RETENTION - 1);

export const DEFAULT_STABILITY = 1;
export const DEFAULT_DIFFICULTY = 5;
export const MIN_STABILITY = 0.5;
export const MAX_STABILITY = 365;
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 10;
export const MIN_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 365;

// Рост стабильности при верном ответе (подобран так, чтобы лёгкое слово давало 1 → 3 → 7 → 17 дней)
const GROWTH_SCALE = 2.5;
const GROWTH_STABILITY_EXPONENT = 0.14;
const GROWTH_RETRIEVABILITY_EXPONENT = 1.05;
const DIFFICULTY_STEP_DOWN = 0.2;

// Падение стабильности при ошибке
const LAPSE_BASE = 0.6;
const LAPSE_PER_DIFFICULTY = 0.05;
const DIFFICULTY_STEP_UP = 1;

/** Слово считается выученным, когда стабильность не меньше этого числа дней… */
export const LEARNED_STABILITY_DAYS = 14;
/** …и верных ответов подряд не меньше этого числа. */
export const LEARNED_MIN_REPETITIONS = 3;

const MS_PER_DAY = 86_400_000;

// ───────────────────────────── Вспомогательное ─────────────────────────────

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Округление до тысячных, чтобы в localStorage не попадали числа с 17 знаками. */
const round3 = (value: number): number => Math.round(value * 1000) / 1000;

/** Целых календарных дней между двумя моментами. Переход на летнее время счёт не сбивает. */
function daysBetween(fromMs: number, toMs: number): number {
  const difference =
    startOfDay(new Date(toMs)).getTime() - startOfDay(new Date(fromMs)).getTime();
  return Math.max(0, Math.round(difference / MS_PER_DAY));
}

/** Вероятность вспомнить слово через `elapsedDays` после последнего ответа. */
export function retrievability(elapsedDays: number, stability: number): number {
  return 1 / (1 + Math.max(0, elapsedDays) / (FORGETTING_SCALE * stability));
}

/** Через сколько дней повторять слово с такой стабильностью. */
export function intervalForStability(stability: number): number {
  return clamp(Math.round(stability * INTERVAL_FACTOR), MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS);
}

// ───────────────────────────── Миграция ─────────────────────────────

/** Интервалы коробок старой системы Лейтнера — нужны только для переноса старых записей. */
const LEGACY_BOX_INTERVAL_DAYS = [1, 2, 4, 7, 14, 30] as const;

/**
 * Приводит запись из localStorage к полному SrsState, дозаполняя недостающие поля.
 * - Для старой записи с box берём производные значения, чтобы не потерять прогресс:
 *   stability = интервал коробки, repetitions = box, lastReviewedAt восстанавливаем
 *   из nextReviewAt. Иначе слово из коробки 5 (30 дней) «забыло» бы всё накопленное.
 * - Без каких-либо данных: stability = 1, difficulty = 5 (значения для нового слова).
 * Полная запись возвращается без изменений (с поправкой на допустимые диапазоны).
 */
export function migrateSrsState(stored: StoredSrsState): SrsState {
  const boxIndex =
    stored.box === undefined ? undefined : clamp(Math.round(stored.box), 0, 5);
  const legacyInterval = boxIndex === undefined ? undefined : LEGACY_BOX_INTERVAL_DAYS[boxIndex];

  const stability = clamp(
    stored.stability ?? legacyInterval ?? DEFAULT_STABILITY,
    MIN_STABILITY,
    MAX_STABILITY,
  );

  return {
    stability,
    difficulty: clamp(stored.difficulty ?? DEFAULT_DIFFICULTY, MIN_DIFFICULTY, MAX_DIFFICULTY),
    repetitions: Math.max(0, Math.floor(stored.repetitions ?? boxIndex ?? 0)),
    lapses: Math.max(0, Math.floor(stored.lapses ?? 0)),
    lastReviewedAt:
      stored.lastReviewedAt ?? stored.nextReviewAt - intervalForStability(stability) * MS_PER_DAY,
    nextReviewAt: stored.nextReviewAt,
  };
}

/** Мигрирует все записи srs (используется при загрузке из localStorage). */
export function migrateSrsMap(
  stored: Readonly<Record<string, StoredSrsState | undefined>>,
): SrsMap {
  const result: SrsMap = {};
  for (const [id, state] of Object.entries(stored)) {
    if (state !== undefined) result[id] = migrateSrsState(state);
  }
  return result;
}

// ───────────────────────────── Ответ и статус ─────────────────────────────

/**
 * Применяет ответ пользователя к состоянию слова.
 * Слово без записи (ещё не изучалось) начинается с stability = 1 и difficulty = 5;
 * запись старого формата мигрирует «на лету», так что вызывать можно с чем угодно из localStorage.
 *
 * Время следующего показа привязано к началу дня: слово становится «просроченным»
 * с 00:00 нужного дня, а не через N * 24 часа от момента ответа.
 */
export function applyAnswer(
  previous: StoredSrsState | undefined,
  isCorrect: boolean,
  now: Date = new Date(),
): SrsState {
  const nowMs = now.getTime();
  const state: SrsState =
    previous === undefined
      ? {
          stability: DEFAULT_STABILITY,
          difficulty: DEFAULT_DIFFICULTY,
          repetitions: 0,
          lapses: 0,
          lastReviewedAt: nowMs,
          nextReviewAt: nowMs,
        }
      : migrateSrsState(previous);

  // Первый ответ: прошло 0 дней, стабильность не растёт (первый интервал — 1 день)
  const elapsedDays = previous === undefined ? 0 : daysBetween(state.lastReviewedAt, nowMs);

  let stability: number;
  let difficulty: number;
  if (isCorrect) {
    const retention = retrievability(elapsedDays, state.stability);
    const growth =
      GROWTH_SCALE *
      (11 - state.difficulty) *
      state.stability ** -GROWTH_STABILITY_EXPONENT *
      (Math.exp(GROWTH_RETRIEVABILITY_EXPONENT * (1 - retention)) - 1);
    stability = Math.min(MAX_STABILITY, state.stability * (1 + growth));
    difficulty = Math.max(MIN_DIFFICULTY, state.difficulty - DIFFICULTY_STEP_DOWN);
  } else {
    stability = Math.max(
      MIN_STABILITY,
      state.stability * (LAPSE_BASE - LAPSE_PER_DIFFICULTY * state.difficulty),
    );
    difficulty = Math.min(MAX_DIFFICULTY, state.difficulty + DIFFICULTY_STEP_UP);
  }
  stability = round3(stability);

  // После ошибки слово возвращается завтра, независимо от стабильности
  const intervalDays = isCorrect ? intervalForStability(stability) : MIN_INTERVAL_DAYS;

  return {
    stability,
    difficulty: round3(difficulty),
    repetitions: isCorrect ? state.repetitions + 1 : 0,
    lapses: isCorrect ? state.lapses : state.lapses + 1,
    lastReviewedAt: nowMs,
    nextReviewAt: addDays(startOfDay(now), intervalDays).getTime(),
  };
}

/** Пора ли повторять слово. Слова без записи — «новые», а не «просроченные». */
export function isDue(
  state: Pick<SrsState, 'nextReviewAt'> | undefined,
  now: Date = new Date(),
): boolean {
  return state !== undefined && state.nextReviewAt <= now.getTime();
}

/**
 * Статус слова для словаря и статистики: выучено, когда память достаточно стабильна
 * (stability ≥ 14 дней) и слово верно названо хотя бы 3 раза подряд.
 * Любая ошибка обнуляет repetitions, и слово возвращается в «в процессе».
 */
export function getStatus(state: SrsState | undefined): WordStatus {
  if (state === undefined) return 'new';
  return state.stability >= LEARNED_STABILITY_DAYS &&
    state.repetitions >= LEARNED_MIN_REPETITIONS
    ? 'learned'
    : 'learning';
}

const LEVEL_ORDER: Readonly<Record<Level, number>> = { A1: 0, A2: 1, B1: 2 };

export interface StudyQueueOptions {
  now?: Date;
  /** Максимум слов в сессии (по умолчанию 20) */
  limit?: number;
  /** Максимум новых слов в сессии (по умолчанию 10) */
  newLimit?: number;
}

/**
 * Очередь для учебной сессии: сначала слова, которые пора повторить
 * (самые давно просроченные первыми), затем новые — от простых уровней к сложным.
 * Если повторять нечего и новых слов нет, вернётся пустой массив.
 */
export function buildStudyQueue(
  words: readonly Word[],
  srs: Readonly<SrsMap>,
  options: StudyQueueOptions = {},
): Word[] {
  const { now = new Date(), limit = 20, newLimit = 10 } = options;

  const due: Word[] = [];
  const fresh: Word[] = [];

  for (const word of words) {
    const state = srs[word.id];
    if (state === undefined) {
      fresh.push(word);
    } else if (isDue(state, now)) {
      due.push(word);
    }
  }

  due.sort(
    (a, b) => (srs[a.id]?.nextReviewAt ?? 0) - (srs[b.id]?.nextReviewAt ?? 0),
  );
  // Array.sort в современных движках стабильна: внутри уровня порядок слов сохраняется
  fresh.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  return [...due, ...fresh.slice(0, newLimit)].slice(0, limit);
}
