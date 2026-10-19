import { useId } from 'react';
import type { Level } from '@/types';

interface LevelProgressProps {
  level: Level;
  learned: number;
  total: number;
}

/** Полоска прогресса по одному уровню: «A1: 6 из 50 изучено». */
export function LevelProgress({ level, learned, total }: LevelProgressProps) {
  const labelId = useId();
  const percent = total > 0 ? Math.round((learned / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span id={labelId} className="font-medium">
          {level}: {learned} из {total} изучено
        </span>
        <span className="tabular-nums text-stone-500 dark:text-stone-400">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={learned}
        className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
      >
        <div
          className="h-full rounded-full bg-teal-600 transition-[width] duration-500 dark:bg-teal-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
