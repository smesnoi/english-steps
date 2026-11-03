import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Mic, Volume2 } from 'lucide-react';
import { EmptyQueue } from '@/components/session/EmptyQueue';
import { SessionProgress } from '@/components/session/SessionProgress';
import { SessionSummary, type SessionResult } from '@/components/session/SessionSummary';
import { PageContainer } from '@/components/ui/PageContainer';
import { FOCUS_RING, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/styles';
import { useEntranceAnimation } from '@/hooks/useEntranceAnimation';
import { useSpeech } from '@/hooks/useSpeech';
import {
  isSpeechRecognitionSupported,
  useSpeechRecognition,
  type RecognitionError,
} from '@/hooks/useSpeechRecognition';
import { useWordStore } from '@/store/useWordStore';
import type { Word } from '@/types';
import { bestPronunciationMatch, isPronunciationAccepted } from '@/utils/phonetics';
import { buildStudyQueue } from '@/utils/srs';

/** Размер одной сессии: сколько слов всего и сколько из них новых. */
const SESSION_LIMIT = 10;
const SESSION_NEW_LIMIT = 10;
/** Пауза после удачного произношения перед следующим словом. */
const SUCCESS_DELAY_MS = 1500;
/** Сколько неудачных попыток даём на слово; потом остаётся только «Дальше». */
const MAX_FAILED_ATTEMPTS = 3;

const ERROR_MESSAGES: Record<RecognitionError, string> = {
  'not-allowed':
    'Нет доступа к микрофону. Разрешите его в настройках сайта в браузере и попробуйте снова.',
  'no-speech': 'Ничего не слышно. Проверьте микрофон и произнесите слово ещё раз.',
  'audio-capture': 'Микрофон не найден. Подключите его и попробуйте снова.',
  network: 'Нет связи с сервисом распознавания речи. Проверьте интернет.',
  unknown: 'Не удалось распознать речь. Попробуйте ещё раз.',
};

/** Итог последней оценённой попытки произнести слово. */
interface Attempt {
  similarity: number;
  /** Что браузер услышал: вариант распознавания, который лучше всего совпал со словом */
  heard: string;
  accepted: boolean;
}

type Feedback = 'idle' | 'success' | 'retry';

// ───────────────────────────── Страница ─────────────────────────────

/** Страница-обёртка: смена sessionKey создаёт новую сессию с новой очередью. */
export default function PronunciationPage() {
  const hydrated = useWordStore((state) => state.hydrated);
  const [sessionKey, setSessionKey] = useState(0);

  if (!hydrated) {
    return (
      <PageContainer>
        <div role="status" aria-label="Загрузка…" className="mx-auto max-w-md animate-pulse space-y-3">
          <div className="h-12 rounded-xl bg-stone-200 dark:bg-stone-800" />
          <div className="h-56 rounded-3xl bg-stone-200 dark:bg-stone-800" />
        </div>
      </PageContainer>
    );
  }

  // Проверяем до запуска сессии: без распознавания речи упражнение выполнить нельзя
  if (!isSpeechRecognitionSupported()) {
    return (
      <EmptyQueue
        title="Распознавание речи не поддерживается"
        description="Ваш браузер не поддерживает распознавание речи. Попробуйте Chrome."
        primaryTo="/flashcards"
        primaryLabel="Перейти к карточкам"
      />
    );
  }

  return (
    <PronunciationSession key={sessionKey} onRestart={() => setSessionKey((key) => key + 1)} />
  );
}

// ───────────────────────────── Сессия ─────────────────────────────

interface PronunciationSessionProps {
  onRestart: () => void;
}

function PronunciationSession({ onRestart }: PronunciationSessionProps) {
  const words = useWordStore((state) => state.words);
  const srs = useWordStore((state) => state.srs);
  const answerWord = useWordStore((state) => state.answerWord);

  const { start, stop, reset, isListening, transcript, alternatives, error } =
    useSpeechRecognition();
  const { speak, cancel: cancelSpeech, isSupported: canSpeak, isSpeaking } = useSpeech();

  // Очередь фиксируется при создании сессии и дальше не пересчитывается
  const [queue] = useState(() =>
    buildStudyQueue(words, srs, { limit: SESSION_LIMIT, newLimit: SESSION_NEW_LIMIT }),
  );
  const [results, setResults] = useState<SessionResult[]>([]);
  /** Последняя оценённая попытка для текущего слова */
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  /** Сколько попыток по текущему слову не прошло порог (тишина и ошибки микрофона не считаются) */
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Всё, что можно вывести, не храним отдельно
  const currentIndex = results.length;
  const finished = currentIndex >= queue.length;
  const currentWord: Word | undefined = queue[currentIndex];
  const currentId = currentWord?.id;
  const feedback: Feedback = attempt === null ? 'idle' : attempt.accepted ? 'success' : 'retry';

  /**
   * Завершает слово: один вызов answerWord на слово. Верно — если слово удалось
   * произнести (в любой попытке), неверно — если его пропустили или попытки кончились.
   */
  const finishWord = useCallback(
    (correct: boolean) => {
      if (currentId === undefined) return;
      answerWord(currentId, correct);
      setResults((previous) => [...previous, { wordId: currentId, correct }]);
      setAttempt(null);
      setFailedAttempts(0);
      reset();
      cancelSpeech();
    },
    [answerWord, cancelSpeech, currentId, reset],
  );

  // Оценка попытки — один раз, когда запись закончилась: isListening стал false после true.
  // Если запись закончилась ошибкой (тишина, нет микрофона) или прервана, оценивать нечего.
  const hasListenedRef = useRef(false);
  useEffect(() => {
    if (isListening) {
      hasListenedRef.current = true;
      return;
    }
    if (!hasListenedRef.current) return;
    hasListenedRef.current = false;

    if (error !== null || currentWord === undefined) return;
    const candidates = alternatives.length > 0 ? alternatives : transcript === '' ? [] : [transcript];
    if (candidates.length === 0) return;

    const match = bestPronunciationMatch(currentWord.en, candidates);
    const accepted = isPronunciationAccepted(match.similarity);
    setAttempt({ similarity: match.similarity, heard: match.heard, accepted });
    if (!accepted) setFailedAttempts((count) => count + 1);
  }, [alternatives, currentWord, error, isListening, transcript]);

  // После удачной попытки — следующее слово через 1,5 с; таймер очищается при выходе
  useEffect(() => {
    if (attempt === null || !attempt.accepted) return undefined;
    const timer = window.setTimeout(() => finishWord(true), SUCCESS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [attempt, finishWord]);

  // Появление нового слова — только при смене слова
  const questionRef = useRef<HTMLDivElement>(null);
  useEntranceAnimation(questionRef, currentId);

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

  if (finished || !currentWord) {
    return (
      <SessionSummary
        queue={queue}
        results={results}
        onRestart={onRestart}
        title="Произношение завершено!"
        formatScore={({ correct, total, percent }) =>
          `Произнесено верно: ${correct} из ${total} (${percent}%)`
        }
      />
    );
  }

  const handleTalk = () => {
    // Во время записи кнопка останавливает её досрочно
    if (isListening) {
      stop();
      return;
    }
    cancelSpeech(); // образец не должен попасть в микрофон
    setAttempt(null);
    reset();
    start();
  };

  const handleListenSample = () => {
    reset(); // запись и озвучка не должны идти одновременно
    speak(currentWord.en);
  };

  const attemptsLeft = MAX_FAILED_ATTEMPTS - failedAttempts;
  const canRetry = attemptsLeft > 0;

  return (
    <PageContainer>
      <div className="mx-auto max-w-md">
        <h1 className="sr-only">Произношение</h1>
        <SessionProgress current={currentIndex + 1} done={currentIndex} total={queue.length} />

        <div ref={questionRef}>
          <WordCard
            word={currentWord}
            canSpeak={canSpeak}
            onListenSample={handleListenSample}
          />

          <div className="mt-6">
            {feedback === 'success' && attempt ? (
              <SuccessBlock heard={attempt.heard} onNext={() => finishWord(true)} />
            ) : isListening ? (
              <ListeningBlock transcript={transcript} onToggle={handleTalk} />
            ) : feedback === 'retry' && attempt ? (
              <ProblemBlock
                title="Попробуйте ещё раз"
                detail={`Услышано: «${attempt.heard}»`}
                attemptsLeft={attemptsLeft}
                canRetry={canRetry}
                onRetry={handleTalk}
                onSkip={() => finishWord(false)}
                retryDisabled={isSpeaking}
              />
            ) : error !== null ? (
              <ProblemBlock
                title="Не получилось записать"
                detail={ERROR_MESSAGES[error]}
                canRetry
                onRetry={handleTalk}
                onSkip={() => finishWord(false)}
                retryDisabled={isSpeaking}
              />
            ) : (
              <IdleBlock
                disabled={isSpeaking}
                onToggle={handleTalk}
                onSkip={() => finishWord(false)}
              />
            )}
          </div>
        </div>

        {/* Результат для скринридеров */}
        <p role="status" className="sr-only">
          {feedback === 'success'
            ? `Отлично! Услышано: ${attempt?.heard ?? ''}`
            : feedback === 'retry'
              ? `Попробуйте ещё раз. Услышано: ${attempt?.heard ?? ''}`
              : ''}
        </p>
      </div>
    </PageContainer>
  );
}

// ───────────────────────────── Карточка слова ─────────────────────────────

interface WordCardProps {
  word: Word;
  canSpeak: boolean;
  onListenSample: () => void;
}

function WordCard({ word, canSpeak, onListenSample }: WordCardProps) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-lg dark:border-stone-800 dark:bg-stone-900">
      <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Произнесите слово</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{word.en}</p>
      <p className="mt-2 text-lg text-stone-500 dark:text-stone-400">{word.transcription}</p>
      <p className="mt-3 text-2xl">{word.ru}</p>

      {canSpeak && (
        <button
          type="button"
          onClick={onListenSample}
          className={`mt-4 inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-teal-500 hover:text-teal-700 dark:border-stone-700 dark:text-stone-300 dark:hover:text-teal-300 ${FOCUS_RING}`}
        >
          <Volume2 className="h-4 w-4" aria-hidden />
          Прослушать образец
        </button>
      )}
    </div>
  );
}

// ───────────────────────────── Блоки действий ─────────────────────────────

interface MicButtonProps {
  listening: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

/** Большая круглая кнопка записи. Во время записи красная и пульсирует. */
function MicButton({ listening, disabled = false, onToggle }: MicButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? 'Остановить запись' : 'Говорить'}
      className={`flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} ${
        listening
          ? 'animate-pulse bg-red-600 ring-4 ring-red-300 dark:bg-red-500 dark:ring-red-900'
          : 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:text-stone-950 dark:hover:bg-teal-400'
      }`}
    >
      <Mic className="h-10 w-10" aria-hidden />
    </button>
  );
}

