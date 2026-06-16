"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  Home,
  RotateCcw,
} from "lucide-react";
import {
  fetchReviewSession,
  answerReview,
  type ReviewSessionItem,
} from "@/lib/api-client";
import { isAnswerCorrect } from "@/lib/quiz";
import { useProgressStore } from "@/store/progress";
import * as haptic from "@/lib/haptic";
import { useTelegramBackButton } from "@/hooks/use-telegram-back-button";
import { useTelegramMainButton } from "@/hooks/use-telegram-main-button";
import { useTelegram } from "@/hooks/use-telegram";

/**
 * Экран сессии повторения (spaced repetition).
 *
 * State machine:
 *   loading → empty | active(index, answered) → finished(stats)
 *
 * При mount загружаем session с сервера. Если пусто — показываем заглушку.
 * Иначе — квиз: каждый вопрос с проверкой, после ответа кнопка «Дальше».
 * После каждого ответа fire-and-forget шлём POST /api/reviews/answer и
 * декрементим счётчик dueCount в стор для синхронизации с главной.
 *
 * В конце — статистика и кнопка «На главную».
 */

type AnswerRecord = {
  questionId: string;
  isCorrect: boolean;
};

export function ReviewView() {
  // Нативная кнопка «назад» — на главную
  const router = useRouter();
  const goBack = useCallback(() => router.push("/"), [router]);
  useTelegramBackButton(goBack);

  // Прячем кастомные нижние кнопки, если есть нативная MainButton
  const { hasMainButton } = useTelegram();

  // ─── Загрузка ─────────────────────────────────────────────
  const [items, setItems] = useState<ReviewSessionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReviewSession().then((r) => {
      if (r.ok) setItems(r.data.items);
      else setError(r.error);
    });
  }, []);

  // ─── Состояние квиза ──────────────────────────────────────
  const [index, setIndex] = useState(0);
  // Ответ юзера на текущий вопрос (тип зависит от вопроса)
  const [currentAnswer, setCurrentAnswer] = useState<unknown>(undefined);
  // Показывать ли результат текущего вопроса (после "Проверить")
  const [showResult, setShowResult] = useState(false);
  // История ответов для финальной статистики
  const [history, setHistory] = useState<AnswerRecord[]>([]);

  const decrementDue = useProgressStore((s) => s.decrementDue);

  // ─── Производные значения ─────────────────────────────────
  const total = items?.length ?? 0;
  const current = items?.[index];
  const isLast = total > 0 && index === total - 1;
  const isFinished = total > 0 && history.length === total;

  // ─── Нативная MainButton ──────────────────────────────────
  // Должна быть ДО всех early-returns (правила хуков).
  // Видимость гасим через isVisible когда мы не на активном вопросе.
  const showMainBtn = !!current && !isFinished;
  function hasCurrentAnswer(): boolean {
    if (!current) return false;
    if (currentAnswer === undefined) return false;
    if (current.question.type === "multi") {
      return (currentAnswer as number[]).length > 0;
    }
    return true;
  }
  // Для choice без showResult MainButton не нужна — тап по варианту запускает проверку
  const isChoiceWithoutResult =
    !!current && current.question.type === "choice" && !showResult;
  useTelegramMainButton({
    text: !showResult
      ? "Проверить"
      : isLast
        ? "Завершить"
        : "Следующий",
    isVisible: showMainBtn && !isChoiceWithoutResult,
    isActive: showResult || hasCurrentAnswer(),
    onClick: () => {
      if (!showResult) handleCheck();
      else handleNext();
    },
  });

  // ─── Обработчики ──────────────────────────────────────────
  function setMultiAnswer(optionIndex: number) {
    const arr = (currentAnswer as number[] | undefined) ?? [];
    if (arr.includes(optionIndex)) {
      setCurrentAnswer(arr.filter((i) => i !== optionIndex));
    } else {
      setCurrentAnswer([...arr, optionIndex]);
    }
  }

  function handleCheck() {
    if (!current) return;
    // Тактильный отклик: успех или ошибка по результату ответа
    const correct = isAnswerCorrect(current.question, currentAnswer);
    if (correct) haptic.success();
    else haptic.error();
    setShowResult(true);
  }

  /**
   * Для choice: тап по варианту = выбор + сразу проверка.
   * Для multi/input — оставляем явное «Проверить».
   */
  function handleChoiceTap(index: number) {
    if (showResult) return;
    if (!current || current.question.type !== "choice") return;
    setCurrentAnswer(index);
    const correct = isAnswerCorrect(current.question, index);
    if (correct) haptic.success();
    else haptic.error();
    setShowResult(true);
  }

  function handleNext() {
    if (!current) return;
    const correct = isAnswerCorrect(current.question, currentAnswer);

    // Fire-and-forget: ответ улетает в SR, мы не ждём.
    // Оптимистично декрементим счётчик на главной.
    answerReview(current.lessonSlug, current.question.id, correct);
    decrementDue();

    // Записываем в историю
    setHistory((prev) => [
      ...prev,
      { questionId: current.question.id, isCorrect: correct },
    ]);

    // Сбрасываем состояние для следующего
    setCurrentAnswer(undefined);
    setShowResult(false);
    setIndex((i) => i + 1);
  }

  // ─── Рендеры состояний ────────────────────────────────────

  // Ошибка загрузки
  if (error) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 pb-24 pt-6">
        <Link href="/" className="flex items-center gap-1 text-hint">
          <ChevronLeft size={18} /> На главную
        </Link>
        <div className="rounded-xl bg-error/10 p-4 text-error">
          Не удалось загрузить сессию: {error}
        </div>
      </main>
    );
  }

  // Идёт загрузка
  if (items === null) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 pb-24 pt-6">
        <div className="h-12 animate-pulse rounded-xl bg-secondary-bg" />
        <div className="h-64 animate-pulse rounded-xl bg-secondary-bg" />
      </main>
    );
  }

  // Загрузка прошла, но повторять нечего
  if (total === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-24 pt-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <CheckCircle size={40} className="text-success" />
        </div>
        <h1 className="text-[22px] font-bold">Нет вопросов к повторению</h1>
        <p className="text-[14px] text-hint">
          Проходи новые уроки — вопросы появятся здесь через несколько дней.
        </p>
        <Link
          href="/"
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-text transition-all active:scale-[0.97]"
        >
          <Home size={18} /> На главную
        </Link>
      </main>
    );
  }

  // Финальный экран
  if (isFinished) {
    const correctCount = history.filter((h) => h.isCorrect).length;
    const percentage = Math.round((correctCount / total) * 100);
    const isGood = percentage >= 70;

    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
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
          <h1 className="text-[22px] font-bold">Повторение завершено</h1>
          <p className="mt-2 text-[14px] text-hint">
            {correctCount} из {total} правильных ответов
          </p>
        </div>

        <Link
          href="/"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-accent-text transition-all active:scale-[0.97]"
        >
          <Home size={18} /> На главную
        </Link>
      </main>
    );
  }

  // Активный вопрос
  if (!current) return null;
  const q = current.question;
  const correct = showResult ? isAnswerCorrect(q, currentAnswer) : null;

  return (
    <div className="flex flex-1 flex-col">
      {/* Шапка */}
      <div className="px-4 pt-6">
        <Link href="/" className="flex items-center gap-1 text-hint">
          <ChevronLeft size={18} /> На главную
        </Link>
        <p className="mt-3 text-[12px] uppercase tracking-wide text-hint">
          {current.lessonTitle}
        </p>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-6 pt-4">
        {/* Прогресс-бар */}
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-300"
              style={{
                width: `${((index + (showResult ? 1 : 0)) / total) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs font-medium text-hint">
            {index + 1}/{total}
          </span>
        </div>

        {/* Текст вопроса */}
        <p className="mt-6 text-[16px] font-semibold leading-snug">
          {q.question}
        </p>

        {/* Варианты — choice */}
        {q.type === "choice" && (
          <div className="mt-5 flex flex-col gap-2.5">
            {q.options.map((option, i) => {
              let style = "border-border/30 bg-secondary-bg";
              let icon = null;
              if (showResult && i === q.correct) {
                style = "border-success bg-success/10";
                icon = <CheckCircle size={18} className="shrink-0 text-success" />;
              } else if (showResult && currentAnswer === i && !correct) {
                style = "border-error bg-error/10";
                icon = <XCircle size={18} className="shrink-0 text-error" />;
              } else if (!showResult && currentAnswer === i) {
                style = "border-accent bg-accent/10";
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={showResult}
                  onClick={() => handleChoiceTap(i)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left text-[14px] leading-snug transition-all active:scale-[0.98] ${style}`}
                >
                  <span className="flex-1">{option}</span>
                  {icon}
                </button>
              );
            })}
          </div>
        )}

        {/* Варианты — multi */}
        {q.type === "multi" && (
          <div className="mt-5 flex flex-col gap-2.5">
            <p className="text-xs text-hint">Выберите все правильные варианты</p>
            {q.options.map((option, i) => {
              const selected = ((currentAnswer as number[] | undefined) ?? []);
              const isSelected = selected.includes(i);
              const isOptionCorrect = q.correct.includes(i);
              let style = "border-border/30 bg-secondary-bg";
              let icon = null;
              if (showResult && isOptionCorrect) {
                style = "border-success bg-success/10";
                icon = <CheckCircle size={18} className="shrink-0 text-success" />;
              } else if (showResult && isSelected && !isOptionCorrect) {
                style = "border-error bg-error/10";
                icon = <XCircle size={18} className="shrink-0 text-error" />;
              } else if (!showResult && isSelected) {
                style = "border-accent bg-accent/10";
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={showResult}
                  onClick={() => setMultiAnswer(i)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left text-[14px] leading-snug transition-all active:scale-[0.98] ${style}`}
                >
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
        {q.type === "input" && (
          <input
            type="text"
            disabled={showResult}
            placeholder="Введите ответ..."
            value={String(currentAnswer ?? "")}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            className="mt-5 h-12 rounded-xl border border-border/30 bg-secondary-bg px-4 text-[16px] outline-none transition-colors focus:border-accent"
          />
        )}

        {/* Пояснение */}
        {showResult && (
          <div className="mt-4 flex flex-col gap-2 rounded-xl bg-secondary-bg p-4">
            <div className="flex items-center gap-2">
              {correct ? (
                <CheckCircle size={18} className="text-success" />
              ) : (
                <XCircle size={18} className="text-error" />
              )}
              <span
                className={`text-[14px] font-semibold ${
                  correct ? "text-success" : "text-error"
                }`}
              >
                {correct ? "Правильно!" : "Неправильно"}
              </span>
            </div>
            {!correct && q.type === "input" && (
              <p className="text-[14px]">
                Правильный ответ:{" "}
                <span className="font-semibold">{q.answer}</span>
              </p>
            )}
            {q.explanation && (
              <p className="text-[14px] leading-relaxed text-hint">
                {q.explanation}
              </p>
            )}
          </div>
        )}

        {/* Кнопка снизу — fallback для клиентов без MainButton (dev) */}
        {!hasMainButton && !isChoiceWithoutResult && (
        <div className="mt-auto pt-6">
          {!showResult ? (
            <button
              type="button"
              disabled={!hasCurrentAnswer()}
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
              {isLast ? (
                <span className="inline-flex items-center gap-2">
                  <RotateCcw size={18} /> Завершить
                </span>
              ) : (
                "Следующий вопрос"
              )}
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
