import { HashRouter, Route, Routes } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import DictionaryPage from '@/pages/DictionaryPage';
import FlashcardsPage from '@/pages/FlashcardsPage';
import HomePage from '@/pages/HomePage';
import ListeningPage from '@/pages/ListeningPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ProgressPage from '@/pages/ProgressPage';
import QuizPage from '@/pages/QuizPage';

/**
 * HashRouter (адреса вида /#/quiz): обновление страницы не даёт 404 на статическом
 * хостинге вроде GitHub Pages, где нет перенаправления всех путей на index.html.
 */
export default function App() {
  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <Navbar />
        {/* Нижний отступ на узких экранах — чтобы таб-панель не перекрывала контент */}
        <main className="flex-1 pb-28 lg:pb-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/listening" element={<ListeningPage />} />
            <Route path="/dictionary" element={<DictionaryPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
