import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  createWebLLMController,
  type ChunkHandler,
  type GenerateOptions,
  type GpuLike,
  type WebLLMModuleLike,
} from '@/utils/webllmEngine';

/**
 * Один движок на всё приложение: все компоненты, вызывающие useWebLLM, делят одну модель.
 * Сама библиотека (несколько мегабайт) подгружается динамически при первом load().
 */
const webLLM = createWebLLMController({
  getGpu: () =>
    typeof navigator === 'undefined'
      ? undefined
      : (navigator as unknown as { gpu?: GpuLike }).gpu,
  importWebLLM: () => import(/* @vite-ignore */ 'https://esm.run/@mlc-ai/web-llm') as unknown as Promise<WebLLMModuleLike>,
  createWorker: () =>
    new Worker(new URL('../workers/webllm.worker.ts', import.meta.url), { type: 'module' }),
});

export interface UseWebLLMOptions {
  /** Начать загрузку модели сразу при появлении компонента. По умолчанию выключено: модель весит гигабайты. */
  autoLoad?: boolean;
}

export interface UseWebLLMResult {
  /** Есть ли в браузере WebGPU (navigator.gpu) */
  isSupported: boolean;
  isLoading: boolean;
  /** Прогресс загрузки модели, 0–100 */
  progress: number;
  /** Модель загружена и готова отвечать */
  isReady: boolean;
  error: string | null;
  /** Текст от библиотеки о текущем шаге загрузки */
  statusText: string;
  /** Начать загрузку модели. Не бросает исключений, ошибку смотрите в `error`. true — готово. */
  load: () => Promise<boolean>;
  /** Выгрузить модель и освободить видеопамять. */
  unload: () => Promise<void>;
  /**
   * Сгенерировать ответ (temperature 0,7, не больше 150 токенов).
   * onChunk получает накопленный текст и новый фрагмент. При уходе со страницы генерация прерывается.
   */
  generate: (prompt: string, onChunk?: ChunkHandler, options?: GenerateOptions) => Promise<string>;
}

/**
 * Локальная нейросеть в браузере (WebLLM). Пример:
 *
 *   const { isSupported, isReady, isLoading, progress, error, load, generate } = useWebLLM();
 *   if (!isSupported) return <p>Нужен браузер с WebGPU</p>;
 *   <button onClick={load}>Загрузить модель</button>       // скачивание — только по кнопке
 *   const answer = await generate('Explain the word "apple"', (text) => setAnswer(text));
 */
export function useWebLLM({ autoLoad = false }: UseWebLLMOptions = {}): UseWebLLMResult {
  const state = useSyncExternalStore(webLLM.subscribe, webLLM.getState, webLLM.getState);
  const pending = useRef(new Set<AbortController>());

  useEffect(() => {
    if (autoLoad && webLLM.isSupported() && webLLM.getState().status === 'idle') {
      void webLLM.load();
    }
  }, [autoLoad]);

  // Генерации, начатые этим компонентом, прерываем при его размонтировании
  useEffect(() => {
    const controllers = pending.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  const generate = useCallback(
    (prompt: string, onChunk?: ChunkHandler, options: GenerateOptions = {}): Promise<string> => {
      const controller = new AbortController();
      const external = options.signal;
      const forward = () => controller.abort();
      external?.addEventListener('abort', forward);
      pending.current.add(controller);

      return webLLM
        .generate(prompt, onChunk, { ...options, signal: controller.signal })
        .finally(() => {
          external?.removeEventListener('abort', forward);
          pending.current.delete(controller);
        });
    },
    [],
  );

  return {
    isSupported: webLLM.isSupported(),
    isLoading: state.status === 'loading',
    progress: state.progress,
    isReady: state.status === 'ready',
    error: state.error,
    statusText: state.statusText,
    load: webLLM.load,
    unload: webLLM.unload,
    generate,
  };
}
