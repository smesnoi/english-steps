interface SessionProgressProps {
  /** Номер текущего вопроса (с единицы) */
  current: number;
  /** Сколько вопросов уже пройдено — по этому числу заполняется полоска */
  done: number;
  total: number;
  /** Подпись полоски для скринридеров */
  ariaLabel?: string;
}

/** Счётчик «N / всего» и полоска прогресса сессии. */
export function SessionProgress({
  current,
  done,
  total,
  ariaLabel = 'Прогресс сессии',
}: SessionProgressProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mb-4">
      <p className="mb-1.5 text-sm font-medium tabular-nums text-stone-500 dark:text-stone-400">
        {current} / {total}
      </p>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
      >
        <div
          className="h-full rounded-full bg-teal-600 transition-[width] duration-300 dark:bg-teal-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
