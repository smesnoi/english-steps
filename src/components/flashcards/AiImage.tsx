import { useEffect, useState } from 'react';
import { AI_BUTTON } from '@/components/ui/styles';
import { useCooldownSeconds } from '@/hooks/useCooldownSeconds';
import { buildImageUrl } from '@/utils/aiImage';
import { createCooldown, type Cooldown } from '@/utils/cooldown';

/** Бесплатный сервис иногда отвечает очень долго: после этого времени сдаёмся. */
const DEFAULT_TIMEOUT_MS = 45_000;

/** После любого сбоя повторять запрос нельзя столько миллисекунд. */
const ERROR_COOLDOWN_MS = 30_000;

/** Одна пауза на всё приложение. */
const sharedImageCooldown = createCooldown(ERROR_COOLDOWN_MS);

const UNAVAILABLE_MESSAGE = 'Сервис картинок временно недоступен. Попробуйте позже.';

interface AiImageProps {
  /** Английское слово */
  word: string;
  /** Сколько ждать картинку, мс. */
  timeoutMs?: number;
  /** Пауза после сбоя. */
  cooldown?: Cooldown;
}

export function AiImage({
  word,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  cooldown = sharedImageCooldown,
}: AiImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const secondsLeft = useCooldownSeconds(cooldown);

  // Пока идёт загрузка, ждём не дольше timeoutMs
  useEffect(() => {
    if (!isLoading) return undefined;
    const timer = window.setTimeout(() => {
      setIsLoading(false);
      setImageUrl(null); // убираем <img>: браузер прекращает ждать ответ
      setFailed(true);
      cooldown.start();
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [isLoading, imageUrl, timeoutMs, cooldown]);

  // Слово без пригодных символов нарисовать нельзя
  if (buildImageUrl(word, 0) === null) return null;

  const handleFailure = () => {
    setIsLoading(false);
    setImageUrl(null);
    setFailed(true);
    cooldown.start();
  };

  const showImage = () => {
    if (secondsLeft > 0) return;
    const url = buildImageUrl(word, Date.now());
    if (url === null) return;
    setFailed(false);
    setIsLoading(true);
    setImageUrl(url);
  };

  if (imageUrl === null) {
    const unavailable = failed || secondsLeft > 0;
    return (
      <div className="space-y-2">
        {unavailable && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {UNAVAILABLE_MESSAGE}
          </p>
        )}
        {secondsLeft > 0 ? (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Повторить можно через {secondsLeft} с.
          </p>
        ) : (
          <button type="button" onClick={showImage} className={AI_BUTTON}>
            {failed ? 'Повторить' : '🖼️ Показать картинку'}
          </button>
        )}
        {!unavailable && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Картинку рисует наш Cloudflare Worker (Workers AI): слово отправляется на его сервер.
          </p>
        )}
      </div>
    );
  }

  return (
    <figure>
      {isLoading && (
        <div
          role="status"
          className="flex h-32 w-32 animate-pulse items-center justify-center rounded-xl bg-teal-200 text-xs font-medium text-teal-900 dark:bg-teal-900 dark:text-teal-100"
        >
          Рисую картинку…
        </div>
      )}
      
      {/* Убрана проверка isExpectedImageSize, так как Workers AI отдает картинки другого размера */}
      <img
        key={imageUrl}
        src={imageUrl}
        alt={`Иллюстрация к слову «${word}», созданная ИИ`}
        width={128}
        height={128}
        decoding="async"
        onLoad={() => setIsLoading(false)}
        onError={handleFailure}
        className={isLoading ? 'invisible h-0 w-0' : 'h-32 w-32 rounded-xl object-cover'}
      />
      
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={showImage} disabled={isLoading} className={AI_BUTTON}>
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