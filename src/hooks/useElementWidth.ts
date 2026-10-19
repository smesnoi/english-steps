import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Следит за шириной элемента (ResizeObserver) и возвращает её в пикселях.
 * Нужен графику: он строит SVG в реальных пикселях, и подписи осей остаются читаемыми
 * на любой ширине экрана (при фиксированном viewBox они сжимались бы вместе с картинкой).
 *
 * До первого замера, а также в окружениях без ResizeObserver, используется `fallbackWidth`.
 */
export function useElementWidth<T extends HTMLElement>(fallbackWidth = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallbackWidth);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const update = () => {
      const measured = Math.round(element.getBoundingClientRect().width);
      if (measured > 0) setWidth(measured);
    };
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
