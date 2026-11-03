import { useMemo, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { FOCUS_RING } from '@/components/ui/styles';
import { useWebLLM } from '@/hooks/useWebLLM';
import {
  combineExamples,
  matchTranslations,
  parseSentences,
  parseTranslations,
  preferSentencesWithWord,
} from '@/utils/aiExamples';
import { MODEL_SIZE_LABEL } from '@/utils/webllmEngine';

// Генерация двухшаговая: маленькая модель путается, когда её просят писать на двух языках сразу.
// Шаг 1 — только английские предложения, шаг 2 — отдельный запрос на перевод.

// В запрос на предложения русское слово намеренно НЕ передаём: оно сбивает маленькую модель
// (транслитерация вроде «utro» в английском предложении).
const SYSTEM_SENTENCES =
  'You are an English teacher. Write exactly TWO or THREE simple sentences in English (A2 level) using the target word. Output ONLY the sentences, one per line. Do not add translations, numbering, quotes, or any other text. Do not use Russian words or transliterations. Use only English words.';

const SYSTEM_TRANSLATION =
  'The input is a list of English sentences. Translate them to Russian. Output ONLY the translations, one per line. Do not add any comments or English text. Do not add any English words to the translation.';

// Кириллица для модели «дорогая», поэтому на перевод токенов больше, чем на английский текст
const MAX_TOKENS_SENTENCES = 120;
const MAX_TOKENS_TRANSLATION = 200;
/** Для предложений нужна живость, для перевода — точность. */
const TEMPERATURE_SENTENCES = 0.7;
const TEMPERATURE_TRANSLATION = 0.2;

const BUTTON = `inline-flex items-center gap-1.5 rounded-lg border border-teal-400 bg-white px-3 py-1.5 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-700 dark:bg-teal-900 dark:text-teal-100 dark:hover:bg-teal-800 ${FOCUS_RING}`;

interface AiExampleProps {
  /** Английское слово */
  word: string;
}

/**
 * Примеры употребления слова от локальной нейросети (WebLLM).
 * Модель не загружена → кнопка «Включить ИИ»; грузится → полоса прогресса;
 * готова → «Сгенерировать примеры»: сначала потоком появляются английские предложения,
 * затем отдельным запросом — их перевод («Перевожу…»). Если перевод не получился,
 * остаются английские предложения с пометкой.
 */
export function AiExample({ word }: AiExampleProps) {
  const { isSupported, isLoading, progress, isReady, error, statusText, load, generate } =
    useWebLLM();

  const [sentencesText, setSentencesText] = useState('');
  const [translationText, setTranslationText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
  const [translationFailed, setTranslationFailed] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Пока предложения пишутся, показываем всё, что разобрали; после — только те, где есть искомое слово
  const sentences = useMemo(() => {
    const parsed = parseSentences(sentencesText);
    return isGenerating ? parsed : preferSentencesWithWord(parsed, word);
  }, [sentencesText, isGenerating, word]);
  const translations = useMemo(() => parseTranslations(translationText), [translationText]);
  // Склейка по номеру строки; пока перевод пишется, у недостающих строк ru пустой
  const pairs = useMemo(() => combineExamples(sentences, translations), [sentences, translations]);
  const isBusy = isGenerating || isLoadingTranslation;

  const handleGenerate = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setSentencesText('');
    setTranslationText('');
    setTranslationFailed(false);
    setGenerationError(null);
    setIsLoadingTranslation(false);
    setIsGenerating(true);

    try {
      // Шаг 1: английские предложения
      const english = await generate(
        `Target word: ${word}`,
        (textSoFar) => setSentencesText(textSoFar),
        {
          system: SYSTEM_SENTENCES,
          maxTokens: MAX_TOKENS_SENTENCES,
          temperature: TEMPERATURE_SENTENCES,
          signal,
        },
      );
      setSentencesText(english);

      const generated = preferSentencesWithWord(parseSentences(english), word);
      if (generated.length === 0) {
        setIsGenerating(false);
        if (!signal.aborted) setGenerationError('ИИ не вернул примеры. Попробуйте ещё раз.');
        return;
      }
      if (signal.aborted) {
        setIsGenerating(false);
        return; // остановили на первом шаге: переводить нечего
      }

      // Шаг 2: перевод. Любая неудача карточку не ломает — остаются английские предложения
      setIsGenerating(false);
      setIsLoadingTranslation(true);
      try {
        const russian = await generate(generated.join('\n'), (textSoFar) => setTranslationText(textSoFar), {
          system: SYSTEM_TRANSLATION,
          maxTokens: MAX_TOKENS_TRANSLATION,
          temperature: TEMPERATURE_TRANSLATION,
          signal,
        });

        if (!signal.aborted) {
          // Готовый перевод принимаем, только если строк не меньше, чем предложений
          const accepted = matchTranslations(generated, parseTranslations(russian));
          if (accepted) {
            setTranslationText(accepted.join('\n'));
          } else {
            setTranslationText('');
            setTranslationFailed(true);
          }
        }
        // остановили во время перевода: оставляем то, что успело появиться
      } catch {
        setTranslationText('');
        setTranslationFailed(true);
      }
    } catch (cause) {
      setGenerationError(
        cause instanceof Error ? cause.message : 'Не удалось сгенерировать примеры.',
      );
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsGenerating(false);
        setIsLoadingTranslation(false);
      }
    }
  };

  // Проверка, что мы на локальном сервере (ИИ не работает на GitHub Pages из-за CSP)
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  if (!isLocalhost) {
    return (
      <p className="text-xs text-stone-500 dark:text-stone-400">
        ИИ-примеры доступны только при локальном запуске приложения (ограничение GitHub Pages).
      </p>
    );
  }

  if (!isSupported) {
    return (
      <p className="text-xs text-stone-500 dark:text-stone-400">
        ИИ-примеры недоступны: браузеру нужен WebGPU (например, актуальный Chrome на компьютере).
      </p>
    );
  }

  if (isLoading) {
    return (
      <div>
        <p className="text-sm font-medium" title={statusText}>
          Загрузка модели ИИ… {progress}%
        </p>
        <div
          role="progressbar"
          aria-label="Загрузка модели ИИ"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="mt-2 h-2 overflow-hidden rounded-full bg-teal-200 dark:bg-teal-900"
        >
          <div
            className="h-full rounded-full bg-teal-600 transition-[width] duration-300 dark:bg-teal-400"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Модель сохранится в браузере, повторно скачивать её не придётся.
        </p>
      </div>
    );
  }

  if (!isReady) {
    const label = error
      ? 'Повторить загрузку'
      : MODEL_SIZE_LABEL
        ? `✨ Включить ИИ (скачает ${MODEL_SIZE_LABEL})`
        : '✨ Включить ИИ';
    return (
      <div className="space-y-2">
        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <button type="button" onClick={() => void load()} className={BUTTON}>
          {label}
        </button>
      </div>
    );
  }

  const hasResult = pairs.length > 0;

  return (
    <div aria-busy={isBusy}>
      {hasResult && (
        <ul className="mb-2 space-y-2">
          {pairs.map((pair, index) => (
            <li key={index}>
              <p className="text-sm font-medium">{pair.en}</p>
              {pair.ru !== '' && (
                <p className="text-xs text-stone-600 dark:text-stone-400">{pair.ru}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {translationFailed && !isBusy && (
        <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">
          Перевод не получен — показаны только английские предложения.
        </p>
      )}

      {generationError && (
        <p role="alert" className="mb-2 text-sm text-red-700 dark:text-red-300">
          {generationError}
        </p>
      )}

      <div className="flex items-center gap-2">
        {isBusy ? (
          <>
            <span className="animate-pulse text-xs text-stone-600 dark:text-stone-400">
              {isLoadingTranslation ? 'Перевожу…' : 'Генерирую…'}
            </span>
            <button type="button" onClick={() => abortRef.current?.abort()} className={BUTTON}>
              Остановить
            </button>
          </>
        ) : (
          <button type="button" onClick={() => void handleGenerate()} className={BUTTON}>
            {hasResult ? (
              <>
                <RotateCw className="h-4 w-4" aria-hidden />
                Ещё примеры
              </>
            ) : (
              'Сгенерировать примеры'
            )}
          </button>
        )}
      </div>

      {/* Потоковый текст не озвучиваем по токенам; сообщаем только о готовности */}
      <p role="status" className="sr-only">
        {!isBusy && hasResult ? 'Примеры готовы' : ''}
      </p>
    </div>
  );
}