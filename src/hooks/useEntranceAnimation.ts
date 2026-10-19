import { useLayoutEffect } from 'react';

interface EntranceAnimationOptions {
  /** Длительность, мс */
  duration?: number;
  /** Насколько элемент «подъезжает» справа, px */
  offsetPx?: number;
}

/**
 * Плавно показывает элемент справа при смене `trigger` (например, id текущего слова).
 *
 * - Анимируется именно переданный элемент, а не вложенные: CSS-переходы внутри него
 *   (например, переворот карточки) с этой анимацией не конфликтуют.
 * - Перезапускается только при смене `trigger`; любые другие перерисовки её не трогают.
 * - useLayoutEffect, а не useEffect: анимация стартует до отрисовки,
 *   и элемент не успевает мелькнуть в конечном положении.
 * - При `prefers-reduced-motion` и в окружениях без Web Animations API ничего не делает.
 *
 * Если `trigger === undefined` (например, сессия закончилась), анимации нет.
 */
export function useEntranceAnimation(
  ref: { readonly current: HTMLElement | null },
  trigger: string | undefined,
  { duration = 250, offsetPx = 32 }: EntranceAnimationOptions = {},
): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (trigger === undefined || !element || typeof element.animate !== 'function') {
      return undefined;
    }
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;

    const animation = element.animate(
      [
        { opacity: 0, transform: `translateX(${offsetPx}px)` },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { duration, easing: 'ease-out' },
    );
    return () => animation.cancel();
  }, [ref, trigger, duration, offsetPx]);
}