function IdleBlock({
  disabled,
  onToggle,
  onSkip,
}: {
  disabled: boolean;
  onToggle: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <MicButton listening={false} disabled={disabled} onToggle={onToggle} />
      <p className="mt-3 font-medium">Говорить</p>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Нажмите на микрофон и произнесите слово
      </p>
      <p className="mt-3 text-xs text-stone-400 dark:text-stone-500">
        Речь распознаёт браузер. В Chrome аудио отправляется на серверы Google.
      </p>
      {/* Чтобы не упереться в тупик, если сейчас нельзя говорить: пропуск засчитывается как неверный */}
      <button
        type="button"
        onClick={onSkip}
        className={`mt-3 rounded-lg px-3 py-1.5 text-sm text-stone-500 underline underline-offset-4 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 ${FOCUS_RING}`}
      >
        Пропустить
      </button>
    </div>
  );
}

function ListeningBlock({
  transcript,
  onToggle,
}: {
  transcript: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <MicButton listening onToggle={onToggle} />
      <p className="mt-3 font-medium text-red-700 dark:text-red-300">Слушаю…</p>
      <p aria-live="polite" className="mt-1 min-h-[1.5rem] text-stone-600 dark:text-stone-300">
        {transcript !== '' && `Слышу: ${transcript}`}
      </p>
    </div>
  );
}

