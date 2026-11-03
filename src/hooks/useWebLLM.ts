import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  createWebLLMController,
  type ChunkHandler,
  type GenerateOptions,
  type GpuLike,
  type WebLLMModuleLike,
} from '@/utils/webllmEngine';

const webLLM = createWebLLMController({
  getGpu: () =>
    typeof navigator === 'undefined'
      ? undefined
      : (navigator as unknown as { gpu?: GpuLike }).gpu,
  importWebLLM: () => import('@mlc-ai/web-llm') as unknown as Promise<WebLLMModuleLike>,
  createWorker: () =>
    new Worker(new URL('../workers/webllm.worker.ts', import.meta.url), { type: 'module' }),
});

export interface UseWebLLMOptions {
  autoLoad?: boolean;
}

export interface UseWebLLMResult {
  isSupported: boolean;
  isLoading: boolean;
  progress: number;
  isReady: boolean;
  error: string | null;
  statusText: string;
  load: () => Promise<boolean>;
  unload: () => Promise<void>;
  generate: (prompt: string, onChunk?: ChunkHandler, options?: GenerateOptions) => Promise<string>;
}

export function useWebLLM({ autoLoad = false }: UseWebLLMOptions = {}): UseWebLLMResult {
  const state = useSyncExternalStore(webLLM.subscribe, webLLM.getState, webLLM.getState);
  const pending = useRef(new Set<AbortController>());

  useEffect(() => {
    if (autoLoad && webLLM.isSupported() && webLLM.getState().status === 'idle') {
      void webLLM.load();
    }
  }, [autoLoad]);

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