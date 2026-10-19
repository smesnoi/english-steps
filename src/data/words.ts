import type { Word } from '@/types';

/**
 * Стартовый набор: 100 самых частотных и полезных слов для начинающих
 * (50 слов уровня A1 и 50 слов уровня A2 по шкале CEFR).
 *
 * При первом запуске он копируется в localStorage (см. hydrate в useWordStore),
 * дальше пользователь может удалять слова и добавлять свои.
 *
 * Правила для редактирования:
 * - id стабильны и привязаны к прогрессу: не меняйте и не переиспользуйте их,
 *   новые слова добавляйте в конец со следующим номером;
 * - у разных слов не должно быть одинаковых `en` или `ru`, иначе тест
 *   перевода (buildOptions) исключит такие слова из вариантов ответа;
 * - status, correctCount и wrongCount — значения по умолчанию, актуальный статус
 *   считается из srs (getStatus).
 */
export const STARTER_WORDS: Word[] = [
  // ───────────── A1 ─────────────
  {
    id: 'starter-001', en: 'hello', ru: 'привет', transcription: '/həˈləʊ/', level: 'A1',
    example: 'Hello, how are you?', exampleTranslation: 'Привет, как дела?',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-002', en: 'goodbye', ru: 'до свидания', transcription: '/ɡʊdˈbaɪ/', level: 'A1',
    example: 'Goodbye, see you tomorrow.', exampleTranslation: 'До свидания, увидимся завтра.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-003', en: 'please', ru: 'пожалуйста', transcription: '/pliːz/', level: 'A1',
    example: 'Please sit down here.', exampleTranslation: 'Пожалуйста, садитесь сюда.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-004', en: 'thanks', ru: 'спасибо', transcription: '/θæŋks/', level: 'A1',
    example: 'Thanks for your help.', exampleTranslation: 'Спасибо за вашу помощь.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-005', en: 'yes', ru: 'да', transcription: '/jes/', level: 'A1',
    example: 'Yes, I like it.', exampleTranslation: 'Да, мне это нравится.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-006', en: 'no', ru: 'нет', transcription: '/nəʊ/', level: 'A1',
    example: "No, I don't know him.", exampleTranslation: 'Нет, я его не знаю.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-007', en: 'mother', ru: 'мама', transcription: '/ˈmʌðə/', level: 'A1',
    example: 'My mother cooks very well.', exampleTranslation: 'Моя мама очень хорошо готовит.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-008', en: 'father', ru: 'отец', transcription: '/ˈfɑːðə/', level: 'A1',
    example: 'My father works in a bank.', exampleTranslation: 'Мой отец работает в банке.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-009', en: 'friend', ru: 'друг', transcription: '/frend/', level: 'A1',
    example: 'He is my best friend.', exampleTranslation: 'Он мой лучший друг.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-010', en: 'child', ru: 'ребёнок', transcription: '/tʃaɪld/', level: 'A1',
    example: 'The child is playing outside.', exampleTranslation: 'Ребёнок играет на улице.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-011', en: 'water', ru: 'вода', transcription: '/ˈwɔːtə/', level: 'A1',
    example: 'I drink water every day.', exampleTranslation: 'Я пью воду каждый день.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-012', en: 'bread', ru: 'хлеб', transcription: '/bred/', level: 'A1',
    example: 'We need some bread.', exampleTranslation: 'Нам нужен хлеб.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-013', en: 'milk', ru: 'молоко', transcription: '/mɪlk/', level: 'A1',
    example: 'I like milk with coffee.', exampleTranslation: 'Я люблю молоко с кофе.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-014', en: 'apple', ru: 'яблоко', transcription: '/ˈæpl/', level: 'A1',
    example: 'I eat an apple every day.', exampleTranslation: 'Я ем яблоко каждый день.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-015', en: 'house', ru: 'дом', transcription: '/haʊs/', level: 'A1',
    example: 'We have a big house.', exampleTranslation: 'У нас большой дом.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-016', en: 'room', ru: 'комната', transcription: '/ruːm/', level: 'A1',
    example: 'My room is very small.', exampleTranslation: 'Моя комната очень маленькая.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-017', en: 'door', ru: 'дверь', transcription: '/dɔː/', level: 'A1',
    example: 'Please close the door.', exampleTranslation: 'Пожалуйста, закрой дверь.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-018', en: 'table', ru: 'стол', transcription: '/ˈteɪbl/', level: 'A1',
    example: 'The book is on the table.', exampleTranslation: 'Книга лежит на столе.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-019', en: 'book', ru: 'книга', transcription: '/bʊk/', level: 'A1',
    example: 'This book is very interesting.', exampleTranslation: 'Эта книга очень интересная.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-020', en: 'day', ru: 'день', transcription: '/deɪ/', level: 'A1',
    example: 'It is a nice day.', exampleTranslation: 'Сегодня хороший день.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-021', en: 'night', ru: 'ночь', transcription: '/naɪt/', level: 'A1',
    example: 'I sleep well at night.', exampleTranslation: 'Ночью я хорошо сплю.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-022', en: 'morning', ru: 'утро', transcription: '/ˈmɔːnɪŋ/', level: 'A1',
    example: 'I drink tea in the morning.', exampleTranslation: 'Утром я пью чай.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-023', en: 'today', ru: 'сегодня', transcription: '/təˈdeɪ/', level: 'A1',
    example: 'Today is my birthday.', exampleTranslation: 'Сегодня мой день рождения.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-024', en: 'one', ru: 'один', transcription: '/wʌn/', level: 'A1',
    example: 'I have one sister.', exampleTranslation: 'У меня одна сестра.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-025', en: 'two', ru: 'два', transcription: '/tuː/', level: 'A1',
    example: 'She has two cats.', exampleTranslation: 'У неё две кошки.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-026', en: 'three', ru: 'три', transcription: '/θriː/', level: 'A1',
    example: 'There are three apples here.', exampleTranslation: 'Здесь три яблока.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-027', en: 'red', ru: 'красный', transcription: '/red/', level: 'A1',
    example: 'He wears a red shirt.', exampleTranslation: 'Он носит красную рубашку.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-028', en: 'blue', ru: 'синий', transcription: '/bluː/', level: 'A1',
    example: 'The sky is blue.', exampleTranslation: 'Небо синее.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-029', en: 'black', ru: 'чёрный', transcription: '/blæk/', level: 'A1',
    example: 'I have a black cat.', exampleTranslation: 'У меня чёрная кошка.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-030', en: 'white', ru: 'белый', transcription: '/waɪt/', level: 'A1',
    example: 'The snow is white.', exampleTranslation: 'Снег белый.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-031', en: 'head', ru: 'голова', transcription: '/hed/', level: 'A1',
    example: 'My head hurts a lot.', exampleTranslation: 'У меня сильно болит голова.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-032', en: 'hand', ru: 'рука', transcription: '/hænd/', level: 'A1',
    example: 'Give me your hand.', exampleTranslation: 'Дай мне свою руку.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-033', en: 'eye', ru: 'глаз', transcription: '/aɪ/', level: 'A1',
    example: 'She has beautiful blue eyes.', exampleTranslation: 'У неё красивые голубые глаза.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-034', en: 'big', ru: 'большой', transcription: '/bɪɡ/', level: 'A1',
    example: 'This is a big room.', exampleTranslation: 'Это большая комната.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-035', en: 'small', ru: 'маленький', transcription: '/smɔːl/', level: 'A1',
    example: 'I have a small bag.', exampleTranslation: 'У меня маленькая сумка.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-036', en: 'good', ru: 'хороший', transcription: '/ɡʊd/', level: 'A1',
    example: 'This is a good idea.', exampleTranslation: 'Это хорошая идея.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-037', en: 'bad', ru: 'плохой', transcription: '/bæd/', level: 'A1',
    example: 'The coffee is bad today.', exampleTranslation: 'Сегодня кофе плохой.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-038', en: 'new', ru: 'новый', transcription: '/njuː/', level: 'A1',
    example: 'I have a new phone.', exampleTranslation: 'У меня новый телефон.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-039', en: 'old', ru: 'старый', transcription: '/əʊld/', level: 'A1',
    example: 'This is an old house.', exampleTranslation: 'Это старый дом.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-040', en: 'hot', ru: 'горячий', transcription: '/hɒt/', level: 'A1',
    example: 'The soup is hot.', exampleTranslation: 'Суп горячий.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-041', en: 'cold', ru: 'холодный', transcription: '/kəʊld/', level: 'A1',
    example: 'The water is cold.', exampleTranslation: 'Вода холодная.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-042', en: 'go', ru: 'идти', transcription: '/ɡəʊ/', level: 'A1',
    example: 'We go to school together.', exampleTranslation: 'Мы вместе ходим в школу.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-043', en: 'come', ru: 'приходить', transcription: '/kʌm/', level: 'A1',
    example: 'Please come to my house.', exampleTranslation: 'Пожалуйста, приходи ко мне домой.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-044', en: 'eat', ru: 'есть (кушать)', transcription: '/iːt/', level: 'A1',
    example: 'We eat dinner at seven.', exampleTranslation: 'Мы ужинаем в семь.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-045', en: 'drink', ru: 'пить', transcription: '/drɪŋk/', level: 'A1',
    example: 'Do you drink coffee?', exampleTranslation: 'Ты пьёшь кофе?',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-046', en: 'see', ru: 'видеть', transcription: '/siː/', level: 'A1',
    example: 'I can see a bird.', exampleTranslation: 'Я вижу птицу.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-047', en: 'like', ru: 'нравиться', transcription: '/laɪk/', level: 'A1',
    example: 'I like to read books.', exampleTranslation: 'Мне нравится читать книги.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-048', en: 'have', ru: 'иметь', transcription: '/hæv/', level: 'A1',
    example: 'I have two brothers.', exampleTranslation: 'У меня два брата.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-049', en: 'want', ru: 'хотеть', transcription: '/wɒnt/', level: 'A1',
    example: 'I want some tea.', exampleTranslation: 'Я хочу чаю.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-050', en: 'sleep', ru: 'спать', transcription: '/sliːp/', level: 'A1',
    example: 'I sleep eight hours.', exampleTranslation: 'Я сплю восемь часов.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  // ───────────── A2 ─────────────
  {
    id: 'starter-051', en: 'although', ru: 'хотя', transcription: '/ɔːlˈðəʊ/', level: 'A2',
    example: 'We went out although it rained.', exampleTranslation: 'Мы вышли, хотя шёл дождь.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-052', en: 'weather', ru: 'погода', transcription: '/ˈweðə/', level: 'A2',
    example: 'The weather is nice today.', exampleTranslation: 'Сегодня хорошая погода.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-053', en: 'expensive', ru: 'дорогой', transcription: '/ɪkˈspensɪv/', level: 'A2',
    example: 'This watch is too expensive.', exampleTranslation: 'Эти часы слишком дорогие.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-054', en: 'cheap', ru: 'дешёвый', transcription: '/tʃiːp/', level: 'A2',
    example: 'The tickets are cheap.', exampleTranslation: 'Билеты дешёвые.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-055', en: 'rain', ru: 'дождь', transcription: '/reɪn/', level: 'A2',
    example: 'The rain stopped an hour ago.', exampleTranslation: 'Дождь прекратился час назад.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-056', en: 'snow', ru: 'снег', transcription: '/snəʊ/', level: 'A2',
    example: 'There is snow on the roof.', exampleTranslation: 'На крыше лежит снег.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-057', en: 'wind', ru: 'ветер', transcription: '/wɪnd/', level: 'A2',
    example: 'The wind is strong.', exampleTranslation: 'Ветер сильный.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-058', en: 'jacket', ru: 'куртка', transcription: '/ˈdʒækɪt/', level: 'A2',
    example: 'I need a warm jacket.', exampleTranslation: 'Мне нужна тёплая куртка.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-059', en: 'shirt', ru: 'рубашка', transcription: '/ʃɜːt/', level: 'A2',
    example: 'He wears a white shirt.', exampleTranslation: 'Он носит белую рубашку.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-060', en: 'shoes', ru: 'ботинки', transcription: '/ʃuːz/', level: 'A2',
    example: 'My shoes are new.', exampleTranslation: 'Мои ботинки новые.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-061', en: 'breakfast', ru: 'завтрак', transcription: '/ˈbrekfəst/', level: 'A2',
    example: 'We have breakfast at eight.', exampleTranslation: 'Мы завтракаем в восемь.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-062', en: 'dinner', ru: 'ужин', transcription: '/ˈdɪnə/', level: 'A2',
    example: 'Dinner is ready, come and eat.', exampleTranslation: 'Ужин готов, иди есть.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-063', en: 'kitchen', ru: 'кухня', transcription: '/ˈkɪtʃɪn/', level: 'A2',
    example: 'Mom is in the kitchen.', exampleTranslation: 'Мама на кухне.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-064', en: 'window', ru: 'окно', transcription: '/ˈwɪndəʊ/', level: 'A2',
    example: 'Open the window, please.', exampleTranslation: 'Откройте окно, пожалуйста.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-065', en: 'street', ru: 'улица', transcription: '/striːt/', level: 'A2',
    example: 'Our street is very quiet.', exampleTranslation: 'Наша улица очень тихая.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-066', en: 'city', ru: 'город', transcription: '/ˈsɪti/', level: 'A2',
    example: 'London is a big city.', exampleTranslation: 'Лондон — большой город.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-067', en: 'airport', ru: 'аэропорт', transcription: '/ˈeəpɔːt/', level: 'A2',
    example: 'The airport is far from here.', exampleTranslation: 'Аэропорт далеко отсюда.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-068', en: 'ticket', ru: 'билет', transcription: '/ˈtɪkɪt/', level: 'A2',
    example: 'I need a ticket to Paris.', exampleTranslation: 'Мне нужен билет в Париж.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-069', en: 'holiday', ru: 'отпуск', transcription: '/ˈhɒlədeɪ/', level: 'A2',
    example: 'We are on holiday in July.', exampleTranslation: 'Мы в отпуске в июле.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-070', en: 'travel', ru: 'путешествовать', transcription: '/ˈtrævl/', level: 'A2',
    example: 'I like to travel by train.', exampleTranslation: 'Я люблю путешествовать на поезде.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-071', en: 'buy', ru: 'покупать', transcription: '/baɪ/', level: 'A2',
    example: 'I want to buy a jacket.', exampleTranslation: 'Я хочу купить куртку.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-072', en: 'sell', ru: 'продавать', transcription: '/sel/', level: 'A2',
    example: 'They sell fresh fruit here.', exampleTranslation: 'Здесь продают свежие фрукты.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-073', en: 'learn', ru: 'учить', transcription: '/lɜːn/', level: 'A2',
    example: 'I learn ten new words a day.', exampleTranslation: 'Я учу десять новых слов в день.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-074', en: 'teach', ru: 'преподавать', transcription: '/tiːtʃ/', level: 'A2',
    example: 'She teaches English at school.', exampleTranslation: 'Она преподаёт английский в школе.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-075', en: 'understand', ru: 'понимать', transcription: '/ˌʌndəˈstænd/', level: 'A2',
    example: "I don't understand this question.", exampleTranslation: 'Я не понимаю этот вопрос.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-076', en: 'remember', ru: 'помнить', transcription: '/rɪˈmembə/', level: 'A2',
    example: 'Do you remember his name?', exampleTranslation: 'Ты помнишь его имя?',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-077', en: 'forget', ru: 'забывать', transcription: '/fəˈɡet/', level: 'A2',
    example: "Don't forget your keys.", exampleTranslation: 'Не забудь ключи.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-078', en: 'wait', ru: 'ждать', transcription: '/weɪt/', level: 'A2',
    example: 'Please wait here a minute.', exampleTranslation: 'Пожалуйста, подождите здесь минуту.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-079', en: 'call', ru: 'звонить', transcription: '/kɔːl/', level: 'A2',
    example: 'I will call you tonight.', exampleTranslation: 'Я позвоню тебе сегодня вечером.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-080', en: 'answer', ru: 'ответ', transcription: '/ˈɑːnsə/', level: 'A2',
    example: "I don't know the answer.", exampleTranslation: 'Я не знаю ответа.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-081', en: 'question', ru: 'вопрос', transcription: '/ˈkwestʃən/', level: 'A2',
    example: 'Can I ask a question?', exampleTranslation: 'Можно задать вопрос?',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-082', en: 'problem', ru: 'проблема', transcription: '/ˈprɒbləm/', level: 'A2',
    example: 'We have a small problem.', exampleTranslation: 'У нас небольшая проблема.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-083', en: 'easy', ru: 'лёгкий', transcription: '/ˈiːzi/', level: 'A2',
    example: 'The test was easy.', exampleTranslation: 'Тест был лёгким.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-084', en: 'difficult', ru: 'трудный', transcription: '/ˈdɪfɪkəlt/', level: 'A2',
    example: 'Chinese is difficult for me.', exampleTranslation: 'Китайский язык труден для меня.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-085', en: 'important', ru: 'важный', transcription: '/ɪmˈpɔːtənt/', level: 'A2',
    example: 'Health is very important.', exampleTranslation: 'Здоровье очень важно.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-086', en: 'different', ru: 'разный', transcription: '/ˈdɪfrənt/', level: 'A2',
    example: 'These two bags are different.', exampleTranslation: 'Эти две сумки разные.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-087', en: 'beautiful', ru: 'красивый', transcription: '/ˈbjuːtɪfl/', level: 'A2',
    example: 'What a beautiful garden!', exampleTranslation: 'Какой красивый сад!',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-088', en: 'tired', ru: 'уставший', transcription: '/ˈtaɪəd/', level: 'A2',
    example: 'I am tired after work.', exampleTranslation: 'Я устал после работы.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-089', en: 'hungry', ru: 'голодный', transcription: '/ˈhʌŋɡri/', level: 'A2',
    example: "I am hungry. Let's eat!", exampleTranslation: 'Я голоден. Давай поедим!',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-090', en: 'busy', ru: 'занятой', transcription: '/ˈbɪzi/', level: 'A2',
    example: 'She is busy at the moment.', exampleTranslation: 'В данный момент она занята.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-091', en: 'early', ru: 'рано', transcription: '/ˈɜːli/', level: 'A2',
    example: 'I get up early on Monday.', exampleTranslation: 'В понедельник я встаю рано.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-092', en: 'late', ru: 'поздно', transcription: '/leɪt/', level: 'A2',
    example: 'We arrived late for dinner.', exampleTranslation: 'Мы приехали к ужину поздно.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-093', en: 'sometimes', ru: 'иногда', transcription: '/ˈsʌmtaɪmz/', level: 'A2',
    example: 'Sometimes I walk to work.', exampleTranslation: 'Иногда я хожу на работу пешком.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-094', en: 'always', ru: 'всегда', transcription: '/ˈɔːlweɪz/', level: 'A2',
    example: 'He always drinks tea.', exampleTranslation: 'Он всегда пьёт чай.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-095', en: 'never', ru: 'никогда', transcription: '/ˈnevə/', level: 'A2',
    example: 'I never eat meat.', exampleTranslation: 'Я никогда не ем мясо.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-096', en: 'together', ru: 'вместе', transcription: '/təˈɡeðə/', level: 'A2',
    example: 'We study English together.', exampleTranslation: 'Мы вместе изучаем английский.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-097', en: 'because', ru: 'потому что', transcription: '/bɪˈkɒz/', level: 'A2',
    example: 'I stay home because it is raining.', exampleTranslation: 'Я сижу дома, потому что идёт дождь.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-098', en: 'tomorrow', ru: 'завтра', transcription: '/təˈmɒrəʊ/', level: 'A2',
    example: 'We meet tomorrow at nine.', exampleTranslation: 'Мы встречаемся завтра в девять.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-099', en: 'yesterday', ru: 'вчера', transcription: '/ˈjestədeɪ/', level: 'A2',
    example: 'I called him yesterday.', exampleTranslation: 'Я звонил ему вчера.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
  {
    id: 'starter-100', en: 'money', ru: 'деньги', transcription: '/ˈmʌni/', level: 'A2',
    example: "I don't have much money.", exampleTranslation: 'У меня мало денег.',
    status: 'new', correctCount: 0, wrongCount: 0,
  },
];
