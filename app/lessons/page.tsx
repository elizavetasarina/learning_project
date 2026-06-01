import { getAllLessons } from "@/lib/lessons";
import { LessonsList } from "./lessons-list";

/**
 * Страница списка уроков — серверный компонент.
 *
 * Читает уроки из файловой системы (быстро, на сервере),
 * передаёт в клиентский LessonsList, который подтягивает
 * прогресс из API (нужен window.Telegram для initData).
 */
export default async function LessonsPage() {
  const lessons = await getAllLessons();

  return (
    <main className="flex flex-col gap-5 px-4 pb-24 pt-6">
      <h1 className="text-[22px] font-semibold leading-tight">Все уроки</h1>

      {lessons.length === 0 ? (
        <p className="text-hint">Пока нет уроков</p>
      ) : (
        <LessonsList lessons={lessons} />
      )}
    </main>
  );
}
