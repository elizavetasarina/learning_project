"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LessonContent } from "./lesson-content";
import { QuizView } from "./quiz-view";
import { pluralize } from "@/lib/pluralize";
import type { Question } from "@/types/content";

/**
 * Клиентский компонент — урок с вкладками Теория / Тест.
 *
 * Зачем вкладки вместо двух отдельных страниц:
 * 1. Переключение без перезагрузки — мгновенное
 * 2. Quiz state (в Zustand) переживает переключение на теорию и обратно
 * 3. Кнопка «← К урокам» всегда на месте — можно выйти из теста
 * 4. Контекст урока сохраняется — ты видишь название и номер
 */

interface LessonViewProps {
  slug: string;
  order: number;
  title: string;
  description: string;
  content: string;
  questions: Question[];
}

type Tab = "theory" | "quiz";

export function LessonView({
  slug,
  order,
  title,
  description,
  content,
  questions,
}: LessonViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("theory");
  const hasQuiz = questions.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* ─── Шапка: навигация + инфо ─── */}
      <div className="px-4 pt-6">
        <Link
          href="/lessons"
          className="flex items-center gap-1 text-sm text-hint transition-opacity active:opacity-70"
        >
          <ChevronLeft size={18} />
          К урокам
        </Link>

        <div className="mt-4">
          <p className="text-xs text-hint">Урок {order}</p>
          <h1 className="mt-1 text-[22px] font-bold leading-tight">{title}</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-hint">
            {description}
          </p>
        </div>

        {/* ─── Вкладки ─── */}
        {hasQuiz && (
          <div className="mt-5 flex gap-1 rounded-xl bg-secondary-bg p-1">
            <button
              type="button"
              onClick={() => setActiveTab("theory")}
              className={`flex-1 rounded-lg py-2.5 text-[14px] font-medium transition-all ${
                activeTab === "theory"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-hint"
              }`}
            >
              Теория
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("quiz")}
              className={`flex-1 rounded-lg py-2.5 text-[14px] font-medium transition-all ${
                activeTab === "quiz"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-hint"
              }`}
            >
              Тест · {questions.length}{" "}
              {pluralize(questions.length, "вопрос", "вопроса", "вопросов")}
            </button>
          </div>
        )}
      </div>

      {/* ─── Контент вкладки ─── */}
      {activeTab === "theory" ? (
        <div className="flex flex-col gap-6 px-4 pb-6 pt-4">
          <LessonContent content={content} />
        </div>
      ) : (
        <QuizView questions={questions} lessonTitle={title} slug={slug} />
      )}
    </div>
  );
}
