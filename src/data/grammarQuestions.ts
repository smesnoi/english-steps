/**
 * Банк тренировочных вопросов по темам грамматики (по пять на тему, ключ — id темы
 * из data/grammar.ts). Вопрос хранится как «верный ответ + три неверных»: порядок вариантов
 * перемешивает generateGrammarQuiz, чтобы верный ответ не стоял на одном и том же месте.
 *
 * Правила для авторов вопросов:
 * - в формулировке пропуск обозначается «___»;
 * - верный вариант должен быть единственным: неверные — безусловные ошибки в этом контексте,
 *   а не «тоже возможные» варианты (если нужно, добавляйте в формулировку подсказку-контекст);
 * - id вида «<id темы>-q1» уникален и стабилен — по нему можно будет хранить прогресс.
 */
export interface GrammarQuestionSeed {
  id: string;
  question: string;
  correct: string;
  /** Ровно три неверных варианта: вместе с верным получается четыре */
  wrong: readonly [string, string, string];
  /** Короткое объяснение по-русски, которое покажем после ответа */
  explanation: string;
}

export const GRAMMAR_QUESTIONS: Readonly<Record<string, readonly GrammarQuestionSeed[]>> = {
  'present-simple': [
    {
      id: 'present-simple-q1',
      question: 'She ___ to work by bus every day.',
      correct: 'goes',
      wrong: ['go', 'going', 'is go'],
      explanation: 'С she глагол получает окончание: goes (he / she / it + -s или -es).',
    },
    {
      id: 'present-simple-q2',
      question: 'They ___ tennis on Sundays.',
      correct: 'play',
      wrong: ['plays', 'playing', 'are play'],
      explanation: 'С they окончание -s не нужно: they play.',
    },
    {
      id: 'present-simple-q3',
      question: 'He ___ like fish.',
      correct: 'doesn’t',
      wrong: ['don’t', 'not', 'no'],
      explanation: 'Отрицание с he / she / it: does not (doesn’t) + глагол без -s.',
    },
    {
      id: 'present-simple-q4',
      question: '___ your sister speak French?',
      correct: 'Does',
      wrong: ['Do', 'Is', 'Are'],
      explanation: 'Вопрос про одного человека (she, he, it) начинаем с does; основной глагол без -s.',
    },
    {
      id: 'present-simple-q5',
      question: 'My father ___ TV in the evening.',
      correct: 'watches',
      wrong: ['watch', 'watching', 'watchs'],
      explanation: 'После ch к глаголу добавляем -es: watches.',
    },
  ],
  'past-simple': [
    {
      id: 'past-simple-q1',
      question: 'We ___ football yesterday.',
      correct: 'played',
      wrong: ['play', 'plays', 'playing'],
      explanation: 'Правильный глагол в Past Simple получает -ed: play → played.',
    },
    {
      id: 'past-simple-q2',
      question: 'She ___ to the cinema last night.',
      correct: 'went',
      wrong: ['goes', 'go', 'goed'],
      explanation: 'go — неправильный глагол: go → went. Формы goed не существует.',
    },
    {
      id: 'past-simple-q3',
      question: 'I ___ see him at the party yesterday.',
      correct: 'didn’t',
      wrong: ['don’t', 'wasn’t', 'doesn’t'],
      explanation: 'Отрицание в Past Simple: did not (didn’t) + глагол в начальной форме.',
    },
    {
      id: 'past-simple-q4',
      question: '___ you watch the film last week?',
      correct: 'Did',
      wrong: ['Do', 'Does', 'Were'],
      explanation: 'Вопрос в Past Simple начинаем с did; основной глагол — в начальной форме.',
    },
    {
      id: 'past-simple-q5',
      question: 'He ___ a new bike two days ago.',
      correct: 'bought',
      wrong: ['buyed', 'buys', 'buying'],
      explanation: 'buy — неправильный глагол: buy → bought.',
    },
  ],
  articles: [
    {
      id: 'articles-q1',
      question: 'There is ___ egg on the table.',
      correct: 'an',
      wrong: ['a', 'the', 'many'],
      explanation: 'Egg начинается с гласного звука — an. О новом предмете (there is) говорим с неопределённым артиклем.',
    },
    {
      id: 'articles-q2',
      question: 'She is ___ university student.',
      correct: 'a',
      wrong: ['an', 'one', 'any'],
      explanation: 'University начинается со звука /j/ — это согласный звук, поэтому a, а не an.',
    },
    {
      id: 'articles-q3',
      question: 'I have a dog. ___ dog is very big.',
      correct: 'The',
      wrong: ['A', 'An', 'Any'],
      explanation: 'Собака уже упоминалась, поэтому слушателю понятно, о какой речь: the dog.',
    },
    {
      id: 'articles-q4',
      question: 'The Earth goes round ___ sun.',
      correct: 'the',
      wrong: ['a', 'an', 'one'],
      explanation: 'Солнце одно, поэтому нужен определённый артикль: the sun.',
    },
    {
      id: 'articles-q5',
      question: 'It is ___ hour from here to the station.',
      correct: 'an',
      wrong: ['a', 'any', 'many'],
      explanation: 'В слове hour буква h не читается, слово начинается с гласного звука: an hour.',
    },
  ],
  'prepositions-place': [
    {
      id: 'prepositions-place-q1',
      question: 'The clock is ___ the wall above the sofa.',
      correct: 'on',
      wrong: ['in', 'at', 'between'],
      explanation: 'On — на поверхности: on the wall.',
    },
    {
      id: 'prepositions-place-q2',
      question: 'My parents live ___ London.',
      correct: 'in',
      wrong: ['on', 'at', 'under'],
      explanation: 'In — внутри города, страны: in London.',
    },
    {
      id: 'prepositions-place-q3',
      question: 'I am waiting ___ the bus stop.',
      correct: 'at',
      wrong: ['in', 'on', 'under'],
      explanation: 'At — в точке или около места: at the bus stop, at school, at home.',
    },
    {
      id: 'prepositions-place-q4',
      question: 'The ball is ___ the table, on the floor.',
      correct: 'under',
      wrong: ['on', 'in', 'between'],
      explanation: 'Under — под: мяч лежит на полу, значит, под столом.',
    },
    {
      id: 'prepositions-place-q5',
      question: 'The school is ___ the bank and the post office.',
      correct: 'between',
      wrong: ['under', 'on', 'in'],
      explanation: 'Between — между двумя предметами.',
    },
  ],
  'plural-nouns': [
    {
      id: 'plural-nouns-q1',
      question: 'I have two ___.',
      correct: 'boxes',
      wrong: ['boxs', 'boxies', 'box'],
      explanation: 'После x добавляем -es: box → boxes.',
    },
    {
      id: 'plural-nouns-q2',
      question: 'There are three ___ in the picture.',
      correct: 'children',
      wrong: ['childs', 'childrens', 'childes'],
      explanation: 'child — особая форма: child → children.',
    },
    {
      id: 'plural-nouns-q3',
      question: 'She visited many ___ last year.',
      correct: 'cities',
      wrong: ['citys', 'cityes', 'city'],
      explanation: 'Согласная + y: меняем y на i и добавляем -es: city → cities.',
    },
    {
      id: 'plural-nouns-q4',
      question: 'Two ___ are standing near the door.',
      correct: 'men',
      wrong: ['mans', 'mens', 'man'],
      explanation: 'man → men: особая форма множественного числа.',
    },
    {
      id: 'plural-nouns-q5',
      question: 'My ___ are cold.',
      correct: 'feet',
      wrong: ['foots', 'feets', 'foot'],
      explanation: 'foot → feet: особая форма множественного числа; после are нужно множественное число.',
    },
  ],
  comparatives: [
    {
      id: 'comparatives-q1',
      question: 'My brother is ___ than me.',
      correct: 'taller',
      wrong: ['tallest', 'more tall', 'tall'],
      explanation: 'Короткое прилагательное + -er: taller. Слово than значит «чем».',
    },
    {
      id: 'comparatives-q2',
      question: 'This film is ___ than that one.',
      correct: 'more interesting',
      wrong: ['interestinger', 'most interesting', 'interesting'],
      explanation: 'Длинные прилагательные образуют сравнительную степень с more.',
    },
    {
      id: 'comparatives-q3',
      question: 'She is the ___ girl in our class.',
      correct: 'tallest',
      wrong: ['taller', 'most tall', 'more tall'],
      explanation: 'Превосходная степень коротких прилагательных: the + -est.',
    },
    {
      id: 'comparatives-q4',
      question: 'Today is ___ than yesterday.',
      correct: 'hotter',
      wrong: ['hoter', 'more hot', 'hottest'],
      explanation: 'После краткого гласного согласная удваивается: hot → hotter.',
    },
    {
      id: 'comparatives-q5',
      question: 'My English is ___ now. I make fewer mistakes.',
      correct: 'better',
      wrong: ['gooder', 'more good', 'more better'],
      explanation: 'good — исключение: good → better → the best.',
    },
  ],
};
