import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OptionButton, getOptionState } from '@/components/session/OptionButton';
import { SessionProgress } from '@/components/session/SessionProgress';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/styles';
import { useEntranceAnimation } from '@/hooks/useEntranceAnimation';
import { generateGrammarQuiz, type Question } from '@/utils/grammarExercises';

interface GrammarQuizProps {
  topicId: string;
  /** Если передан, в конце теста появляется кнопка «К правилам» */
  onBackToRules?: () => void;
}

/**
 * Тест по теме грамматики. «Пройти ещё раз» создаёт новый прогон: вопросы и варианты
 * генерируются заново (другой порядок, варианты на других местах).
 */
export function GrammarQuiz({ topicId, onBackToRules }: GrammarQuizProps) {
  const [attempt, setAttempt] = useState(0);

  return (
    <QuizRun
      key={`${topicId}-${attempt}`}
      topicId={topicId}
      onRestart={() => setAttempt((value) => value + 1)}
      onBackToRules={onBackToRules}
    />
  );
}

// ───────────────────────────── Один прогон ─────────────────────────────

interface QuizRunProps {
  topicId: string;
  onRestart: () => void;
  onBackToRules?: () => void;
}

function QuizRun({ topicId, onRestart, onBackToRules }: QuizRunProps) {
  // Вопросы фиксируются при начале прогона и дальше не пересчитываются
  const [questions] = useState(() => generateGrammarQuiz(topicId));
  /** Выбранные варианты по уже подтверждённым вопросам */
  const [answers, setAnswers] = useState<number[]>([]);
  /** Выбор на текущем вопросе; null — ещё не отвечали */
  const [selected, setSelected] = useState<number | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);

  // Всё, что можно вывести, не храним отдельно
  const index = answers.length;
  const question: Question | undefined = questions[index];
  useEntranceAnimation(questionRef, question?.id);

  // После ответа варианты блокируются, и фокус терялся бы — переносим его на «Дальше»
  useEffect(() => {
    if (selected !== null) nextRef.current?.focus();
  }, [selected]);

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <p className="text-lg font-medium">Для этой темы пока нет вопросов.</p>
        {onBackToRules && (
          <button type="button" onClick={onBackToRules} className={`mt-4 ${SECONDARY_BUTTON}`}>
            К правилам
          </button>
        )}
      </div>
    );
  }

  if (!question) {
    return (
      <QuizResult
        questions={questions}
        answers={answers}
        onRestart={onRestart}
        onBackToRules={onBackToRules}
      />
    );
  }

  const answered = selected !== null;
  const correctOption = question.options[question.correctIndex] ?? '';
  const isCorrect = selected === question.correctIndex;
  const isLast = index === questions.length - 1;

  const handleSelect = (optionIndex: number) => {
    if (answered) return; // ответ изменить нельзя
    setSelected(optionIndex);
  };

  const handleNext = () => {
    if (selected === null) return;
    setAnswers((previous) => [...previous, selected]);
    setSelected(null);
  };

  return (
    <div className="mx-auto max-w-xl">
      <SessionProgress
        current={index + 1}
        done={index}
        total={questions.length}
        ariaLabel="Прогресс теста"
      />

      <div ref={questionRef}>
        <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-lg dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
            Выберите правильный вариант
          </p>
          <QuestionText text={question.question} filler={answered ? correctOption : null} />
        </div>

        <ul className="mt-5 space-y-3">
          {question.options.map((option, optionIndex) => (
            <li key={option}>
              <OptionButton
                label={option}
                state={getOptionState(
                  String(optionIndex),
                  String(question.correctIndex),
                  selected === null ? null : String(selected),
                )}
                disabled={answered}
                onClick={() => handleSelect(optionIndex)}
              />
            </li>
          ))}
        </ul>

        {answered && (
          <>
            <div
              role="status"
              className={`mt-5 rounded-2xl border p-4 ${
                isCorrect
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100'
                  : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100'
              }`}
            >
              <p className="flex items-center gap-2 font-semibold">
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0" aria-hidden />
                )}
                {isCorrect ? 'Верно!' : `Неверно. Правильный ответ: ${correctOption}`}
              </p>
              <p className="mt-2 text-sm">{question.explanation}</p>
            </div>

            <button
              ref={nextRef}
              type="button"
              onClick={handleNext}
              className={`mt-4 w-full sm:w-auto ${PRIMARY_BUTTON}`}
            >
              {isLast ? 'Показать результат' : 'Дальше'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Вопрос с пропуском ─────────────────────────────

/** Предложение с пропуском «___»: пустая черта, а после ответа — верное слово. */
function QuestionText({ text, filler }: { text: string; filler: string | null }) {
  const parts = text.split('___');

  return (
    <p className="mt-3 text-2xl font-semibold leading-snug sm:text-3xl">
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 &&
            (filler === null ? (
              <>
                <span
                  aria-hidden
                  className="mx-1 inline-block w-14 border-b-4 border-stone-400 dark:border-stone-500"
                />
                <span className="sr-only">пропуск</span>
              </>
            ) : (
              <span className="mx-1 text-emerald-700 dark:text-emerald-400">{filler}</span>
            ))}
        </span>
      ))}
    </p>
  );
}

// ───────────────────────────── Результат ─────────────────────────────

interface QuizResultProps {
  questions: readonly Question[];
  answers: readonly number[];
  onRestart: () => void;
  onBackToRules?: () => void;
}

function QuizResult({ questions, answers, onRestart, onBackToRules }: QuizResultProps) {
  const total = questions.length;
  const mistakes = questions.flatMap((question, index) => {
    const chosen = answers[index] ?? -1;
    return chosen === question.correctIndex ? [] : [{ question, chosen }];
  });
  const correct = total - mistakes.length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  const message =
    mistakes.length === 0
      ? 'Без ошибок — отличный результат!'
      : percent >= 60
        ? 'Хороший результат. Посмотрите разбор ошибок ниже.'
        : 'Стоит повторить правила и попробовать ещё раз.';

  return (
    <div className="mx-auto max-w-xl">
      <h2 className="text-2xl font-semibold tracking-tight">Тест завершён!</h2>
      <p className="mt-3 text-5xl font-semibold tabular-nums">
        {correct} из {total}
      </p>
      <p className="mt-1 text-stone-600 dark:text-stone-400">
        {percent}% верных ответов. {message}
      </p>

      {mistakes.length > 0 && (
        <section aria-labelledby="mistakes-title" className="mt-6">
          <h3 id="mistakes-title" className="text-lg font-semibold">
            Разбор ошибок
          </h3>
          <ul className="mt-3 space-y-3">
            {mistakes.map(({ question, chosen }) => {
              const correctOption = question.options[question.correctIndex] ?? '';
              return (
                <li
                  key={question.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
                >
                  <p className="font-medium">{question.question.replace('___', correctOption)}</p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    Ваш ответ: {question.options[chosen] ?? '—'}
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    Верно: {correctOption}
                  </p>
                  <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                    {question.explanation}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onRestart} className={PRIMARY_BUTTON}>
          Пройти ещё раз
        </button>
        {onBackToRules && (
          <button type="button" onClick={onBackToRules} className={SECONDARY_BUTTON}>
            К правилам
          </button>
        )}
        <Link to="/grammar" className={SECONDARY_BUTTON}>
          Все темы
        </Link>
      </div>
    </div>
  );
}
