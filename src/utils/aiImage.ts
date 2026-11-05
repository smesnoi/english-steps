/** Сервис, который рисует картинки по описанию (наш Cloudflare Worker). */
export const IMAGE_SERVICE_ORIGIN = 'https://image-proxy.siberia-omsk-kozlov.workers.dev';

const PROMPT_SUFFIX = ' realistic photo, high quality, white background';
/** Размер запрашиваемой картинки, пикселей: и ширина, и высота. */
export const IMAGE_SIZE = 512;
/** Слова пользователя могут быть любыми (в том числе импортированными), поэтому длину ограничиваем. */
const MAX_WORD_LENGTH = 100;

/**
 * Приводит слово к безопасному виду для запроса: управляющие символы и переводы строк
 * становятся пробелами, пробелы схлопываются, слишком длинный текст обрезается.
 */
export function sanitizeWord(word: string): string {
  return word
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_WORD_LENGTH)
    .trim();
}

/** Описание для генерации: слово + «реалистичное фото на белом фоне». */
export function buildImagePrompt(word: string): string {
  return `${sanitizeWord(word)}${PROMPT_SUFFIX}`;
}

/**
 * Пришла ли картинка того размера, который мы просили. (Оставлено для совместимости,
 * но в Cloudflare Worker размер может быть другим, поэтому проверку в AiImage мы уберем).
 */
export function isExpectedImageSize(width: number, height: number): boolean {
  return width === IMAGE_SIZE && height === IMAGE_SIZE;
}

/**
 * Адрес картинки для слова. Мы обращаемся к нашему Cloudflare Worker,
 * который принимает слово в параметре `word`.
 */
export function buildImageUrl(word: string, seed: number): string | null {
  if (sanitizeWord(word) === '') return null;
  const safeSeed = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  return `${IMAGE_SERVICE_ORIGIN}/?word=${encodeURIComponent(word)}&seed=${safeSeed}`;
}