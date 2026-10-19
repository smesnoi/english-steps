/**
 * Склонение существительного после числа в русском языке:
 * 1 слово, 2 слова, 5 слов, 11 слов, 21 слово.
 */
export function pluralize(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
