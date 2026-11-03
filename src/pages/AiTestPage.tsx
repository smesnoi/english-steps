import { useState } from 'react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PRIMARY_BUTTON } from '@/components/ui/styles';
import { useWebLLM } from '@/hooks/useWebLLM';

export default function AiTestPage() {
  const { isSupported, isLoading, progress, isReady, error, statusText, load, generate } = useWebLLM();
  const [prompt, setPrompt] = useState('Придумай одно простое предложение на английском со словом "apple".');
  const [answer, setAnswer] = useState('');

  const handleGenerate = async () => {
    setAnswer('Генерация...');
    try {
      const result = await generate(prompt, (text) => setAnswer(text));
      setAnswer(result);
    } catch (e) {
      setAnswer(`Ошибка: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (!isSupported) {
    return <PageContainer><p>Ваш браузер не поддерживает WebGPU (нужен Chrome/Edge на ПК).</p></PageContainer>;
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold mb-4">Тест WebLLM</h1>
      
      {!isReady && (
        <div className="mb-4">
          <button onClick={load} disabled={isLoading} className={PRIMARY_BUTTON}>
            {isLoading ? `Загрузка... ${progress}%` : 'Загрузить модель (Llama 3.2)'}
          </button>
          {isLoading && <p className="mt-2 text-sm text-gray-500">{statusText}</p>}
          {error && <p className="mt-2 text-red-500">{error}</p>}
        </div>
      )}

      {isReady && (
        <div>
          <p className="text-green-600 font-bold mb-2">Модель готова к работе!</p>
          <textarea 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-2 border rounded mb-2 text-black"
            rows={3}
          />
          <button onClick={handleGenerate} className={PRIMARY_BUTTON}>Сгенерировать</button>
          <div className="mt-4 p-4 bg-gray-100 text-black rounded whitespace-pre-wrap">
            {answer}
          </div>
        </div>
      )}
    </PageContainer>
  );
}