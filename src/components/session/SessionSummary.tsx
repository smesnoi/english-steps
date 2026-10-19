import { CheckCircle2, Home, RotateCw, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/ui/PageContainer';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/styles';
import type { Word } from '@/types';

/** Результат ответа на одно слово в сессии. */
export interface SessionResult {
  wordId: string;
  correct: boolean;
}

export interface SessionScore {
  correct: number;
  total: number;
  /** Целое число процентов, 0–100 */
  percent: number;
}

interface SessionSummaryProps {
  queue: readonly Word[];
  results: readonly SessionResult[];
  onRestart: () => void;
  /** Тексты — пропсами, значения по умолчанию подходят для карточек */
  title?: string;
  formatScore?: (score: SessionScore) => string;
  restartLabel?: string;
  homeLabel?: string;
  /** Скрытые подписи иконок для скринридеров */
  correctLabel?: string;
  incorrectLabel?: string;
}

const defaultFormatScore = ({ correct, total, percent }: SessionScore): string =>
  `Правильных: ${correct} из ${total} (${percent}%)`;

/** Финальный экран сессии: итог и список слов с результатом по каждому. */
export function SessionSummary({
  queue,
  results,
  onRestart,
  title = 'Сессия завершена!',
  formatScore = defaultFormatScore,
  restartLabel = 'Ещё раз',
  homeLabel = 'На главную',
  correctLabel = 'верно',
  incorrectLabel = 'неверно',
}: SessionSummaryProps) {
  const total = results.length;
  const correct = results.filter((result) => result.correct).length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const wordsById = new Map(queue.map((word) => [word.id, word]));

  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-400">
          {formatScore({ correct, total, percent })}
        </p>

        <ul className="mt-6 divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
          {results.map((result) => {
            const word = wordsById.get(result.wordId);
            if (!word) return null;
            return (
              <li key={result.wordId} className="flex items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="font-medium">{word.en}</span>
                  <span className="text-stone-400 dark:text-stone-500"> → </span>
                  <span className="text-stone-600 dark:text-stone-300">{word.ru}</span>
                </span>
                {result.correct ? (
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                ) : (
                  <XCircle
                    className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
                    aria-hidden
                  />
                )}
                <span className="sr-only">{result.correct ? correctLabel : incorrectLabel}</span>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onRestart} className={PRIMARY_BUTTON}>
            <RotateCw className="h-5 w-5" aria-hidden />
            {restartLabel}
          </button>
          <Link to="/" className={SECONDARY_BUTTON}>
            <Home className="h-5 w-5" aria-hidden />
            {homeLabel}
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
