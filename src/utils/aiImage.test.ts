import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  IMAGE_SERVICE_ORIGIN,
  IMAGE_SIZE,
  buildImagePrompt,
  buildImageUrl,
  isExpectedImageSize,
  sanitizeWord,
} from './aiImage';

// Запуск: npm test  (tsx --test ...)

const parts = (url: string) => {
  const parsed = new URL(url);
  const [, kind, ...rest] = parsed.pathname.split('/');
  return { parsed, kind, rest };
};

describe('buildImageUrl', () => {
  it('адрес в нужном формате: путь с описанием и параметры', () => {
    const url = buildImageUrl('hello', 1700000000000);

    assert.equal(
      url,
      'https://image.pollinations.ai/prompt/hello%20realistic%20photo%2C%20high%20quality%2C%20white%20background' +
        '?width=512&height=512&nologo=true&safe=true&seed=1700000000000',
    );
  });

  it('описание — слово плюс «realistic photo, high quality, white background»', () => {
    assert.equal(buildImagePrompt('apple'), 'apple realistic photo, high quality, white background');
    const { rest } = parts(buildImageUrl('apple', 1)!);
    assert.equal(decodeURIComponent(rest[0]!), 'apple realistic photo, high quality, white background');
  });

  it('параметры: размер 512×512, без логотипа, строгий фильтр, seed', () => {
    const { parsed } = parts(buildImageUrl('cat', 42)!);

    assert.equal(parsed.origin, IMAGE_SERVICE_ORIGIN);
    assert.deepEqual([...parsed.searchParams.keys()].sort(), ['height', 'nologo', 'safe', 'seed', 'width']);
    assert.equal(parsed.searchParams.get('width'), '512');
    assert.equal(parsed.searchParams.get('height'), '512');
    assert.equal(parsed.searchParams.get('nologo'), 'true');
    assert.equal(parsed.searchParams.get('safe'), 'true');
    assert.equal(parsed.searchParams.get('seed'), '42');
  });

  it('другой seed — другой адрес, остальное то же', () => {
    const first = buildImageUrl('dog', 1)!;
    const second = buildImageUrl('dog', 2)!;

    assert.notEqual(first, second);
    assert.equal(first.replace(/seed=\d+$/, ''), second.replace(/seed=\d+$/, ''));
  });

  it('seed всегда целое число: дробные обрезаются, не числа заменяются нулём', () => {
    assert.match(buildImageUrl('cat', 12.9)!, /seed=12$/);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.match(buildImageUrl('cat', bad)!, /seed=0$/);
    }
  });

  it('служебные символы в слове не меняют ни путь, ни параметры (нет «инъекции» в адрес)', () => {
    const hostile = 'a/b?c#d&e=f&seed=1 ../../x';
    const url = buildImageUrl(hostile, 7)!;
    const { parsed, kind, rest } = parts(url);

    assert.equal(parsed.origin, IMAGE_SERVICE_ORIGIN);
    assert.equal(kind, 'prompt');
    assert.equal(rest.length, 1, 'описание — один сегмент пути');
    assert.equal(parsed.hash, '');
    assert.deepEqual([...parsed.searchParams.keys()].sort(), ['height', 'nologo', 'safe', 'seed', 'width']);
    assert.equal(parsed.searchParams.get('seed'), '7', 'seed из слова не подменяет настоящий');
    assert.equal(decodeURIComponent(rest[0]!), `${hostile} realistic photo, high quality, white background`);
  });

  it('пробелы, русские буквы и эмодзи кодируются корректно', () => {
    for (const word of ['ice cream', 'утро', '🍎 apple']) {
      const { rest } = parts(buildImageUrl(word, 1)!);
      assert.equal(decodeURIComponent(rest[0]!), buildImagePrompt(word), word);
      assert.match(rest[0]!, /^[A-Za-z0-9%._~!'()*-]+$/, 'в пути только допустимые символы');
    }
  });

  it('управляющие символы и переводы строк заменяются пробелами', () => {
    assert.equal(sanitizeWord('hel\nlo\t\u0000world\r\n'), 'hel lo world');
    assert.equal(buildImagePrompt('a\r\nb'), 'a b realistic photo, high quality, white background');
  });

  it('слишком длинное слово обрезается до 100 символов', () => {
    assert.equal(sanitizeWord('x'.repeat(500)).length, 100);
    const { rest } = parts(buildImageUrl('y'.repeat(500), 1)!);
    assert.ok(decodeURIComponent(rest[0]!).startsWith('y'.repeat(100) + ' realistic'));
  });

  it('пустое слово (или только пробелы и управляющие символы) — адреса нет', () => {
    for (const word of ['', '   ', '\n\t', '\u0000\u0001']) {
      assert.equal(buildImageUrl(word, 1), null, JSON.stringify(word));
    }
  });
});

describe('isExpectedImageSize: картинка-заглушка сервиса не проходит', () => {
  it('нужный размер — настоящая картинка', () => {
    assert.equal(IMAGE_SIZE, 512);
    assert.equal(isExpectedImageSize(512, 512), true);
  });

  it('любой другой размер считается ошибкой сервиса', () => {
    for (const [width, height] of [[256, 256], [1024, 1024], [512, 256], [256, 512], [1, 1], [0, 0], [800, 200]] as const) {
      assert.equal(isExpectedImageSize(width, height), false, `${width}×${height}`);
    }
  });

  it('запрошенный размер совпадает с параметрами адреса', () => {
    const parsed = new URL(buildImageUrl('cat', 1)!);
    assert.equal(parsed.searchParams.get('width'), String(IMAGE_SIZE));
    assert.equal(parsed.searchParams.get('height'), String(IMAGE_SIZE));
  });
});