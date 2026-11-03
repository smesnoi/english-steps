/*
 * Сравнение произношения по тексту, который вернул распознаватель речи.
 *
 * Важно: Web Speech API отдаёт распознанный ТЕКСТ, а не оценку произношения.
 * «Верно» здесь значит «браузер понял именно это слово» — это проверка
 * разборчивости, а не фонетическая оценка.
 *
 * Как считается сходство target и spoken (от 0 до 1):
 * 1. Нормализация: без регистра, знаков препинания и пробелов; цифры → слова («2» → «two»).
 * 2. Одинаковые строки → 1.
 * 3. Омофоны (two / to / too, write / right…) → 0,95.
 * 4. «Фонетическая запись»: разные написания одних и тех же согласных приводятся к одному
 *    виду (c → k, ph → f, wr → r…), ГЛАСНЫЕ СОХРАНЯЮТСЯ. Записи совпали (cat / kat) → 0,95.
 * 5. Иначе — сходство по Левенштейну (1 − расстояние / длина длинной строки), лучшее из
 *    двух: по исходным строкам и по их фонетическим записям.
 *
 * Soundex намеренно не используется: он игнорирует гласные, и cat, cut, cot считались бы
 * одним словом, а различать такие слова как раз и нужно.
 */

/** Слово принимается как верно произнесённое, если сходство СТРОГО больше порога. */
export const PRONUNCIATION_THRESHOLD = 0.8;

/** Оценка для «то же слово, записанное иначе» (омофон или совпавшая фонетическая запись). */
const EQUIVALENT_SCORE = 0.95;

// ───────────────────────────── Нормализация ─────────────────────────────

const NUMBER_WORDS = new Map<string, string>(
  [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
    'nineteen', 'twenty',
  ].map((word, index) => [String(index), word]),
);

/**
 * Приводит текст к виду для сравнения: нижний регистр, без диакритики и пунктуации,
 * слова через один пробел, числа 0–20 записаны словами (распознаватель часто пишет «2»).
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’‘`´]/g, '') // don't → dont
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // ice-cream → ice cream, «Hello!» → hello
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => NUMBER_WORDS.get(token) ?? token)
    .join(' ');
}

/** Нормализованный текст без пробелов: «good bye» и «goodbye» считаются одним словом. */
const compact = (text: string): string => normalizeText(text).replace(/\s/g, '');

// ───────────────────────────── Омофоны ─────────────────────────────

/** Слова, которые звучат одинаково: распознаватель не отличит их по звуку. */
export const HOMOPHONE_GROUPS: readonly (readonly string[])[] = [
  ['two', 'to', 'too'],
  ['four', 'for', 'fore'],
  ['eight', 'ate'],
  ['one', 'won'],
  ['no', 'know'],
  ['new', 'knew'],
  ['write', 'right', 'rite'],
  ['see', 'sea', 'c'],
  ['buy', 'by', 'bye'],
  ['here', 'hear'],
  ['wait', 'weight'],
  ['blue', 'blew'],
  ['eye', 'i', 'aye'],
  ['son', 'sun'],
  ['hour', 'our'],
  ['there', 'their', 'theyre'],
  ['whole', 'hole'],
  ['meet', 'meat'],
  ['week', 'weak'],
  ['made', 'maid'],
  ['plain', 'plane'],
  ['sale', 'sail'],
  ['tail', 'tale'],
  ['peace', 'piece'],
  ['mail', 'male'],
  ['bear', 'bare'],
  ['dear', 'deer'],
  ['flower', 'flour'],
  ['sell', 'cell'],
  ['be', 'bee'],
  ['wood', 'would'],
  ['die', 'dye'],
  ['hi', 'high'],
  ['pair', 'pear', 'pare'],
  ['break', 'brake'],
  ['steal', 'steel'],
  ['great', 'grate'],
];

