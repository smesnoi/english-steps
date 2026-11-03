import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GRAMMAR_TOPICS } from '../data/grammar';
import { GRAMMAR_QUESTIONS } from '../data/grammarQuestions';
import { generateGrammarQuiz } from './grammarExercises';

// Запуск: npm test  (tsx --test ...)

const CYRILLIC = /[А-Яа-яЁё]/;
const LATIN = /[A-Za-z]/;
const normalize = (text: string): string => text.trim().toLowerCase().replace(/\s+/g, ' ');

/** Детерминированный генератор случайных чисел (mulberry32): один seed — одна и та же последовательность. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('темы грамматики (данные)', () => {
  it('шесть тем с уникальными стабильными id', () => {
    assert.equal(GRAMMAR_TOPICS.length, 6);
    const ids = GRAMMAR_TOPICS.map((topic) => topic.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[a-z]+(-[a-z]+)*$/, id);
  });

  it('у каждой темы заголовок, описание, 1–2 правила', () => {
    for (const topic of GRAMMAR_TOPICS) {
      assert.ok(topic.title.trim() !== '' && topic.description.trim() !== '', topic.id);
      assert.ok(topic.rules.length >= 1 && topic.rules.length <= 2, `${topic.id}: правил ${topic.rules.length}`);
    }
  });

  it('у каждого правила объяснение по-русски и 2–3 примера с переводом', () => {
    for (const topic of GRAMMAR_TOPICS) {
      for (const rule of topic.rules) {
        const where = `${topic.id} / ${rule.title}`;
        assert.ok(rule.title.trim() !== '', where);
        assert.ok(CYRILLIC.test(rule.explanation), `${where}: объяснение по-русски`);
        assert.ok(rule.examples.length >= 2 && rule.examples.length <= 3, `${where}: примеров ${rule.examples.length}`);
        for (const example of rule.examples) {
          assert.ok(LATIN.test(example.en) && !CYRILLIC.test(example.en), `${where}: «${example.en}» — английский`);
          assert.ok(CYRILLIC.test(example.ru), `${where}: «${example.ru}» — русский`);
        }
      }
    }
  });

  it('примеры не повторяются', () => {
    const sentences = GRAMMAR_TOPICS.flatMap((topic) =>
      topic.rules.flatMap((rule) => rule.examples.map((example) => normalize(example.en))),
    );
    assert.equal(new Set(sentences).size, sentences.length);
  });

  it('у каждой темы есть вопросы и у каждого банка вопросов есть тема', () => {
    const topicIds = GRAMMAR_TOPICS.map((topic) => topic.id).sort();
    assert.deepEqual(Object.keys(GRAMMAR_QUESTIONS).sort(), topicIds);
  });
});

describe('generateGrammarQuiz', () => {
  it('для каждой темы ровно 5 вопросов, всего 30', () => {
    let total = 0;
    for (const topic of GRAMMAR_TOPICS) {
      const quiz = generateGrammarQuiz(topic.id);
      assert.equal(quiz.length, 5, topic.id);
      total += quiz.length;
    }
    assert.equal(total, 30);
  });

  it('четыре варианта, correctIndex всегда в диапазоне 0–3 и указывает на верный ответ', () => {
    for (const topic of GRAMMAR_TOPICS) {
      // много раз с разным порядком: проверяем перемешивание, а не одну удачную раскладку
      for (let seed = 1; seed <= 50; seed += 1) {
        for (const question of generateGrammarQuiz(topic.id, seededRandom(seed))) {
          assert.equal(question.options.length, 4, question.id);
          assert.ok(Number.isInteger(question.correctIndex), question.id);
          assert.ok(question.correctIndex >= 0 && question.correctIndex <= 3, `${question.id}: ${question.correctIndex}`);

          const seed_ = GRAMMAR_QUESTIONS[topic.id]?.find((item) => item.id === question.id);
          assert.ok(seed_, `${question.id}: нет в банке`);
          assert.equal(question.options[question.correctIndex], seed_.correct, `${question.id}: correctIndex указывает не на верный ответ`);
        }
      }
    }
  });

  it('нет дубликатов вопросов: ни в одном тесте, ни во всём банке; id уникальны', () => {
    const texts = new Set<string>();
    const ids = new Set<string>();
    for (const topic of GRAMMAR_TOPICS) {
      const quiz = generateGrammarQuiz(topic.id);
      assert.equal(new Set(quiz.map((q) => normalize(q.question))).size, quiz.length, `${topic.id}: повтор внутри теста`);
      for (const question of quiz) {
        assert.ok(!texts.has(normalize(question.question)), `повтор формулировки: ${question.question}`);
        assert.ok(!ids.has(question.id), `повтор id: ${question.id}`);
        texts.add(normalize(question.question));
        ids.add(question.id);
      }
    }
    assert.equal(texts.size, 30);
  });

  it('внутри вопроса варианты не повторяются (иначе верных ответов могло бы быть два)', () => {
    for (const topic of GRAMMAR_TOPICS) {
      for (const question of generateGrammarQuiz(topic.id)) {
        const options = question.options.map(normalize);
        assert.equal(new Set(options).size, 4, `${question.id}: ${question.options.join(' / ')}`);
        assert.ok(options.every((option) => option !== ''), question.id);
      }
    }
  });

  it('в каждом вопросе один пропуск «___» и объяснение по-русски', () => {
    for (const topic of GRAMMAR_TOPICS) {
      for (const question of generateGrammarQuiz(topic.id)) {
        assert.equal((question.question.match(/___/g) ?? []).length, 1, question.id);
        assert.ok(CYRILLIC.test(question.explanation), `${question.id}: объяснение`);
      }
    }
  });

  it('набор вариантов — это верный ответ и три неверных из банка, ничего не теряется', () => {
    for (const topic of GRAMMAR_TOPICS) {
      for (const question of generateGrammarQuiz(topic.id, seededRandom(7))) {
        const source = GRAMMAR_QUESTIONS[topic.id]?.find((item) => item.id === question.id);
        assert.deepEqual([...question.options].sort(), [source!.correct, ...source!.wrong].sort(), question.id);
        assert.equal(question.question, source!.question);
        assert.equal(question.explanation, source!.explanation);
      }
    }
  });

  it('верный ответ встречается на всех четырёх местах (варианты действительно перемешиваются)', () => {
    const positions = new Set<number>();
    for (let seed = 1; seed <= 200; seed += 1) {
      const question = generateGrammarQuiz('articles', seededRandom(seed)).find((q) => q.id === 'articles-q1');
      positions.add(question!.correctIndex);
    }
    assert.deepEqual([...positions].sort(), [0, 1, 2, 3]);
  });

  it('порядок вопросов тоже меняется, но состав — всегда те же 5', () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 60; seed += 1) {
      const ids = generateGrammarQuiz('past-simple', seededRandom(seed)).map((q) => q.id);
      assert.deepEqual([...ids].sort(), ['past-simple-q1', 'past-simple-q2', 'past-simple-q3', 'past-simple-q4', 'past-simple-q5']);
      orders.add(ids.join(','));
    }
    assert.ok(orders.size > 10, `разных порядков: ${orders.size}`);
  });

  it('при одном и том же seed результат один и тот же', () => {
    assert.deepEqual(generateGrammarQuiz('comparatives', seededRandom(42)), generateGrammarQuiz('comparatives', seededRandom(42)));
    assert.notDeepEqual(generateGrammarQuiz('comparatives', seededRandom(42)), generateGrammarQuiz('comparatives', seededRandom(43)));
  });

  it('банк вопросов не меняется, а результат — новый объект при каждом вызове', () => {
    const before = JSON.stringify(GRAMMAR_QUESTIONS);
    const first = generateGrammarQuiz('plural-nouns');
    first[0]!.options.push('мусор');
    first.pop();

    assert.equal(JSON.stringify(GRAMMAR_QUESTIONS), before);
    const second = generateGrammarQuiz('plural-nouns');
    assert.equal(second.length, 5);
    assert.ok(second.every((question) => question.options.length === 4));
  });

  it('неизвестная тема — пустой список, в том числе служебные имена объекта', () => {
    for (const id of ['', 'nope', 'Present-Simple', 'constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      assert.deepEqual(generateGrammarQuiz(id), [], id);
    }
  });
});
