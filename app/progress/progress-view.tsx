"use client";

import Link from "next/link";
import {
  BookOpen,
  Trophy,
  Target,
  CheckCircle,
  Circle,
  ArrowRight,
} from "lucide-react";
import type { LessonMeta } from "@/types/content";
import { useProgress } from "@/hooks/use-progress";
import { pluralize } from "@/lib/pluralize";

interface ProgressViewProps {
  lessons: LessonMeta[];
}

/**
 * Клиентский компонент — визуализация прогресса.
 *
 * Показывает:
 * 1. Общую статистику (пройдено / всего, средний балл, лучший)
 * 2. Общий прогресс-бар
 * 3. Детальный список по каждому уроку
 */
export function ProgressView({ lessons }: ProgressViewProps) {
  const { progressMap, isLoading } = useProgress();

  // ─── Подсчёт статистики ───────────────────────────────────

  const completedLessons = progressMap
    ? Array.from(progressMap.values()).filter((p) => p.status === "COMPLETED")
    : [];

  const completedCount = completedLessons.length;
  const totalCount = lessons.length;
  const overallPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Средний балл по пройденным урокам
  const scores = completedLessons
    .map((p) => p.bestScore)
    .filter((s): s is number => s !== null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;

  // Лучший результат
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  // ─── Скелетон загрузки ────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {/* Анимированные плейсхолдеры */}
        <div className="h-20 animate-pulse rounded-xl bg-secondary-bg" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 animate-pulse rounded-xl bg-secondary-bg" />
          <div className="h-24 animate-pulse rounded-xl bg-secondary-bg" />
          <div className="h-24 animate-pulse rounded-xl bg-secondary-bg" />
        </div>
        <div className="h-16 animate-pulse rounded-xl bg-secondary-bg" />
        <div className="h-16 animate-pulse rounded-xl bg-secondary-bg" />
        <div className="h-16 animate-pulse rounded-xl bg-secondary-bg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ─── Общий прогресс-бар ─── */}
      <div className="rounded-xl bg-secondary-bg p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-hint">Общий прогресс</span>
          <span className="text-sm font-semibold">{overallPercent}%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-hint">
          {completedCount} из {totalCount}{" "}
          {pluralize(totalCount, "урок", "урока", "уроков")} пройдено
        </p>
      </div>

      {/* ─── Мини-статистика ─── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1.5 rounded-xl bg-secondary-bg p-4">
          <BookOpen size={20} className="text-accent" />
          <span className="text-lg font-bold">
            {completedCount}/{totalCount}
          </span>
          <span className="text-xs text-hint">Пройдено</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-xl bg-secondary-bg p-4">
          <Target size={20} className="text-warning" />
          <span className="text-lg font-bold">{avgScore}%</span>
          <span className="text-xs text-hint">Средний</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-xl bg-secondary-bg p-4">
          <Trophy size={20} className="text-accent-light" />
          <span className="text-lg font-bold">{bestScore}%</span>
          <span className="text-xs text-hint">Лучший</span>
        </div>
      </div>

      {/* ─── Список уроков ─── */}
      <h2 className="text-[16px] font-semibold">По урокам</h2>

      <ul className="flex flex-col gap-2.5">
        {lessons.map((lesson) => {
          const progress = progressMap?.get(lesson.slug);
          const isCompleted = progress?.status === "COMPLETED";
          const score = progress?.bestScore;
          const attempts = progress?.attemptsCount ?? 0;

          return (
            <li key={lesson.slug}>
              <Link
                href={`/lessons/${lesson.slug}`}
                className="flex items-center gap-3 rounded-xl bg-secondary-bg p-4 transition-all active:scale-[0.98]"
              >
                {/* Иконка статуса */}
                {isCompleted ? (
                  <CheckCircle size={22} className="shrink-0 text-success" />
                ) : (
                  <Circle size={22} className="shrink-0 text-hint/40" />
                )}

                {/* Инфо */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold leading-snug truncate">
                    {lesson.title}
                  </p>
                  {isCompleted && score !== null ? (
                    <p className="mt-0.5 text-xs text-hint">
                      Лучший: {score}% · {attempts}{" "}
                      {pluralize(attempts, "попытка", "попытки", "попыток")}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-hint">Не пройден</p>
                  )}
                </div>

                {/* Стрелка */}
                <ArrowRight size={16} className="shrink-0 text-hint/40" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

