import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/ui/PageContainer';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/styles';

interface EmptyQueueProps {
  title?: string;
  description?: string;
  primaryTo?: string;
  primaryLabel?: string;
  secondaryTo?: string;
  secondaryLabel?: string;
}

/**
 * Экран «в этой сессии заниматься нечем». Тексты и ссылки задаются пропсами:
 * в карточках и в тесте они отличаются. Значения по умолчанию — для типичного случая.
 */
export function EmptyQueue({
  title = 'Нечего повторять',
  description = 'Заходите позже!',
  primaryTo = '/dictionary',
  primaryLabel = 'Добавить слова',
  secondaryTo = '/',
  secondaryLabel = 'На главную',
}: EmptyQueueProps) {
  return (
    <PageContainer className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">{description}</p>
      <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <Link to={primaryTo} className={PRIMARY_BUTTON}>
          {primaryLabel}
        </Link>
        <Link to={secondaryTo} className={SECONDARY_BUTTON}>
          {secondaryLabel}
        </Link>
      </div>
    </PageContainer>
  );
}
