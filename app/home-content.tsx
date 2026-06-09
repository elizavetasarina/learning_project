"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flame, BookOpen, ChevronRight, Trophy, Zap, Target, Check, RotateCcw, Pencil } from "lucide-react";
import { useTelegram } from "@/hooks/use-telegram";
import { useProgressStore } from "@/store/progress";
import { getLevel, getLevelProgress, xpForLevel } from "@/lib/xp";
import { pluralize } from "@/lib/pluralize";
import * as haptic from "@/lib/haptic";
import { useAnimatedCount } from "@/hooks/use-animated-count";
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

  // Триггер haptic.success() в момент пересечения порога цели.
  // Сравниваем предыдущее значение с текущим — вибрация только на ПЕРЕХОДЕ,
  // не при каждом рендере с выполненной целью.
  const goalReachedBefore = useRef<boolean | null>(null);
  useEffect(() => {
    if (!userData) return;
    const reached = userData.dailyXp >= userData.dailyGoal;
    if (goalReachedBefore.current === false && reached) {
      haptic.success();
    }
    goalReachedBefore.current = reached;
  }, [userData]);

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
  // Анимированное число XP: при изменении dailyXp число «прокручивается»
  const animatedDailyXp = useAnimatedCount(dailyXp);

  // Модалка редактирования цели
  const [editing, setEditing] = useState(false);

  return (
    <>
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-hint">
              {animatedDailyXp} / {dailyGoal} XP
            </span>
            {/* Кнопка-карандаш для редактирования цели */}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-hint transition-colors active:bg-foreground/10"
              aria-label="Изменить дневную цель"
            >
              <Pencil size={14} />
            </button>
          </div>
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

      {editing && (
        <DailyGoalEditor
          currentGoal={dailyGoal}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

// ─── Модалка редактирования цели ────────────────────────────

const MIN_GOAL = 10;
const MAX_GOAL = 500;

function DailyGoalEditor({
  currentGoal,
  onClose,
}: {
  currentGoal: number;
  onClose: () => void;
}) {
  const setDailyGoal = useProgressStore((s) => s.setDailyGoal);
  const [value, setValue] = useState(String(currentGoal));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const parsed = Number(value);
    if (
      !Number.isInteger(parsed) ||
      parsed < MIN_GOAL ||
      parsed > MAX_GOAL
    ) {
      setError(`Целое число от ${MIN_GOAL} до ${MAX_GOAL}`);
      return;
    }
    setSaving(true);
    const err = await setDailyGoal(parsed);
    setSaving(false);
    if (err) {
      haptic.error();
      setError(err);
      return;
    }
    haptic.success();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
            <Target size={24} className="text-warning" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-[18px] font-bold">
          Дневная цель
        </h2>
        <p className="mt-1 text-center text-[13px] text-hint">
          Сколько XP в день? Минимум {MIN_GOAL}, максимум {MAX_GOAL}.
        </p>
        <div className="mt-5">
          <input
            type="number"
            inputMode="numeric"
            min={MIN_GOAL}
            max={MAX_GOAL}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            className="h-12 w-full rounded-xl border border-border/30 bg-secondary-bg px-4 text-center text-[20px] font-semibold outline-none transition-colors focus:border-accent"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-center text-[13px] text-error">{error}</p>
          )}
        </div>
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="h-12 rounded-xl bg-accent font-semibold text-accent-text transition-all disabled:opacity-60 active:scale-[0.97]"
          >
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl bg-secondary-bg font-semibold transition-all active:scale-[0.97]"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── XP-карточка ────────────────────────────────────────────

function XpCard({ totalXp }: { totalXp: number }) {
  const level = getLevel(totalXp);
  const progress = getLevelProgress(totalXp);
  const nextLevelXp = xpForLevel(level + 1);
  // Анимация: число в шапке плавно прокручивается до новой суммы XP
  const animatedTotal = useAnimatedCount(totalXp);

  return (
    <div className="rounded-xl bg-secondary-bg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-accent" />
          <span className="text-sm font-semibold">Уровень {level}</span>
        </div>
        <span className="text-xs text-hint">
          {animatedTotal} / {nextLevelXp} XP
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
