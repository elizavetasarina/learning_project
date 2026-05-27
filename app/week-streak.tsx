"use client";

import { Flame } from "lucide-react";

interface WeekStreakProps {
  currentStreak: number;
}

// Сокращённые названия дней — русские, как в Telegram
const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function WeekStreak({ currentStreak }: WeekStreakProps) {
  // Какой сегодня день недели (0 = Пн, 6 = Вс).
  // JS Date.getDay() возвращает 0 = Вс, поэтому сдвигаем.
  const jsDay = new Date().getDay();
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1;

  // Заглушка: отмечаем последние N дней как активные (N = currentStreak).
  // В реальности данные будут приходить из БД.
  const activeDays = new Set<number>();
  for (let i = 0; i < currentStreak; i++) {
    const dayIndex = todayIndex - i;
    if (dayIndex >= 0) activeDays.add(dayIndex);
  }

  return (
    <div className="rounded-xl bg-secondary-bg p-4">
      {/* Заголовок со стриком */}
      <div className="mb-3 flex items-center gap-2">
        <Flame size={18} className="text-warning" />
        <span className="text-sm font-semibold">
          {currentStreak} {getDaysWord(currentStreak)} подряд
        </span>
      </div>

      {/* Кружки дней недели */}
      <div className="flex justify-between">
        {DAYS.map((day, index) => {
          const isActive = activeDays.has(index);
          const isToday = index === todayIndex;

          return (
            <div key={day} className="flex flex-col items-center gap-1.5">
              <span className="text-xs text-hint">{day}</span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-accent text-accent-text"
                    : isToday
                      ? "ring-2 ring-accent text-foreground"
                      : "bg-foreground/10 text-hint"
                }`}
              >
                {isActive ? "✓" : index + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Склонение слова "день" для русского языка */
function getDaysWord(n: number): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs >= 11 && abs <= 19) return "дней";
  if (lastDigit === 1) return "день";
  if (lastDigit >= 2 && lastDigit <= 4) return "дня";
  return "дней";
}
