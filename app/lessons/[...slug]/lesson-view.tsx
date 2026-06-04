"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Eye } from "lucide-react";
import { LessonContent } from "./lesson-content";
import { QuizView } from "./quiz-view";
import { useQuizStore } from "@/store/quiz";
import { pluralize } from "@/lib/pluralize";
import type { Question } from "@/types/content";

/**
 * Клиентский компонент — урок с вкладками Теория / Тест.
 *
 * Включает механику «подсмотреть»:
 * Если юзер на вкладке Тест и переключается на Теорию —
 * показываем диалог «Точно хотите подсмотреть?».
 * Если да — помечаем тест как «с подсказкой» (peekedAtTheory).
 * Диалог показывается только один раз за тест.
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
  const [showPeekDialog, setShowPeekDialog] = useState(false);
  const hasQuiz = questions.length > 0;

  // Zustand: читаем состояние теста для определения, начат ли он
  const currentIndex = useQuizStore((s) => s.currentIndex);
  const peekDialogShown = useQuizStore((s) => s.peekDialogShown);
  const isFinished = useQuizStore((s) => s.isFinished);
  const markPeeked = useQuizStore((s) => s.markPeeked);

  // Тест считается «начатым», если юзер ответил хотя бы на один вопрос
  // или продвинулся дальше первого
  const quizStarted = currentIndex > 0 || Object.keys(useQuizStore.getState().answers).length > 0;

  function handleTheoryClick() {
    // Показываем диалог только если:
    // 1. Сейчас на вкладке Тест
    // 2. Тест начат (есть ответы)
    // 3. Тест не завершён
    // 4. Диалог ещё не показывался
    if (
      activeTab === "quiz" &&
      quizStarted &&
      !isFinished &&
      !peekDialogShown
    ) {
      setShowPeekDialog(true);
      return;
    }
    setActiveTab("theory");
  }

  function handlePeekConfirm() {
    markPeeked(); // peekedAtTheory = true, peekDialogShown = true
    setShowPeekDialog(false);
    setActiveTab("theory");
  }

  function handlePeekCancel() {
    setShowPeekDialog(false);
    // Остаёмся на тесте
  }

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
              onClick={handleTheoryClick}
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

      {/* ─── Диалог «подсмотреть» ─── */}
      {showPeekDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <Eye size={24} className="text-warning" />
              </div>
            </div>
            <h2 className="mt-4 text-center text-[18px] font-bold">
              Подсмотреть?
            </h2>
            <p className="mt-2 text-center text-[14px] leading-relaxed text-hint">
              Точно хотите вернуться к теории? Тест будет помечен как
              «пройден с подсказкой»
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handlePeekConfirm}
                className="h-12 rounded-xl bg-warning/10 font-semibold text-warning transition-all active:scale-[0.97]"
              >
                Да, подсмотрю
              </button>
              <button
                type="button"
                onClick={handlePeekCancel}
                className="h-12 rounded-xl bg-accent font-semibold text-accent-text transition-all active:scale-[0.97]"
              >
                Нет, справлюсь сам
              </button>
            </div>
          </div>
        </div>
      )}

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
