import type { Box, Level, SrsMap, SrsState, Word, WordStatus } from '@/types';
import { addDays, startOfDay } from './date';

/** Через сколько дней повторять слово, лежащее в коробке N. */
export const BOX_INTERVAL_DAYS: Readonly<Record<Box, number>> = {
  0: 1,
  1: 2,
  2: 4,
  3: 7,
  4: 14,
  5: 30,
};

/** Начиная с этой коробки слово считается выученным. */
export const LEARNED_BOX: Box = 4;

/** Правильный ответ переносит слово в следующую коробку (из последней — никуда). */
const NEXT_BOX: Readonly<Record<Box, Box>> = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 5 };

/**
 * Применяет ответ пользователя к состоянию слова (система Лейтнера):
 * - верно → слово переходит в следующую коробку;
 * - неверно → возвращается в коробку 0.
 * Слово без записи (ещё не изучалось) считается лежащим в коробке 0.
 *
 * Время следующего показа привязано к началу дня: слово становится «просроченным»
 * с 00:00 нужного дня, а не через N * 24 часа от момента ответа.
 */
export function applyAnswer(
  previous: SrsState | undefined,
  isCorrect: boolean,
  now: Date = new Date(),
): SrsState {
  const box: Box = isCorrect ? NEXT_BOX[previous?.box ?? 0] : 0;
  const nextReview = addDays(startOfDay(now), BOX_INTERVAL_DAYS[box]);
  return { box, nextReviewAt: nextReview.getTime() };
}

/** Пора ли повторять слово. Слова без записи — «новые», а не «просроченные». */
export function isDue(state: SrsState | undefined, now: Date = new Date()): boolean {
  return state !== undefined && state.nextReviewAt <= now.getTime();
}

/** Статус слова для словаря и статистики, выводится из коробки. */
export function getStatus(state: SrsState | undefined): WordStatus {
  if (state === undefined) return 'new';
  return state.box >= LEARNED_BOX ? 'learned' : 'learning';
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
