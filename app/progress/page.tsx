import { ChevronLeft } from "lucide-react";
import { getAllLessons } from "@/lib/lessons";
import { ProgressView } from "./progress-view";
import Link from "next/link";

/**
 * Страница «Мой прогресс» — серверный компонент.
 * Читает список уроков из файлов, передаёт в клиентский ProgressView,
 * который подтягивает реальный прогресс из API.
 */
export default async function ProgressPage() {
  const lessons = await getAllLessons();

  return (
    <main className="flex flex-col gap-6 px-4 py-6">
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-hint transition-opacity active:opacity-70"
      >
        <ChevronLeft size={18} />
        Главная
      </Link>

      <h1 className="text-[22px] font-bold leading-tight">Мой прогресс</h1>

      <ProgressView lessons={lessons} />
    </main>
  );
}