const HOMOPHONE_GROUP_OF = new Map<string, number>();
HOMOPHONE_GROUPS.forEach((group, index) => {
  for (const word of group) HOMOPHONE_GROUP_OF.set(word, index);
});

// ───────────────────────────── Фонетическая запись ─────────────────────────────

/**
 * Упрощённая фонетическая запись английского слова (на вход — нормализованная строка
 * без пробелов). Разные написания согласных сводятся к одному, гласные остаются как есть,
 * поэтому cat → kat, но cut → kut (то есть cat и cut по-прежнему различаются).
 */
export function phoneticKey(word: string): string {
  return (
    word
      // начало слова: kn → n (knee), wr → r (write), wh → w (white)
      .replace(/^kn/, 'n')
      .replace(/^wr/, 'r')
      .replace(/^wh/, 'w')
      // диграфы → одна заглавная буква (заглавные не пересекаются с обычными буквами)
      .replace(/tch/g, 'C')
      .replace(/ch/g, 'C')
      .replace(/sh/g, 'S')
      .replace(/th/g, 'T')
      .replace(/ph/g, 'f')
      // немое gh: night, high
      .replace(/gh(?=t|$)/g, '')
      // q, x
      .replace(/qu/g, 'kw')
      .replace(/q/g, 'k')
      .replace(/x/g, 'ks')
      // c: перед e, i, y читается как s, иначе как k; ck → k
      .replace(/ck/g, 'k')
      .replace(/c(?=[eiy])/g, 's')
      .replace(/c/g, 'k')
      // двойные согласные → одна (apple ≈ aple)
      .replace(/([b-df-hj-np-tv-zCST])\1+/g, '$1')
  );
}

// ───────────────────────────── Левенштейн ─────────────────────────────

/** Расстояние Левенштейна: минимальное число вставок, удалений и замен символов. */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      const deletion = (previous[j] ?? 0) + 1;
      const insertion = (current[j - 1] ?? 0) + 1;
      current.push(Math.min(substitution, deletion, insertion));
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/** Сходство двух непустых строк от 0 до 1. */
function similarity(a: string, b: string): number {
  return 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length);
}

// ───────────────────────────── Сравнение ─────────────────────────────

/**
 * Насколько произнесённый текст похож на целевое слово: от 0 (ничего общего)
 * до 1 (то же слово). Результат принимают по порогу — см. isPronunciationAccepted.
 */
export function comparePronunciation(target: string, spoken: string): number {
  const a = compact(target);
  const b = compact(spoken);
  if (a === '' || b === '') return 0;
  if (a === b) return 1;

  const groupOfA = HOMOPHONE_GROUP_OF.get(a);
  if (groupOfA !== undefined && groupOfA === HOMOPHONE_GROUP_OF.get(b)) return EQUIVALENT_SCORE;

  const keyA = phoneticKey(a);
  const keyB = phoneticKey(b);
  if (keyA === keyB) return EQUIVALENT_SCORE;

  return Math.max(similarity(a, b), similarity(keyA, keyB));
}

export interface PronunciationMatch {
  /** Сходство лучшего варианта, 0–1 */
  similarity: number;
  /** Вариант, который совпал лучше всего (если совпадений нет — самый вероятный) */
  heard: string;
}

/**
 * Сравнивает целевое слово со всеми вариантами распознавания и берёт лучший:
 * распознаватель часто ставит верное слово вторым-третьим вариантом.
 */
export function bestPronunciationMatch(
  target: string,
  candidates: readonly string[],
): PronunciationMatch {
  let best: PronunciationMatch = { similarity: 0, heard: candidates[0] ?? '' };
  for (const candidate of candidates) {
    const score = comparePronunciation(target, candidate);
    if (score > best.similarity) best = { similarity: score, heard: candidate };
  }
  return best;
}

/** Принято ли произношение: сходство строго больше PRONUNCIATION_THRESHOLD. */
export function isPronunciationAccepted(score: number): boolean {
  return score > PRONUNCIATION_THRESHOLD;
}
