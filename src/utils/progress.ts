/** Минимум полей дня, нужных для расчётов (DayStats из стора подходит). */
export interface DayRecord {
  correct: number;
  total: number;
  learnedCount: number;
}

export type DayRecords = Readonly<Record<string, DayRecord | undefined>>;

export interface LearnedPoint {
  /** Ключ дня "YYYY-MM-DD" */
  day: string;
  /** Сколько слов выучено на конец этого дня */
  learned: number;
  /** Были ли в этот день занятия (есть запись в dailyStats) */
  active: boolean;
}

/**
 * Ряд «выучено слов по дням» для графика.
 *
 * learnedCount в dailyStats — снимок на конец дня, записи есть только за дни с занятиями.
 * Поэтому дни без записи наследуют последнее известное значение (carry-forward),
 * иначе график проваливался бы в ноль в дни без занятий:
 * - дни до первой записи в окне берут значение последней записи ПЕРЕД окном, а если её нет — 0;
 * - последний день (сегодня) всегда равен текущему числу выученных слов `currentLearned`,
 *   чтобы график совпадал с карточкой «Выучено».
 *
 * @param days ключи дней окна от старого к новому (getLastDays)
 */
export function buildLearnedSeries(
  dailyStats: DayRecords,
  days: readonly string[],
  currentLearned: number,
): LearnedPoint[] {
  const firstDay = days[0];
  if (firstDay === undefined) return [];

  // Ключи вида YYYY-MM-DD корректно сравниваются как строки
  let latestBefore: string | undefined;
  for (const key of Object.keys(dailyStats)) {
    if (key < firstDay && (latestBefore === undefined || key > latestBefore)) {
      latestBefore = key;
    }
  }
  let last = latestBefore === undefined ? 0 : (dailyStats[latestBefore]?.learnedCount ?? 0);

  const lastIndex = days.length - 1;
  return days.map((day, index) => {
    const record = dailyStats[day];
    if (record !== undefined) last = record.learnedCount;
    return {
      day,
      learned: index === lastIndex ? currentLearned : last,
      active: record !== undefined,
    };
  });
}

export interface Accuracy {
  correct: number;
  total: number;
  /** Целые проценты или null, если ответов ещё не было */
  percent: number | null;
}

/** Точность за всё время: сумма верных ответов / сумма всех ответов. */
export function calculateAccuracy(dailyStats: DayRecords): Accuracy {
  let correct = 0;
  let total = 0;
  for (const record of Object.values(dailyStats)) {
    if (record === undefined) continue;
    correct += record.correct;
    total += record.total;
  }
  return { correct, total, percent: total > 0 ? Math.round((correct / total) * 100) : null };
}

export interface Axis {
  max: number;
  ticks: number[];
}

/**
 * Ось Y с «круглым» шагом (1, 2, 5, 10, 20, 50…) и не более чем пятью промежутками.
 * Максимум не меньше `minMax`, чтобы нулевой график лежал внизу, а не посередине.
 */
export function niceAxis(maxValue: number, minMax = 5, maxIntervals = 5): Axis {
  const safe = Number.isFinite(maxValue) ? Math.max(0, maxValue) : 0;
  const target = Math.max(Math.ceil(safe), minMax);

  for (let magnitude = 1; ; magnitude *= 10) {
    for (const factor of [1, 2, 5]) {
      const step = magnitude * factor;
      const intervals = Math.ceil(target / step);
      if (intervals <= maxIntervals) {
        return {
          max: intervals * step,
          ticks: Array.from({ length: intervals + 1 }, (_, i) => i * step),
        };
      }
    }
  }
}

export interface ChartBox {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** X-координата точки: равномерно по ширине области графика (одна точка — по центру). */
export function chartX(index: number, count: number, box: ChartBox): number {
  const plotWidth = box.width - box.left - box.right;
  return count <= 1 ? box.left + plotWidth / 2 : box.left + (index / (count - 1)) * plotWidth;
}

/** Y-координата значения: 0 — нижняя граница области графика, yMax — верхняя. */
export function chartY(value: number, yMax: number, box: ChartBox): number {
  const plotHeight = box.height - box.top - box.bottom;
  return box.top + plotHeight - (yMax > 0 ? (value / yMax) * plotHeight : 0);
}

/** Индексы подписей оси X: равномерно, всегда включая первую и последнюю точку. */
export function pickLabelIndices(count: number, labels: number): number[] {
  if (count <= 0) return [];
  if (count <= labels || labels < 2) return Array.from({ length: Math.min(count, Math.max(labels, 1)) }, (_, i) => i);
  const indices = new Set<number>();
  for (let i = 0; i < labels; i += 1) {
    indices.add(Math.round((i * (count - 1)) / (labels - 1)));
  }
  return [...indices];
}
