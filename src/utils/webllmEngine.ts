/*
 * Управление локальной языковой моделью (WebLLM): загрузка в браузер, генерация, выгрузка.
 *
 * Это обычный TypeScript без React: один экземпляр на всё приложение (иначе модель
 * загрузилась бы в видеопамять несколько раз), состояние отдаётся через subscribe/getState,
 * а все внешние зависимости (WebGPU, библиотека, worker) передаются снаружи — поэтому
 * модуль проверяется Node-тестами с подменами. React-обёртка — hooks/useWebLLM.ts.
 */

/** Модель по умолчанию. Проверяется по каталогу установленной версии web-llm перед загрузкой. */
export const DEFAULT_WEBLLM_MODEL = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';

/** Примерный размер скачивания известных моделей — показывается пользователю перед загрузкой. */
const MODEL_SIZE_LABELS: Readonly<Record<string, string>> = {
  'Llama-3.2-1B-Instruct-q4f32_1-MLC': '~700 МБ',
};

/**
 * Подпись размера для модели по умолчанию. Привязана к её id: если сменить модель, не добавив
 * её размер в MODEL_SIZE_LABELS, подпись станет пустой, а не покажет чужое число.
 */
export const MODEL_SIZE_LABEL: string = MODEL_SIZE_LABELS[DEFAULT_WEBLLM_MODEL] ?? '';

/** Параметры генерации. */
export const GENERATION_DEFAULTS = { temperature: 0.7, max_tokens: 150 } as const;

// ───────────────────────────── Что нужно от внешнего мира ─────────────────────────────
// Минимальные описания того, чем мы пользуемся: код не зависит от точных типов версии библиотеки.

interface InitProgressReportLike {
  /** Доля от 0 до 1 */
  progress: number;
  text: string;
}

interface ChatChunkLike {
  choices: ReadonlyArray<{ delta?: { content?: string | null } }>;
}

interface ChatRequestLike {
  messages: ReadonlyArray<{ role: 'system' | 'user'; content: string }>;
  stream: true;
  temperature: number;
  max_tokens: number;
}

interface EngineLike {
  chat: { completions: { create(request: ChatRequestLike): Promise<AsyncIterable<ChatChunkLike>> } };
  interruptGenerate(): void | Promise<void>;
  unload(): Promise<void>;
}

export interface WorkerLike {
  terminate(): void;
}

export interface WebLLMModuleLike {
  prebuiltAppConfig: { model_list: ReadonlyArray<{ model_id: string }> };
  CreateWebWorkerMLCEngine(
    worker: WorkerLike,
    modelId: string,
    config: {
      initProgressCallback: (report: InitProgressReportLike) => void;
      useIndexedDBCache?: boolean;
      appConfig?: { model_list: ReadonlyArray<{ model_id: string }> };
    },
  ): Promise<EngineLike>;
}

export interface GpuLike {
  requestAdapter(): Promise<unknown | null>;
}

export interface WebLLMDeps {
  /** navigator.gpu или undefined, если WebGPU нет */
  getGpu: () => GpuLike | undefined;
  /** Динамический import библиотеки: она тяжёлая и не должна попадать в основной бандл */
  importWebLLM: () => Promise<WebLLMModuleLike>;
  createWorker: () => WorkerLike;
  modelId?: string;
}

// ───────────────────────────── Состояние ─────────────────────────────

export type WebLLMStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WebLLMState {
  status: WebLLMStatus;
  /** 0–100; во время загрузки только растёт */
  progress: number;
  /** Что сейчас происходит (текст от библиотеки, например «Fetching param cache…») */
  statusText: string;
  error: string | null;
}

const IDLE_STATE: WebLLMState = { status: 'idle', progress: 0, statusText: '', error: null };

/** Вызывается на каждый кусок ответа: накопленный текст и новый фрагмент. */
export type ChunkHandler = (textSoFar: string, delta: string) => void;

export interface GenerateOptions {
  /** Системная инструкция, если нужна */
  system?: string;
  /** Предел длины ответа в токенах. По умолчанию 150 (GENERATION_DEFAULTS.max_tokens). */
  maxTokens?: number;
  /** Остановка: generate вернёт то, что успело сгенерироваться */
  signal?: AbortSignal;
}

