import { useEffect, useRef, useState } from 'react';
import { EmptyQueue } from '@/components/session/EmptyQueue';
import { OptionButton, getOptionState } from '@/components/session/OptionButton';
import { SessionProgress } from '@/components/session/SessionProgress';
import { SessionSummary, type SessionResult } from '@/components/session/SessionSummary';
import { PageContainer } from '@/components/ui/PageContainer';
import { useEntranceAnimation } from '@/hooks/useEntranceAnimation';
import { useWordStore } from '@/store/useWordStore';
import type { Word } from '@/types';
import { FEEDBACK_DELAY_MS, OPTIONS_COUNT, buildChoiceSession } from '@/utils/choiceSession';

// ───────────────────────────── Страница ─────────────────────────────

/** Страница-обёртка: смена sessionKey создаёт новую сессию с новой очередью. */
export default function QuizPage() {
  const hydrated = useWordStore((state) => state.hydrated);
  const [sessionKey, setSessionKey] = useState(0);

  if (!hydrated) {
    return (
      <PageContainer>
        <div role="status" aria-label="Загрузка…" className="mx-auto max-w-md animate-pulse space-y-3">
          <div className="h-12 rounded-xl bg-stone-200 dark:bg-stone-800" />
          <div className="h-44 rounded-3xl bg-stone-200 dark:bg-stone-800" />
        </div>
      </PageContainer>
    );
  }

  return <QuizSession key={sessionKey} onRestart={() => setSessionKey((key) => key + 1)} />;
}

// ───────────────────────────── Сессия ─────────────────────────────

interface QuizSessionProps {
  onRestart: () => void;
}

function QuizSession({ onRestart }: QuizSessionProps) {
  const words = useWordStore((state) => state.words);
  const srs = useWordStore((state) => state.srs);
  const answerWord = useWordStore((state) => state.answerWord);

  // Очередь и варианты фиксируются при создании сессии и дальше не пересчитываются
  const [{ queue, options, candidateCount }] = useState(() => buildChoiceSession(words, srs));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);

  // Всё, что можно вывести, не храним отдельно
  const currentIndex = results.length;
  const finished = currentIndex >= queue.length;
  const currentWord: Word | undefined = queue[currentIndex];
  const currentId = currentWord?.id;
  const answered = selectedId !== null;

  // Пауза после ответа. Таймер создаётся в эффекте и очищается в cleanup:
  // при уходе со страницы он не сработает на размонтированном компоненте.
  // Результат и сброс выбора идут в одном колбэке — React объединит их в один рендер.
  useEffect(() => {
    if (selectedId === null || currentId === undefined) return undefined;

    const timer = window.setTimeout(() => {
      setResults((previous) => [
        ...previous,
        { wordId: currentId, correct: selectedId === currentId },
      ]);
      setSelectedId(null);
    }, FEEDBACK_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [selectedId, currentId]);

  // Появление нового вопроса — только при смене слова, выбор варианта анимацию не запускает
  const questionRef = useRef<HTMLDivElement>(null);
  useEntranceAnimation(questionRef, currentId);

  if (candidateCount === 0) {
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

  if (queue.length === 0) {
    return (
      <EmptyQueue
        title={`Для теста нужно минимум ${OPTIONS_COUNT} слова в словаре`}
        description="Добавьте больше слов с разными переводами, и тест станет доступен."
      />
    );
  }

  if (finished || !currentWord) {
    return (
      <SessionSummary
        queue={queue}
        results={results}
        onRestart={onRestart}
        title="Тест завершён!"
        formatScore={({ correct, total, percent }) =>
          `Верных ответов: ${correct} из ${total} (${percent}%)`
        }
      />
    );
  }

  const handleSelect = (optionId: string) => {
    if (answered) return; // ответ изменить нельзя
    setSelectedId(optionId);
    answerWord(currentWord.id, optionId === currentWord.id);
  };

  const currentOptions = options[currentWord.id] ?? [];
  const feedback = !answered
    ? ''
    : selectedId === currentWord.id
      ? 'Верно!'
      : `Неверно. Правильный ответ: ${currentWord.ru}`;

  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <SessionProgress current={currentIndex + 1} done={currentIndex} total={queue.length} />

        <div ref={questionRef}>
          <QuestionCard word={currentWord} />

          <ul className="mt-5 space-y-3">
            {currentOptions.map((option) => (
              <li key={option.id}>
                <OptionButton
                  label={option.ru}
                  state={getOptionState(option.id, currentWord.id, selectedId)}
                  disabled={answered}
                  onClick={() => handleSelect(option.id)}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Результат ответа для скринридеров */}
        <p role="status" className="sr-only">
          {feedback}
        </p>
      </div>
    </PageContainer>
  );
}

// ───────────────────────────── Вопрос ─────────────────────────────

function QuestionCard({ word }: { word: Word }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-lg dark:border-stone-800 dark:bg-stone-900">
      <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Выберите перевод</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{word.en}</p>
      <p className="mt-2 text-lg text-stone-500 dark:text-stone-400">{word.transcription}</p>
    </div>
  );
}
