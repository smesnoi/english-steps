import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Cooldown } from '@/utils/cooldown';

/**
 * Сколько целых секунд осталось до конца паузы (0 — паузы нет). Обновляется раз в секунду,
 * а в момент окончания — сразу, поэтому кнопка появляется без запаздывания.
 */
export function useCooldownSeconds(cooldown: Cooldown): number {
  const until = useSyncExternalStore(cooldown.subscribe, cooldown.until, cooldown.until);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= Date.now()) return undefined;
    setNow(Date.now());

    const ticker = window.setInterval(() => setNow(Date.now()), 1000);
    const finish = window.setTimeout(() => setNow(Date.now()), until - Date.now() + 20);
    return () => {
      window.clearInterval(ticker);
      window.clearTimeout(finish);
    };
  }, [until]);

  return Math.max(0, Math.ceil((until - now) / 1000));
}
