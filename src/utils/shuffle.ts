import type { Word } from '@/types';

/** Перемешивание Фишера — Йетса. Возвращает новый массив, исходный не меняется. */
export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/**
 * Варианты ответа для теста: правильное слово + неправильные, всё перемешано.
 *
 * - Неправильные варианты берутся из pool, сначала того же уровня (они похожи по сложности).
 * - Исключаются слова с таким же текстом в поле `field`, чтобы не было двух одинаковых
 *   вариантов (например, разные слова с одним переводом).
 * - Если слов в pool не хватает, вариантов будет меньше `total` — вызывающий код
 *   должен это учитывать (например, показать сообщение «мало слов для теста»).
 *
 * @param field какое поле показывается в вариантах: 'ru' — перевод, 'en' — слово
 */
export function buildOptions(
  correct: Word,
  pool: readonly Word[],
  field: 'en' | 'ru' = 'ru',
  total = 4,
  random: () => number = Math.random,
): Word[] {
  const candidates = pool.filter(
    (word) => word.id !== correct.id && word[field] !== correct[field],
  );
  const sameLevel = shuffle(
    candidates.filter((word) => word.level === correct.level),
    random,
  );
  const otherLevels = shuffle(
    candidates.filter((word) => word.level !== correct.level),
    random,
  );

  const picked: Word[] = [];
  const usedTexts = new Set<string>([correct[field]]);

  for (const word of [...sameLevel, ...otherLevels]) {
    if (picked.length >= total - 1) break;
    if (usedTexts.has(word[field])) continue;
    usedTexts.add(word[field]);
    picked.push(word);
  }

  return shuffle([correct, ...picked], random);
}
