/*
 * Разбор ответов ИИ для примеров на карточке. Генерация двухшаговая:
 * 1) модель пишет только английские предложения (по строке на предложение);
 * 2) отдельным запросом переводит их на русский (тоже по строке).
 * Здесь — разбор обоих ответов и склейка по номеру строки.
 */

/** Одно предложение-пример и его перевод. */
export interface AiExamplePair {
  en: string;
  /** Пустая строка, если перевода нет (ещё не пришёл или не получился) */
  ru: string;
}

/** Больше трёх примеров не показываем, даже если модель написала больше. */
const MAX_EXAMPLES = 3;

/** Модель по привычке может написать «English ||| Русский»: разделитель — одна и более вертикальных черт. */
const SEPARATOR = /\s*\|+\s*/;
const LIST_MARKER = /^\s*(?:\d+\s*[.)]|[-*•–—])\s+/;
const CYRILLIC = /[А-Яа-яЁё]/;
const LATIN = /[A-Za-z]/;

/** Убирает нумерацию, markdown-выделение и обрамляющие кавычки. */
function clean(text: string): string {
  return text
    .replace(LIST_MARKER, '')
    .replace(/\*\*|__/g, '')
    .replace(/^["“«„]+|["”»]+$/g, '')
    .trim();
}

/** Слова из букв подряд. «backlightает» — одно слово из латинских и русских букв сразу. */
const letterWords = (line: string): string[] => line.match(/\p{L}+/gu) ?? [];

/**
 * Признаки «сорвавшегося» перевода: слово из букв двух алфавитов («Суход backlightает»)
 * или несколько английских слов. Одно английское слово (имя вроде «Anna») допускаем,
 * чтобы не браковать нормальные переводы.
 */
function isBrokenTranslation(line: string): boolean {
  const words = letterWords(line);
  const mixed = words.some((word) => LATIN.test(word) && CYRILLIC.test(word));
  const latinWords = words.filter((word) => LATIN.test(word) && !CYRILLIC.test(word)).length;
  return mixed || latinWords >= 2;
}

/** Похожа ли строка на вводную фразу («Here are your sentences:», «Вот перевод:»). */
const isPreamble = (line: string): boolean => line.endsWith(':');

const splitLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Английские предложения из ответа первого шага (не больше трёх).
 * Нумерация и кавычки срезаются; вводные фразы и строки с русскими буквами
 * (модель «проговорилась» переводом) отбрасываются. Недописанная последняя строка
 * при потоковой генерации остаётся — так текст виден по мере появления.
 */
export function parseSentences(text: string): string[] {
  const sentences: string[] = [];
  for (const raw of splitLines(text)) {
    const [english = ''] = raw.replace(LIST_MARKER, '').split(SEPARATOR);
    const line = clean(english);
    if (line === '' || isPreamble(line) || CYRILLIC.test(line) || !LATIN.test(line)) continue;
    sentences.push(line);
  }
  return sentences.slice(0, MAX_EXAMPLES);
}

/**
 * Русские строки из ответа второго шага. Оставляем только строки с русскими буквами:
 * английские комментарии, вводные фразы и «кашу» из двух алфавитов отбрасываем. Количество не ограничиваем —
 * согласование с предложениями делает matchTranslations.
 */
export function parseTranslations(text: string): string[] {
  const lines: string[] = [];
  for (const raw of splitLines(text)) {
    // «English ||| Русский»: берём русскую часть
    const candidate = raw.includes('|')
      ? (raw.split(SEPARATOR).reverse().find((part) => CYRILLIC.test(part)) ?? '')
      : raw;
    const line = clean(candidate);
    if (line === '' || isPreamble(line) || !CYRILLIC.test(line) || isBrokenTranslation(line)) continue;
    lines.push(line);
  }
  return lines;
}

/** Основа слова для поиска его форм в предложении: eat → eat (eats, eating), morning → morni (mornings). */
function wordStem(word: string): string {
  const normalized = word.trim().toLowerCase();
  if (normalized.length > 4) return normalized.slice(0, -2);
  if (normalized.length > 3) return normalized.slice(0, -1);
  return normalized;
}

/**
 * Оставляет предложения, в которых есть искомое слово (с любым окончанием): так отсеиваются
 * ответы вроде «The sun rises over the utro» для слова morning. Если ни в одном предложении
 * слова нет (например, все в прошедшем времени у неправильного глагола), ничего не выбрасываем:
 * лучше показать, чем потерять всё.
 */
export function preferSentencesWithWord(sentences: readonly string[], word: string): string[] {
  const stem = wordStem(word);
  if (stem === '') return [...sentences];
  const matching = sentences.filter((sentence) => sentence.toLowerCase().includes(stem));
  return matching.length > 0 ? matching : [...sentences];
}

/**
 * Склеивает предложения и переводы по номеру строки. Лишние переводы игнорируются,
 * недостающие — пустая строка (так показываем перевод, который ещё пишется).
 */
export function combineExamples(
  sentences: readonly string[],
  translations: readonly string[],
): AiExamplePair[] {
  return sentences.map((en, index) => ({ en, ru: translations[index] ?? '' }));
}

/**
 * Проверка готового перевода: строк не меньше, чем предложений → берём первые N;
 * иначе null. Если строк меньше (модель слила или пропустила предложения), по номеру строки
 * уже не понять, какой перевод к какому предложению, — лучше показать без перевода,
 * чем с неверной подписью.
 */
export function matchTranslations(
  sentences: readonly string[],
  translations: readonly string[],
): string[] | null {
  if (sentences.length === 0 || translations.length < sentences.length) return null;
  return translations.slice(0, sentences.length);
}