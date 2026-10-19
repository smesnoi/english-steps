import { useMemo } from 'react';
import { BookOpen, CheckCircle2, Flame, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LearnedChart } from '@/components/progress/LearnedChart';
import { LevelProgress } from '@/components/progress/LevelProgress';
import { PageContainer } from '@/components/ui/PageContainer';
import { StatCard } from '@/components/ui/StatCard';
import { PRIMARY_BUTTON } from '@/components/ui/styles';
import { useStreak, useWordStore, useWordsWithStatus } from '@/store/useWordStore';
import type { Level } from '@/types';
import { getLastDays } from '@/utils/date';
import { pluralize } from '@/utils/pluralize';
import { buildLearnedSeries, calculateAccuracy } from '@/utils/progress';

const CHART_DAYS = 30;
const LEVELS: readonly Level[] = ['A1', 'A2', 'B1'];

const SECTION_CLASS =
  'mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 dark:border-stone-800 dark:bg-stone-900';

export default function ProgressPage() {
  const hydrated = useWordStore((state) => state.hydrated);
  const words = useWordsWithStatus();
  const dailyStats = useWordStore((state) => state.dailyStats);
  const streak = useStreak();

  // Число выученных считаем по вычисленному статусу (единственный источник правды — srs)
  const learnedCount = useMemo(
    () => words.filter((word) => word.srsStatus === 'learned').length,
    [words],
  );
  const accuracy = useMemo(() => calculateAccuracy(dailyStats), [dailyStats]);
  const series = useMemo(
    () => buildLearnedSeries(dailyStats, getLastDays(CHART_DAYS), learnedCount),
    [dailyStats, learnedCount],
  );
  const levels = useMemo(
    () =>
      LEVELS.map((level) => {
        const inLevel = words.filter((word) => word.level === level);
        return {
          level,
          total: inLevel.length,
          learned: inLevel.filter((word) => word.srsStatus === 'learned').length,
        };
      }).filter((item) => item.total > 0),
    [words],
  );

  if (!hydrated) {
    return (
      <PageContainer>
        <div role="status" aria-label="Загрузка…" className="animate-pulse space-y-4">
          <div className="h-9 w-48 rounded-lg bg-stone-200 dark:bg-stone-800" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="h-32 rounded-2xl bg-stone-200 dark:bg-stone-800" />
            ))}
          </div>
          <div className="h-60 rounded-2xl bg-stone-200 dark:bg-stone-800" />
        </div>
      </PageContainer>
    );
  }

  const header = (
    <>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Прогресс</h1>
      <p className="mt-1 text-stone-600 dark:text-stone-400">
        Серия занятий, выученные слова и точность ответов.
      </p>
    </>
  );

  // Слов нет вообще — показывать нечего
  if (words.length === 0) {
    return (
      <PageContainer>
        {header}
        <div className="mt-6 rounded-2xl border border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
          <p className="text-lg font-medium">Начните заниматься, чтобы увидеть прогресс</p>
          <Link to="/dictionary" className={`mt-4 ${PRIMARY_BUTTON}`}>
            Добавить слова
          </Link>
        </div>
      </PageContainer>
    );
  }

  const hasActivity = Object.keys(dailyStats).length > 0;

  return (
    <PageContainer>
      {header}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Flame}
          value={`${streak} ${pluralize(streak, 'день', 'дня', 'дней')}`}
          label="Серия"
          tone="amber"
        />
        <StatCard icon={BookOpen} value={words.length} label="Всего слов" tone="sky" />
        <StatCard icon={CheckCircle2} value={learnedCount} label="Выучено" tone="emerald" />
        <StatCard
          icon={Target}
          value={accuracy.percent === null ? '—' : `${accuracy.percent}%`}
          label="Точность"
          hint={
            accuracy.total > 0
              ? `${accuracy.correct} из ${accuracy.total} ответов`
              : 'Пока нет ответов'
          }
          tone="teal"
        />
      </div>

      <section aria-labelledby="learned-chart-title" className={SECTION_CLASS}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="learned-chart-title" className="text-lg font-semibold">
            Выучено слов за {CHART_DAYS} дней
          </h2>
          {/* Дублирует значение маркера «сейчас»: на сенсорных экранах подсказки при наведении нет */}
          <p className="text-sm font-medium tabular-nums text-teal-700 dark:text-teal-300">
            {learnedCount} выучено
          </p>
        </div>
        {hasActivity ? (
          <div className="mt-4">
            <LearnedChart series={series} />
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-stone-300 p-6 text-center dark:border-stone-700">
            <p className="font-medium">Начните заниматься, чтобы увидеть прогресс</p>
            <Link to="/flashcards" className={`mt-3 ${PRIMARY_BUTTON}`}>
              Перейти к карточкам
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="levels-title" className={SECTION_CLASS}>
        <h2 id="levels-title" className="text-lg font-semibold">
          Прогресс по уровням
        </h2>
        <ul className="mt-4 space-y-4">
          {levels.map(({ level, learned, total }) => (
            <li key={level}>
              <LevelProgress level={level} learned={learned} total={total} />
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
