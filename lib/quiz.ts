import type { Question } from "@/types/content";

/**
 * Чистая функция проверки правильности ответа.
 *
 * Поддерживает все три типа вопросов:
 *   - choice  — ans это индекс выбранного варианта (number)
 *   - multi   — ans это массив индексов (number[])
 *   - input   — ans это строка
 *
 * Используется и в обычном тесте (quiz-view), и в режиме повторения (review-view).
 * Вынесена в отдельный модуль, чтобы не дублировать логику в двух местах.
 */
export function isAnswerCorrect(q: Question, ans: unknown): boolean {
  if (q.type === "choice") {
    return ans === q.correct;
  }
  if (q.type === "multi") {
    const selected = (ans as number[] | undefined) ?? [];
    const correct = [...q.correct].sort();
    const sorted = [...selected].sort();
    return (
      correct.length === sorted.length &&
      correct.every((v, i) => v === sorted[i])
    );
  }
  // input
  return (
    String(ans).trim().toLowerCase() === q.answer.trim().toLowerCase()
  );
}