export interface WebLLMController {
  getState: () => WebLLMState;
  subscribe: (listener: () => void) => () => void;
  /** Есть ли WebGPU (navigator.gpu). Наличие видеоадаптера проверяется при load(). */
  isSupported: () => boolean;
  /** Загружает модель. Не бросает исключений: ошибка попадает в состояние. true — модель готова. */
  load: () => Promise<boolean>;
  /** Выгружает модель и освобождает видеопамять. */
  unload: () => Promise<void>;
  /**
   * Генерирует ответ. Потоком вызывает onChunk, возвращает полный текст.
   * Запросы выполняются по одному, в порядке вызова. Бросает ошибку, если модель не загружена.
   */
  generate: (prompt: string, onChunk?: ChunkHandler, options?: GenerateOptions) => Promise<string>;
}

// ───────────────────────────── Ошибки ─────────────────────────────

const MESSAGES = {
  unsupported: 'Ваш браузер не поддерживает WebGPU. Попробуйте актуальный Chrome или Edge на компьютере.',
  noAdapter:
    'Не найден графический адаптер для WebGPU. Проверьте, что в браузере включено аппаратное ускорение.',
  notReady: 'Модель не загружена. Сначала вызовите load().',
  emptyPrompt: 'Пустой запрос.',
  outOfMemory:
    'Не хватило памяти видеокарты для модели. Закройте другие вкладки или выберите модель поменьше.',
  network: 'Не удалось загрузить модель. Проверьте интернет и попробуйте снова.',
  deviceLost: 'Видеокарта была сброшена. Загрузите модель заново.',
  modelMissing: (modelId: string) =>
    `Модель «${modelId}» недоступна в установленной версии web-llm.`,
  generic: (message: string) => `Не удалось запустить модель: ${message}`,
} as const;

/** Ошибка с уже готовым текстом для пользователя. */
class WebLLMError extends Error {}

function describeError(cause: unknown): string {
  if (cause instanceof WebLLMError) return cause.message;
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/device.{0,20}lost/i.test(message)) return MESSAGES.deviceLost;
  // Границы слов важны: «OOM» без них находится в слове «boom», «fetch» — в «prefetch» и т. п.
  if (
    /out of memory|\boom\b|\ballocat|maxBufferSize|maxStorageBufferBindingSize/i.test(message)
  ) {
    return MESSAGES.outOfMemory;
  }
  if (/\bfetch\b|\bnetwork|Failed to load/i.test(message)) return MESSAGES.network;
  return MESSAGES.generic(message);
}

/** Неподходящее значение (не целое, не больше нуля) заменяется значением по умолчанию. */
const sanitizeMaxTokens = (value: number | undefined): number =>
  value !== undefined && Number.isInteger(value) && value > 0
    ? value
    : GENERATION_DEFAULTS.max_tokens;

const toPercent = (fraction: number): number =>
  Math.min(100, Math.max(0, Math.round((Number.isFinite(fraction) ? fraction : 0) * 100)));

async function unloadQuietly(engine: EngineLike): Promise<void> {
  try {
    await engine.unload();
  } catch {
    /* уже выгружен или упал вместе с видеокартой */
  }
}

// ───────────────────────────── Контроллер ─────────────────────────────

