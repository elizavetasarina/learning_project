"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, BookOpen, ChevronRight, Trophy } from "lucide-react";
import { useTelegram } from "@/hooks/use-telegram";
import { WeekStreak } from "./week-streak";
import { fetchProgress, type LessonProgressData } from "@/hooks/use-api";
import type { LessonMeta } from "@/types/content";

interface HomeContentProps {
  /** Все уроки — для подсчёта статистики и карточки "Продолжить" */
  lessons: LessonMeta[];
}

export function HomeContent({ lessons }: HomeContentProps) {
  const { user, isReady } = useTelegram();

  // Прогресс из API. null = ещё загружается.
  const [progressMap, setProgressMap] = useState<Map<
    string,
    LessonProgressData
  > | null>(null);

  useEffect(() => {
    async function loadProgress() {
      const result = await fetchProgress();
      if (result.ok) {
        const map = new Map(
          result.data.progress.map((p) => [p.lessonSlug, p])
        );
        setProgressMap(map);
      }
    }
    loadProgress();
  }, []);

  if (!isReady) return null;

  const displayName = user?.first_name ?? "Гость";

  // Считаем реальную статистику из прогресса
  const completedSlugs = progressMap
    ? Array.from(progressMap.values()).filter((p) => p.status === "COMPLETED")
    : [];
  const completedCount = completedSlugs.length;

  // "Продолжить" — первый урок, который ещё не пройден.
  // Если все пройдены — показываем первый (для повторного прохождения).
  const nextLesson =
    lessons.find((l) => !progressMap?.has(l.slug)) ?? lessons[0] ?? null;

  // Стрик — пока заглушка (нужна логика подсчёта по lastActivityAt,
  // реализуем на неделе 4 — геймификация). Показываем 0 если нет данных.
  const streak = { current: 0, best: 0 };

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6">
      {/* Приветствие */}
      <div>
        <p className="text-sm text-hint">Добро пожаловать</p>
        <h1 className="text-[28px] font-bold leading-tight">
          Привет, {displayName}!
        </h1>
      </div>

      {/* Трекер недели — стрик */}
      <WeekStreak currentStreak={streak.current} />

      {/* Карточка "Продолжить обучение" */}
      {nextLesson && (
        <Link
          href={`/lessons/${nextLesson.slug}`}
          className="flex items-center gap-4 rounded-xl bg-accent p-5 text-accent-text transition-opacity active:opacity-90"
        >
          <BookOpen size={24} />
          <div className="flex-1">
            <p className="text-sm opacity-80">Продолжить</p>
            <p className="font-semibold">{nextLesson.title}</p>
          </div>
          <ChevronRight size={20} />
        </Link>
      )}

      {/* Мини-статистика */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 rounded-xl bg-secondary-bg p-4">
          <BookOpen size={20} className="text-accent" />
          <span className="text-lg font-bold">
            {completedCount}/{lessons.length}
          </span>
          <span className="text-xs text-hint">Уроков</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl bg-secondary-bg p-4">
          <Flame size={20} className="text-warning" />
          <span className="text-lg font-bold">{streak.current}</span>
          <span className="text-xs text-hint">Стрик</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl bg-secondary-bg p-4">
          <Trophy size={20} className="text-accent-light" />
          <span className="text-lg font-bold">{streak.best}</span>
          <span className="text-xs text-hint">Лучший</span>
        </div>
      </div>

      {/* Кнопки навигации */}
      <div className="flex flex-col gap-3">
        <Link
          href="/lessons"
          className="flex h-12 items-center justify-center rounded-xl bg-accent px-6 font-semibold text-accent-text transition-all active:scale-[0.97]"
        >
          Все уроки
        </Link>
        <Link
          href="/progress"
          className="flex h-12 items-center justify-center rounded-xl border border-border/30 px-6 font-semibold transition-all active:scale-[0.97]"
        >
          Мой прогресс
        </Link>
      </div>
    </main>
  );
}
