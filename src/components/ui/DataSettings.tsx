import { useRef, useState, type ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { SECONDARY_BUTTON } from '@/components/ui/styles';
import { useWordStore } from '@/store/useWordStore';
import { toDayKey } from '@/utils/date';

/** Резервная копия — небольшой текстовый файл; всё, что больше, не читаем. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

interface Notice {
  kind: 'success' | 'error';
  text: string;
}

/**
 * Блок «Настройки данных»: сохранить слова, прогресс и статистику в JSON-файл
 * и загрузить их обратно (смена устройства, очистка кеша браузера).
 */
export function DataSettings() {
  const exportData = useWordStore((state) => state.exportData);
  const importData = useWordStore((state) => state.importData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const handleExport = () => {
    const filename = `english-steps-backup-${toDayKey(new Date())}.json`;
    const url = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' }));

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Адрес освобождаем не сразу: некоторые браузеры начинают скачивание с задержкой
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);

    setNotice({ kind: 'success', text: `Резервная копия сохранена: ${filename}` });
  };

  const handleImportClick = () => {
    // Импорт заменяет все данные, поэтому спрашиваем до выбора файла
    const confirmed = window.confirm(
      'Импорт заменит все текущие слова и прогресс данными из файла. Продолжить?',
    );
    if (confirmed) fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    // Сбрасываем выбор, чтобы тот же файл можно было выбрать ещё раз
    input.value = '';
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setNotice({ kind: 'error', text: 'Файл слишком большой' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setNotice(
        importData(text)
          ? { kind: 'success', text: 'Данные загружены!' }
          : { kind: 'error', text: 'Неверный формат файла' },
      );
    };
    reader.onerror = () => setNotice({ kind: 'error', text: 'Не удалось прочитать файл' });
    reader.readAsText(file);
  };

  return (
    <section
      aria-labelledby="data-settings-title"
      className="mt-10 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900"
    >
      <h2 id="data-settings-title" className="text-lg font-semibold">
        Настройки данных
      </h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Слова, прогресс повторения и статистика хранятся только в этом браузере. Сохраните
        резервную копию перед очисткой кеша или переходом на другое устройство. Тема
        оформления в копию не входит.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={handleExport} className={SECONDARY_BUTTON}>
          <Download className="h-5 w-5" aria-hidden />
          Экспорт данных
        </button>
        <button type="button" onClick={handleImportClick} className={SECONDARY_BUTTON}>
          <Upload className="h-5 w-5" aria-hidden />
          Импорт данных
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        tabIndex={-1}
        aria-label="Файл резервной копии"
        className="hidden"
      />

      <div role="status" className="mt-3 min-h-[1.25rem] text-sm">
        {notice && (
          <p
            className={
              notice.kind === 'success'
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-red-600 dark:text-red-400'
            }
          >
            {notice.text}
          </p>
        )}
      </div>
    </section>
  );
}
