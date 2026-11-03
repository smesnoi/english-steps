import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SrsState, StoredSrsState, Word } from '@/types';
import { startOfDay } from './date';
import {
  INTERVAL_FACTOR,
  MAX_DIFFICULTY,
  MAX_INTERVAL_DAYS,
  MAX_STABILITY,
  MIN_DIFFICULTY,
  MIN_STABILITY,
  applyAnswer,
  buildStudyQueue,
  getStatus,
  intervalForStability,
  isDue,
  migrateSrsMap,
  migrateSrsState,
  retrievability,
} from './srs';

// Запуск: npm test  (tsx --test src/utils/srs.test.ts)

const MS_PER_DAY = 86_400_000;

/** 1 октября 2026 + offset дней, в заданный час (по умолчанию в полдень). */
const day = (offset: number, hour = 12): Date => new Date(2026, 9, 1 + offset, hour);

const closeTo = (actual: number, expected: number, epsilon = 0.01): void => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `ожидалось ≈ ${expected}, получено ${actual}`);
};

/** Через сколько календарных дней слово станет «просроченным» после ответа в момент `answeredAt`. */
const daysUntilNext = (state: SrsState, answeredAt: Date): number =>
  Math.round((state.nextReviewAt - startOfDay(answeredAt).getTime()) / MS_PER_DAY);

/** Состояние слова, ответ на которое был в день 0 (для проверки отдельных формул). */
const stateAt = (overrides: Partial<SrsState>): SrsState => ({
  stability: 3,
  difficulty: 5,
  repetitions: 2,
  lapses: 0,
  lastReviewedAt: day(0).getTime(),
  nextReviewAt: day(3).getTime(),
  ...overrides,
});

/** Отвечаем на слово строго в день повторения (ошибка — на следующий день). */
function runOnSchedule(answers: readonly boolean[]) {
  const states: SrsState[] = [];
  const intervals: number[] = [];
  const days: number[] = [];
  let state: SrsState | undefined;
  let dayOffset = 0;

  for (const correct of answers) {
    const at = day(dayOffset);
    state = applyAnswer(state, correct, at);
    const interval = daysUntilNext(state, at);
    states.push(state);
    intervals.push(interval);
    days.push(dayOffset);
    dayOffset += interval;
  }
  return { states, intervals, days };
}

describe('лёгкое слово', () => {
  it('3 верных ответа подряд: интервал растёт 1 → 3 → 7', () => {
    const { states, intervals } = runOnSchedule([true, true, true]);

    assert.deepEqual(intervals, [1, 3, 7]);
    assert.deepEqual(
      states.map((s) => s.repetitions),
      [1, 2, 3],
    );
    assert.ok(states[0]!.stability < states[1]!.stability && states[1]!.stability < states[2]!.stability);
    assert.ok(states[0]!.difficulty > states[1]!.difficulty && states[1]!.difficulty > states[2]!.difficulty);
    assert.ok(states.every((s) => s.lapses === 0));
  });

  it('первый ответ: стабильность остаётся 1, сложность чуть снижается', () => {
    const state = applyAnswer(undefined, true, day(0));

    assert.equal(state.stability, 1);
    assert.equal(state.difficulty, 4.8);
    assert.equal(state.repetitions, 1);
    assert.equal(state.lapses, 0);
    assert.equal(state.lastReviewedAt, day(0).getTime());
    assert.equal(daysUntilNext(state, day(0)), 1);
  });

  it('эталонная последовательность из 5 ответов в срок: 1, 3, 7, 17, 39', () => {
    const { intervals, days } = runOnSchedule([true, true, true, true, true]);

    assert.deepEqual(intervals, [1, 3, 7, 17, 39]);
    assert.deepEqual(days, [0, 1, 4, 11, 28]);
  });

  it('становится выученным на 4-м верном ответе (≈ 11-й день)', () => {
    const { states, days } = runOnSchedule([true, true, true, true]);

    assert.deepEqual(
      states.map(getStatus),
      ['learning', 'learning', 'learning', 'learned'],
    );
    assert.equal(days[3], 11);
  });
});

