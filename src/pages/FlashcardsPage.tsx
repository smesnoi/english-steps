import { useRef, useState } from 'react';
import { Check, Volume2, X } from 'lucide-react';
import { EmptyQueue } from '@/components/session/EmptyQueue';
import { SessionProgress } from '@/components/session/SessionProgress';
import { SessionSummary, type SessionResult } from '@/components/session/SessionSummary';
import { PageContainer } from '@/components/ui/PageContainer';
import { FOCUS_RING } from '@/components/ui/styles';
import { useEntranceAnimation } from '@/hooks/useEntranceAnimation';
import { useWordStore } from '@/store/useWordStore';
import type { Word } from '@/types';
import { buildStudyQueue } from '@/utils/srs';

/** Размер одной сессии: сколько слов всего и сколько из них новых. */
const SESSION_LIMIT = 20;
const SESSION_NEW_LIMIT = 10;

// ───────────────────────────── Страница ─────────────────────────────

/**
 * Страница-обёртка. Каждая сессия — это отдельный экземпляр FlashcardsSession:
 * смена sessionKey пересоздаёт его, и очередь строится заново из актуального srs.
 */
export default function FlashcardsPage() {
  const hydrated = useWordStore((state) => state.hydrated);
  const [sessionKey, setSessionKey] = useState(0);

  if (!hydrated) {
    return (
      <PageContainer>
        <div role="status" aria-label="Загрузка…" className="animate-pulse">
          <div className="mx-auto h-[400px] max-w-md rounded-3xl bg-stone-200 dark:bg-stone-800" />
        </div>
      </PageContainer>
    );
  }

  return (
    <FlashcardsSession key={sessionKey} onRestart={() => setSessionKey((key) => key + 1)} />
  );
}

// ───────────────────────────── Сессия ─────────────────────────────

interface FlashcardsSessionProps {
  onRestart: () => void;
}

function FlashcardsSession({ onRestart }: FlashcardsSessionProps) {
  const words = useWordStore((state) => state.words);
  const srs = useWordStore((state) => state.srs);
  const answerWord = useWordStore((state) => state.answerWord);

  // Очередь строится один раз при создании сессии. Если брать её из хука useStudyQueue,
  // она пересчитывалась бы после каждого ответа (слово пропадало бы из «просроченных»).
  const [queue] = useState(() =>
    buildStudyQueue(words, srs, { limit: SESSION_LIMIT, newLimit: SESSION_NEW_LIMIT }),
  );
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);

  // После каждого ответа в results добавляется ровно один элемент,
  // поэтому индекс и признак завершения выводим из него, а не храним отдельно.
  const currentIndex = results.length;
  const finished = currentIndex >= queue.length;
  const currentWord: Word | undefined = queue[currentIndex];
  const currentId = currentWord?.id;

  // Анимация появления новой карточки зависит только от id слова,
  // поэтому переворот (setIsFlipped) её не перезапускает.
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  useEntranceAnimation(cardWrapperRef, currentId);

  if (queue.length === 0) {
    const hasWords = words.length > 0;
    return (
      <EmptyQueue
        title={hasWords ? 'Нечего повторять' : 'В словаре пока нет слов'}
        description={
          hasWords
            ? 'Заходите позже! Или добавьте свои слова в словарь.'
            : 'Добавьте слова в словарь, чтобы начать учиться.'
        }
      />
    );
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
          {/* key: у каждого слова своя карточка — новая появляется сразу лицевой стороной */}
          <FlipCard
            key={currentWord?.id}
            word={currentWord}
            isFlipped={isFlipped}
            onFlip={() => setIsFlipped((flipped) => !flipped)}
          />
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

// ───────────────────────────── Карточка ─────────────────────────────

interface FlipCardProps {
  word: Word | undefined;
  isFlipped: boolean;
  onFlip: () => void;
}

const FACE_BASE =
  'absolute inset-0 flex flex-col items-center justify-center rounded-3xl border p-6 text-center shadow-lg [backface-visibility:hidden]';

function FlipCard({ word, isFlipped, onFlip }: FlipCardProps) {
  if (!word) return null;

  return (
    <div className="relative">
      {/* Переворот: perspective на контейнере, rotateY на карточке, обе стороны скрывают «изнанку» */}
      <div className="[perspective:1200px]">
        {/* div с role="button", а не <button>: у кнопок есть баги с preserve-3d в Safari и Firefox */}
        <div
          role="button"
          tabIndex={0}
          onClick={onFlip}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onFlip();
            }
          }}
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          className={`relative h-[400px] w-full cursor-pointer rounded-3xl transition-transform duration-500 [transform-style:preserve-3d] ${FOCUS_RING}`}
        >
          {/* Лицевая сторона */}
          <div
            aria-hidden={isFlipped}
            className={`${FACE_BASE} gap-2 border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900`}
          >
            <p className="text-4xl font-semibold tracking-tight sm:text-5xl">{word.en}</p>
            <p className="text-lg text-stone-500 dark:text-stone-400">{word.transcription}</p>
            <p className="absolute bottom-6 text-sm text-stone-400 dark:text-stone-500">
              Нажмите, чтобы перевернуть
            </p>
          </div>

          {/* Обратная сторона */}
          <div
            aria-hidden={!isFlipped}
            style={{ transform: 'rotateY(180deg)' }}
            className={`${FACE_BASE} gap-6 border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950`}
          >
            <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{word.ru}</p>
            <div className="w-full border-t border-teal-200 pt-5 dark:border-teal-900">
              <p className="text-base">{word.example}</p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {word.exampleTranslation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Озвучка — заглушка. Кнопка рядом с карточкой, а не внутри: кнопка в кнопке недопустима */}
      <button
        type="button"
        disabled
        title="Озвучка скоро появится"
        aria-label="Озвучить слово (скоро)"
        className="absolute right-3 top-3 z-10 rounded-full p-2 text-stone-400 disabled:cursor-not-allowed dark:text-stone-500"
      >
        <Volume2 className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