export function createWebLLMController(deps: WebLLMDeps): WebLLMController {
  const modelId = deps.modelId ?? DEFAULT_WEBLLM_MODEL;

  let state: WebLLMState = IDLE_STATE;
  const listeners = new Set<() => void>();

  let engine: EngineLike | null = null;
  let worker: WorkerLike | null = null;
  let loading: Promise<boolean> | null = null;
  /** Растёт при unload(): загрузка, начатая раньше, понимает, что её результат больше не нужен. */
  let epoch = 0;
  /** Очередь генераций: движок обрабатывает по одному запросу. */
  let queue: Promise<unknown> = Promise.resolve();
  let interruptActive: (() => void) | null = null;

  const setState = (patch: Partial<WebLLMState>): void => {
    const next = { ...state, ...patch };
    // Новый объект только при реальных изменениях: так требует useSyncExternalStore
    if (
      next.status === state.status &&
      next.progress === state.progress &&
      next.statusText === state.statusText &&
      next.error === state.error
    ) {
      return;
    }
    state = next;
    listeners.forEach((listener) => listener());
  };

  const isSupported = (): boolean => deps.getGpu() !== undefined;

  // ── загрузка ──

  const runLoad = async (): Promise<boolean> => {
    const myEpoch = epoch;
    const gpu = deps.getGpu();
    if (!gpu) {
      setState({ ...IDLE_STATE, status: 'error', error: MESSAGES.unsupported });
      return false;
    }

    setState({ status: 'loading', progress: 0, statusText: 'Подготовка…', error: null });
    let createdWorker: WorkerLike | null = null;

    try {
      // navigator.gpu бывает и без реального адаптера (например, в виртуальной машине)
      if (!(await gpu.requestAdapter())) throw new WebLLMError(MESSAGES.noAdapter);

      const library = await deps.importWebLLM();
      if (!library.prebuiltAppConfig.model_list.some((model) => model.model_id === modelId)) {
        throw new WebLLMError(MESSAGES.modelMissing(modelId));
      }

            createdWorker = deps.createWorker();
const created = await library.CreateWebWorkerMLCEngine(createdWorker, modelId, {
  initProgressCallback: (report) => {
    if (myEpoch !== epoch) return;
    setState({
      progress: Math.max(state.progress, toPercent(report.progress)),
      statusText: report.text,
    });
  },
  useIndexedDBCache: false,
  // Явно передаем конфигурацию моделей, чтобы Vite не потерял её при сборке
  appConfig: library.prebuiltAppConfig,
});

      if (myEpoch !== epoch) {
        // Пока модель грузилась, её выгрузили: освобождаем всё, что успели создать
        await unloadQuietly(created);
        createdWorker.terminate();
        return false;
      }

      engine = created;
      worker = createdWorker;
      setState({ status: 'ready', progress: 100, statusText: 'Модель готова', error: null });
      return true;
    } catch (cause) {
      createdWorker?.terminate();
      if (myEpoch !== epoch) return false;
      setState({ status: 'error', progress: 0, statusText: '', error: describeError(cause) });
      return false;
    }
  };

  const load = (): Promise<boolean> => {
    if (state.status === 'ready') return Promise.resolve(true);
    if (loading) return loading; // уже грузим — не создаём второй движок
    const promise = runLoad().finally(() => {
      if (loading === promise) loading = null;
    });
    loading = promise;
    return promise;
  };

  // ── генерация ──

  const runGenerate = async (
    prompt: string,
    onChunk: ChunkHandler | undefined,
    { system, signal, maxTokens }: GenerateOptions,
  ): Promise<string> => {
    const current = engine;
    if (!current) throw new WebLLMError(MESSAGES.notReady);
    if (signal?.aborted) return '';

    const messages: ChatRequestLike['messages'] = system
      ? [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ]
      : [{ role: 'user', content: prompt }];

    let text = '';
    const interrupt = (): void => {
      void Promise.resolve(current.interruptGenerate()).catch(() => undefined);
    };
    signal?.addEventListener('abort', interrupt);
    interruptActive = interrupt;

    try {
      const stream = await current.chat.completions.create({
        messages,
        stream: true,
        temperature: GENERATION_DEFAULTS.temperature,
        max_tokens: sanitizeMaxTokens(maxTokens),
      });
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta !== '') {
          text += delta;
          onChunk?.(text, delta);
        }
        if (signal?.aborted) break;
      }
      return text.trim();
    } catch (cause) {
      // Остановка может проявиться и исключением: отдаём то, что успело сгенерироваться
      if (signal?.aborted) return text.trim();
      const message = describeError(cause);
      if (message === MESSAGES.deviceLost) {
        // Движок потерян вместе с видеокартой: дальше работать нельзя, нужна новая загрузка
        engine = null;
        worker?.terminate();
        worker = null;
        setState({ status: 'error', progress: 0, statusText: '', error: message });
      }
      throw new WebLLMError(message);
    } finally {
      signal?.removeEventListener('abort', interrupt);
      if (interruptActive === interrupt) interruptActive = null;
    }
  };

  const generate = (
    prompt: string,
    onChunk?: ChunkHandler,
    options: GenerateOptions = {},
  ): Promise<string> => {
    if (state.status !== 'ready' || !engine) {
      return Promise.reject(new WebLLMError(MESSAGES.notReady));
    }
    if (prompt.trim() === '') return Promise.reject(new WebLLMError(MESSAGES.emptyPrompt));

    const task = (): Promise<string> => runGenerate(prompt, onChunk, options);
    const result = queue.then(task);
    queue = result.catch(() => undefined);
    return result;
  };

  // ── выгрузка ──

  const unload = async (): Promise<void> => {
    epoch += 1; // загрузка, которая ещё идёт, по окончании сама всё освободит
    loading = null;
    interruptActive?.();

    const oldEngine = engine;
    const oldWorker = worker;
    engine = null;
    worker = null;
    setState(IDLE_STATE);

    if (oldEngine) await unloadQuietly(oldEngine);
    oldWorker?.terminate();
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    isSupported,
    load,
    unload,
    generate,
  };
}
