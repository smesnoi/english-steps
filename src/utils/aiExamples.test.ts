import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  combineExamples,
  matchTranslations,
  parseSentences,
  parseTranslations,
} from './aiExamples';

// Запуск: npm test  (tsx --test ...)

describe('parseSentences: английские предложения (шаг 1)', () => {
  it('по предложению на строку', () => {
    assert.deepEqual(parseSentences('I eat an apple.\nShe likes apples.\nWe bought one.'), [
      'I eat an apple.',
      'She likes apples.',
      'We bought one.',
    ]);
  });

  it('нумерация, маркеры, markdown и кавычки срезаются', () => {
    const text = '1. I eat an apple.\n2) She likes apples.\n- **We bought one.**\n• "He is here."';
    assert.deepEqual(parseSentences(text), [
      'I eat an apple.',
      'She likes apples.',
      'We bought one.',
    ].slice(0, 3));
  });

  it('вводная фраза с двоеточием отбрасывается', () => {
    assert.deepEqual(parseSentences('Here are three sentences:\nI see a cat.\nI see a dog.'), [
      'I see a cat.',
      'I see a dog.',
    ]);
  });

  it('строки с русскими буквами (модель «проговорилась» переводом) отбрасываются', () => {
    assert.deepEqual(parseSentences('I eat apples.\nЯ ем яблоки.\nShe sings.'), ['I eat apples.', 'She sings.']);
  });

  it('по привычке написанное «English ||| Русский» даёт английскую часть', () => {
    assert.deepEqual(parseSentences('I eat apples. ||| Я ем яблоки.\nShe sings. || Она поёт.'), [
      'I eat apples.',
      'She sings.',
    ]);
  });

  it('больше трёх предложений обрезается до трёх', () => {
    const text = Array.from({ length: 6 }, (_, i) => `Sentence number ${i}.`).join('\n');
    assert.equal(parseSentences(text).length, 3);
  });

  it('пустые строки, переводы строк Windows и строки без букв игнорируются', () => {
    assert.deepEqual(parseSentences('\r\nI see.\r\n\r\n---\r\n...\r\nYou see.\r\n'), ['I see.', 'You see.']);
  });

  it('недописанная строка потока остаётся', () => {
    assert.deepEqual(parseSentences('I eat apples.\nShe is sin'), ['I eat apples.', 'She is sin']);
  });

  it('пустой ответ — пустой список', () => {
    assert.deepEqual(parseSentences(''), []);
    assert.deepEqual(parseSentences(' \n \n'), []);
    assert.deepEqual(parseSentences('|||'), []);
  });
});

describe('parseTranslations: русские строки (шаг 2)', () => {
  it('по переводу на строку', () => {
    assert.deepEqual(parseTranslations('Я ем яблоко.\nОна любит яблоки.'), ['Я ем яблоко.', 'Она любит яблоки.']);
  });

  it('английские комментарии и вводные фразы отбрасываются', () => {
    const text = 'Here are the translations:\nВот перевод:\nЯ ем яблоко.\nSure, no problem!\nОна любит яблоки.';
    assert.deepEqual(parseTranslations(text), ['Я ем яблоко.', 'Она любит яблоки.']);
  });

  it('нумерация, markdown и кавычки срезаются', () => {
    assert.deepEqual(parseTranslations('1. Я ем яблоко.\n2) **Она любит яблоки.**\n- «Мы купили одно.»'), [
      'Я ем яблоко.',
      'Она любит яблоки.',
      'Мы купили одно.',
    ]);
  });

  it('строка «English ||| Русский» даёт русскую часть', () => {
    assert.deepEqual(parseTranslations('I eat apples. ||| Я ем яблоки.'), ['Я ем яблоки.']);
  });

  it('только английский — пусто (перевод не удался)', () => {
    assert.deepEqual(parseTranslations('I eat apples.\nShe sings.'), []);
    assert.deepEqual(parseTranslations(''), []);
  });

  it('недописанная строка потока остаётся', () => {
    assert.deepEqual(parseTranslations('Я ем яблоко.\nОна люб'), ['Я ем яблоко.', 'Она люб']);
  });

  it('служебные слова вроде constructor не ломают разбор', () => {
    assert.deepEqual(parseTranslations('constructor\nПривет.'), ['Привет.']);
  });
});

