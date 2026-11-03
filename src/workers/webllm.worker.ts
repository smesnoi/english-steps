/**
 * Web Worker для локальной нейросети (WebLLM).
 *
 * Мы загружаем библиотеку с CDN через динамический import(), чтобы Vite
 * не пытался собрать её в бандл при сборке на GitHub (там нет WebGPU).
 * Это решает ошибку "Rollup failed to resolve import @mlc-ai/web-llm".
 */

// Загружаем библиотеку с CDN
// @ts-expect-error — модуль загружается с внешнего URL, его типов нет в проекте
import('https://esm.run/@mlc-ai/web-llm')
  .then((module) => {
    // Создаём обработчик сообщений от основного потока
    const handler = new module.WebWorkerMLCEngineHandler();

    // Слушаем сообщения от основного потока (из useWebLLM)
    self.onmessage = (message: MessageEvent) => {
      handler.onmessage(message);
    };
  })
  .catch((error) => {
    // Если CDN недоступен или произошла ошибка, пишем в консоль
    console.error('Failed to load WebLLM from CDN in worker:', error);
    // Сообщаем основному потоку, что воркер не смог загрузиться
    self.postMessage({
      type: 'error',
      error: 'Не удалось загрузить модель с CDN. Проверьте интернет.',
    });
  });