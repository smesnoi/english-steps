import { Check, X } from 'lucide-react';
import { FOCUS_RING } from '@/components/ui/styles';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'dimmed';

/** Состояние варианта ответа: правильный подсвечивается всегда, выбранный неверный — красным. */
export function getOptionState(
  optionId: string,
  correctId: string,
  selectedId: string | null,
): OptionState {
  if (selectedId === null) return 'idle';
  if (optionId === correctId) return 'correct';
  if (optionId === selectedId) return 'wrong';
  return 'dimmed';
}

// Классы записаны целиком — иначе Tailwind не найдёт их при сборке
const OPTION_CLASSES: Record<OptionState, string> = {
  idle: 'border-stone-300 bg-white text-stone-900 hover:border-teal-500 hover:bg-teal-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-teal-500 dark:hover:bg-stone-800',
  correct:
    'border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-100',
  wrong:
    'border-red-500 bg-red-50 text-red-900 dark:border-red-500 dark:bg-red-950 dark:text-red-100',
  dimmed:
    'border-stone-200 bg-white text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-500',
};

interface OptionButtonProps {
  label: string;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
}

/** Кнопка с вариантом ответа на всю ширину. */
export function OptionButton({ label, state, disabled, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-5 py-4 text-left text-lg font-medium transition-colors disabled:cursor-default ${OPTION_CLASSES[state]} ${FOCUS_RING}`}
    >
      <span>{label}</span>
      {/* Состояние передаётся не только цветом: иконка и скрытый текст */}
      {state === 'correct' && (
        <>
          <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <span className="sr-only">правильный ответ</span>
        </>
      )}
      {state === 'wrong' && (
        <>
          <X className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
          <span className="sr-only">неверный ответ</span>
        </>
      )}
    </button>
  );
}
