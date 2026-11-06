import { normalizeImageWord } from '../utils/aiImage';

/**
 * Слова, которые нельзя нарисовать: приветствия, время, числа, служебные и абстрактные слова.
 * В режиме «Картинки» их нет: по ним нейросеть рисует случайное, а оно только сбивает с толку.
 */
export const VISUAL_SKIP_WORDS: readonly string[] = [
  'hello', 'goodbye', 'please', 'thanks', 'yes', 'no',
  'today', 'tomorrow', 'yesterday', 'early', 'late', 'always', 'never', 'sometimes',
  'one', 'two', 'three',
  'although', 'because', 'together', 'like', 'have', 'want',
  'good', 'bad', 'new', 'old', 'big', 'small', 'easy', 'difficult', 'important', 'different', 'expensive', 'cheap',
  'understand', 'remember', 'forget', 'wait', 'learn', 'teach', 'answer', 'question', 'problem',
];

const SKIP_SET = new Set(VISUAL_SKIP_WORDS);

/**
 * Можно ли показать это слово картинкой: оно не в списке и подходит для сервиса картинок.
 * Отсеиваем все слова, которые не являются чисто английскими (русские, цифры, символы)
 * и которые слишком длинные (больше 40 символов, как в Worker'е).
 */
export function isVisualWord(en: string): boolean {
  const normalized = normalizeImageWord(en);
  if (normalized === null) return false;
  
  // Приводим к нижнему регистру для проверки (тесты передают "Mother", "  street ")
  const lower = normalized.toLowerCase();
  
  // Проверка длины (в Worker'е максимум 40 символов)
  if (lower.length > 40) return false;

  // Проверка, что слово состоит только из английских букв (и допустимых символов: дефис, апостроф)
  if (!/^[a-z]+(?:['’-][a-z]+)*$/.test(lower)) return false;

  return !SKIP_SET.has(lower);
}