describe('combineExamples: склейка по номеру строки', () => {
  const en = ['I eat apples.', 'She sings.', 'We run.'];
  const ru = ['Я ем яблоки.', 'Она поёт.', 'Мы бежим.'];

  it('переводы подходят к предложениям по индексу', () => {
    assert.deepEqual(combineExamples(en, ru), [
      { en: 'I eat apples.', ru: 'Я ем яблоки.' },
      { en: 'She sings.', ru: 'Она поёт.' },
      { en: 'We run.', ru: 'Мы бежим.' },
    ]);
  });

  it('переводов меньше (идёт потоковый перевод): у остальных ru пустой', () => {
    assert.deepEqual(combineExamples(en, ['Я ем яблоки.']), [
      { en: 'I eat apples.', ru: 'Я ем яблоки.' },
      { en: 'She sings.', ru: '' },
      { en: 'We run.', ru: '' },
    ]);
  });

  it('лишние переводы игнорируются', () => {
    assert.deepEqual(combineExamples(['A cat.'], ['Кошка.', 'Лишнее.']), [{ en: 'A cat.', ru: 'Кошка.' }]);
  });

  it('перевода нет — остаются только английские предложения', () => {
    assert.deepEqual(combineExamples(en, []), en.map((sentence) => ({ en: sentence, ru: '' })));
  });

  it('предложений нет — пусто, даже если переводы есть', () => {
    assert.deepEqual(combineExamples([], ru), []);
  });
});

describe('matchTranslations: принять или отклонить готовый перевод', () => {
  const en = ['I eat apples.', 'She sings.'];

  it('столько же строк — принимаем', () => {
    assert.deepEqual(matchTranslations(en, ['Я ем яблоки.', 'Она поёт.']), ['Я ем яблоки.', 'Она поёт.']);
  });

  it('строк больше — берём первые по числу предложений', () => {
    assert.deepEqual(matchTranslations(en, ['Я ем яблоки.', 'Она поёт.', 'Надеюсь, это поможет!']), [
      'Я ем яблоки.',
      'Она поёт.',
    ]);
  });

  it('строк меньше — null: по номеру строки уже не понять, что к чему', () => {
    assert.equal(matchTranslations(en, ['Я ем яблоки.']), null);
    assert.equal(matchTranslations(en, []), null);
  });

  it('предложений нет — null', () => {
    assert.equal(matchTranslations([], ['Привет.']), null);
  });
});

describe('весь путь: ответы модели → пары для карточки', () => {
  /** Как AiExample обрабатывает ответы двух шагов. */
  function pipeline(step1: string, step2: string) {
    const sentences = parseSentences(step1);
    const accepted = matchTranslations(sentences, parseTranslations(step2));
    return combineExamples(sentences, accepted ?? []);
  }

  it('аккуратные ответы', () => {
    assert.deepEqual(pipeline('I eat apples.\nShe sings.', 'Я ем яблоки.\nОна поёт.'), [
      { en: 'I eat apples.', ru: 'Я ем яблоки.' },
      { en: 'She sings.', ru: 'Она поёт.' },
    ]);
  });

  it('«срыв» в обоих шагах: вступления, нумерация, комментарии', () => {
    const step1 = 'Sure! Here are your sentences:\n1. Hello, Anna!\n2) Say hello to him.\nЯ слышу привет.';
    const step2 = 'Вот перевод:\n1. Привет, Анна!\n2) Передай ему привет.\nНадеюсь, это поможет!';

    assert.deepEqual(pipeline(step1, step2), [
      { en: 'Hello, Anna!', ru: 'Привет, Анна!' },
      { en: 'Say hello to him.', ru: 'Передай ему привет.' },
    ]);
  });

  it('перевод не удался (английский текст, пусто, слишком мало строк): остаются английские предложения', () => {
    const step1 = 'I eat apples.\nShe sings.\nWe run.';
    const englishOnly = [
      { en: 'I eat apples.', ru: '' },
      { en: 'She sings.', ru: '' },
      { en: 'We run.', ru: '' },
    ];

    assert.deepEqual(pipeline(step1, 'Here are the translations:\nI eat apples.'), englishOnly);
    assert.deepEqual(pipeline(step1, '   '), englishOnly);
    assert.deepEqual(pipeline(step1, 'Я ем яблоки.\nОна поёт.'), englishOnly, 'две строки на три предложения');
  });
});