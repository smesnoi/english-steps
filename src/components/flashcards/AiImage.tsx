import { useEffect, useState } from 'react';
import { AI_BUTTON } from '@/components/ui/styles';
import { buildImageUrl } from '@/utils/aiImage';

/** Генерация занимает секунды, но иногда сервис отвечает очень долго: после этого времени сдаёмся. */
const DEFAULT_TIMEOUT_MS = 45_000;

const SIZE_CLASSES = {
  small: 'h-32 w-32',
  large: 'h-64 w-64 sm:h-72 sm:w-72',
} as const;

interface AiImageProps {
  word: string;
  autoLoad?: boolean;
  size?: 'small' | 'large';
  timeoutMs?: number;
}

export function AiImage({
  word,
  autoLoad = false,
  size = 'small',
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: AiImageProps) {
  // При autoLoad запрос начинается уже с первой отрисовки
  const [imageUrl, setImageUrl] = useState<string | null>(() =>
    autoLoad ? buildImageUrl(word, Date.now()) : null,
  );
  const [isLoading, setIsLoading] = useState(imageUrl !== null);
  const [failed, setFailed] = useState(false);

  // Пока идёт загрузка, ждём не дольше timeoutMs
  useEffect(() => {
    if (!isLoading) return undefined;
    const timer = window.setTimeout(() => {
      setIsLoading(false);
      setImageUrl(null);
      setFailed(true);
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [isLoading, imageUrl, timeoutMs]);

  // Слово нарисовать нельзя — ничего не показываем
  if (buildImageUrl(word, 0) === null) return null;

  const start = (refresh?: number) => {
    const url = buildImageUrl(word, Date.now(), refresh);
    if (url === null) return;
    setFailed(false);
    setIsLoading(true);
    setImageUrl(url);
  };

  const handleFailure = () => {
    setIsLoading(false);
    setImageUrl(null);
    setFailed(true);
  };

  if (imageUrl === null) {
    if (failed) {
      return (
        <div className={`flex flex-col items-center gap-3 ${size === 'large' ? `justify-center ${SIZE_CLASSES.large}` : ''}`}>
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            Не удалось загрузить картинку
          </p>
          <button type="button" onClick={() => start()} className={AI_BUTTON}>
            Попробовать снова
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <button type="button" onClick={() => start()} className={AI_BUTTON}>
          🖼️ Показать картинку
        </button>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Картинку рисует ИИ на сервере Cloudflare: слово отправляется на него.
        </p>
      </div>
    );
  }

  return (
    <figure className="flex flex-col items-center">
      {isLoading && (
        <div className={`flex animate-pulse items-center justify-center rounded-2xl bg-teal-200 text-sm font-medium text-teal-900 dark:bg-teal-900 dark:text-teal-100 ${SIZE_CLASSES[size]}`}>
          Рисую картинку…
        </div>
      )}
      <img
        key={imageUrl}
        src={imageUrl}
        alt="Иллюстрация к слову, созданная ИИ"
        decoding="async"
        onLoad={(event) => {
          if (event.currentTarget.naturalWidth === 0) {
            handleFailure();
            return;
          }
          setIsLoading(false);
        }}
        onError={handleFailure}
        className={isLoading ? 'invisible h-0 w-0' : `${SIZE_CLASSES[size]} rounded-2xl object-cover`}
      />
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={() => start(Date.now())} disabled={isLoading} className={AI_BUTTON}>
          Обновить картинку
        </button>
      </div>
      {!isLoading && (
        <figcaption className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          Картинка создана ИИ и может быть неточной.
        </figcaption>
      )}
    </figure>
  );
}