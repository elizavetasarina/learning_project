"use client";

import Link from "next/link";
import { Flame, BookOpen, ChevronRight, Trophy } from "lucide-react";
import { useTelegram } from "@/hooks/use-telegram";
import { WeekStreak } from "./week-streak";
import type { LessonMeta } from "@/types/content";

interface HomeContentProps {
  /** Все уроки — для подсчёта статистики и карточки "Продолжить" */
  lessons: LessonMeta[];
}

export function HomeContent({ lessons }: HomeContentProps) {
  const { user, isReady } = useTelegram();

  if (!isReady) return null;

  const displayName = user?.first_name ?? "Гость";

  // Пока нет БД — захардкоженные данные для визуала.
  // Заменим на реальные на неделе 2.
  const streak = { current: 3, best: 7 };
  const completedCount = 0;

  // "Продолжить" — первый незавершённый урок (пока все незавершены)
  const nextLesson = lessons[0] ?? null;

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
          <span className="text-lg font-bold">{completedCount}/{lessons.length}</span>
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

      {/* Ссылка ко всем урокам */}
      <Link
        href="/lessons"
        className="flex h-12 items-center justify-center rounded-xl bg-accent px-6 font-semibold text-accent-text transition-all active:scale-[0.97]"
      >
        Все уроки
      </Link>
    </main>
  );
}
