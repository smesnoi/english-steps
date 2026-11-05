/** Пауза после неудачи: пока она идёт, повторять запрос нельзя. */
export interface Cooldown {
  /** Запускает паузу на durationMs. Повторный вызов начинает отсчёт заново. */
  start: () => void;
  /** Момент (мс), до которого пауза действует; 0 — паузы не было. Число стабильно между вызовами (подходит useSyncExternalStore). */
  until: () => number;
  /** Сколько миллисекунд паузы осталось (0, если закончилась). */
  remainingMs: () => number;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Пауза без собственных таймеров — только отметка «до какого момента». Её можно сделать общей
 * для всего приложения: все, кто к ней обращаются, видят одно и то же состояние.
 * `now` подменяется в тестах.
 */
export function createCooldown(durationMs: number, now: () => number = Date.now): Cooldown {
  let until = 0;
  const listeners = new Set<() => void>();

  return {
    start: () => {
      until = now() + Math.max(0, durationMs);
      listeners.forEach((listener) => listener());
    },
    until: () => until,
    remainingMs: () => Math.max(0, until - now()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
