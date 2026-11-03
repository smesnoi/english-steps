import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { GrammarQuiz } from '@/components/grammar/GrammarQuiz';
import { EmptyQueue } from '@/components/session/EmptyQueue';
import { PageContainer } from '@/components/ui/PageContainer';
import { FOCUS_RING, PRIMARY_BUTTON } from '@/components/ui/styles';
import { GRAMMAR_TOPICS } from '@/data/grammar';

const BACK_LINK = `inline-flex items-center gap-1 rounded-lg text-sm font-medium text-teal-700 hover:underline dark:text-teal-300 ${FOCUS_RING}`;

/**
 * Страница темы: правила с примерами и тест. key по topicId сбрасывает состояние,
 * когда переходим к другой теме: страница при этом не пересоздаётся маршрутизатором.
 */
export default function GrammarTopicPage() {
  const { topicId = '' } = useParams<{ topicId: string }>();
  return <TopicView key={topicId} topicId={topicId} />;
}

function TopicView({ topicId }: { topicId: string }) {
  const topic = GRAMMAR_TOPICS.find((item) => item.id === topicId);
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  // При переключении между правилами и тестом показываем страницу с начала
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [isQuizOpen]);

  if (!topic) {
    return (
      <EmptyQueue
        title="Тема не найдена"
        description="Такой темы нет. Выберите тему из списка."
        primaryTo="/grammar"
        primaryLabel="К списку тем"
      />
    );
  }

  if (isQuizOpen) {
    return (
      <PageContainer>
        <button type="button" onClick={() => setIsQuizOpen(false)} className={BACK_LINK}>
          <ArrowLeft className="h-4 w-4" aria-hidden />К правилам
        </button>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{topic.title}</h1>
        <p className="mb-6 mt-1 text-stone-600 dark:text-stone-400">Проверьте себя: тест по теме.</p>
        <GrammarQuiz topicId={topic.id} onBackToRules={() => setIsQuizOpen(false)} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link to="/grammar" className={BACK_LINK}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Все темы
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{topic.title}</h1>
      <p className="mt-1 text-stone-600 dark:text-stone-400">{topic.description}</p>

      <div className="mt-6 space-y-4">
        {topic.rules.map((rule, index) => (
          <section
            key={rule.title}
            aria-labelledby={`rule-${index}-title`}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 dark:border-stone-800 dark:bg-stone-900"
          >
            <h2 id={`rule-${index}-title`} className="text-lg font-semibold">
              {index + 1}. {rule.title}
            </h2>
            <p className="mt-2 text-stone-700 dark:text-stone-300">{rule.explanation}</p>
            <ul className="mt-4 space-y-3">
              {rule.examples.map((example) => (
                <li
                  key={example.en}
                  className="border-l-4 border-teal-400 pl-3 dark:border-teal-600"
                >
                  <p className="font-medium">{example.en}</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400">{example.ru}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8">
        <button type="button" onClick={() => setIsQuizOpen(true)} className={PRIMARY_BUTTON}>
          Пройти тест
        </button>
      </div>
    </PageContainer>
  );
}
