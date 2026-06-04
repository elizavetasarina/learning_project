import { getModulesWithLessons } from "@/lib/lessons";
import { LessonsList } from "./lessons-list";

/**
 * Страница списка уроков — серверный компонент.
 *
 * Читает модули с уроками из файловой системы и передаёт
 * в клиентский LessonsList, который добавляет прогресс из API.
 *
 * Группировка идёт на стороне сервера через getModulesWithLessons —
 * клиенту не нужно знать о структуре папок.
 */
export default async function LessonsPage() {
  const modules = await getModulesWithLessons();

  return (
    <main className="flex flex-col gap-5 px-4 pb-24 pt-6">
      <h1 className="text-[22px] font-semibold leading-tight">Все уроки</h1>

      {modules.length === 0 ? (
        <p className="text-hint">Пока нет уроков</p>
      ) : (
        <LessonsList modules={modules} />
      )}
    </main>
  );
}
