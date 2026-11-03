import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/ui/PageContainer';
import { FOCUS_RING } from '@/components/ui/styles';
import { GRAMMAR_TOPICS } from '@/data/grammar';
import { pluralize } from '@/utils/pluralize';

/** Список тем грамматики. */
export default function GrammarPage() {
  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Грамматика</h1>
      <p className="mt-1 text-stone-600 dark:text-stone-400">
        Короткие правила с примерами и тест по каждой теме.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {GRAMMAR_TOPICS.map((topic) => {
          const rulesCount = topic.rules.length;
          return (
            <li key={topic.id}>
              <Link
                to={`/grammar/${topic.id}`}
                className={`block h-full rounded-2xl border border-stone-200 bg-white p-4 transition-colors hover:border-teal-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-teal-600 ${FOCUS_RING}`}
              >
                <span className="block text-lg font-semibold">{topic.title}</span>
                <span className="mt-1 block text-sm text-stone-600 dark:text-stone-400">
                  {topic.description}
                </span>
                <span className="mt-3 inline-block rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {rulesCount} {pluralize(rulesCount, 'правило', 'правила', 'правил')}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageContainer>
  );
}
