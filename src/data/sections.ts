import {
  BarChart3,
  BookOpen,
  Headphones,
  Home,
  Layers,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';

export interface Section {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** Разделы приложения: один источник для навигации и карточек на главной. */
export const SECTIONS: readonly Section[] = [
  {
    to: '/',
    label: 'Главная',
    description: 'Статистика и быстрый старт',
    icon: Home,
  },
  {
    to: '/flashcards',
    label: 'Карточки',
    description: 'Переворачивайте карточки и отмечайте, что знаете',
    icon: Layers,
  },
  {
    to: '/quiz',
    label: 'Тест',
    description: 'Выберите правильный перевод из четырёх вариантов',
    icon: ListChecks,
  },
  {
    to: '/listening',
    label: 'Аудио',
    description: 'Слушайте слово и вспоминайте, что оно значит',
    icon: Headphones,
  },
  {
    to: '/dictionary',
    label: 'Словарь',
    description: 'Все слова, поиск и ваши собственные добавления',
    icon: BookOpen,
  },
  {
    to: '/progress',
    label: 'Прогресс',
    description: 'Серия занятий, график и точность ответов',
    icon: BarChart3,
  },
];
