import type { SrsMap, Word } from '@/types';
import { buildOptions } from './shuffle';
import { buildStudyQueue } from './srs';

/** Сколько слов в одной сессии и сколько из них новых. */
export const CHOICE_SESSION_LIMIT = 10;
export const CHOICE_SESSION_NEW_LIMIT = 10;
/** Сколько вариантов ответа показываем. */
export const OPTIONS_COUNT = 4;
/** Пауза между ответом и следующим вопросом — чтобы успеть увидеть правильный ответ. */
export const FEEDBACK_DELAY_MS = 1200;

export interface ChoiceSessionData {
  queue: Word[];
  /** Варианты ответа по id слова (в нужном порядке, перемешаны один раз) */
  options: Record<string, Word[]>;
  /** Сколько слов выбрано для сессии до отсева — нужно, чтобы отличить «нечего повторять» от «мало слов» */
  candidateCount: number;
}

/**
 * Сессия «выбери перевод из вариантов» (тест и аудирование): очередь и варианты ответа
 * строятся вместе и один раз. Слова, для которых не набралось OPTIONS_COUNT вариантов
 * (мало слов в словаре), в очередь не попадают.
 */
export function buildChoiceSession(
  words: readonly Word[],
  srs: Readonly<SrsMap>,
): ChoiceSessionData {
  const candidates = buildStudyQueue(words, srs, {
    limit: CHOICE_SESSION_LIMIT,
    newLimit: CHOICE_SESSION_NEW_LIMIT,
  });

  const queue: Word[] = [];
  const options: Record<string, Word[]> = {};
  for (const word of candidates) {
    const variants = buildOptions(word, words, 'ru', OPTIONS_COUNT);
    if (variants.length < OPTIONS_COUNT) continue;
    queue.push(word);
    options[word.id] = variants;
  }

  return { queue, options, candidateCount: candidates.length };
}
