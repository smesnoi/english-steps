import { GRAMMAR_QUESTIONS, type GrammarQuestionSeed } from '../data/grammarQuestions';
import { shuffle } from './shuffle';

/** Готовый вопрос теста: четыре варианта, индекс верного уже вычислен. */
export interface Question {
  id: string;
  question: string;
  options: string[];
  /** Индекс верного варианта в options, от 0 до 3 */
  correctIndex: number;
  /** Объяснение по-русски — показываем после ответа */
  explanation: string;
}

// Map вместо обращения по ключу к объекту: идентификатор из адреса страницы может оказаться
// словом вроде «constructor», которое у обычного объекта «найдётся» среди унаследованных свойств
const QUESTIONS_BY_TOPIC = new Map<string, readonly GrammarQuestionSeed[]>(
  Object.entries(GRAMMAR_QUESTIONS),
);

function buildQuestion(seed: GrammarQuestionSeed, random: () => number): Question {
  const options = shuffle([seed.correct, ...seed.wrong], random);
  return {
    id: seed.id,
    question: seed.question,
    options,
    correctIndex: options.indexOf(seed.correct),
    explanation: seed.explanation,
  };
}

/**
 * Тест по теме: все вопросы темы (по пять), в случайном порядке и с перемешанными вариантами,
 * поэтому верный ответ каждый раз стоит на разных местах. Банк вопросов не меняется.
 * Неизвестная тема — пустой список.
 *
 * @param random источник случайности (0 ≤ x < 1); в тестах подставляется детерминированный
 */
export function generateGrammarQuiz(
  topicId: string,
  random: () => number = Math.random,
): Question[] {
  const seeds = QUESTIONS_BY_TOPIC.get(topicId);
  if (!seeds) return [];
  return shuffle(
    seeds.map((seed) => buildQuestion(seed, random)),
    random,
  );
}