describe('сложное слово', () => {
  it('верно → неверно → верно: стабильность падает, интервал остаётся коротким', () => {
    const { states, intervals } = runOnSchedule([true, false, true]);
    const [first, afterMistake, afterRecovery] = states as [SrsState, SrsState, SrsState];

    // ошибка
    assert.ok(afterMistake.stability < first.stability, 'стабильность упала');
    assert.ok(afterMistake.difficulty > first.difficulty, 'сложность выросла');
    assert.equal(afterMistake.lapses, 1);
    assert.equal(afterMistake.repetitions, 0);
    assert.equal(intervals[1], 1, 'после ошибки слово возвращается на следующий день');

    // восстановление
    assert.ok(intervals[2]! <= 3, `интервал короткий, получено ${intervals[2]}`);
    assert.ok(afterRecovery.difficulty > 5, 'слово осталось «сложнее среднего»');
    assert.equal(getStatus(afterRecovery), 'learning');

    // и заметно отстаёт от лёгкого слова на том же шаге
    const easy = runOnSchedule([true, true, true]);
    assert.ok(afterRecovery.stability < easy.states[2]!.stability / 2);
    assert.ok(intervals[2]! < easy.intervals[2]!);
  });
});

describe('неверный ответ', () => {
  const mature = stateAt({
    stability: 20,
    difficulty: 4,
    repetitions: 4,
    nextReviewAt: day(20).getTime(),
  });

  it('зрелое слово: стабильность резко падает, но возвращается завтра', () => {
    const state = applyAnswer(mature, false, day(20));

    closeTo(state.stability, 8); // 20 · (0,6 − 0,05 · 4)
    assert.equal(state.difficulty, 5);
    assert.equal(state.repetitions, 0);
    assert.equal(state.lapses, 1);
    assert.equal(daysUntilNext(state, day(20)), 1);
    assert.equal(getStatus(mature), 'learned');
    assert.equal(getStatus(state), 'learning', 'ошибка выводит слово из «выучено»');
  });

  it('новое слово, первый ответ неверный', () => {
    const state = applyAnswer(undefined, false, day(0));

    assert.equal(state.stability, MIN_STABILITY);
    assert.equal(state.difficulty, 6);
    assert.equal(state.lapses, 1);
    assert.equal(state.repetitions, 0);
    assert.equal(daysUntilNext(state, day(0)), 1);
  });

  it('чем сложнее слово, тем сильнее падает стабильность', () => {
    const afterEasy = applyAnswer(stateAt({ stability: 20, difficulty: 3 }), false, day(3));
    const afterHard = applyAnswer(stateAt({ stability: 20, difficulty: 8 }), false, day(3));

    assert.ok(afterHard.stability < afterEasy.stability);
  });

  it('после ошибки верный ответ на следующий день почти не увеличивает интервал', () => {
    const afterMistake = applyAnswer(mature, false, day(20));
    const recovered = applyAnswer(afterMistake, true, day(21));
    const interval = daysUntilNext(recovered, day(21));

    assert.ok(interval >= 8 && interval <= 10, `ожидалось 8–10 дней, получено ${interval}`);
  });
});

describe('влияние сложности и времени ответа', () => {
  it('чем выше сложность, тем медленнее рост стабильности', () => {
    const grown = [2, 5, 8, 10].map(
      (difficulty) => applyAnswer(stateAt({ difficulty }), true, day(3)).stability,
    );

    for (let i = 1; i < grown.length; i += 1) assert.ok(grown[i]! < grown[i - 1]!);
    assert.ok(grown.every((value) => value > 3), 'при верном ответе стабильность не падает');
  });

  it('чем позже повторили, тем сильнее рост', () => {
    const grown = [0, 1, 3, 6, 12].map(
      (elapsed) => applyAnswer(stateAt({}), true, day(elapsed)).stability,
    );

    closeTo(grown[0]!, 3, 0.001); // в тот же день стабильность не растёт
    for (let i = 1; i < grown.length; i += 1) assert.ok(grown[i]! > grown[i - 1]!);
  });

  it('повтор в тот же день не накручивает стабильность', () => {
    const first = applyAnswer(undefined, true, day(0, 9));
    const again = applyAnswer(first, true, day(0, 20));

    assert.equal(again.stability, first.stability);
    assert.equal(daysUntilNext(again, day(0, 20)), 1);
  });
});

