"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, Home, RotateCcw, BookOpen } from "lucide-react";
import type { Question } from "@/types/content";
import { Zap } from "lucide-react";
import { useQuizStore } from "@/store/quiz";
import { useProgressStore } from "@/store/progress";

interface QuizViewProps {
  questions: Question[];
  lessonTitle: string;
  slug: string;
}

/**
 * Компонент теста — использует Zustand для хранения state.
 *
 * Почему Zustand, а не useState:
 * Quiz-view может размонтироваться при переключении на вкладку «Теория».
 * useState сбросится — юзер потеряет ответы. Zustand хранит state
 * вне React-дерева — ответы на месте при возврате.
 */
export function QuizView({ questions, lessonTitle, slug }: QuizViewProps) {
  // ─── Zustand: подписка на нужные поля ─────────────────────
  const currentIndex = useQuizStore((s) => s.currentIndex);
  const answers = useQuizStore((s) => s.answers);
  const showResult = useQuizStore((s) => s.showResult);
  const correctCount = useQuizStore((s) => s.correctCount);
  const isFinished = useQuizStore((s) => s.isFinished);
  const peekedAtTheory = useQuizStore((s) => s.peekedAtTheory);

  // Actions
  const init = useQuizStore((s) => s.init);
  const setAnswer = useQuizStore((s) => s.setAnswer);
  const toggleMultiAnswer = useQuizStore((s) => s.toggleMultiAnswer);
  const check = useQuizStore((s) => s.check);
  const next = useQuizStore((s) => s.next);
  const retry = useQuizStore((s) => s.retry);

  // Progress store — для сохранения результата и показа XP
  const saveToServer = useProgressStore((s) => s.save);
  const lastXpEarned = useProgressStore((s) => s.lastXpEarned);

  // Локальная ошибка сохранения — для отображения юзеру
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Инициализация: если slug изменился или тест завершён — сбросить
  useEffect(() => { init(slug); }, [slug, init]);

  // ─── Вычисляемые значения ─────────────────────────────────

  const question = questions[currentIndex];
  const userAnswer = answers[question?.id];
  const isLast = currentIndex === questions.length - 1;

  function checkIsCorrect(): boolean {
    if (!question) return false;
    if (question.type === "choice") {
      return userAnswer === question.correct;
    }
    if (question.type === "multi") {
      // Сравниваем массивы: отсортированные выбранные === отсортированные правильные
      const selected = (userAnswer as number[] | undefined) ?? [];
      const correct = [...question.correct].sort();
      const sorted = [...selected].sort();
      return (
        correct.length === sorted.length &&
        correct.every((v, i) => v === sorted[i])
      );
    }
    // input
    return (
      String(userAnswer).trim().toLowerCase() ===
      question.answer.trim().toLowerCase()
    );
  }

  // Есть ли ответ у текущего вопроса (для disabled кнопки «Проверить»)
  function hasAnswer(): boolean {
    if (userAnswer === undefined) return false;
    if (question.type === "multi") {
      return (userAnswer as number[]).length > 0;
    }
    return true;
  }

  function handleCheck() {
    check(checkIsCorrect());
  }

  async function handleNext() {
    if (isLast) {
      // Считаем процент и сохраняем через progress store.
      // Важно дождаться save: иначе bg-данные (XP, status) не успевают
      // дойти, и юзер видит «+0 XP» на итоговом экране.
      const percentage = Math.round((correctCount / questions.length) * 100);
      setIsSaving(true);
      setSaveError(null);
      const err = await saveToServer(slug, percentage);
      setIsSaving(false);
      if (err !== null) {
        // Показываем РЕАЛЬНЫЙ текст ошибки от сервера — без него непонятно, что чинить
        setSaveError(err);
        return; // не переходим на финальный экран, чтобы юзер не потерял шанс retry
      }
    }
    next(isLast);
  }

  const isCorrect = showResult ? checkIsCorrect() : null;

  // ─── Итоговый экран ───────────────────────────────────────

  if (isFinished) {
    const percentage = Math.round((correctCount / questions.length) * 100);
    const isGood = percentage >= 85;

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
        {/* Круговой индикатор */}
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full ${
            isGood ? "bg-success/10" : "bg-warning/10"
          }`}
        >
          <span
            className={`text-4xl font-bold ${
              isGood ? "text-success" : "text-warning"
            }`}
          >
            {percentage}%
          </span>
        </div>

        <div className="text-center">
          <h1 className="text-[22px] font-bold">
            {isGood ? "Отличный результат!" : "Можно лучше!"}
          </h1>
          <p className="mt-2 text-[14px] text-hint">
            {correctCount} из {questions.length} правильных ответов
          </p>
          {peekedAtTheory && (
            <p className="mt-1.5 text-[13px] text-warning">
              👀 Пройдено с подсказкой
            </p>
          )}
          {lastXpEarned > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5">
              <Zap size={16} className="text-accent" />
              <span className="text-[14px] font-semibold text-accent">
                +{lastXpEarned} XP
              </span>
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex w-full flex-col gap-3">
          {!isGood && (
            <button
              type="button"
              onClick={retry}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-text transition-all active:scale-[0.97]"
            >
              <RotateCcw size={18} />
              Пройти ещё раз
            </button>
          )}
          <Link
            href="/"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border/30 font-semibold transition-all active:scale-[0.97]"
          >
            <Home size={18} />
            На главную
          </Link>
        </div>
      </div>
    );
  }

  // ─── Экран вопроса ────────────────────────────────────────

  if (!question) return null;

  return (
    <div className="flex flex-1 flex-col px-4 pb-6 pt-4">
      {/* Прогресс-бар */}
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-300"
            style={{
              width: `${((currentIndex + (showResult ? 1 : 0)) / questions.length) * 100}%`,
            }}
          />
        </div>
        <span className="text-xs font-medium text-hint">
          {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Вопрос */}
      <p className="mt-6 text-[16px] font-semibold leading-snug">
        {question.question}
      </p>

      {/* Варианты — choice */}
      {question.type === "choice" && (
        <div className="mt-5 flex flex-col gap-2.5">
          {question.options.map((option, index) => {
            let style = "border-border/30 bg-secondary-bg";
            let icon = null;

            if (showResult && index === question.correct) {
              style = "border-success bg-success/10";
              icon = (
                <CheckCircle size={18} className="shrink-0 text-success" />
              );
            } else if (showResult && userAnswer === index && !isCorrect) {
              style = "border-error bg-error/10";
              icon = <XCircle size={18} className="shrink-0 text-error" />;
            } else if (!showResult && userAnswer === index) {
              style = "border-accent bg-accent/10";
            }

            return (
              <button
                key={index}
                type="button"
                disabled={showResult}
                onClick={() => setAnswer(question.id, index)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left text-[14px] leading-snug transition-all active:scale-[0.98] ${style}`}
              >
                <span className="flex-1">{option}</span>
                {icon}
              </button>
            );
          })}
        </div>
      )}

      {/* Варианты — multi (несколько правильных) */}
      {question.type === "multi" && (
        <div className="mt-5 flex flex-col gap-2.5">
          <p className="text-xs text-hint">Выберите все правильные варианты</p>
          {question.options.map((option, index) => {
            const selected = ((userAnswer as number[] | undefined) ?? []);
            const isSelected = selected.includes(index);
            const isOptionCorrect = question.correct.includes(index);

            let style = "border-border/30 bg-secondary-bg";
            let icon = null;

            if (showResult && isOptionCorrect) {
              // Правильный вариант — всегда зелёный
              style = "border-success bg-success/10";
              icon = (
                <CheckCircle size={18} className="shrink-0 text-success" />
              );
            } else if (showResult && isSelected && !isOptionCorrect) {
              // Выбран, но неправильный — красный
              style = "border-error bg-error/10";
              icon = <XCircle size={18} className="shrink-0 text-error" />;
            } else if (!showResult && isSelected) {
              // Выбран до проверки — акцент
              style = "border-accent bg-accent/10";
            }

            return (
              <button
                key={index}
                type="button"
                disabled={showResult}
                onClick={() => toggleMultiAnswer(question.id, index)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left text-[14px] leading-snug transition-all active:scale-[0.98] ${style}`}
              >
                {/* Чекбокс-индикатор */}
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                    isSelected
                      ? "border-accent bg-accent text-white"
                      : "border-border/50"
                  }`}
                >
                  {isSelected && "✓"}
                </span>
                <span className="flex-1">{option}</span>
                {icon}
              </button>
            );
          })}
        </div>
      )}

      {/* Поле ввода — input */}
      {question.type === "input" && (
        <input
          type="text"
          disabled={showResult}
          placeholder="Введите ответ..."
          value={String(userAnswer ?? "")}
          onChange={(e) => setAnswer(question.id, e.target.value)}
          className="mt-5 h-12 rounded-xl border border-border/30 bg-secondary-bg px-4 text-[16px] outline-none transition-colors focus:border-accent"
        />
      )}

      {/* Пояснение */}
      {showResult && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-secondary-bg p-4">
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <CheckCircle size={18} className="text-success" />
            ) : (
              <XCircle size={18} className="text-error" />
            )}
            <span
              className={`text-[14px] font-semibold ${
                isCorrect ? "text-success" : "text-error"
              }`}
            >
              {isCorrect ? "Правильно!" : "Неправильно"}
            </span>
          </div>

          {!isCorrect && question.type === "input" && (
            <p className="text-[14px]">
              Правильный ответ:{" "}
              <span className="font-semibold">{question.answer}</span>
            </p>
          )}

          {question.explanation && (
            <p className="text-[14px] leading-relaxed text-hint">
              {question.explanation}
            </p>
          )}
        </div>
      )}

      {/* Кнопка — прибита к низу */}
      <div className="mt-auto pt-6">
        {!showResult ? (
          <button
            type="button"
            disabled={!hasAnswer()}
            onClick={handleCheck}
            className="h-12 w-full rounded-xl bg-accent font-semibold text-accent-text transition-all disabled:opacity-40 active:scale-[0.97]"
          >
            Проверить
          </button>
        ) : (
          <>
            {saveError && (
              <div className="mb-3 rounded-lg bg-error/10 px-3 py-2 text-[13px] text-error">
                <p className="font-semibold">Не удалось сохранить:</p>
                <p className="mt-0.5 break-all">{saveError}</p>
              </div>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleNext}
              className="h-12 w-full rounded-xl bg-accent font-semibold text-accent-text transition-all disabled:opacity-60 active:scale-[0.97]"
            >
              {isSaving ? "Сохраняем..." : isLast ? "Завершить тест" : "Следующий вопрос"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
