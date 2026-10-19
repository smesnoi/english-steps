import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { AddWordForm, normalizeEn } from '@/components/dictionary/AddWordForm';
import { WordCard } from '@/components/dictionary/WordCard';
import { PageContainer } from '@/components/ui/PageContainer';
import { FOCUS_RING, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/styles';
import {
  useWordStore,
  useWordsWithStatus,
  type NewWordInput,
  type WordWithStatus,
} from '@/store/useWordStore';
import type { WordStatus } from '@/types';
import { pluralize } from '@/utils/pluralize';

type StatusFilter = 'all' | WordStatus;

const FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'learning', label: 'В процессе' },
  { value: 'learned', label: 'Выученные' },
];

const SEARCH_INPUT =
  'w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100';

export default function DictionaryPage() {
  const hydrated = useWordStore((state) => state.hydrated);
  const words = useWordsWithStatus();
  const addWord = useWordStore((state) => state.addWord);
  const removeWord = useWordStore((state) => state.removeWord);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [isAdding, setIsAdding] = useState(false);
  /** Сообщение о добавлении. Сбрасывается при следующем действии пользователя. */
  const [notice, setNotice] = useState<string | null>(null);

  // Всё, что можно вывести из слов, считаем здесь, а не храним в состоянии
  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { all: words.length, new: 0, learning: 0, learned: 0 };
    for (const word of words) result[word.srsStatus] += 1;
    return result;
  }, [words]);

  const existingEn = useMemo(() => new Set(words.map((word) => normalizeEn(word.en))), [words]);

  const visibleWords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return words
      .filter((word) => filter === 'all' || word.srsStatus === filter)
      .filter(
        (word) =>
          needle === '' ||
          word.en.toLowerCase().includes(needle) ||
          word.ru.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.en.localeCompare(b.en, 'en', { sensitivity: 'base' }));
  }, [words, query, filter]);

  if (!hydrated) {
    return (
      <PageContainer>
        <div role="status" aria-label="Загрузка…" className="animate-pulse space-y-3">
          <div className="h-9 w-40 rounded-lg bg-stone-200 dark:bg-stone-800" />
          <div className="h-12 rounded-xl bg-stone-200 dark:bg-stone-800" />
          <div className="h-32 rounded-2xl bg-stone-200 dark:bg-stone-800" />
        </div>
      </PageContainer>
    );
  }

  const isFiltering = query.trim() !== '' || filter !== 'all';

  const openForm = () => {
    setNotice(null);
    setIsAdding(true);
  };

  const handleAdd = (input: NewWordInput) => {
    // Форма уже проверила дубликат; повторная проверка защищает от гонки состояний
    if (existingEn.has(normalizeEn(input.en))) return;
    addWord(input);
    setIsAdding(false);
    // Без сброса новое слово могло бы оказаться скрыто фильтром или поиском
    setQuery('');
    setFilter('all');
    setNotice(`Слово «${input.en}» добавлено`);
  };

  const handleDelete = (word: WordWithStatus) => {
    const confirmed = window.confirm(
      `Удалить слово «${word.en}»? Прогресс по нему тоже будет удалён.`,
    );
    if (!confirmed) return;
    setNotice(null);
    removeWord(word.id);
  };

  const resetFilters = () => {
    setQuery('');
    setFilter('all');
  };

  const header = (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Словарь</h1>
        <p className="text-stone-500 tabular-nums dark:text-stone-400">
          {counts.all} {pluralize(counts.all, 'слово', 'слова', 'слов')}
        </p>
      </div>
    </div>
  );

  const noticeBlock = (
    <div role="status">
      {notice && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {notice}
        </p>
      )}
    </div>
  );

  const form = isAdding && (
    <div className="mt-4">
      <AddWordForm
        existingEn={existingEn}
        onSubmit={handleAdd}
        onCancel={() => setIsAdding(false)}
      />
    </div>
  );

  // Пустой словарь: поиск и фильтры были бы бессмысленны
  if (counts.all === 0) {
    return (
      <PageContainer>
        {header}
        {noticeBlock}
        {form}
        {!isAdding && (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
            <p className="text-lg font-medium">В словаре пока нет слов</p>
            <button type="button" onClick={openForm} className={`mt-4 ${PRIMARY_BUTTON}`}>
              <Plus className="h-5 w-5" aria-hidden />
              Добавить первое слово
            </button>
          </div>
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {header}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setNotice(null);
              setQuery(event.target.value);
            }}
            placeholder="Поиск по слову или переводу"
            aria-label="Поиск по словарю"
            autoComplete="off"
            className={SEARCH_INPUT}
          />
        </div>
        <button
          type="button"
          onClick={openForm}
          aria-expanded={isAdding}
          className={PRIMARY_BUTTON}
        >
          <Plus className="h-5 w-5" aria-hidden />
          Добавить слово
        </button>
      </div>

      {/* Не табы, а кнопки-переключатели: у нас один список, а не отдельные панели */}
      <div role="group" aria-label="Фильтр по статусу" className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setNotice(null);
                setFilter(value);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
                active
                  ? 'border-teal-600 bg-teal-600 text-white dark:border-teal-500 dark:bg-teal-500 dark:text-stone-950'
                  : 'border-stone-300 bg-white text-stone-700 hover:border-teal-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
              }`}
            >
              {label} <span className="tabular-nums opacity-70">{counts[value]}</span>
            </button>
          );
        })}
      </div>

      {noticeBlock}
      {form}

      {isFiltering && (
        <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
          Найдено: {visibleWords.length} из {counts.all}
        </p>
      )}

      {visibleWords.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
          <p className="text-lg font-medium">Ничего не найдено</p>
          <p className="mt-1 text-stone-500 dark:text-stone-400">
            Попробуйте изменить запрос или фильтр.
          </p>
          <button type="button" onClick={resetFilters} className={`mt-4 ${SECONDARY_BUTTON}`}>
            Сбросить поиск и фильтры
          </button>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {visibleWords.map((word) => (
            <li key={word.id}>
              <WordCard word={word} onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
