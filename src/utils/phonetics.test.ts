import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { STARTER_WORDS } from '../data/words';
import {
  HOMOPHONE_GROUPS,
  PRONUNCIATION_THRESHOLD,
  bestPronunciationMatch,
  comparePronunciation,
  isPronunciationAccepted,
  levenshteinDistance,
  normalizeText,
  phoneticKey,
} from './phonetics';

// Запуск: npm test  (tsx --test ...)

const accepted = (target: string, spoken: string): boolean =>
  isPronunciationAccepted(comparePronunciation(target, spoken));

describe('нормализация', () => {
  it('регистр, знаки препинания и пробелы', () => {
    assert.equal(normalizeText('  Hello!  '), 'hello');
    assert.equal(normalizeText("Don't"), 'dont');
    assert.equal(normalizeText('ice-cream'), 'ice cream');
    assert.equal(normalizeText('Hello,   WORLD...'), 'hello world');
    assert.equal(normalizeText('Café'), 'cafe');
    assert.equal(normalizeText('?!'), '');
  });

  it('числа 0–20 записываются словами, остальные не трогаем', () => {
    assert.equal(normalizeText('2'), 'two');
    assert.equal(normalizeText('10 apples'), 'ten apples');
    assert.equal(normalizeText('21'), '21');
    assert.equal(normalizeText('constructor'), 'constructor', 'служебные имена не ломают таблицу');
  });
});

describe('comparePronunciation', () => {
  it('cat и kat: фонетически одно слово (> 0,8)', () => {
    const score = comparePronunciation('cat', 'kat');
    assert.ok(score > PRONUNCIATION_THRESHOLD, `cat/kat = ${score}`);
    assert.ok(score < 1, 'но это не точное совпадение');
  });

  it('cat и cut: разные слова, гласные сохраняются (< 0,8)', () => {
    const score = comparePronunciation('cat', 'cut');
    assert.ok(score < PRONUNCIATION_THRESHOLD, `cat/cut = ${score}`);
    for (const other of ['cot', 'cart', 'bat', 'cap', 'kit']) {
      assert.ok(comparePronunciation('cat', other) < PRONUNCIATION_THRESHOLD, `cat/${other}`);
    }
  });

  it('точное совпадение — 1, регистр и пунктуация не важны', () => {
    assert.equal(comparePronunciation('cat', 'cat'), 1);
    assert.equal(comparePronunciation('cat', 'Cat.'), 1);
    assert.equal(comparePronunciation('Hello', '  HELLO!!! '), 1);
    assert.equal(comparePronunciation('goodbye', 'good bye'), 1);
    assert.equal(comparePronunciation('ice cream', 'icecream'), 1);
  });

  it('пустые строки дают 0', () => {
    assert.equal(comparePronunciation('', 'cat'), 0);
    assert.equal(comparePronunciation('cat', ''), 0);
    assert.equal(comparePronunciation('', ''), 0);
    assert.equal(comparePronunciation('cat', '?!'), 0);
  });

  it('цифры вместо слов: «2» — это two', () => {
    assert.equal(comparePronunciation('two', '2'), 1);
    assert.equal(comparePronunciation('one', '1'), 1);
    assert.equal(comparePronunciation('three', '3.'), 1);
  });

  it('омофоны принимаются', () => {
    for (const [target, spoken] of [['two', 'to'], ['two', 'too'], ['write', 'right'], ['no', 'know'],
      ['buy', 'by'], ['see', 'sea'], ['eye', 'I'], ['one', 'won'], ['here', 'hear'], ['blue', 'blew']] as const) {
      assert.ok(accepted(target, spoken), `${target} ← ${spoken}`);
      assert.ok(accepted(spoken, target), `${spoken} ← ${target}`);
    }
  });

  it('разные написания согласных', () => {
    for (const [a, b] of [['phone', 'fone'], ['wrong', 'rong'], ['queen', 'kween'], ['knee', 'nee'],
      ['kitchen', 'kitchen'], ['cold', 'kold'], ['city', 'sity'], ['back', 'bak']] as const) {
      assert.ok(accepted(a, b), `${a} ≈ ${b}`);
    }
    assert.equal(phoneticKey('cat'), 'kat');
    assert.equal(phoneticKey('cut'), 'kut');
    assert.equal(phoneticKey('knight'), 'nit');
  });

  it('небольшие неточности распознавания в длинных словах', () => {
    assert.ok(accepted('apple', 'apples'));
    assert.ok(accepted('tomorrow', 'tomorow'));
    assert.ok(accepted('beautiful', 'beautifull'));
  });

  it('разные слова далеко друг от друга', () => {
    assert.ok(comparePronunciation('hello', 'water') < 0.5);
    assert.ok(comparePronunciation('cat', 'elephant') < 0.4);
  });

  it('симметрична и всегда в диапазоне 0–1', () => {
    const samples = ['cat', 'kat', 'cut', 'two', 'to', 'phone', 'fone', 'hello', 'apple', 'a', 'zzzzzz', 'tomorrow'];
    for (const a of samples) {
      for (const b of samples) {
        const forward = comparePronunciation(a, b);
        assert.equal(forward, comparePronunciation(b, a), `${a}/${b}`);
        assert.ok(forward >= 0 && forward <= 1, `${a}/${b} = ${forward}`);
      }
    }
  });
});

