import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_WEBLLM_MODEL,
  GENERATION_DEFAULTS,
  MODEL_SIZE_LABEL,
  createWebLLMController,
  type WebLLMModuleLike,
  type WebLLMState,
} from './webllmEngine';

// Запуск: npm test  (tsx --test ...)
// Настоящий WebLLM в Node не запустить (нужен WebGPU), поэтому библиотека, видеоадаптер
// и worker подменены управляемыми заглушками.

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

class FakeWorker {
  terminated = false;
  terminate(): void {
    this.terminated = true;
  }
}

class FakeEngine {
  requests: Array<{ messages: unknown; stream: unknown; temperature: unknown; max_tokens: unknown }> = [];
  running = 0;
  maxRunning = 0;
  interrupts = 0;
  unloaded = false;
  script: string[] = ['Hel', 'lo', ' world'];
  delayMs = 1;
  failWith: Error | null = null;
  private interrupted = false;

  chat = {
    completions: {
      create: async (request: FakeEngine['requests'][number]) => {
        this.requests.push(request);
        if (this.failWith) throw this.failWith;
        this.running += 1;
        this.maxRunning = Math.max(this.maxRunning, this.running);
        const self = this;
        async function* stream() {
          try {
            for (const piece of self.script) {
              await sleep(self.delayMs);
              if (self.interrupted) break;
              yield { choices: [{ delta: { content: piece } }] };
            }
          } finally {
            self.running -= 1;
            self.interrupted = false;
          }
        }
        return stream();
      },
    },
  };

  interruptGenerate(): void {
    this.interrupts += 1;
    this.interrupted = true;
  }

  async unload(): Promise<void> {
    this.unloaded = true;
  }
}

interface SetupOptions {
  gpu?: boolean;
  adapter?: boolean;
  models?: string[];
  progress?: number[];
  createFails?: Error;
  gate?: Promise<void>;
}

