import { useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { VisualCard } from '@/components/flashcards/VisualCard';
import { EmptyQueue } from '@/components/session/EmptyQueue';
import { SessionProgress } from '@/components/session/SessionProgress';
import { SessionSummary, type SessionResult } from '@/components/session/SessionSummary';
import { PageContainer } from '@/components/ui/PageContainer';
import { FOCUS_RING } from '@/components/ui/styles';
import { isVisualWord } from '@/data/visualWords';
import { useEntranceAnimation } from '@/hooks/useEntranceAnimation';
import { useWordStore } from '@/store/useWordStore';
import type { Word } from '@/types';
import { buildStudyQueue } from '@/utils/srs';

/** Каждая карточка — это генерация картинки, поэтому сессия короткая. */
const SESSION_LIMIT = 10;
const SESSION_NEW_LIMIT = 10;

// ───────────────────────────── Страница ─────────────────────────────

/** Страница-обёртка: смена sessionKey создаёт новую сессию с новой очередью. */
export default function VisualFlashcardsPage() {
  const hydrated = useWordStore((state) => state.hydrated);
  const [sessionKey, setSessionKey] = useState(0);

  if (!hydrated) {
    return (
      <PageContainer>
        <div role="status" aria-label="Загрузка…" className="animate-pulse">
          <div className="mx-auto h-[28rem] max-w-md rounded-3xl bg-stone-200 dark:bg-stone-800" />
        </div>
      </PageContainer>
    );
  }

  return <VisualSession key={sessionKey} onRestart={() => setSessionKey((key) => key + 1)} />;
}

// ───────────────────────────── Сессия ─────────────────────────────

interface VisualSessionProps {
  onRestart: () => void;
}

function VisualSession({ onRestart }: VisualSessionProps) {
  const words = useWordStore((state) => state.words);
  const srs = useWordStore((state) => state.srs);
  const answerWord = useWordStore((state) => state.answerWord);

  // Очередь строится один раз при создании сессии, только из слов, которые можно нарисовать
  const [{ queue, visualCount }] = useState(() => {
    const visualWords = words.filter((word) => isVisualWord(word.en));
    return {
      queue: buildStudyQueue(visualWords, srs, { limit: SESSION_LIMIT, newLimit: SESSION_NEW_LIMIT }),
      visualCount: visualWords.length,
    };
  });
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);

  // После каждого ответа в results добавляется ровно один элемент:
  // индекс и признак завершения выводим из него, а не храним отдельно
  const currentIndex = results.length;
  const finished = currentIndex >= queue.length;
  const currentWord: Word | undefined = queue[currentIndex];
  const currentId = currentWord?.id;

  // Анимация появления зависит только от id слова, поэтому переворот её не перезапускает
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  useEntranceAnimation(cardWrapperRef, currentId);

  if (queue.length === 0) {
    const title =
      words.length === 0
        ? 'В словаре пока нет слов'
        : visualCount === 0
          ? 'Нет слов, которые можно нарисовать'
          : 'Нечего повторять';
    const description =
      words.length === 0
        ? 'Добавьте слова в словарь, чтобы начать учиться.'
        : visualCount === 0
          ? 'Абстрактные слова (hello, because, today…) в этом режиме пропускаются. Добавьте предметы, действия или места.'
          : 'Заходите позже! Или добавьте свои слова в словарь.';
    return <EmptyQueue title={title} description={description} />;
  }

  if (finished) {
    return <SessionSummary queue={queue} results={results} onRestart={onRestart} />;
  }

  const handleAnswer = (correct: boolean) => {
    if (!currentWord) return;
    answerWord(currentWord.id, correct);
    setResults((previous) => [...previous, { wordId: currentWord.id, correct }]);
    setIsFlipped(false);
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <SessionProgress current={currentIndex + 1} done={currentIndex} total={queue.length} />

        <div ref={cardWrapperRef}>
          {/* key: у каждого слова своя карточка — новая появляется лицевой стороной и сама грузит картинку */}
          {currentWord && (
            <VisualCard
              key={currentWord.id}
              word={currentWord}
              isFlipped={isFlipped}
              onFlip={() => setIsFlipped((flipped) => !flipped)}
            />
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleAnswer(false)}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-red-700 dark:bg-red-500 dark:text-stone-950 dark:hover:bg-red-400 ${FOCUS_RING}`}
          >
            <X className="h-5 w-5" aria-hidden />
            Не знаю
          </button>
          <button
            type="button"
            onClick={() => handleAnswer(true)}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:text-stone-950 dark:hover:bg-emerald-400 ${FOCUS_RING}`}
          >
            <Check className="h-5 w-5" aria-hidden />
            Знаю
          </button>
        </div>
      </div>
    </PageContainer>
  );
}