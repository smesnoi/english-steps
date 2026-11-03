// @ts-expect-error
import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/+esm').then((module) => {
  const handler = new module.WebWorkerMLCEngineHandler();
  self.onmessage = (message: MessageEvent) => {
    handler.onmessage(message);
  };
}).catch((error) => {
  console.error('Failed to load WebLLM from CDN in worker:', error);
});