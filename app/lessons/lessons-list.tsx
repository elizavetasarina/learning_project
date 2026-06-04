"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HelpCircle, CheckCircle, ChevronDown } from "lucide-react";
import type { ModuleWithLessons } from "@/types/content";
import { useProgressStore } from "@/store/progress";
import { pluralize } from "@/lib/pluralize";

interface LessonsListProps {
  modules: ModuleWithLessons[];
}

/**
 * Клиентский компонент — список уроков, сгруппированный по модулям.
 * Каждый модуль — раскрывающийся аккордеон.
 *
 * Почему useState<Set<string>>, а не один открытый модуль:
 * Set позволяет открыть несколько модулей одновременно — юзеру может
 * быть удобно сравнивать темы. Если хотим «один за раз» — заменить
 * на useState<string | null>.
 *
 * Идиома Set + new Set(prev) — иммутабельное обновление.
 * Zustand/React сравнивают по ===, поэтому нужна новая ссылка.
 */
export function LessonsList({ modules }: LessonsListProps) {
  const progressMap = useProgressStore((s) => s.progressMap);
  const load = useProgressStore((s) => s.load);
  useEffect(() => { load(); }, [load]);

  // Множество slug'ов открытых модулей. По умолчанию все свёрнуты.
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  function toggleModule(slug: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {modules.map((module) => {
        const isOpen = openModules.has(module.slug);

        // Подсчёт пройденных уроков модуля (для бейджа в шапке)
        const completedInModule = module.lessons.filter((l) => {
          const p = progressMap?.get(l.slug);
          return p?.status === "COMPLETED";
        }).length;

        return (
          <section
            key={module.slug}
            className="overflow-hidden rounded-xl bg-secondary-bg"
          >
            {/* Кликабельная шапка модуля */}
            <button
              type="button"
              onClick={() => toggleModule(module.slug)}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-foreground/5"
              aria-expanded={isOpen}
            >
              <div className="flex-1 min-w-0">
                <h2 className="text-[16px] font-semibold leading-tight">
                  {module.title}
                </h2>
                <p className="mt-0.5 text-[13px] leading-snug text-hint">
                  {module.description}
                </p>
                {/* Бейдж: прогресс по модулю */}
                <p className="mt-1.5 text-[12px] font-medium text-hint">
                  {completedInModule}/{module.lessons.length}{" "}
                  {pluralize(module.lessons.length, "урок", "урока", "уроков")} пройдено
                </p>
              </div>
              {/* Шеврон — поворачивается при открытии */}
              <ChevronDown
                size={20}
                className={`shrink-0 text-hint transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Список уроков — рендерим только когда открыт.
                Альтернатива: всегда рендерить с max-height: 0 для анимации,
                но это сложнее и не оправдано для коротких списков. */}
            {isOpen && (
              <ul className="flex flex-col gap-2 px-3 pb-3">
                {module.lessons.map((lesson) => {
                  const progress = progressMap?.get(lesson.slug);
                  const isCompleted = progress?.status === "COMPLETED";
                  const scorePercent = progress?.bestScore ?? 0;

                  return (
                    <li key={lesson.slug}>
                      <Link
                        href={`/lessons/${lesson.slug}`}
                        className="block rounded-lg bg-background p-4 transition-all active:scale-[0.98]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-[15px] font-semibold">
                            {lesson.title}
                          </h3>
                          {isCompleted && (
                            <CheckCircle
                              size={18}
                              className="shrink-0 text-success"
                            />
                          )}
                        </div>
                        <p className="mt-1 text-[13px] leading-snug text-hint">
                          {lesson.description}
                        </p>

                        <div className="mt-2.5 flex items-center gap-3 text-xs text-hint">
                          {lesson.questionCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <HelpCircle size={14} />
                              <span>
                                {lesson.questionCount}{" "}
                                {pluralize(
                                  lesson.questionCount,
                                  "вопрос",
                                  "вопроса",
                                  "вопросов",
                                )}
                              </span>
                            </div>
                          )}
                          {isCompleted && progress.bestScore !== null && (
                            <span className="text-accent font-medium">
                              Лучший: {progress.bestScore}%
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
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
            )}
          </section>
        );
      })}
    </div>
  );
}
