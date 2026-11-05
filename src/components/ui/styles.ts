/** Общие наборы классов Tailwind для кнопок и фокуса. */

export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-950';

export const PRIMARY_BUTTON = `inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-medium text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:text-stone-950 dark:hover:bg-teal-400 ${FOCUS_RING}`;

export const SECONDARY_BUTTON = `inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-6 py-3 font-medium text-stone-800 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800 ${FOCUS_RING}`;
export const AI_BUTTON = `inline-flex items-center gap-1.5 rounded-lg border border-teal-400 bg-white px-3 py-1.5 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-700 dark:bg-teal-900 dark:text-teal-100 dark:hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500`;