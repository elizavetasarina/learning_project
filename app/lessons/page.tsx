import Link from "next/link";
import { ChevronLeft, HelpCircle } from "lucide-react";
import { getAllLessons } from "@/lib/lessons";

export default async function LessonsPage() {
  const lessons = await getAllLessons();

  return (
    <main className="flex flex-col gap-5 px-4 py-6">
      {/* Навигация назад */}
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-hint transition-opacity active:opacity-70"
      >
        <ChevronLeft size={18} />
        Главная
      </Link>

      <h1 className="text-[22px] font-semibold leading-tight">Все уроки</h1>

      {lessons.length === 0 && (
        <p className="text-hint">Пока нет уроков</p>
      )}

      <ul className="flex flex-col gap-3">
        {lessons.map((lesson) => {
          // Заглушка прогресса — заменим на реальные данные из БД на неделе 2
          const progress = 0;

          return (
            <li key={lesson.slug}>
              <Link
                href={`/lessons/${lesson.slug}`}
                className="block rounded-xl bg-secondary-bg p-5 transition-all active:scale-[0.98]"
              >
                <h2 className="text-[16px] font-semibold">{lesson.title}</h2>
                <p className="mt-1 text-sm leading-snug text-hint">
                  {lesson.description}
                </p>

                {/* Мета-информация: количество вопросов */}
                {lesson.questionCount > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-hint">
                    <HelpCircle size={14} />
                    <span>{lesson.questionCount} {getQuestionsWord(lesson.questionCount)}</span>
                  </div>
                )}

                {/* Прогресс-бар */}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

/** Склонение слова "вопрос" */
function getQuestionsWord(n: number): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs >= 11 && abs <= 19) return "вопросов";
  if (lastDigit === 1) return "вопрос";
  if (lastDigit >= 2 && lastDigit <= 4) return "вопроса";
  return "вопросов";
}
