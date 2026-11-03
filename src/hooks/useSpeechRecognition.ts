import { useCallback, useEffect, useRef, useState } from 'react';

// ───────────────────────────── Типы Web Speech API ─────────────────────────────
// В стандартных типах TypeScript нет конструктора SpeechRecognition (в браузерах он
// ещё и с префиксом webkit), поэтому описываем только то, чем пользуемся.

interface RecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

interface RecognitionResultLike {
  readonly length: number;
  readonly isFinal: boolean;
  readonly [index: number]: RecognitionAlternativeLike;
}

interface RecognitionEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: RecognitionResultLike;
  };
}

interface RecognitionErrorEventLike {
  readonly error: string;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionConstructor = new () => RecognitionLike;

function getRecognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

/** Есть ли в браузере распознавание речи (Chrome, Edge, частично Safari; в Firefox нет). */
export function isSpeechRecognitionSupported(): boolean {
  return getRecognitionConstructor() !== undefined;
}

// ───────────────────────────── Ошибки ─────────────────────────────

/**
 * Что пошло не так:
 * - not-allowed   — нет доступа к микрофону (запрещён пользователем или страница без HTTPS)
 * - no-speech     — ничего не услышали
 * - audio-capture — микрофон не найден
 * - network       — нет связи с сервисом распознавания (ему нужен интернет)
 * - unknown       — всё остальное
 */
export type RecognitionError = 'not-allowed' | 'no-speech' | 'audio-capture' | 'network' | 'unknown';

/** null — не ошибка: 'aborted' приходит, когда мы сами останавливаем запись. */
function mapError(code: string): RecognitionError | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not-allowed';
    case 'no-speech':
      return 'no-speech';
    case 'audio-capture':
      return 'audio-capture';
    case 'network':
      return 'network';
    default:
      return 'unknown';
  }
}

// ───────────────────────────── Хук ─────────────────────────────

const DEFAULT_LANG = 'en-US';
/** Сколько вариантов распознавания просим у браузера. */
const MAX_ALTERNATIVES = 3;
/** Через сколько мс останавливаем запись, если браузер сам не закончил слушать. */
const DEFAULT_TIMEOUT_MS = 8000;
/** Сколько ждём событие end после принудительной остановки, прежде чем завершить сами. */
const FORCE_FINISH_DELAY_MS = 1500;

export interface UseSpeechRecognitionOptions {
  lang?: string;
  /** Предел времени прослушивания, мс */
  timeoutMs?: number;
}

export interface UseSpeechRecognitionResult {
  /** Начать слушать. Если уже слушаем или распознавания нет — ничего не делает. */
  start: () => void;
  /** Закончить запись; то, что успели услышать, всё равно будет распознано. */
  stop: () => void;
  /** Прервать запись без результата и очистить состояние. */
  reset: () => void;
  isSupported: boolean;
  isListening: boolean;
  /** Лучший вариант распознавания; пока человек говорит, обновляется на лету */
  transcript: string;
  /** Все варианты распознавания (первый совпадает с transcript) */
  alternatives: string[];
  error: RecognitionError | null;
}

interface Session {
  recognition: RecognitionLike;
  watchdog?: number;
  forceFinish?: number;
}

/**
 * Обёртка над Web Speech API (SpeechRecognition / webkitSpeechRecognition), одно слово за запуск.
 *
 * - Экземпляр распознавателя одноразовый: на каждый start() создаётся новый.
 * - События старого экземпляра (отменённого или завершённого) состояние не меняют.
 * - Запись заканчивается сама, когда человек замолчал (continuous = false). Если браузер
 *   этого не сделал за timeoutMs, вызываем stop(), а если и после этого нет события end —
 *   завершаем сами. Если за время записи ничего не услышали, error = 'no-speech'.
 * - При размонтировании запись прерывается.
 * - Нет поддержки: isSupported = false, start() ничего не делает.
 */
export function useSpeechRecognition({
  lang = DEFAULT_LANG,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [error, setError] = useState<RecognitionError | null>(null);

  // Текущая сессия записи; null, если не слушаем
  const sessionRef = useRef<Session | null>(null);

  /** Отключает текущую сессию: её таймеры сняты, события больше ничего не меняют. Состояние React не трогает. */
  const dispose = useCallback((abort: boolean) => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;

    window.clearTimeout(session.watchdog);
    window.clearTimeout(session.forceFinish);

    const { recognition } = session;
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    if (abort) {
      try {
        recognition.abort();
      } catch {
        /* уже остановлен */
      }
    }
  }, []);

  const start = useCallback(() => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition || sessionRef.current) return;

    setTranscript('');
    setAlternatives([]);
    setError(null);

    // Экземпляр одноразовый: после end повторный start() у него ненадёжен, поэтому каждый раз новый
    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = MAX_ALTERNATIVES;

    const session: Session = { recognition };
    sessionRef.current = session;

    let heardSomething = false;
    let failed = false;

    const finish = () => {
      if (sessionRef.current !== session) return;
      dispose(false);
      setIsListening(false);
      // Некоторые браузеры заканчивают запись молча, без ошибки и без результата
      if (!heardSomething && !failed) setError('no-speech');
    };

    recognition.onstart = () => {
      if (sessionRef.current === session) setIsListening(true);
    };

    recognition.onresult = (event) => {
      if (sessionRef.current !== session) return;

      const best: string[] = [];
      for (let i = 0; i < event.results.length; i += 1) {
        const top = event.results[i]?.[0];
        if (top) best.push(top.transcript.trim());
      }
      const text = best.join(' ').trim();
      if (text === '') return;

      heardSomething = true;
      setTranscript(text);

      // Один результат — отдаём все его варианты, несколько — только склеенный лучший
      const only = event.results.length === 1 ? event.results[0] : undefined;
      const options = only
        ? Array.from({ length: only.length }, (_, i) => only[i]?.transcript.trim() ?? '').filter(Boolean)
        : [];
      setAlternatives(options.length > 0 ? options : [text]);
    };

    recognition.onerror = (event) => {
      if (sessionRef.current !== session) return;
      const mapped = mapError(event.error);
      if (mapped !== null) {
        failed = true;
        setError(mapped);
      }
    };

    recognition.onend = finish;

    try {
      recognition.start();
    } catch {
      // Например, InvalidStateError, если браузер считает, что запись уже идёт
      dispose(false);
      setError('unknown');
      setIsListening(false);
      return;
    }

    session.watchdog = window.setTimeout(() => {
      if (sessionRef.current !== session) return;
      try {
        recognition.stop();
      } catch {
        /* уже остановлен */
      }
      session.forceFinish = window.setTimeout(finish, FORCE_FINISH_DELAY_MS);
    }, timeoutMs);
  }, [dispose, lang, timeoutMs]);

  const stop = useCallback(() => {
    try {
      sessionRef.current?.recognition.stop();
    } catch {
      /* уже остановлен */
    }
  }, []);

  const reset = useCallback(() => {
    dispose(true);
    setIsListening(false);
    setTranscript('');
    setAlternatives([]);
    setError(null);
  }, [dispose]);

  // При уходе со страницы прерываем запись
  useEffect(() => () => dispose(true), [dispose]);

  return {
    start,
    stop,
    reset,
    isSupported: isSpeechRecognitionSupported(),
    isListening,
    transcript,
    alternatives,
    error,
  };
}
