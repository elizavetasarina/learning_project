"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HelpCircle, CheckCircle } from "lucide-react";
import type { LessonMeta } from "@/types/content";
import { fetchProgress, type LessonProgressData } from "@/hooks/use-api";

interface LessonsListProps {
  lessons: LessonMeta[];
}

/**
 * Клиентский компонент — список уроков с реальным прогрессом.
 *
 * Зачем отдельный клиентский компонент:
 * Список уроков (LessonMeta[]) приходит из серверного компонента (page.tsx),
 * где мы читаем файлы. Прогресс приходит из API (нужен window.Telegram).
 * Разделение: сервер готовит данные → клиент добавляет прогресс.
 */
export function LessonsList({ lessons }: LessonsListProps) {
  // Map: lessonSlug → прогресс. null = ещё не загрузили.
  const [progressMap, setProgressMap] = useState<Map<
    string,
    LessonProgressData
  > | null>(null);

  useEffect(() => {
    async function loadProgress() {
      const result = await fetchProgress();
      if (result.ok) {
        // Преобразуем массив в Map для быстрого поиска по slug: O(1) вместо O(n)
        const map = new Map(
          result.data.progress.map((p) => [p.lessonSlug, p])
        );
        setProgressMap(map);
      }
    }
    loadProgress();
  }, []);

  return (
    <ul className="flex flex-col gap-3">
      {lessons.map((lesson) => {
        const progress = progressMap?.get(lesson.slug);
        const isCompleted = progress?.status === "COMPLETED";
        const scorePercent = progress?.bestScore ?? 0;

        return (
          <li key={lesson.slug}>
            <Link
              href={`/lessons/${lesson.slug}`}
              className="block rounded-xl bg-secondary-bg p-5 transition-all active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[16px] font-semibold">{lesson.title}</h2>
                {/* Галочка завершения */}
                {isCompleted && (
                  <CheckCircle size={20} className="shrink-0 text-success" />
                )}
              </div>
              <p className="mt-1 text-sm leading-snug text-hint">
                {lesson.description}
              </p>

              {/* Мета: кол-во вопросов + лучший результат */}
              <div className="mt-3 flex items-center gap-3 text-xs text-hint">
                {lesson.questionCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <HelpCircle size={14} />
                    <span>
                      {lesson.questionCount}{" "}
                      {getQuestionsWord(lesson.questionCount)}
                    </span>
                  </div>
                )}
                {isCompleted && progress.bestScore !== null && (
                  <span className="text-accent font-medium">
                    Лучший: {progress.bestScore}%
                  </span>
                )}
              </div>

              {/* Прогресс-бар */}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
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
