import { AiImage } from '@/components/flashcards/AiImage';
import { FOCUS_RING } from '@/components/ui/styles';
import type { Word } from '@/types';

const FACE_BASE =
  'absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl border p-5 text-center shadow-lg [backface-visibility:hidden]';

interface VisualCardProps {
  word: Word;
  isFlipped: boolean;
  onFlip: () => void;
}

/**
 * Карточка режима «Картинки»: спереди картинка и вопрос «Что это за слово?», сзади слово.
 *
 * Карточка — не role="button": на лицевой стороне есть настоящие кнопки (обновить картинку,
 * попробовать снова), а кнопка внутри кнопки недопустима. Поэтому клик по карточке переворачивает её
 * (клики по вложенным кнопкам игнорируются), а для клавиатуры и скринридеров есть отдельная
 * кнопка под карточкой.
 */
export function VisualCard({ word, isFlipped, onFlip }: VisualCardProps) {
  return (
    <div>
      <div className="[perspective:1200px]">
        {/* Клик мышью или пальцем; доступная замена для клавиатуры — кнопка ниже */}
        <div
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('button')) return;
            onFlip();
          }}
          style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          className="relative h-[28rem] w-full cursor-pointer rounded-3xl transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none"
        >
          {/* Лицевая сторона. После переворота скрывается и от фокуса (кнопки внутри не должны
              получать Tab): visibility включается с задержкой, чтобы не исчезнуть посреди анимации */}
          <div
            aria-hidden={isFlipped}
            className={`${FACE_BASE} border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 ${
              isFlipped ? 'invisible [transition:visibility_0s_linear_0.5s]' : '[transition:visibility_0s]'
            }`}
          >
            <p className="text-lg font-medium text-stone-600 dark:text-stone-300">Что это за слово?</p>
            <AiImage word={word.en} autoLoad size="large" />
          </div>

          {/* Оборотная сторона */}
          <div
            aria-hidden={!isFlipped}
            style={{ transform: 'rotateY(180deg)' }}
            className={`${FACE_BASE} border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950`}
          >
            <p className="text-4xl font-semibold tracking-tight sm:text-5xl">{word.en}</p>
            <p className="text-lg text-stone-500 dark:text-stone-400">{word.transcription}</p>
            <p className="text-2xl">{word.ru}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={onFlip}
          aria-pressed={isFlipped}
          className={`rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-teal-500 hover:text-teal-700 dark:border-stone-700 dark:text-stone-300 dark:hover:text-teal-300 ${FOCUS_RING}`}
        >
          {isFlipped ? 'Показать картинку' : 'Показать слово'}
        </button>
      </div>
    </div>
  );
}
