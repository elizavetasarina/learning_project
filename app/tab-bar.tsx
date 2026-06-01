"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, BarChart3 } from "lucide-react";

/**
 * Нижняя навигация (tab bar) — как в мобильных приложениях.
 *
 * Показывается только на "корневых" экранах: /, /lessons, /progress.
 * На страницах уроков и квизов скрывается — там своя навигация (← назад).
 *
 * usePathname() — хук Next.js, возвращает текущий путь.
 * Используем его для:
 * 1. Определения, показывать ли tab bar
 * 2. Подсветки активной вкладки
 */

// Страницы, на которых tab bar видим
const TAB_BAR_PATHS = ["/", "/lessons", "/progress"];

const tabs = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/lessons", label: "Уроки", icon: BookOpen },
  { href: "/progress", label: "Прогресс", icon: BarChart3 },
] as const;

export function TabBar() {
  const pathname = usePathname();

  // Скрываем на страницах уроков, квизов и других вложенных роутах
  if (!TAB_BAR_PATHS.includes(pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/15 bg-background/95 backdrop-blur-sm">
      {/* safe-area-inset — отступ от "чёлки" на iPhone,
          env() — CSS-функция, возвращает системные отступы */}
      <div
        className="flex items-center justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors ${
                isActive
                  ? "text-accent"
                  : "text-hint active:text-foreground"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className={isActive ? "font-semibold" : "font-medium"}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