function setup(options: SetupOptions = {}) {
  const {
    gpu = true,
    adapter = true,
    models = [DEFAULT_WEBLLM_MODEL, 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'],
    progress = [0.1, 0.5, 0.3, 0.9, 1],
    createFails,
    gate,
  } = options;

  const workers: FakeWorker[] = [];
  const engines: FakeEngine[] = [];
  const modelsRequested: string[] = [];
  let imports = 0;

  const library: WebLLMModuleLike = {
    prebuiltAppConfig: { model_list: models.map((model_id) => ({ model_id })) },
    async CreateWebWorkerMLCEngine(_worker, modelId, config) {
      modelsRequested.push(modelId);
      for (const fraction of progress) {
        config.initProgressCallback({ progress: fraction, text: `шаг ${Math.round(fraction * 100)}` });
        await sleep(1);
      }
      if (gate) await gate;
      if (createFails) throw createFails;
      const engine = new FakeEngine();
      engines.push(engine);
      return engine;
    },
  };

  const controller = createWebLLMController({
    getGpu: () => (gpu ? { requestAdapter: async () => (adapter ? {} : null) } : undefined),
    importWebLLM: async () => {
      imports += 1;
      return library;
    },
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
  });

  return { controller, workers, engines, modelsRequested, imports: () => imports };
}

async function ready(options?: SetupOptions) {
  const env = setup(options);
  assert.equal(await env.controller.load(), true);
  return env;
}

describe('поддержка WebGPU', () => {
  it('нет navigator.gpu: isSupported = false, load() не падает и кладёт ошибку в состояние', async () => {
    const { controller, workers, imports } = setup({ gpu: false });

    assert.equal(controller.isSupported(), false);
    assert.equal(await controller.load(), false);
    const state = controller.getState();
    assert.equal(state.status, 'error');
    assert.match(state.error ?? '', /не поддерживает WebGPU/);
    assert.equal(imports(), 0, 'библиотека не загружалась');
    assert.equal(workers.length, 0);
  });

  it('navigator.gpu есть, но адаптера нет (виртуальная машина, выключено ускорение)', async () => {
    const { controller, workers, imports } = setup({ adapter: false });

    assert.equal(controller.isSupported(), true);
    assert.equal(await controller.load(), false);
    assert.match(controller.getState().error ?? '', /графический адаптер/);
    assert.equal(imports(), 0);
    assert.equal(workers.length, 0);
  });
});

describe('загрузка модели', () => {
  it('исходное состояние: ничего не грузится, модель не готова', () => {
    const { controller } = setup();
    assert.deepEqual(controller.getState(), { status: 'idle', progress: 0, statusText: '', error: null });
  });

  it('по умолчанию грузит Llama-3.2-1B q4f32_1, подпись размера привязана к этой модели', async () => {
    const { modelsRequested } = await ready();
    assert.deepEqual(modelsRequested, ['Llama-3.2-1B-Instruct-q4f32_1-MLC']);
    assert.equal(DEFAULT_WEBLLM_MODEL, 'Llama-3.2-1B-Instruct-q4f32_1-MLC');
    assert.equal(MODEL_SIZE_LABEL, '~700 МБ');
  });

  it('прогресс 0–100 только растёт, статус меняется loading → ready', async () => {
    const { controller } = setup();
    const seen: WebLLMState[] = [];
    controller.subscribe(() => seen.push(controller.getState()));

    assert.equal(await controller.load(), true);

    assert.equal(seen[0]?.status, 'loading');
    const progresses = seen.map((s) => s.progress);
    assert.deepEqual([...progresses].sort((a, b) => a - b), progresses, 'прогресс не убывает (в отчётах было 0,5 → 0,3)');
    assert.ok(progresses.includes(10) && progresses.includes(50) && progresses.includes(90));
    assert.ok(seen.some((s) => s.statusText === 'шаг 50'));
    const final = controller.getState();
    assert.deepEqual({ ...final }, { status: 'ready', progress: 100, statusText: 'Модель готова', error: null });
  });

  it('повторный и параллельный load() не создают второй движок', async () => {
    const env = setup();
    const [first, second] = await Promise.all([env.controller.load(), env.controller.load()]);
    assert.deepEqual([first, second], [true, true]);
    assert.equal(await env.controller.load(), true);

    assert.equal(env.engines.length, 1);
    assert.equal(env.workers.length, 1);
    assert.equal(env.imports(), 1);
  });

  it('модели нет в каталоге библиотеки: понятная ошибка, worker не создаётся', async () => {
    const { controller, workers } = setup({ models: ['Qwen2.5-0.5B-Instruct-q4f16_1-MLC'] });

    assert.equal(await controller.load(), false);
    assert.match(controller.getState().error ?? '', /Llama-3\.2-1B-Instruct-q4f32_1-MLC.*недоступна/);
    assert.equal(workers.length, 0);
  });

  it('ошибка при создании движка: worker закрыт, можно попробовать снова', async () => {
    let attempt = 0;
    const workers: FakeWorker[] = [];
    const engines: FakeEngine[] = [];
    const controller = createWebLLMController({
      getGpu: () => ({ requestAdapter: async () => ({}) }),
      importWebLLM: async () => ({
        prebuiltAppConfig: { model_list: [{ model_id: DEFAULT_WEBLLM_MODEL }] },
        async CreateWebWorkerMLCEngine() {
          attempt += 1;
          if (attempt === 1) throw new Error('Failed to fetch');
          const engine = new FakeEngine();
          engines.push(engine);
          return engine;
        },
      }),
      createWorker: () => {
        const worker = new FakeWorker();
        workers.push(worker);
        return worker;
      },
    });

    assert.equal(await controller.load(), false);
    assert.equal(controller.getState().status, 'error');
    assert.match(controller.getState().error ?? '', /Проверьте интернет/);
    assert.equal(workers[0]?.terminated, true, 'worker после неудачи закрыт');

    assert.equal(await controller.load(), true);
    assert.equal(controller.getState().status, 'ready');
    assert.equal(controller.getState().error, null);
    assert.equal(engines.length, 1);
  });

  it('нехватка памяти видеокарты объясняется человеческим языком', async () => {
    const { controller } = setup({ createFails: new Error('Failed to allocate buffer: out of memory') });
    assert.equal(await controller.load(), false);
    assert.match(controller.getState().error ?? '', /памяти видеокарты/);
  });
});

describe('сообщения об ошибках', () => {
  const loadError = async (message: string): Promise<string> => {
    const { controller } = setup({ createFails: new Error(message) });
    await controller.load();
    return controller.getState().error ?? '';
  };

  it('нехватка памяти распознаётся по настоящим признакам', async () => {
    for (const message of ['out of memory', 'OOM', 'Failed to allocate buffer', 'exceeds maxBufferSize']) {
      assert.match(await loadError(message), /памяти видеокарты/, message);
    }
  });

  it('обычные слова с буквами «oom» не принимаются за нехватку памяти', async () => {
    for (const message of ['boom', 'zoom lens', 'Room not found', 'bloom filter']) {
      assert.doesNotMatch(await loadError(message), /памяти видеокарты/, message);
      assert.match(await loadError(message), /Не удалось запустить модель/, message);
    }
  });

  it('сетевые ошибки распознаются, «prefetch» сетевой ошибкой не считается', async () => {
    for (const message of ['Failed to fetch', 'NetworkError when attempting', 'network down']) {
      assert.match(await loadError(message), /Проверьте интернет/, message);
    }
    assert.doesNotMatch(await loadError('prefetch cache invalid'), /Проверьте интернет/);
  });
});

describe('generate', () => {
  it('до загрузки модели отклоняется с понятной ошибкой', async () => {
    const { controller } = setup();
    await assert.rejects(() => controller.generate('hello'), /Модель не загружена/);
  });

  it('пустой запрос отклоняется, движок не вызывается', async () => {
    const { controller, engines } = await ready();
    await assert.rejects(() => controller.generate('   '), /Пустой запрос/);
    assert.equal(engines[0]?.requests.length, 0);
  });

  it('стримит: onChunk получает накопленный текст и фрагмент, результат — полный текст', async () => {
    const { controller, engines } = await ready();
    const calls: Array<[string, string]> = [];

    const result = await controller.generate('Say hi', (textSoFar, delta) => calls.push([textSoFar, delta]));

    assert.deepEqual(calls, [
      ['Hel', 'Hel'],
      ['Hello', 'lo'],
      ['Hello world', ' world'],
    ]);
    assert.equal(result, 'Hello world');
    const request = engines[0]?.requests[0];
    assert.deepEqual(request?.messages, [{ role: 'user', content: 'Say hi' }]);
    assert.equal(request?.stream, true);
    assert.equal(request?.temperature, 0.7);
    assert.equal(request?.max_tokens, 150);
    assert.deepEqual(GENERATION_DEFAULTS, { temperature: 0.7, max_tokens: 150 });
  });

  it('maxTokens меняет предел ответа; по умолчанию 150; неверные значения игнорируются', async () => {
    const { controller, engines } = await ready();

    await controller.generate('a');
    await controller.generate('b', undefined, { maxTokens: 220 });
    for (const bad of [0, -5, 1.5, Number.NaN]) await controller.generate('c', undefined, { maxTokens: bad });

    const limits = engines[0]?.requests.map((request) => request.max_tokens);
    assert.deepEqual(limits, [150, 220, 150, 150, 150, 150]);
    assert.ok(engines[0]?.requests.every((request) => request.temperature === 0.7));
  });

  it('системная инструкция идёт первым сообщением; каждый запрос независим (история не копится)', async () => {
    const { controller, engines } = await ready();

    await controller.generate('one', undefined, { system: 'Be brief.' });
    await controller.generate('two');

    assert.deepEqual(engines[0]?.requests[0]?.messages, [
      { role: 'system', content: 'Be brief.' },
      { role: 'user', content: 'one' },
    ]);
    assert.deepEqual(engines[0]?.requests[1]?.messages, [{ role: 'user', content: 'two' }]);
  });

  it('параллельные запросы выполняются по одному, по порядку', async () => {
    const { controller, engines } = await ready();
    const order: string[] = [];

    const results = await Promise.all(
      ['a', 'b', 'c'].map((prompt) => controller.generate(prompt).then((text) => (order.push(prompt), text))),
    );

    assert.equal(engines[0]?.maxRunning, 1, 'одновременно не больше одного запроса');
    assert.deepEqual(order, ['a', 'b', 'c']);
    assert.deepEqual(results, ['Hello world', 'Hello world', 'Hello world']);
  });

  it('остановка через AbortSignal: движок прерывается, возвращается уже сгенерированное', async () => {
    const { controller, engines } = await ready();
    engines[0]!.script = ['A', 'B', 'C', 'D', 'E', 'F'];
    engines[0]!.delayMs = 8;
    const abort = new AbortController();
    const seen: string[] = [];

    const promise = controller.generate('long', (textSoFar) => {
      seen.push(textSoFar);
      if (textSoFar === 'AB') abort.abort();
    }, { signal: abort.signal });

    const result = await promise;
    assert.equal(engines[0]?.interrupts, 1);
    assert.ok(result.startsWith('AB') && result.length < 6, `получено «${result}»`);
    // следующий запрос после остановки работает
    engines[0]!.script = ['ok'];
    assert.equal(await controller.generate('next'), 'ok');
  });

  it('сигнал уже сработал до вызова: пустой ответ, движок не вызывается', async () => {
    const { controller, engines } = await ready();
    const abort = new AbortController();
    abort.abort();

    assert.equal(await controller.generate('x', undefined, { signal: abort.signal }), '');
    assert.equal(engines[0]?.requests.length, 0);
  });

  it('ошибка движка: запрос отклоняется, следующие работают', async () => {
    const { controller, engines } = await ready();
    engines[0]!.failWith = new Error('boom');

    await assert.rejects(() => controller.generate('x'), /Не удалось запустить модель: boom/);
    assert.equal(controller.getState().status, 'ready', 'обычная ошибка не ломает модель');

    engines[0]!.failWith = null;
    assert.equal(await controller.generate('y'), 'Hello world');
  });

  it('потеря видеокарты: модель выгружена, состояние error, можно загрузить заново', async () => {
    const { controller, engines, workers } = await ready();
    engines[0]!.failWith = new Error('Device was lost: DeviceLostError');

    await assert.rejects(() => controller.generate('x'), /Видеокарта была сброшена/);
    assert.equal(controller.getState().status, 'error');
    assert.equal(workers[0]?.terminated, true);
    await assert.rejects(() => controller.generate('y'), /Модель не загружена/);

    assert.equal(await controller.load(), true);
    assert.equal(await controller.generate('z'), 'Hello world');
  });
});

describe('unload', () => {
  it('освобождает движок и worker, состояние возвращается в idle; потом можно загрузить заново', async () => {
    const env = await ready();

    await env.controller.unload();

    assert.equal(env.engines[0]?.unloaded, true);
    assert.equal(env.workers[0]?.terminated, true);
    assert.deepEqual(env.controller.getState(), { status: 'idle', progress: 0, statusText: '', error: null });
    await assert.rejects(() => env.controller.generate('x'), /Модель не загружена/);

    assert.equal(await env.controller.load(), true);
    assert.equal(env.engines.length, 2, 'после выгрузки создаётся новый движок');
  });

  it('выгрузка во время загрузки: то, что успели создать, освобождается, состояние idle', async () => {
    const gate = deferred();
    const env = setup({ gate: gate.promise });

    const loading = env.controller.load();
    await sleep(15); // загрузка уже идёт и ждёт на gate
    assert.equal(env.controller.getState().status, 'loading');

    await env.controller.unload();
    assert.equal(env.controller.getState().status, 'idle');
    gate.resolve();

    assert.equal(await loading, false, 'устаревшая загрузка сообщает, что модели нет');
    assert.equal(env.controller.getState().status, 'idle');
    assert.equal(env.engines[0]?.unloaded, true);
    assert.equal(env.workers[0]?.terminated, true);
  });

  it('выгрузка прерывает идущую генерацию', async () => {
    const { controller, engines } = await ready();
    engines[0]!.script = Array.from({ length: 20 }, () => 'x');
    engines[0]!.delayMs = 10;

    const generating = controller.generate('long');
    await sleep(25);
    await controller.unload();

    assert.equal(engines[0]?.interrupts, 1);
    await generating.catch(() => undefined);
  });
});

describe('подписка', () => {
  it('getState возвращает один и тот же объект, пока ничего не изменилось', async () => {
    const { controller } = setup();
    assert.equal(controller.getState(), controller.getState());
    await controller.load();
    const snapshot = controller.getState();
    assert.equal(controller.getState(), snapshot);
  });

  it('подписчики уведомляются об изменениях; после отписки — нет', async () => {
    const { controller } = setup();
    let calls = 0;
    const unsubscribe = controller.subscribe(() => {
      calls += 1;
    });

    await controller.load();
    assert.ok(calls >= 3, `было ${calls} уведомлений`);

    unsubscribe();
    const before = calls;
    await controller.unload();
    assert.equal(calls, before);
  });
});
