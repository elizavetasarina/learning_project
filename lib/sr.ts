/**
 * Логика интервального повторения.
 *
 * Простая фиксированная схема:
 *   - Правильный ответ → повторить через INTERVAL_CORRECT дней
 *   - Неправильный     → повторить через INTERVAL_WRONG дней
 *
 * Поля easeFactor и repetitions сохраняются в БД для совместимости схемы,
 * но на интервал больше не влияют.
 */

// ─── Типы ───────────────────────────────────────────────────

export interface SRState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface SRResult {
  state: SRState;
  nextReviewAt: Date;
}

// ─── Интервалы ──────────────────────────────────────────────

const INTERVAL_CORRECT = 10;
const INTERVAL_WRONG = 5;

// ─── Главная функция ────────────────────────────────────────

/**
 * Пересчитать состояние карточки после ответа.
 *
 * @param prev — текущее состояние (не используется для расчёта интервала)
 * @param grade — 5 = правильно, 0 = неправильно
 * @param now   — текущее время (можно передать явно в тестах)
 */
export function nextSRState(
  prev: SRState,
  grade: number,
  now: Date = new Date(),
): SRResult {
  const correct = grade >= 3;
  const intervalDays = correct ? INTERVAL_CORRECT : INTERVAL_WRONG;

  const nextReviewAt = new Date(now.getTime());
  nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + intervalDays);

  return {
    state: {
      easeFactor: prev.easeFactor,
      intervalDays,
      repetitions: correct ? prev.repetitions + 1 : 0,
    },
    nextReviewAt,
  };
}

export const INITIAL_STATE: SRState = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
};
