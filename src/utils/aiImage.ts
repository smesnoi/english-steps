/** Сервис, который рисует картинки по описанию (наш Cloudflare Worker). */
export const IMAGE_SERVICE_ORIGIN = 'https://image-proxy.siberia-omsk-kozlov.workers.dev';

const PROMPT_SUFFIX = ' realistic photo, high quality, white background';
/** Размер запрашиваемой картинки, пикселей: и ширина, и высота. */
export const IMAGE_SIZE = 512;
/** Слова пользователя могут быть любыми (в том числе импортированными), поэтому длину ограничиваем. */
const MAX_WORD_LENGTH = 100;

export function sanitizeWord(word: string): string {
  return word
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_WORD_LENGTH)
    .trim();
}

export function normalizeImageWord(word: string): string | null {
  const cleaned = sanitizeWord(word);
  return cleaned === '' ? null : cleaned;
}

export function buildImagePrompt(word: string): string {
  return `${sanitizeWord(word)}${PROMPT_SUFFIX}`;
}

export function isExpectedImageSize(width: number, height: number): boolean {
  return width === IMAGE_SIZE && height === IMAGE_SIZE;
}

/**
 * Адрес картинки для слова. Мы обращаемся к нашему Cloudflare Worker,
 * который принимает слово в параметре `word`.
 */
export function buildImageUrl(word: string, seed: number, refresh?: number): string | null {
  const cleanWord = sanitizeWord(word);
  if (cleanWord === '') return null;
  
  const safeSeed = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  const finalSeed = refresh !== undefined ? refresh : safeSeed;
  
  return `${IMAGE_SERVICE_ORIGIN}/?word=${encodeURIComponent(cleanWord)}&seed=${finalSeed}`;
}