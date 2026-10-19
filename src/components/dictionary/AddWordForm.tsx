import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/styles';
import type { NewWordInput } from '@/store/useWordStore';
import type { Level } from '@/types';

/** Ключ для сравнения английских слов: без регистра, лишних пробелов по краям и внутри. */
export function normalizeEn(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Транскрипцию без слешей оборачиваем в /…/, как в стартовом наборе. */
function normalizeTranscription(value: string): string {
  const text = value.trim();
  if (text === '') return '';
  return text.startsWith('/') || text.startsWith('[') ? text : `/${text}/`;
}

const LEVELS: readonly Level[] = ['A1', 'A2', 'B1'];

interface FormValues {
  en: string;
  ru: string;
  transcription: string;
  level: Level;
  example: string;
  exampleTranslation: string;
}

interface FormErrors {
  en?: string;
  ru?: string;
}

const INITIAL_VALUES: FormValues = {
  en: '',
  ru: '',
  transcription: '',
  level: 'A2',
  example: '',
  exampleTranslation: '',
};

const INPUT_BASE =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 dark:bg-stone-950 dark:text-stone-100';
const INPUT_OK =
  'border-stone-300 focus:border-teal-500 focus:ring-teal-500/30 dark:border-stone-700';
const INPUT_ERROR = 'border-red-500 focus:border-red-500 focus:ring-red-500/30';

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  errorId?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

function Field({ label, htmlFor, error, errorId, optional, className = '', children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-stone-400 dark:text-stone-500">
            (необязательно)
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

interface AddWordFormProps {
  /** Уже существующие английские слова в виде normalizeEn(...) — для проверки дубликатов */
  existingEn: ReadonlySet<string>;
  onSubmit: (input: NewWordInput) => void;
  onCancel: () => void;
}

/** Inline-форма добавления своего слова. Закрывается по Esc и кнопке «Отмена». */
export function AddWordForm({ existingEn, onSubmit, onCancel }: AddWordFormProps) {
  const uid = useId();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const enRef = useRef<HTMLInputElement>(null);
  const ruRef = useRef<HTMLInputElement>(null);

  // При открытии формы курсор сразу в первом поле
  useEffect(() => {
    enRef.current?.focus();
  }, []);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const clearError = (field: keyof FormErrors) => {
    setErrors((previous) => (previous[field] ? { ...previous, [field]: undefined } : previous));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const en = values.en.trim().replace(/\s+/g, ' ');
    const ru = values.ru.trim();

    const nextErrors: FormErrors = {};
    if (en === '') nextErrors.en = 'Введите английское слово';
    else if (existingEn.has(normalizeEn(en))) nextErrors.en = 'Такое слово уже есть в словаре';
    if (ru === '') nextErrors.ru = 'Введите перевод';

    if (nextErrors.en || nextErrors.ru) {
      setErrors(nextErrors);
      (nextErrors.en ? enRef : ruRef).current?.focus();
      return;
    }

    onSubmit({
      en,
      ru,
      transcription: normalizeTranscription(values.transcription),
      level: values.level,
      example: values.example.trim(),
      exampleTranslation: values.exampleTranslation.trim(),
    });
  };

  const enId = `${uid}-en`;
  const ruId = `${uid}-ru`;
  const enErrorId = `${uid}-en-error`;
  const ruErrorId = `${uid}-ru-error`;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
      }}
      aria-label="Новое слово"
      className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm sm:p-5 dark:border-teal-900 dark:bg-stone-900"
    >
      <h2 className="text-lg font-semibold">Новое слово</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Слово (английский)" htmlFor={enId} error={errors.en} errorId={enErrorId}>
          <input
            ref={enRef}
            id={enId}
            type="text"
            value={values.en}
            maxLength={60}
            autoComplete="off"
            aria-required="true"
            aria-invalid={errors.en ? true : undefined}
            aria-describedby={errors.en ? enErrorId : undefined}
            onChange={(event) => {
              update('en', event.target.value);
              clearError('en');
            }}
            className={`${INPUT_BASE} ${errors.en ? INPUT_ERROR : INPUT_OK}`}
          />
        </Field>

        <Field label="Перевод (русский)" htmlFor={ruId} error={errors.ru} errorId={ruErrorId}>
          <input
            ref={ruRef}
            id={ruId}
            type="text"
            value={values.ru}
            maxLength={80}
            autoComplete="off"
            aria-required="true"
            aria-invalid={errors.ru ? true : undefined}
            aria-describedby={errors.ru ? ruErrorId : undefined}
            onChange={(event) => {
              update('ru', event.target.value);
              clearError('ru');
            }}
            className={`${INPUT_BASE} ${errors.ru ? INPUT_ERROR : INPUT_OK}`}
          />
        </Field>

        <Field label="Транскрипция" htmlFor={`${uid}-transcription`} optional>
          <input
            id={`${uid}-transcription`}
            type="text"
            value={values.transcription}
            maxLength={40}
            autoComplete="off"
            placeholder="həˈləʊ"
            onChange={(event) => update('transcription', event.target.value)}
            className={`${INPUT_BASE} ${INPUT_OK}`}
          />
        </Field>

        <Field label="Уровень" htmlFor={`${uid}-level`}>
          <select
            id={`${uid}-level`}
            value={values.level}
            onChange={(event) => update('level', event.target.value as Level)}
            className={`${INPUT_BASE} ${INPUT_OK}`}
          >
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Пример"
          htmlFor={`${uid}-example`}
          optional
          className="sm:col-span-2"
        >
          <input
            id={`${uid}-example`}
            type="text"
            value={values.example}
            maxLength={200}
            autoComplete="off"
            onChange={(event) => update('example', event.target.value)}
            className={`${INPUT_BASE} ${INPUT_OK}`}
          />
        </Field>

        <Field
          label="Перевод примера"
          htmlFor={`${uid}-example-translation`}
          optional
          className="sm:col-span-2"
        >
          <input
            id={`${uid}-example-translation`}
            type="text"
            value={values.exampleTranslation}
            maxLength={200}
            autoComplete="off"
            onChange={(event) => update('exampleTranslation', event.target.value)}
            className={`${INPUT_BASE} ${INPUT_OK}`}
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="submit" className={PRIMARY_BUTTON}>
          Добавить
        </button>
        <button type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
          Отмена
        </button>
      </div>
    </form>
  );
}
