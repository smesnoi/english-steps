import { useCallback, useEffect, useRef, useState } from 'react';

/** Есть ли в браузере синтез речи. Безопасно вызывать вне браузера. */
export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

/** Эти коды — не ошибки: обычная отмена и замена одной реплики другой. */
const IGNORED_ERRORS: readonly string[] = ['canceled', 'interrupted'];

export interface UseSpeechResult {
  /** Озвучить текст. Возвращает управление сразу, звук идёт асинхронно. */
  speak: (text: string, lang?: string) => void;
  /** Остановить озвучку. */
  cancel: () => void;
  isSupported: boolean;
  /** Сейчас что-то звучит */
  isSpeaking: boolean;
  /**
   * Код последней ошибки озвучки (например 'not-allowed' — браузер заблокировал звук
   * до действия пользователя). null, если всё в порядке. Сбрасывается при следующем speak().
   */
  error: string | null;
}

/**
 * Обёртка над window.speechSynthesis.
 * - Нет поддержки: isSupported = false, speak() и cancel() ничего не делают.
 * - Новый speak() отменяет предыдущую озвучку, «хвосты» не накапливаются.
 * - Голос не выбираем: по lang браузер подберёт подходящий, а если английского
 *   нет — возьмёт свой голос по умолчанию.
 * - При размонтировании компонента озвучка останавливается.
 */
export function useSpeech(): UseSpeechResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Текущая реплика. Ссылка нужна дважды: Chrome может удалить реплику сборщиком мусора
  // раньше события end, а по ней мы отличаем события актуальной реплики от устаревших.
  const currentRef = useRef<SpeechSynthesisUtterance | null>(null);

  const cancel = useCallback(() => {
    if (!isSpeechSupported()) return;
    currentRef.current = null; // события отменённой реплики теперь игнорируются
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text: string, lang = 'en-US') => {
    if (!isSpeechSupported() || text.trim() === '') return;
    const synth = window.speechSynthesis;

    // Без отмены реплики встали бы в очередь друг за другом
    if (synth.speaking || synth.pending) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // Отменённая реплика присылает событие с задержкой: оно не должно сбросить состояние новой
    const isCurrent = () => currentRef.current === utterance;
    utterance.onstart = () => {
      if (isCurrent()) setIsSpeaking(true);
    };
    utterance.onend = () => {
      if (isCurrent()) setIsSpeaking(false);
    };
    utterance.onerror = (event) => {
      if (!isCurrent()) return;
      setIsSpeaking(false);
      if (!IGNORED_ERRORS.includes(event.error)) setError(event.error);
    };

    currentRef.current = utterance;
    setError(null);
    synth.speak(utterance);
  }, []);

  useEffect(
    () => () => {
      currentRef.current = null;
      if (isSpeechSupported()) window.speechSynthesis.cancel();
    },
    [],
  );

  return { speak, cancel, isSupported: isSpeechSupported(), isSpeaking, error };
}