describe('границы значений', () => {
  it('сложность остаётся в диапазоне 1–10', () => {
    assert.equal(applyAnswer(stateAt({ difficulty: 1.1 }), true, day(3)).difficulty, MIN_DIFFICULTY);
    assert.equal(applyAnswer(stateAt({ difficulty: 9.5 }), false, day(3)).difficulty, MAX_DIFFICULTY);

    let state: SrsState | undefined;
    for (let i = 0; i < 40; i += 1) state = applyAnswer(state, false, day(i));
    assert.equal(state!.difficulty, MAX_DIFFICULTY);
  });

  it('стабильность не больше 365, интервал не больше 365', () => {
    const state = applyAnswer(stateAt({ stability: 364, difficulty: 1 }), true, day(1000));

    assert.equal(state.stability, MAX_STABILITY);
    assert.equal(daysUntilNext(state, day(1000)), MAX_INTERVAL_DAYS);
  });

  it('стабильность не меньше 0,5, интервал после ошибки всегда 1 день', () => {
    let state: SrsState | undefined;
    for (let i = 0; i < 10; i += 1) {
      state = applyAnswer(state, false, day(i));
      assert.ok(state.stability >= MIN_STABILITY);
      assert.equal(daysUntilNext(state, day(i)), 1);
    }
    assert.equal(state!.stability, MIN_STABILITY);
    assert.equal(state!.lapses, 10);
  });

  it('прошлый ответ «из будущего» (сбитые часы) не ломает расчёт', () => {
    const state = applyAnswer(stateAt({ lastReviewedAt: day(5).getTime() }), true, day(0));

    assert.ok(Number.isFinite(state.stability) && state.stability >= 3);
  });
});

describe('расписание', () => {
  it('nextReviewAt привязан к началу дня и не зависит от времени ответа', () => {
    const lateEvening = applyAnswer(undefined, true, day(0, 23));
    const justAfterMidnight = applyAnswer(undefined, true, day(0, 0));

    assert.equal(lateEvening.nextReviewAt, justAfterMidnight.nextReviewAt);
    assert.equal(new Date(lateEvening.nextReviewAt).getHours(), 0);
  });

  it('слово становится просроченным ровно в начале дня повторения', () => {
    const state = applyAnswer(undefined, true, day(0)); // повторить завтра

    assert.equal(isDue(state, day(0, 23)), false);
    assert.equal(isDue(state, day(1, 0)), true);
    assert.equal(isDue(undefined, day(5)), false, 'слово без записи — новое, а не просроченное');
  });

  it('очередь сессии использует nextReviewAt: слово возвращается, когда подошёл срок', () => {
    const word: Word = {
      id: 'w1',
      en: 'cat',
      ru: 'кот',
      transcription: '',
      level: 'A1',
      example: '',
      exampleTranslation: '',
      status: 'new',
      correctCount: 0,
      wrongCount: 0,
    };
    const srs = { w1: applyAnswer(undefined, true, day(0)) };

    assert.deepEqual(buildStudyQueue([word], srs, { now: day(0, 18) }), []);
    assert.deepEqual(
      buildStudyQueue([word], srs, { now: day(1, 9) }).map((w) => w.id),
      ['w1'],
    );
  });
});