function SuccessBlock({ heard, onNext }: { heard: string; onNext: () => void }) {
  return (
    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center dark:border-emerald-800 dark:bg-emerald-950">
      <CheckCircle2
        className="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400"
        aria-hidden
      />
      <p className="mt-2 text-xl font-semibold text-emerald-900 dark:text-emerald-100">Отлично!</p>
      <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">Услышано: «{heard}»</p>
      <button type="button" onClick={onNext} className={`mt-4 ${PRIMARY_BUTTON}`}>
        Дальше
      </button>
    </div>
  );
}

interface ProblemBlockProps {
  title: string;
  detail: string;
  /** Сколько попыток осталось; не передаём, если речь об ошибке микрофона */
  attemptsLeft?: number;
  canRetry: boolean;
  retryDisabled: boolean;
  onRetry: () => void;
  onSkip: () => void;
}

/** Жёлтый блок: слово не засчитано или запись не удалась. */
function ProblemBlock({
  title,
  detail,
  attemptsLeft,
  canRetry,
  retryDisabled,
  onRetry,
  onSkip,
}: ProblemBlockProps) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <div>
          <p className="text-lg font-semibold text-amber-900 dark:text-amber-100">{title}</p>
          <p className="mt-1 text-amber-900 dark:text-amber-100">{detail}</p>
          {attemptsLeft !== undefined && (
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              {canRetry ? `Осталось попыток: ${attemptsLeft}` : 'Попытки закончились'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            className={`${PRIMARY_BUTTON} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Mic className="h-5 w-5" aria-hidden />
            Говорить снова
          </button>
        )}
        <button type="button" onClick={onSkip} className={SECONDARY_BUTTON}>
          {canRetry ? (
            'Пропустить'
          ) : (
            <>
              <ArrowRight className="h-5 w-5" aria-hidden />
              Дальше
            </>
          )}
        </button>
      </div>
    </div>
  );
}
