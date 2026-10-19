import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { EmptyQueue } from '@/components/session/EmptyQueue';
import { OptionButton, getOptionState } from '@/components/session/OptionButton';
import { SessionProgress } from '@/components/session/SessionProgress';
import { SessionSummary, type SessionResult } from '@/components/session/SessionSummary';
import { PageContainer } from '@/components/ui/PageContainer';
import { FOCUS_RING } from '@/components/ui/styles';
import { useEntranceAnimation } from '@/hooks/useEntranceAnimation';
import { isSpeechSupported, useSpeech } from '@/hooks/useSpeech';
import { useWordStore } from '@/store/useWordStore';
import type { Word } from '@/types';
import { FEEDBACK_DELAY_MS, OPTIONS_COUNT, buildChoiceSession } from '@/utils/choiceSession';

// ───────────────────────────── Страница ─────────────────────────────

/** Страница-обёртка: смена sessionKey создаёт новую сессию с новой очередью. */
export default function ListeningPage() {
  const hydrated = useWordStore((state) => state.hydrated);
  const [sessionKey, setSessionKey] = useState(0);

  if (!hydrated) {
    return (
      <PageContainer>
        <div role="status" aria-label="Загрузка…" className="mx-auto max-w-md animate-pulse space-y-3">
          <div className="h-12 rounded-xl bg-stone-200 dark:bg-stone-800" />
          <div className="h-52 rounded-3xl bg-stone-200 dark:bg-stone-800" />
        </div>
      </PageContainer>
    );
  }

  // Проверяем до запуска сессии: слово на этой странице не видно, и без звука
  // пользователю пришлось бы угадывать — случайные ответы испортили бы повторение.
  if (!isSpeechSupported()) {
    return (
      <EmptyQueue
        title="Озвучка не поддерживается в этом браузере"
        description="Аудирование работает только со звуком. Попробуйте режим «Тест» или карточки."
        primaryTo="/quiz"
        primaryLabel="Перейти к тесту"
      />
    );
  }

  return <ListeningSession key={sessionKey} onRestart={() => setSessionKey((key) => key + 1)} />;
}

// ───────────────────────────── Сессия ─────────────────────────────

interface ListeningSessionProps {
  onRestart: () => void;
}

function ListeningSession({ onRestart }: ListeningSessionProps) {
  const words = useWordStore((state) => state.words);
  const srs = useWordStore((state) => state.srs);
  const answerWord = useWordStore((state) => state.answerWord);
  const { speak, cancel, isSpeaking, error } = useSpeech();

  // Очередь и варианты фиксируются при создании сессии и дальше не пересчитываются
  const [{ queue, options, candidateCount }] = useState(() => buildChoiceSession(words, srs));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);

  // Всё, что можно вывести, не храним отдельно
  const currentIndex = results.length;
  const finished = currentIndex >= queue.length;
  const currentWord: Word | undefined = queue[currentIndex];
  const currentId = currentWord?.id;
  const currentText = currentWord?.en;
  const answered = selectedId !== null;

  // Пауза после ответа; таймер очищается в cleanup (см. QuizPage)
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

  // Автоозвучка при появлении нового слова. selectedId в зависимостях нет,
  // поэтому выбор варианта слово заново не проигрывает. Предыдущую озвучку
  // speak() отменяет сам; когда слова кончились — останавливаем звук.
  useEffect(() => {
    if (currentId === undefined || currentText === undefined) {
      cancel();
    } else {
      speak(currentText);
    }
  }, [currentId, currentText, speak, cancel]);

  // Появление нового вопроса — только при смене слова
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
        title={`Для аудирования нужно минимум ${OPTIONS_COUNT} слова в словаре`}
        description="Добавьте больше слов с разными переводами, и аудирование станет доступно."
      />
    );
  }

  if (finished || !currentWord) {
    return (
      <SessionSummary
        queue={queue}
        results={results}
        onRestart={onRestart}
        title="Аудирование завершено!"
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
      ? `Верно! Это «${currentWord.en}».`
      : `Неверно. Это «${currentWord.en}», по-русски: ${currentWord.ru}.`;

  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <SessionProgress current={currentIndex + 1} done={currentIndex} total={queue.length} />

        <div ref={questionRef}>
          <ListenPanel
            word={currentWord}
            revealed={answered}
            isSpeaking={isSpeaking}
            error={error}
            onListen={() => speak(currentWord.en)}
          />

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

// ───────────────────────────── Панель озвучки ─────────────────────────────

interface ListenPanelProps {
  word: Word;
  /** После ответа показываем слово, чтобы связать звук с написанием */
  revealed: boolean;
  isSpeaking: boolean;
  error: string | null;
  onListen: () => void;
}

function ListenPanel({ word, revealed, isSpeaking, error, onListen }: ListenPanelProps) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-lg dark:border-stone-800 dark:bg-stone-900">
      <button
        type="button"
        onClick={onListen}
        className={`inline-flex items-center gap-3 rounded-full bg-teal-600 px-8 py-5 text-xl font-medium text-white shadow-md transition hover:bg-teal-700 active:scale-95 dark:bg-teal-500 dark:text-stone-950 dark:hover:bg-teal-400 ${isSpeaking ? 'animate-pulse' : ''} ${FOCUS_RING}`}
      >
        <Volume2 className="h-7 w-7" aria-hidden />
        Прослушать
      </button>

      {/* Фиксированная высота, чтобы блок не прыгал при смене подсказки на слово */}
      <div className="mt-5 flex min-h-[4rem] flex-col items-center justify-center">
        {revealed ? (
          <>
            <p className="text-3xl font-semibold tracking-tight">{word.en}</p>
            <p className="mt-1 text-lg text-stone-500 dark:text-stone-400">{word.transcription}</p>
          </>
        ) : error !== null ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {error === 'not-allowed'
              ? 'Браузер заблокировал автозапуск звука. Нажмите «Прослушать».'
              : 'Не удалось воспроизвести звук. Нажмите «Прослушать», чтобы попробовать ещё раз.'}
          </p>
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Нажмите, чтобы услышать слово ещё раз
          </p>
        )}
      </div>
    </div>
  );
}
