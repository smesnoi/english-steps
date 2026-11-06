import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  IMAGE_SERVICE_ORIGIN,
  buildImagePrompt,
  buildImageUrl,
  isExpectedImageSize,
  normalizeImageWord,
  sanitizeWord,
} from './aiImage';

// Запуск: npm test  (tsx --test ...)

const parts = (url: string) => {
  const parsed = new URL(url);
  return { parsed, word: parsed.searchParams.get('word'), seed: parsed.searchParams.get('seed') };
};

describe('buildImageUrl (для Cloudflare Worker)', () => {
  it('формирует правильный адрес для нашего Worker', () => {
    const url = buildImageUrl('hello', 1700000000000);

    assert.ok(url);
    const { parsed, word, seed } = parts(url);

    assert.equal(parsed.origin, IMAGE_SERVICE_ORIGIN);
    assert.equal(parsed.pathname, '/');
    assert.equal(word, 'hello');
    assert.equal(seed, '1700000000000');
  });

  it('параметр refresh добавляется в seed для обхода кэша', () => {
    const url = buildImageUrl('apple', 123, 456);
    assert.ok(url);
    const { seed } = parts(url);
    assert.equal(seed, '456');
  });

  it('служебные символы в слове кодируются (не ломают URL)', () => {
    const url = buildImageUrl('a/b?c#d', 1);
    assert.ok(url);
    const { word } = parts(url);
    assert.equal(word, 'a/b?c#d');
  });

  it('пустое слово — null', () => {
    assert.equal(buildImageUrl('', 1), null);
    assert.equal(buildImageUrl('   ', 1), null);
  });
});

describe('isExpectedImageSize', () => {
  it('проверяет 512x512', () => {
    assert.equal(isExpectedImageSize(512, 512), true);
    assert.equal(isExpectedImageSize(512, 256), false);
  });
});

describe('sanitizeWord и normalizeImageWord', () => {
  it('очищает пробелы и служебные символы', () => {
    assert.equal(sanitizeWord('  hello  world  '), 'hello world');
    assert.equal(sanitizeWord('hello\nworld'), 'hello world');
  });

  it('normalizeImageWord возвращает null для пустой строки', () => {
    assert.equal(normalizeImageWord('   '), null);
    assert.equal(normalizeImageWord('apple'), 'apple');
  });
});

describe('buildImagePrompt', () => {
  it('добавляет суффикс', () => {
    assert.equal(buildImagePrompt('apple'), 'apple realistic photo, high quality, white background');
  });
});