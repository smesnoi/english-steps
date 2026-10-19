import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/ui/PageContainer';

export default function NotFoundPage() {
  return (
    <PageContainer className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Страница не найдена</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        Такого раздела нет. Возможно, ссылка устарела.
      </p>
      <Link
        to="/"
        className="mt-4 inline-block font-medium text-teal-700 underline underline-offset-4 dark:text-teal-300"
      >
        На главную
      </Link>
    </PageContainer>
  );
}
