import { Trash2 } from 'lucide-react';
import { FOCUS_RING } from '@/components/ui/styles';
import type { WordWithStatus } from '@/store/useWordStore';
import type { WordStatus } from '@/types';

// Классы записаны целиком — иначе Tailwind не найдёт их при сборке
const STATUS_BADGES: Record<WordStatus, { label: string; className: string }> = {
  new: {
    label: 'Новое',
    className: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  },
  learning: {
    label: 'В процессе',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  },
  learned: {
    label: 'Выучено',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  },
};

function StatusBadge({ status }: { status: WordStatus }) {
  const { label, className } = STATUS_BADGES[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>
  );
}

interface WordCardProps {
  word: WordWithStatus;
  onDelete: (word: WordWithStatus) => void;
}

/** Карточка слова в словаре. Статус берётся из srsStatus, а не из поля Word.status. */
export function WordCard({ word, onDelete }: WordCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-xl font-semibold tracking-tight">{word.en}</h3>
          {word.transcription !== '' && (
            <p className="text-sm text-stone-500 dark:text-stone-400">{word.transcription}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(word)}
          aria-label={`Удалить слово ${word.en}`}
          title="Удалить"
          className={`shrink-0 rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-stone-500 dark:hover:bg-red-950 dark:hover:text-red-400 ${FOCUS_RING}`}
        >
          <Trash2 className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <p className="mt-2 break-words text-lg">{word.ru}</p>

      {word.example !== '' && (
        <div className="mt-3 border-t border-stone-100 pt-3 text-sm dark:border-stone-800">
          <p>{word.example}</p>
          {word.exampleTranslation !== '' && (
            <p className="mt-0.5 text-stone-500 dark:text-stone-400">{word.exampleTranslation}</p>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-3">
        <StatusBadge status={word.srsStatus} />
        <span className="rounded-md border border-stone-200 px-1.5 py-0.5 text-xs font-medium text-stone-500 dark:border-stone-700 dark:text-stone-400">
          {word.level}
        </span>
      </div>
    </article>
  );
}