describe('миграция старых данных', () => {
  const nextReviewAt = day(10).getTime();

  it('запись Лейтнера переносится по коробке: stability = интервал, repetitions = box', () => {
    const intervals = [1, 2, 4, 7, 14, 30];
    intervals.forEach((interval, box) => {
      const state = migrateSrsState({ box, nextReviewAt });

      assert.equal(state.stability, interval, `box ${box}`);
      assert.equal(state.repetitions, box);
      assert.equal(state.lapses, 0);
      assert.equal(state.difficulty, 5);
      assert.equal(state.nextReviewAt, nextReviewAt);
      assert.equal(state.lastReviewedAt, nextReviewAt - interval * MS_PER_DAY);
    });
  });

  it('прогресс не теряется: слово из коробки 5 после верного ответа растёт, а не сбрасывается к 1', () => {
    const legacy: StoredSrsState = { box: 5, nextReviewAt: day(30).getTime() };
    const state = applyAnswer(legacy, true, day(30));

    assert.ok(state.stability > 30, `стабильность ${state.stability}`);
    assert.ok(daysUntilNext(state, day(30)) > 30);
  });

  it('applyAnswer принимает старую запись так же, как уже мигрированную', () => {
    const legacy: StoredSrsState = { box: 3, nextReviewAt: day(7).getTime() };

    assert.deepEqual(
      applyAnswer(legacy, true, day(7)),
      applyAnswer(migrateSrsState(legacy), true, day(7)),
    );
  });

  it('статусы после миграции: коробки 4 и 5 остаются «выучено», остальные — «в процессе»', () => {
    const statuses = [0, 1, 2, 3, 4, 5].map((box) => getStatus(migrateSrsState({ box, nextReviewAt })));

    assert.deepEqual(statuses, ['learning', 'learning', 'learning', 'learning', 'learned', 'learned']);
  });

  it('полная запись не меняется, повторная миграция ничего не меняет', () => {
    const full = stateAt({ stability: 12.5, difficulty: 3.2, repetitions: 5, lapses: 2 });

    assert.deepEqual(migrateSrsState(full), full);
    const once = migrateSrsState({ box: 2, nextReviewAt });
    assert.deepEqual(migrateSrsState(once), once);
  });

  it('частично заполненная запись дозаполняется значениями по умолчанию', () => {
    const state = migrateSrsState({ nextReviewAt, stability: 6 });

    assert.equal(state.stability, 6);
    assert.equal(state.difficulty, 5);
    assert.equal(state.repetitions, 0);
    assert.equal(state.lapses, 0);
    assert.equal(state.lastReviewedAt, nextReviewAt - 6 * MS_PER_DAY);
  });

  it('запись без данных получает stability = 1 и difficulty = 5', () => {
    const state = migrateSrsState({ nextReviewAt });

    assert.equal(state.stability, 1);
    assert.equal(state.difficulty, 5);
  });

  it('недопустимые значения приводятся к диапазону', () => {
    const state = migrateSrsState({
      nextReviewAt,
      stability: 1000,
      difficulty: 0,
      repetitions: -3,
      lapses: -1,
    });

    assert.equal(state.stability, MAX_STABILITY);
    assert.equal(state.difficulty, MIN_DIFFICULTY);
    assert.equal(state.repetitions, 0);
    assert.equal(state.lapses, 0);
    assert.equal(migrateSrsState({ box: 9, nextReviewAt }).stability, 30, 'коробка вне диапазона → последняя');
  });

  it('migrateSrsMap переносит все записи и пропускает пустые', () => {
    const result = migrateSrsMap({
      a: { box: 1, nextReviewAt },
      b: stateAt({}),
      c: undefined,
    });

    assert.deepEqual(Object.keys(result).sort(), ['a', 'b']);
    assert.equal(result.a?.stability, 2);
    assert.equal(result.b?.stability, 3);
  });
});

describe('статус слова', () => {
  const state = (stability: number, repetitions: number): SrsState => stateAt({ stability, repetitions });

  it('новое слово без записи', () => {
    assert.equal(getStatus(undefined), 'new');
  });

  it('выучено: стабильность ≥ 14 дней и ≥ 3 верных ответов подряд', () => {
    assert.equal(getStatus(state(14, 3)), 'learned');
    assert.equal(getStatus(state(40, 8)), 'learned');
    assert.equal(getStatus(state(13.99, 5)), 'learning', 'стабильности не хватает');
    assert.equal(getStatus(state(30, 2)), 'learning', 'мало верных ответов подряд');
    assert.equal(getStatus(state(1, 0)), 'learning');
  });
});

describe('формулы', () => {
  it('вероятность вспомнить: 0,9 в срок, 1 в день ответа, убывает со временем', () => {
    closeTo(retrievability(5, 5), 0.9, 1e-9);
    assert.equal(retrievability(0, 5), 1);
    assert.ok(retrievability(10, 5) < retrievability(5, 5));
    assert.equal(retrievability(-3, 5), 1, 'отрицательное время считается нулевым');
  });

  it('интервал = стабильность × множитель (при 90% множитель равен 1), от 1 до 365 дней', () => {
    closeTo(INTERVAL_FACTOR, 1, 1e-9);
    assert.equal(intervalForStability(0.2), 1);
    assert.equal(intervalForStability(7.4), 7);
    assert.equal(intervalForStability(400), 365);
  });
});
