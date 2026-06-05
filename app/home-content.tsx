"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Flame, BookOpen, ChevronRight, Trophy, Zap, Target, Check, RotateCcw } from "lucide-react";
import { useTelegram } from "@/hooks/use-telegram";
import { useProgressStore } from "@/store/progress";
import { getLevel, getLevelProgress, xpForLevel } from "@/lib/xp";
import { pluralize } from "@/lib/pluralize";
import { WeekStreak } from "./week-streak";
import type { LessonMeta } from "@/types/content";

interface HomeContentProps {
  /** Все уроки — для подсчёта статистики и карточки "Продолжить" */
  lessons: LessonMeta[];
}

export function HomeContent({ lessons }: HomeContentProps) {
  const { user, isReady } = useTelegram();

  // Zustand: точечная подписка — перерендер только если progressMap изменился
  const progressMap = useProgressStore((s) => s.progressMap);
  const userData = useProgressStore((s) => s.userData);
  const dueCount = useProgressStore((s) => s.dueCount);
  const load = useProgressStore((s) => s.load);

  // Загружаем прогресс при первом рендере (load внутри проверяет: если уже загружен — пропускает)
  useEffect(() => { load(); }, [load]);

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

  // Стрик из API (считается на сервере в authenticateRequest)
  const streak = {
    current: userData?.currentStreak ?? 0,
    best: userData?.longestStreak ?? 0,
  };

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pb-24 pt-6">
      {/* Приветствие */}
      <div>
        <p className="text-sm text-hint">Добро пожаловать</p>
        <h1 className="text-[28px] font-bold leading-tight">
          Привет, {displayName}!
        </h1>
      </div>

      {/* Трекер недели — стрик */}
      <WeekStreak currentStreak={streak.current} />

      {/* Уровень и XP */}
      {userData && <XpCard totalXp={userData.totalXp} />}

      {/* Дневная цель */}
      {userData && (
        <DailyGoalCard dailyXp={userData.dailyXp} dailyGoal={userData.dailyGoal} />
      )}

      {/* Карточка "К повтору сегодня" — показываем только если есть что повторять.
          Это главный CTA для удержания: SR работает, только если юзер реально
          приходит закрывать «долги» по карточкам. */}
      {dueCount > 0 && (
        <Link
          href="/review"
          className="flex items-center gap-4 rounded-xl border border-warning/30 bg-warning/10 p-5 transition-all active:scale-[0.97]"
        >
          <RotateCcw size={24} className="text-warning" />
          <div className="flex-1">
            <p className="text-sm text-hint">К повтору сегодня</p>
            <p className="font-semibold text-warning">
              {dueCount} {pluralize(dueCount, "вопрос", "вопроса", "вопросов")}
            </p>
          </div>
          <ChevronRight size={20} className="text-warning" />
        </Link>
      )}

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

    </main>
  );
}

// ─── Дневная цель ───────────────────────────────────────────

function DailyGoalCard({ dailyXp, dailyGoal }: { dailyXp: number; dailyGoal: number }) {
  const reached = dailyXp >= dailyGoal;
  const percent = Math.min(Math.round((dailyXp / dailyGoal) * 100), 100);

  return (
    <div className="rounded-xl bg-secondary-bg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {reached ? (
            <Check size={18} className="text-success" />
          ) : (
            <Target size={18} className="text-warning" />
          )}
          <span className="text-sm font-semibold">
            {reached ? "Цель выполнена!" : "Цель на сегодня"}
          </span>
        </div>
        <span className="text-xs text-hint">
          {dailyXp} / {dailyGoal} XP
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            reached
              ? "bg-success"
              : "bg-gradient-to-r from-warning to-warning/70"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ─── XP-карточка ────────────────────────────────────────────

function XpCard({ totalXp }: { totalXp: number }) {
  const level = getLevel(totalXp);
  const progress = getLevelProgress(totalXp);
  const nextLevelXp = xpForLevel(level + 1);

  return (
    <div className="rounded-xl bg-secondary-bg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-accent" />
          <span className="text-sm font-semibold">Уровень {level}</span>
        </div>
        <span className="text-xs text-hint">
          {totalXp} / {nextLevelXp} XP
        </span>
      </div>
      {/* Прогресс-бар до следующего уровня */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
