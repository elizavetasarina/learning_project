import { getAllLessons } from "@/lib/lessons";
import { ProgressView } from "./progress-view";

/**
 * Страница «Мой прогресс» — серверный компонент.
 * Читает список уроков из файлов, передаёт в клиентский ProgressView,
 * который подтягивает реальный прогресс из API.
 */
export default async function ProgressPage() {
  const lessons = await getAllLessons();

  return (
    <main className="flex flex-col gap-6 px-4 pb-24 pt-6">
      <h1 className="text-[22px] font-bold leading-tight">Мой прогресс</h1>

      <ProgressView lessons={lessons} />
    </main>
  );
}
