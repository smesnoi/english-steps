/** Пример употребления: английское предложение и его перевод. */
export interface GrammarExample {
  en: string;
  ru: string;
}

/** Одно правило темы: короткий заголовок, объяснение и примеры. */
export interface GrammarRule {
  title: string;
  explanation: string;
  examples: GrammarExample[];
}

export interface GrammarTopic {
  /** Стабильный идентификатор для адреса и сохранения прогресса: не менять у существующих тем */
  id: string;
  title: string;
  description: string;
  rules: GrammarRule[];
}

/**
 * Базовые темы грамматики уровня A1–A2. Для каждой темы в data/grammarQuestions.ts
 * есть пять тренировочных вопросов с тем же id.
 */
export const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    id: 'present-simple',
    title: 'Present Simple — настоящее простое время',
    description: 'Говорим о привычках, регулярных действиях и фактах.',
    rules: [
      {
        title: 'Утверждения: he / she / it + -s',
        explanation:
          'Глагол ставим в начальной форме. С he, she, it добавляем окончание -s (после s, sh, ch, x, o — -es: watches, goes). С I, you, we, they окончания нет.',
        examples: [
          { en: 'I work in a shop.', ru: 'Я работаю в магазине.' },
          { en: 'She works in a bank.', ru: 'Она работает в банке.' },
          { en: 'He watches TV every evening.', ru: 'Он каждый вечер смотрит телевизор.' },
        ],
      },
      {
        title: 'Отрицания и вопросы: do / does',
        explanation:
          'Для отрицания и вопроса нужен вспомогательный глагол: do (I, you, we, they) или does (he, she, it). После does основной глагол остаётся без -s: Does she work? She doesn’t work.',
        examples: [
          { en: 'I don’t like coffee.', ru: 'Я не люблю кофе.' },
          { en: 'Does he play football?', ru: 'Он играет в футбол?' },
          { en: 'They do not live here.', ru: 'Они здесь не живут.' },
        ],
      },
    ],
  },
  {
    id: 'past-simple',
    title: 'Past Simple — прошедшее простое время',
    description: 'Говорим о действиях, которые произошли и закончились в прошлом.',
    rules: [
      {
        title: 'Правильные глаголы: -ed',
        explanation:
          'К правильному глаголу добавляем -ed (-d, если он уже оканчивается на -e): work → worked, like → liked. Если глагол оканчивается на согласную + y, то y меняется на i: study → studied. Для всех лиц форма одна.',
        examples: [
          { en: 'We worked all day.', ru: 'Мы работали весь день.' },
          { en: 'She studied English last year.', ru: 'В прошлом году она изучала английский.' },
          { en: 'I liked the film.', ru: 'Мне понравился фильм.' },
        ],
      },
      {
        title: 'Неправильные глаголы, отрицания и вопросы',
        explanation:
          'У неправильных глаголов особые формы: go → went, see → saw, have → had, eat → ate, buy → bought. Для отрицания и вопроса нужен did, а основной глагол возвращается в начальную форму: Did you see him? I didn’t see him.',
        examples: [
          { en: 'He went to London in May.', ru: 'В мае он поехал в Лондон.' },
          { en: 'Did you eat breakfast?', ru: 'Ты завтракал?' },
          { en: 'I didn’t see her yesterday.', ru: 'Вчера я её не видел.' },
        ],
      },
    ],
  },
  {
    id: 'articles',
    title: 'Артикли a / an / the',
    description: 'Маленькие слова перед существительными, которых нет в русском языке.',
    rules: [
      {
        title: 'a / an — неопределённый артикль',
        explanation:
          'Ставим перед исчисляемым существительным в единственном числе, когда говорим о предмете впервые или «об одном из многих». Выбор зависит от звука, а не от буквы: a — перед согласным звуком (a book, a university), an — перед гласным звуком (an apple, an hour).',
        examples: [
          { en: 'I have a dog.', ru: 'У меня есть собака.' },
          { en: 'She eats an apple every day.', ru: 'Она каждый день ест яблоко.' },
          { en: 'He is a student.', ru: 'Он студент.' },
        ],
      },
      {
        title: 'the — определённый артикль',
        explanation:
          'Используем the, когда собеседнику понятно, о каком именно предмете речь: он уже упоминался или он единственный в своём роде (the sun, the moon). Когда говорим о чём-то вообще (во множественном числе или о неисчисляемом), артикль не нужен.',
        examples: [
          { en: 'I have a dog. The dog is big.', ru: 'У меня есть собака. Собака большая.' },
          { en: 'The sun is hot today.', ru: 'Сегодня солнце жаркое.' },
          { en: 'Please close the door.', ru: 'Закрой, пожалуйста, дверь.' },
        ],
      },
    ],
  },
  {
    id: 'prepositions-place',
    title: 'Предлоги места',
    description: 'Говорим, где находится предмет или человек.',
    rules: [
      {
        title: 'in, on, at',
        explanation:
          'in — внутри чего-то (in the bag, in London); on — на поверхности (on the table, on the wall); at — в точке или около места (at the bus stop, at school, at home).',
        examples: [
          { en: 'The keys are in the bag.', ru: 'Ключи в сумке.' },
          { en: 'The book is on the table.', ru: 'Книга на столе.' },
          { en: 'I am at home.', ru: 'Я дома.' },
        ],
      },
      {
        title: 'under, next to, between, behind, in front of',
        explanation:
          'under — под, next to — рядом с, between — между (двумя предметами), behind — позади, in front of — перед.',
        examples: [
          { en: 'The cat is under the chair.', ru: 'Кошка под стулом.' },
          { en: 'The bank is next to the school.', ru: 'Банк рядом со школой.' },
          { en: 'The park is between the shop and the cafe.', ru: 'Парк находится между магазином и кафе.' },
        ],
      },
    ],
  },
  {
    id: 'plural-nouns',
    title: 'Множественное число существительных',
    description: 'Как сказать «много» о предметах и людях.',
    rules: [
      {
        title: 'Обычное правило: -s и -es',
        explanation:
          'Обычно добавляем -s: cat → cats. После s, ss, sh, ch, x добавляем -es: box → boxes, watch → watches. Если слово оканчивается на согласную + y, то y меняется на i и добавляется -es: city → cities.',
        examples: [
          { en: 'one cat — two cats', ru: 'одна кошка — две кошки' },
          { en: 'a box — three boxes', ru: 'коробка — три коробки' },
          { en: 'a city — many cities', ru: 'город — много городов' },
        ],
      },
      {
        title: 'Особые формы',
        explanation:
          'Некоторые существительные меняются не по правилу: man → men, woman → women, child → children, foot → feet, tooth → teeth, person → people. Слова sheep и fish во множественном числе не меняются.',
        examples: [
          { en: 'There are three children in the garden.', ru: 'В саду трое детей.' },
          { en: 'The women are at work.', ru: 'Женщины на работе.' },
          { en: 'My feet are cold.', ru: 'У меня замёрзли ноги.' },
        ],
      },
    ],
  },
  {
    id: 'comparatives',
    title: 'Степени сравнения прилагательных',
    description: 'Сравниваем предметы и людей: выше, интереснее, самый лучший.',
    rules: [
      {
        title: 'Сравнительная степень: -er и more',
        explanation:
          'Короткие прилагательные (из одного слога) принимают -er: tall → taller, small → smaller; после краткого гласного согласная удваивается: hot → hotter. Длинные прилагательные используем с more: more interesting. «Чем» — than.',
        examples: [
          { en: 'My brother is taller than me.', ru: 'Мой брат выше меня.' },
          { en: 'This book is more interesting than that one.', ru: 'Эта книга интереснее той.' },
          { en: 'Today is hotter than yesterday.', ru: 'Сегодня жарче, чем вчера.' },
        ],
      },
      {
        title: 'Превосходная степень и исключения',
        explanation:
          'Короткие прилагательные: the + -est (the tallest). Длинные: the most + прилагательное (the most beautiful). Исключения: good → better → the best, bad → worse → the worst.',
        examples: [
          { en: 'She is the tallest girl in the class.', ru: 'Она самая высокая девочка в классе.' },
          { en: 'This is the most expensive hotel in the city.', ru: 'Это самый дорогой отель в городе.' },
          { en: 'My English is better than before.', ru: 'Мой английский лучше, чем раньше.' },
        ],
      },
    ],
  },
];
