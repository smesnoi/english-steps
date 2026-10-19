const pad = (value: number): string => String(value).padStart(2, '0');

/** Ключ дня в локальном времени: "2026-10-12". Используется для статистики и streak. */
export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Начало дня (00:00 по локальному времени). */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Сдвиг на N дней (можно отрицательное число).
 * Считаем через календарь, а не через 24 * 60 * 60 * 1000 мс,
 * чтобы переход на летнее/зимнее время не сбивал дату.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

/** Ключи последних N дней, от старого к новому; последний элемент — сегодня. */
export function getLastDays(count: number, today: Date = new Date()): string[] {
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(toDayKey(addDays(today, -offset)));
  }
  return days;
}

/**
 * Streak — сколько дней подряд была активность.
 * Если сегодня ещё не занимались, серия не прерывается:
 * считаем от вчерашнего дня (у пользователя есть время позаниматься до конца дня).
 */
export function calculateStreak(
  activeDays: readonly string[],
  today: Date = new Date(),
): number {
  const active = new Set(activeDays);
  let cursor = startOfDay(today);

  if (!active.has(toDayKey(cursor))) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (active.has(toDayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