describe('вспомогательные функции', () => {
  it('расстояние Левенштейна', () => {
    assert.equal(levenshteinDistance('kitten', 'sitting'), 3);
    assert.equal(levenshteinDistance('', 'abc'), 3);
    assert.equal(levenshteinDistance('abc', ''), 3);
    assert.equal(levenshteinDistance('same', 'same'), 0);
    assert.equal(levenshteinDistance('cat', 'cut'), 1);
  });

  it('порог строгий: ровно 0,8 не принимается', () => {
    assert.equal(PRONUNCIATION_THRESHOLD, 0.8);
    assert.equal(isPronunciationAccepted(0.8), false);
    assert.equal(isPronunciationAccepted(0.81), true);
    assert.equal(isPronunciationAccepted(0), false);
  });

  it('bestPronunciationMatch берёт лучший вариант распознавания', () => {
    assert.deepEqual(bestPronunciationMatch('cat', ['cut', 'kat', 'cart']), { similarity: 0.95, heard: 'kat' });
    assert.equal(bestPronunciationMatch('cat', ['cat', 'cut']).heard, 'cat');
    // ничего не подошло — показываем самый вероятный вариант
    const none = bestPronunciationMatch('cat', ['water', 'house']);
    assert.equal(none.heard, 'water');
    assert.ok(!isPronunciationAccepted(none.similarity));
    assert.deepEqual(bestPronunciationMatch('cat', []), { similarity: 0, heard: '' });
  });

  it('таблица омофонов: ни одно слово не встречается в двух группах', () => {
    const seen = new Set<string>();
    for (const word of HOMOPHONE_GROUPS.flat()) {
      assert.ok(!seen.has(word), `«${word}» повторяется`);
      seen.add(word);
    }
  });
});

describe('словарь приложения (100 слов)', () => {
  const words = STARTER_WORDS.map((word) => word.en);

  it('в базе действительно 100 слов', () => {
    assert.equal(words.length, 100);
  });

  it('каждое слово принимается, когда его произносят: как есть, ЗАГЛАВНЫМИ, с точкой', () => {
    for (const word of words) {
      assert.equal(comparePronunciation(word, word), 1, word);
      assert.equal(comparePronunciation(word, `${word.toUpperCase()}.`), 1, word);
    }
  });

  it('разные слова базы не совпадают друг с другом', () => {
    const collisions: string[] = [];
    let closest = { pair: '', score: 0 };

    for (let i = 0; i < words.length; i += 1) {
      for (let j = i + 1; j < words.length; j += 1) {
        const a = words[i]!;
        const b = words[j]!;
        const score = comparePronunciation(a, b);
        if (isPronunciationAccepted(score)) collisions.push(`${a} / ${b} (${score.toFixed(2)})`);
        if (score > closest.score) closest = { pair: `${a} / ${b}`, score };
      }
    }

    assert.deepEqual(collisions, [], `слова принимаются друг за друга: ${collisions.join(', ')}`);
    assert.ok(
      closest.score < PRONUNCIATION_THRESHOLD,
      `самая похожая пара: ${closest.pair} = ${closest.score.toFixed(2)}`,
    );
  });

  it('слово базы не принимается за слово, отличающееся одной гласной', () => {
    const swaps: Array<[string, string]> = [
      ['cat', 'cut'], ['bad', 'bed'], ['big', 'bag'], ['hot', 'hat'], ['man', 'men'],
      ['red', 'rid'], ['sell', 'sill'], ['wait', 'wet'],
    ];
    for (const [a, b] of swaps) {
      assert.ok(!accepted(a, b), `${a} ← ${b}`);
    }
  });
});
