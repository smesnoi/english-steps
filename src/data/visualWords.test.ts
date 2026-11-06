import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { STARTER_WORDS } from './words';
import { VISUAL_SKIP_WORDS, isVisualWord } from './visualWords';

// Запуск: npm test  (tsx --test ...)

describe('VISUAL_SKIP_WORDS', () => {
  it('содержит слова из задачи', () => {
    for (const word of ['although', 'because', 'hello', 'goodbye', 'yes', 'no', 'today', 'tomorrow', 'yesterday']) {
      assert.ok(VISUAL_SKIP_WORDS.includes(word), word);
    }
  });

  it('только строчные английские слова без повторов (иначе запись в списке не сработает)', () => {
    for (const word of VISUAL_SKIP_WORDS) assert.match(word, /^[a-z]+$/, word);
    assert.equal(new Set(VISUAL_SKIP_WORDS).size, VISUAL_SKIP_WORDS.length);
  });

  it('каждое слово из списка есть в стартовом наборе (опечатка в списке была бы заметна)', () => {
    const starter = new Set(STARTER_WORDS.map((word) => word.en));
    const missing = VISUAL_SKIP_WORDS.filter((word) => !starter.has(word));
    assert.deepEqual(missing, [], `нет в стартовом наборе: ${missing.join(', ')}`);
  });
});

describe('isVisualWord', () => {
  it('предметы, действия и места рисуются', () => {
    for (const word of ['apple', 'house', 'book', 'water', 'airport', 'eat', 'rain', 'Mother', ' street ']) {
      assert.equal(isVisualWord(word), true, word);
    }
  });

  it('слова из списка не рисуются, регистр и пробелы не помогают их обойти', () => {
    for (const word of VISUAL_SKIP_WORDS) {
      assert.equal(isVisualWord(word), false, word);
      assert.equal(isVisualWord(` ${word.toUpperCase()} `), false, word);
    }
  });

  it('слова, которые сервис картинок не примет (русские буквы, цифры, длинные фразы), не рисуются', () => {
    for (const word of ['яблоко', 'a1', '', '   ', 'one two three four', 'x'.repeat(41)]) {
      assert.equal(isVisualWord(word), false, JSON.stringify(word));
    }
  });

  it('в стартовом наборе остаётся достаточно слов для режима «Картинки»', () => {
    const visual = STARTER_WORDS.filter((word) => isVisualWord(word.en));

    assert.equal(visual.length, STARTER_WORDS.length - VISUAL_SKIP_WORDS.length);
    assert.ok(visual.length >= 40, `слов с картинками: ${visual.length}`);
    for (const word of ['apple', 'house', 'book', 'water', 'door', 'kitchen']) {
      assert.ok(visual.some((item) => item.en === word), word);
    }
  });
});
