import type { LucideIcon } from 'lucide-react';

export type StatTone = 'teal' | 'sky' | 'amber' | 'emerald';

// Классы Tailwind должны быть записаны целиком, иначе они не попадут в сборку
const TONE_CLASSES: Record<StatTone, string> = {
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

interface StatCardProps {
  icon: LucideIcon;
  /** Число или готовая строка («87%», «—», «5 дней») */
  value: string | number;
  label: string;
  /** Необязательная мелкая подпись под названием */
  hint?: string;
  tone: StatTone;
}

/** Карточка с одним показателем статистики. */
export function StatCard({ icon: Icon, value, label, hint, tone }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 dark:border-stone-800 dark:bg-stone-900">
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      <p className="text-sm text-stone-500 dark:text-stone-400">{label}</p>
      {hint !== undefined && (
        <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500">{hint}</p>
      )}
    </div>
  );
}
