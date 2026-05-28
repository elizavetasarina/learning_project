"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, Home, RotateCcw } from "lucide-react";
import type { Question } from "@/types/content";

interface QuizViewProps {
  questions: Question[];
  lessonTitle: string;
  slug: string;
}

export function QuizView({ questions, lessonTitle, slug }: QuizViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [showResult, setShowResult] = useState(false);
  // Считаем правильные ответы для итогового экрана
  const [correctCount, setCorrectCount] = useState(0);
  // Тест завершён — показываем итоговый экран
  const [isFinished, setIsFinished] = useState(false);

  const question = questions[currentIndex];
  const userAnswer = answers[question?.id];
  const isLast = currentIndex === questions.length - 1;

  function checkIsCorrect(): boolean {
    if (question.type === "choice") {
      return userAnswer === question.correct;
    }
    return (
      String(userAnswer).trim().toLowerCase() ===
      question.answer.trim().toLowerCase()
    );
  }

  function handleCheck() {
    setShowResult(true);
    if (checkIsCorrect()) {
      setCorrectCount((prev) => prev + 1);
    }
  }

  function handleNext() {
    if (isLast) {
      setIsFinished(true);
      return;
    }
    setShowResult(false);
    setCurrentIndex((prev) => prev + 1);
  }

  function handleRetry() {
    setCurrentIndex(0);
    setAnswers({});
    setShowResult(false);
    setCorrectCount(0);
    setIsFinished(false);
  }

  const isCorrect = showResult ? checkIsCorrect() : null;

  // ─── Итоговый экран ───
  if (isFinished) {
    const percentage = Math.round((correctCount / questions.length) * 100);
    const isGood = percentage >= 70;

    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
        {/* Круговой индикатор результата */}
        <div className={`flex h-28 w-28 items-center justify-center rounded-full ${isGood ? "bg-success/10" : "bg-warning/10"}`}>
          <span className={`text-4xl font-bold ${isGood ? "text-success" : "text-warning"}`}>
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
        </div>

        {/* Кнопки */}
        <div className="flex w-full flex-col gap-3">
          {!isGood && (
            <button
              type="button"
              onClick={handleRetry}
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
          <Link
            href={`/lessons/${slug}`}
            className="flex h-12 items-center justify-center text-[14px] text-hint transition-opacity active:opacity-70"
          >
            Вернуться к теории
          </Link>
        </div>
      </main>
    );
  }

  // ─── Экран вопроса ───
  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      {/* Шапка */}
      <p className="text-xs text-hint">{lessonTitle}</p>
      <h1 className="mt-1 text-[22px] font-bold">Проверь себя</h1>

      {/* Прогресс-бар */}
      <div className="mt-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-300"
            style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-hint">
          {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Вопрос */}
      <p className="mt-8 text-[16px] font-semibold leading-snug">
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
              icon = <CheckCircle size={18} className="shrink-0 text-success" />;
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
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [question.id]: index }))
                }
                className={`flex items-center gap-3 rounded-xl border p-4 text-left text-[14px] leading-snug transition-all active:scale-[0.98] ${style}`}
              >
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
          onChange={(e) =>
            setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
          }
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
            <span className={`text-[14px] font-semibold ${isCorrect ? "text-success" : "text-error"}`}>
              {isCorrect ? "Правильно!" : "Неправильно"}
            </span>
          </div>

          {!isCorrect && question.type === "input" && (
            <p className="text-[14px]">
              Правильный ответ: <span className="font-semibold">{question.answer}</span>
            </p>
          )}

          {question.explanation && (
            <p className="text-[14px] leading-relaxed text-hint">
              {question.explanation}
            </p>
          )}
        </div>
      )}

      {/* Кнопка — прибита к низу экрана через mt-auto */}
      <div className="mt-auto pt-6">
        {!showResult ? (
          <button
            type="button"
            disabled={userAnswer === undefined}
            onClick={handleCheck}
            className="h-12 w-full rounded-xl bg-accent font-semibold text-accent-text transition-all disabled:opacity-40 active:scale-[0.97]"
          >
            Проверить
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="h-12 w-full rounded-xl bg-accent font-semibold text-accent-text transition-all active:scale-[0.97]"
          >
            {isLast ? "Завершить тест" : "Следующий вопрос"}
          </button>
        )}
      </div>
    </main>
  );
}
