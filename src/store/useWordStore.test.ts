import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Word } from '@/types';

// Запуск: npm test  (tsx --test ...)

// ── Окружение браузера: localStorage в памяти. Должно появиться до загрузки стора. ──
const memory = new Map<string, string>();
/** Если задан, запись этого ключа бросает исключение (имитация нехватки места). */
let failingKey: string | null = null;

Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (key === failingKey) throw new Error('QuotaExceededError');
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    },
  },
});

const { useWordStore } = await import('./useWordStore');
const { STORAGE_KEYS } = await import('../utils/storage');

// ── Помощники ──

/** Чистое хранилище и заново загруженный стор (первый запуск: стартовый набор слов). */
function resetStore(): void {
  memory.clear();
  failingKey = null;
  useWordStore.setState({ words: [], srs: {}, dailyStats: {}, hydrated: false });
  useWordStore.getState().hydrate();
}

/** Имитация перезагрузки страницы: хранилище остаётся, стор загружается заново. */
function reloadStore(): void {
  useWordStore.setState({ words: [], srs: {}, dailyStats: {}, hydrated: false });
  useWordStore.getState().hydrate();
}

const day = (offset: number): Date => new Date(2026, 6, 1 + offset, 12);
const storageSnapshot = (): string => JSON.stringify([...memory.entries()].sort());
const stateSnapshot = (): string => {
  const { words, srs, dailyStats, hydrated } = useWordStore.getState();
  return JSON.stringify({ words, srs, dailyStats, hydrated });
};

function makeWord(id: string, en: string, ru: string): Word {
  return {
    id,
    en,
    ru,
    transcription: '',
    level: 'A1',
    example: '',
    exampleTranslation: '',
    status: 'new',
    correctCount: 0,
    wrongCount: 0,
  };
}

/** Резервная копия в формате приложения; поля можно подменять для проверки плохих файлов. */
function backup(
  overrides: Record<string, unknown> = {},
  data: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    app: 'english-steps',
    version: 1,
    exportedAt: '2026-07-01T10:00:00.000Z',
    data: {
      words: [makeWord('t-1', 'cat', 'кот'), makeWord('t-2', 'dog', 'собака')],
      srs: {},
      dailyStats: {},
      seeded: true,
      ...data,
    },
    ...overrides,
  });
}

/** Состояние с прогрессом: ответы, своё слово, удалённое стартовое слово. */
function buildProgress(): void {
  const { answerWord, addWord, removeWord } = useWordStore.getState();
  answerWord('starter-001', true, day(0));
  answerWord('starter-001', true, day(1));
  answerWord('starter-002', false, day(1));
  addWord({
    en: 'tree',
    ru: 'дерево',
    transcription: '/triː/',
    level: 'A2',
    example: 'A tree is tall.',
    exampleTranslation: 'Дерево высокое.',
  });
  removeWord('starter-010');
}

describe('exportData', () => {
  it('собирает слова, повторение и статистику в конверт с меткой и версией', () => {
    resetStore();
    buildProgress();
    const parsed = JSON.parse(useWordStore.getState().exportData());

    assert.equal(parsed.app, 'english-steps');
    assert.equal(parsed.version, 1);
    assert.ok(!Number.isNaN(Date.parse(parsed.exportedAt)), 'exportedAt — дата в формате ISO');
    assert.deepEqual(Object.keys(parsed.data).sort(), ['dailyStats', 'seeded', 'srs', 'words']);
    assert.equal(parsed.data.seeded, true);
    assert.equal(parsed.data.words.length, 100, '100 − удалённое + своё');
    assert.ok(parsed.data.words.some((w: Word) => w.en === 'tree'));
    assert.ok(!parsed.data.words.some((w: Word) => w.id === 'starter-010'));
    assert.equal(parsed.data.srs['starter-001'].repetitions, 2);
    assert.equal(parsed.data.srs['starter-002'].lapses, 1);
    assert.equal(Object.keys(parsed.data.dailyStats).length, 2);
  });
});

describe('importData: круговой обмен', () => {
  it('экспорт → чистое хранилище → импорт восстанавливает всё, в том числе после перезагрузки', () => {
    resetStore();
    buildProgress();
    const before = stateSnapshot();
    const file = useWordStore.getState().exportData();

    resetStore(); // «новое устройство»
    assert.notEqual(stateSnapshot(), before);
    assert.equal(useWordStore.getState().importData(file), true);
    assert.equal(stateSnapshot(), before);
    assert.equal(memory.get(STORAGE_KEYS.seeded), 'true');

    reloadStore();
    assert.equal(stateSnapshot(), before, 'после перезагрузки данные те же');
  });

  it('пустой список слов остаётся пустым и не пересеивается стартовым набором', () => {
    resetStore();
    assert.equal(useWordStore.getState().importData(backup({}, { words: [] })), true);
    assert.equal(useWordStore.getState().words.length, 0);

    reloadStore();
    assert.equal(useWordStore.getState().words.length, 0);
  });

  it('записи повторения старого формата (Лейтнер) в файле мигрируют, «сироты» отбрасываются', () => {
    resetStore();
    const T = day(40).getTime();
    const file = backup(
      {},
      {
        srs: {
          't-1': { box: 5, nextReviewAt: T },
          ghost: { box: 1, nextReviewAt: T },
        },
        dailyStats: { '2026-07-01': { studied: 3, correct: 2, total: 3 } },
      },
    );

    assert.equal(useWordStore.getState().importData(file), true);
    const { srs, dailyStats } = useWordStore.getState();
    assert.deepEqual(Object.keys(srs), ['t-1']);
    assert.equal(srs['t-1']?.stability, 30);
    assert.equal(srs['t-1']?.repetitions, 5);
    assert.equal(dailyStats['2026-07-01']?.learnedCount, 0, 'в старых записях статистики нет learnedCount');
    assert.equal(JSON.parse(memory.get(STORAGE_KEYS.srs) ?? '{}')['t-1'].stability, 30, 'на диск ушёл новый формат');
  });

  it('import полностью заменяет данные, а не дополняет их', () => {
    resetStore();
    buildProgress();
    assert.equal(useWordStore.getState().importData(backup()), true);

    const { words, srs, dailyStats } = useWordStore.getState();
    assert.deepEqual(words.map((w) => w.id), ['t-1', 't-2']);
    assert.deepEqual(srs, {});
    assert.deepEqual(dailyStats, {});
  });
});

