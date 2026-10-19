/** Уровни по шкале CEFR. B1 оставлен в типе для будущих слов и пользовательских добавлений. */
export type Level = 'A1' | 'A2' | 'B1';

/**
 * Статус изучения слова:
 * - new      — слово ещё не встречалось в тренировках
 * - learning — слово в процессе (были ответы, но оно ещё не закреплено)
 * - learned  — слово выучено
 */
export type WordStatus = 'new' | 'learning' | 'learned';

/** Слово словаря вместе с прогрессом по нему. */
export interface Word {
  /** Уникальный стабильный идентификатор (по нему хранится прогресс) */
  id: string;
  /** Слово на английском */
  en: string;
  /** Перевод на русский */
  ru: string;
  /** Транскрипция в формате IPA, например "/həˈləʊ/" */
  transcription: string;
  level: Level;
  /** Пример употребления на английском */
  example: string;
  /** Перевод примера на русский */
  exampleTranslation: string;
  status: WordStatus;
  /** Сколько раз ответ был правильным */
  correctCount: number;
  /** Сколько раз ответ был неправильным */
  wrongCount: number;
}

/** Номер коробки в системе Лейтнера: чем выше, тем реже слово повторяется. */
export type Box = 0 | 1 | 2 | 3 | 4 | 5;

/** Состояние интервального повторения для одного слова. */
export interface SrsState {
  box: Box;
  /** Момент (мс, Date.getTime()), начиная с которого слово пора повторить */
  nextReviewAt: number;
}

/**
 * Состояние повторения по id слова. Слова без записи — ещё не изучались (new).
 */
export type SrsMap = Record<string, SrsState | undefined>;
