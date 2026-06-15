"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Trophy,
  Target,
  CheckCircle,
  Circle,
  ArrowRight,
  Zap,
} from "lucide-react";
import type { LessonMeta } from "@/types/content";
import { useProgressStore } from "@/store/progress";
import { pluralize } from "@/lib/pluralize";
import type { LeaderboardEntry, AchievementData } from "@/lib/api-client";

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
 * 4. Таблица лидеров
 */
export function ProgressView({ lessons }: ProgressViewProps) {
  const progressMap = useProgressStore((s) => s.progressMap);
  const isLoading = useProgressStore((s) => s.isLoading);
  const load = useProgressStore((s) => s.load);
  const leaderboard = useProgressStore((s) => s.leaderboard);
  const achievements = useProgressStore((s) => s.achievements);
  const loadExtras = useProgressStore((s) => s.loadExtras);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadExtras(); }, [loadExtras]);

  // ─── Подсчёт статистики ───────────────────────────────────

  const completedLessons = progressMap
    ? Array.from(progressMap.values()).filter((p) => p.status === "COMPLETED")
    : [];

  const completedCount = completedLessons.length;
  const totalCount = lessons.length;
  const overallPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const scores = completedLessons
    .map((p) => p.bestScore)
    .filter((s): s is number => s !== null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  // ─── Скелетон загрузки ────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
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
                {isCompleted ? (
                  <CheckCircle size={22} className="shrink-0 text-success" />
                ) : (
                  <Circle size={22} className="shrink-0 text-hint/40" />
                )}

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

                <ArrowRight size={16} className="shrink-0 text-hint/40" />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ─── Ачивки ─── */}
      <h2 className="text-[16px] font-semibold">Достижения</h2>

      {!achievements ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary-bg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
        </div>
      )}

      {/* ─── Таблица лидеров ─── */}
      <h2 className="text-[16px] font-semibold">Рейтинг</h2>

      {!leaderboard ? (
        // Скелетон пока грузится
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary-bg" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 pb-6">
          {leaderboard.top.map((entry) => (
            <LeaderboardRow key={entry.rank} entry={entry} />
          ))}

          {/* Текущий юзер за топ-20 — закреплённая карточка */}
          {leaderboard.me && (
            <div className="mt-2 rounded-xl border border-accent/30 bg-accent/10 p-4">
              <div className="flex items-center gap-3">
                <span className="w-7 text-center text-sm font-bold text-accent">
                  #{leaderboard.me.rank}
                </span>
                <span className="flex-1 text-[14px] font-semibold">
                  {leaderboard.me.firstName}
                  {leaderboard.me.username && (
                    <span className="ml-1.5 text-xs font-normal text-hint">
                      @{leaderboard.me.username}
                    </span>
                  )}
                  <span className="ml-1.5 text-xs font-normal text-accent">
                    · это ты
                  </span>
                </span>
                <span className="flex items-center gap-1 text-sm font-bold">
                  <Zap size={14} className="text-accent" />
                  {leaderboard.me.totalXp}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Карточка ачивки ─────────────────────────────────────────

function AchievementCard({ achievement: a }: { achievement: AchievementData }) {
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl p-4 transition-opacity ${
        a.unlocked ? "bg-secondary-bg" : "bg-secondary-bg opacity-40"
      }`}
    >
      <span className="text-2xl">{a.emoji}</span>
      <p className={`text-[13px] font-semibold leading-snug ${a.unlocked ? "" : "text-hint"}`}>
        {a.title}
      </p>
      <p className="text-[11px] leading-snug text-hint">{a.description}</p>
    </div>
  );
}

// ─── Строка лидерборда ───────────────────────────────────────

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const medal = MEDALS[entry.rank];

  return (
    <div
      className={`flex items-center gap-3 rounded-xl p-4 ${
        entry.isMe
          ? "border border-accent/30 bg-accent/10"
          : "bg-secondary-bg"
      }`}
    >
      {/* Место */}
      <span className="w-7 text-center text-sm font-bold">
        {medal ?? `#${entry.rank}`}
      </span>

      {/* Имя */}
      <span className="flex-1 text-[14px] font-semibold">
        {entry.firstName}
        {entry.username && (
          <span className="ml-1.5 text-xs font-normal text-hint">
            @{entry.username}
          </span>
        )}
        {entry.isMe && (
          <span className="ml-1.5 text-xs font-normal text-accent">
            · это ты
          </span>
        )}
      </span>

      {/* XP */}
      <span className="flex items-center gap-1 text-sm font-bold">
        <Zap size={14} className="text-accent" />
        {entry.totalXp}
      </span>
    </div>
  );
}
