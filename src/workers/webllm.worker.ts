import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Модель работает в отдельном потоке, чтобы страница не подвисала при загрузке и генерации.
// Сообщения от страницы обрабатывает обработчик из web-llm.
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (message: MessageEvent) => {
  handler.onmessage(message);
};
