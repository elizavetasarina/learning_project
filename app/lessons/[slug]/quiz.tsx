"use client";

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { Question } from "@/types/content";

interface QuizProps {
  questions: Question[];
}

export function Quiz({ questions }: QuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [showResult, setShowResult] = useState(false);

  if (questions.length === 0) return null;

  const question = questions[currentIndex];
  const userAnswer = answers[question.id];
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
  }

  function handleNext() {
    setShowResult(false);
    setCurrentIndex((prev) => prev + 1);
  }

  const isCorrect = showResult ? checkIsCorrect() : null;

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[18px] font-semibold">Проверь себя</h2>

      {/* Прогресс-бар теста */}
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all"
            style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-hint">
          {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Вопрос */}
      <p className="text-[16px] font-medium leading-snug">{question.question}</p>

      {/* Варианты ответа — choice */}
      {question.type === "choice" && (
        <div className="flex flex-col gap-2.5">
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
          className="h-12 rounded-xl border border-border/30 bg-secondary-bg px-4 text-[16px] outline-none transition-colors focus:border-accent"
        />
      )}

      {/* Результат + пояснение */}
      {showResult && (
        <div className="flex flex-col gap-2.5 rounded-xl bg-secondary-bg p-4">
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

          {/* Показываем правильный ответ для input-вопросов при ошибке */}
          {!isCorrect && question.type === "input" && (
            <p className="text-[14px]">
              Правильный ответ: <span className="font-semibold">{question.answer}</span>
            </p>
          )}

          {/* Пояснение */}
          {question.explanation && (
            <p className="text-[14px] leading-relaxed text-hint">
              {question.explanation}
            </p>
          )}
        </div>
      )}

      {/* Кнопка действия */}
      {!showResult ? (
        <button
          type="button"
          disabled={userAnswer === undefined}
          onClick={handleCheck}
          className="h-12 rounded-xl bg-accent font-semibold text-accent-text transition-all disabled:opacity-40 active:scale-[0.97]"
        >
          Проверить
        </button>
      ) : !isLast ? (
        <button
          type="button"
          onClick={handleNext}
          className="h-12 rounded-xl bg-accent font-semibold text-accent-text transition-all active:scale-[0.97]"
        >
          Следующий вопрос
        </button>
      ) : (
        <div className="rounded-xl bg-success/10 p-4 text-center">
          <p className="text-[14px] font-semibold text-success">Тест завершён!</p>
        </div>
      )}
    </section>
  );
}
