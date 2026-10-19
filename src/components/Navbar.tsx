import { Languages, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { SECTIONS } from '@/data/sections';
import { useTheme, useThemeStore, type Theme } from '@/store/useThemeStore';

const cx = (...parts: Array<string | false | undefined>): string =>
  parts.filter(Boolean).join(' ');

const THEME_OPTIONS: readonly { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Светлая тема', icon: Sun },
  { value: 'dark', label: 'Тёмная тема', icon: Moon },
  { value: 'system', label: 'Как в системе', icon: Monitor },
];

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500';

/** Три кнопки Light / Dark / System (от 640px). */
function ThemeSwitch() {
  const theme = useTheme();
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div
      role="group"
      aria-label="Тема оформления"
      className="hidden items-center gap-0.5 rounded-xl border border-stone-200 bg-white p-0.5 sm:flex dark:border-stone-800 dark:bg-stone-900"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={cx(
              'rounded-lg p-1.5 transition-colors',
              FOCUS_RING,
              active
                ? 'bg-teal-600 text-white dark:bg-teal-500 dark:text-stone-950'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

/** На узких экранах: одна кнопка, которая перебирает темы по кругу. */
function ThemeCycler() {
  const theme = useTheme();
  const setTheme = useThemeStore((state) => state.setTheme);

  const index = Math.max(
    THEME_OPTIONS.findIndex((option) => option.value === theme),
    0,
  );
  const current = THEME_OPTIONS[index];
  const next = THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length];
  if (!current || !next) return null;
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={() => setTheme(next.value)}
      aria-label={`${current.label}. Нажмите, чтобы переключить: ${next.label}`}
      title={current.label}
      className={cx(
        'rounded-xl border border-stone-200 bg-white p-2 text-stone-600 sm:hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300',
        FOCUS_RING,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

const desktopLinkClass = ({ isActive }: { isActive: boolean }): string =>
  cx(
    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    FOCUS_RING,
    isActive
      ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
      : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
  );

const tabLinkClass = ({ isActive }: { isActive: boolean }): string =>
  cx(
    'flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 pb-2 pt-2 text-[10px] font-medium transition-colors',
    FOCUS_RING,
    isActive
      ? 'text-teal-700 dark:text-teal-300'
      : 'text-stone-500 dark:text-stone-400',
  );

export function Navbar() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/85 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-stone-800 dark:bg-stone-950/85">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className={cx(
              'flex items-center gap-2 rounded-lg text-base font-semibold tracking-tight',
              FOCUS_RING,
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white dark:bg-teal-500 dark:text-stone-950">
              <Languages className="h-5 w-5" aria-hidden />
            </span>
            English Steps
          </Link>

          {/* Ссылки с подписями — на широких экранах */}
          <nav aria-label="Основная навигация" className="ml-4 hidden items-center gap-1 lg:flex">
            {SECTIONS.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={desktopLinkClass}>
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto">
            <ThemeSwitch />
            <ThemeCycler />
          </div>
        </div>
      </header>

      {/* Нижняя таб-панель — на телефонах и планшетах */}
      <nav
        aria-label="Нижняя навигация"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-stone-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-stone-800 dark:bg-stone-950/95"
      >
        <div className="mx-auto flex max-w-xl">
          {SECTIONS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={tabLinkClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-teal-100 dark:bg-teal-950',
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
