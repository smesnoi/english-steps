import { Flame, Play, RefreshCw, Sparkles, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/ui/PageContainer';
import { SECTIONS } from '@/data/sections';
import { useDueCount, useNewCount, useStreak, useWordStore } from '@/store/useWordStore';
import { pluralize } from '@/utils/pluralize';

type Tone = 'teal' | 'sky' | 'amber';

// Классы Tailwind должны быть записаны целиком, иначе они не попадут в сборку
const TONE_CLASSES: Record<Tone, string> = {
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

interface StatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  tone: Tone;
}

function StatCard({ icon: Icon, value, label, tone }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 dark:border-stone-800 dark:bg-stone-900">
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      <p className="text-sm text-stone-500 dark:text-stone-400">{label}</p>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <PageContainer>
      <div role="status" aria-label="Загрузка…" className="animate-pulse space-y-6">
        <div className="h-9 w-48 rounded-lg bg-stone-200 dark:bg-stone-800" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-32 rounded-2xl bg-stone-200 dark:bg-stone-800" />
          ))}
        </div>
        <div className="h-12 w-full rounded-xl bg-stone-200 sm:w-48 dark:bg-stone-800" />
      </div>
    </PageContainer>
  );
}

export default function HomePage() {
  // Хуки вызываются до раннего возврата — порядок хуков не должен меняться
  const hydrated = useWordStore((state) => state.hydrated);
  const wordsCount = useWordStore((state) => state.words.length);
  const dueCount = useDueCount();
  const newCount = useNewCount();
  const streak = useStreak();

  if (!hydrated) return <HomeSkeleton />;

  const otherSections = SECTIONS.filter((section) => section.to !== '/');

  return (
    <PageContainer>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">English Steps</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        Английский с нуля до B1: учите слова и повторяйте их вовремя.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard icon={RefreshCw} value={dueCount} label="Повторить" tone="teal" />
        <StatCard icon={Sparkles} value={newCount} label="Новые слова" tone="sky" />
        <StatCard
          icon={Flame}
          value={streak}
          label={`${pluralize(streak, 'день', 'дня', 'дней')} подряд`}
          tone="amber"
        />
      </div>

      <div className="mt-6">
        {wordsCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-5 text-center dark:border-stone-700">
            <p className="text-stone-600 dark:text-stone-400">В словаре пока нет слов.</p>
            <Link
              to="/dictionary"
              className="mt-2 inline-block font-medium text-teal-700 underline underline-offset-4 dark:text-teal-300"
            >
              Добавить слова
            </Link>
          </div>
        ) : (
          <>
            <Link
              to="/flashcards"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:w-auto dark:bg-teal-500 dark:text-stone-950 dark:hover:bg-teal-400 dark:focus-visible:ring-offset-stone-950"
            >
              <Play className="h-5 w-5" aria-hidden />
              Начать сессию
            </Link>
            {dueCount + newCount === 0 && (
              <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                На сегодня всё повторено. Загляните позже: новые слова появятся, когда придёт срок
                повторения.
              </p>
            )}
          </>
        )}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Разделы</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {otherSections.map(({ to, label, description, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex h-full items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition-colors hover:border-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-teal-600"
            >
              <span className="mt-0.5 rounded-lg bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-200">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-medium">{label}</span>
                <span className="block text-sm text-stone-500 dark:text-stone-400">
                  {description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