describe('importData: плохие файлы', () => {
  const tooManyWords = JSON.stringify({
    app: 'english-steps',
    version: 1,
    data: {
      words: Array.from({ length: 5001 }, (_, i) => makeWord(`w-${i}`, `w${i}`, `п${i}`)),
      srs: {},
      dailyStats: {},
    },
  });

  const cases: Array<[string, string]> = [
    ['пустая строка', ''],
    ['не JSON', 'not json'],
    ['обрезанный JSON', '{"app":"english-steps",'],
    ['null', 'null'],
    ['массив', '[]'],
    ['число', '42'],
    ['чужой JSON', backup({ app: 'other-app' })],
    ['нет метки app', backup({ app: undefined })],
    ['версия 0', backup({ version: 0 })],
    ['версия из будущего', backup({ version: 2 })],
    ['версия строкой', backup({ version: '1' })],
    ['дробная версия', backup({ version: 1.5 })],
    ['нет версии', backup({ version: undefined })],
    ['нет data', backup({ data: undefined })],
    ['data — массив', backup({ data: [] })],
    ['words не массив', backup({}, { words: 'cat' })],
    ['слово без полей', backup({}, { words: [{ id: 'a' }] })],
    ['одинаковые id слов', backup({}, { words: [makeWord('x', 'a', 'б'), makeWord('x', 'c', 'г')] })],
    ['неизвестный уровень', backup({}, { words: [{ ...makeWord('x', 'a', 'б'), level: 'C2' }] })],
    ['перевод числом', backup({}, { words: [{ ...makeWord('x', 'a', 'б'), ru: 5 }] })],
    ['служебный id __proto__', backup({}, { words: [makeWord('__proto__', 'a', 'б')] })],
    ['слишком длинный текст', backup({}, { words: [makeWord('x', 'a'.repeat(301), 'б')] })],
    ['слишком много слов', tooManyWords],
    ['коробка вне диапазона', backup({}, { srs: { 't-1': { box: 7, nextReviewAt: 1 } } })],
    ['nextReviewAt строкой', backup({}, { srs: { 't-1': { box: 1, nextReviewAt: 'завтра' } } })],
    ['stability строкой', backup({}, { srs: { 't-1': { nextReviewAt: 1, stability: 'много' } } })],
    ['srs — массив', backup({}, { srs: [] })],
    ['ключ статистики не дата', backup({}, { dailyStats: { вчера: { studied: 1, correct: 1, total: 1 } } })],
    ['отрицательная статистика', backup({}, { dailyStats: { '2026-07-01': { studied: -1, correct: 0, total: 0 } } })],
    ['огромный файл', ' '.repeat(2_000_001)],
  ];

  for (const [name, file] of cases) {
    it(`${name}: false, данные и хранилище не тронуты`, () => {
      resetStore();
      buildProgress();
      const stateBefore = stateSnapshot();
      const storageBefore = storageSnapshot();

      assert.equal(useWordStore.getState().importData(file), false);
      assert.equal(stateSnapshot(), stateBefore);
      assert.equal(storageSnapshot(), storageBefore);
    });
  }

  it('до загрузки стора импорт не выполняется', () => {
    resetStore();
    useWordStore.setState({ hydrated: false });
    assert.equal(useWordStore.getState().importData(backup()), false);
    assert.equal(useWordStore.getState().words.length, 100);
  });
});

describe('importData: сохранение', () => {
  for (const key of ['words', 'srs', 'dailyStats', 'seeded'] as const) {
    it(`не хватило места при записи «${key}»: false и откат к прежним данным`, () => {
      resetStore();
      buildProgress();
      const stateBefore = stateSnapshot();
      const storageBefore = storageSnapshot();

      failingKey = STORAGE_KEYS[key];
      assert.equal(useWordStore.getState().importData(backup()), false);
      failingKey = null;

      assert.equal(stateSnapshot(), stateBefore, 'состояние в памяти не изменилось');
      assert.equal(storageSnapshot(), storageBefore, 'в хранилище вернулись прежние значения');
      reloadStore();
      assert.equal(stateSnapshot(), stateBefore, 'и после перезагрузки данные прежние');
    });
  }
});
