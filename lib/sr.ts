/**
 * Алгоритм spaced repetition (SM-2).
 *
 * Источник: Piotr Wozniak, 1985 (SuperMemo). Тот же алгоритм в основе Anki.
 *
 * Цель: на каждый ответ юзера пересчитать
 *   - на сколько дней отложить следующий показ карточки (intervalDays)
 *   - её «лёгкость» (easeFactor) — насколько большие шаги делать в будущем
 *   - счётчик подряд успешных ответов (repetitions)
 *
 * Главная идея: лёгкие карточки быстро уходят в long-term (интервалы прыгают
 * 1 → 6 → 15 → 37 → 92 дня), сложные остаются в короткой памяти. Ошибка
 * сбрасывает интервал, но НЕ ease factor — карточка остаётся той же сложности
 * (мы её просто не помним сегодня), и при следующем правильном ответе скорость
 * роста интервалов не теряется.
 *
 * Чистая функция: без БД, без даты «сейчас» в аргументах (now передаётся
 * отдельно для тестируемости). Легко покрывается unit-тестами.
 */

// ─── Типы ───────────────────────────────────────────────────

/** Состояние карточки в SR: то, что хранится в БД (без даты — она производная) */
export interface SRState {
  /** «Лёгкость» карточки. Начинается с 2.5, плавает в [1.3, ~3.0]. */
  easeFactor: number;
  /** Через сколько дней показать карточку после текущего ответа. */
  intervalDays: number;
  /** Сколько раз подряд юзер ответил правильно (сбрасывается на ошибке). */
  repetitions: number;
}

/** Результат расчёта: новое состояние + конкретная дата следующего показа */
export interface SRResult {
  state: SRState;
  nextReviewAt: Date;
}

// ─── Константы ──────────────────────────────────────────────

/** Начальное значение easeFactor. Каноническое для SM-2. */
export const INITIAL_EASE_FACTOR = 2.5;

/**
 * Минимальный easeFactor. Без нижней границы он бы падал бесконечно
 * на постоянно проваленных карточках, и интервалы стали бы микроскопические
 * (1.0 * 1.0 = 1 день навсегда). 1.3 — каноническое значение SM-2.
 */
export const MIN_EASE_FACTOR = 1.3;

/** Порог правильности: оценки >= 3 считаются «правильно». */
export const PASSING_GRADE = 3;

// ─── Главная функция ──────────────────────────────────────────

/**
 * Пересчитать состояние карточки после ответа.
 *
 * @param prev — текущее состояние карточки. Если это первый ответ на новый
 *   вопрос — передай { easeFactor: 2.5, intervalDays: 0, repetitions: 0 }
 *   (или используй INITIAL_STATE).
 * @param grade — оценка 0–5:
 *   - 0–2: неправильно (карточка возвращается в начало)
 *   - 3: правильно, но с трудом
 *   - 4: правильно с лёгким колебанием
 *   - 5: идеально
 * @param now — текущее время, нужно для вычисления nextReviewAt.
 *   Дефолт = new Date(), но можно передать явно (важно для тестов).
 *
 * @returns новое состояние + дата следующего показа.
 *
 * @example
 * // Первый правильный ответ
 * nextSRState({ easeFactor: 2.5, intervalDays: 0, repetitions: 0 }, 5)
 * // → { state: { easeFactor: 2.6, intervalDays: 1, repetitions: 1 },
 * //     nextReviewAt: <завтра> }
 *
 * @example
 * // Ошибка на устоявшейся карточке (была через 30 дней, EF 2.3)
 * nextSRState({ easeFactor: 2.3, intervalDays: 30, repetitions: 5 }, 1)
 * // → { state: { easeFactor: 2.3, intervalDays: 1, repetitions: 0 },
 * //     nextReviewAt: <завтра> }
 * // EF НЕ изменился, repetitions сбросился, интервал = 1
 */
export function nextSRState(
  prev: SRState,
  grade: number,
  now: Date = new Date(),
): SRResult {
  // Защита от мусорных оценок: clamp в [0, 5].
  const g = Math.max(0, Math.min(5, grade));

  let easeFactor: number;
  let intervalDays: number;
  let repetitions: number;

  if (g >= PASSING_GRADE) {
    // ─── Правильный ответ ────────────────────────────────
    repetitions = prev.repetitions + 1;

    // Интервалы первых двух правильных ответов фиксированы канонически:
    //   1-й правильный → 1 день
    //   2-й правильный → 6 дней
    //   3-й и далее   → предыдущий interval × easeFactor
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(prev.intervalDays * prev.easeFactor);
    }

    // Формула обновления EF из SM-2. Раскладка:
    //   EF' = EF + (0.1 − (5 − g) × (0.08 + (5 − g) × 0.02))
    // При g = 5: EF растёт на 0.10  (лёгкая карточка — увеличиваем шаг)
    // При g = 4: EF растёт на 0.00  (норм — оставляем)
    // При g = 3: EF падает на 0.14  (на грани — уменьшаем шаг)
    easeFactor =
      prev.easeFactor +
      (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02));

    // Защита от падения ниже минимума
    if (easeFactor < MIN_EASE_FACTOR) easeFactor = MIN_EASE_FACTOR;
  } else {
    // ─── Ошибка ─────────────────────────────────────────
    // Каноническая SM-2 при ошибке:
    //   - сбрасывает счётчик правильных подряд (карточка «новая»)
    //   - ставит интервал = 1 (показать завтра)
    //   - НЕ трогает easeFactor: сложность карточки не изменилась,
    //     мы её просто сегодня не вспомнили. При следующих правильных
    //     ответах интервалы будут расти с тем же EF, что и раньше.
    repetitions = 0;
    intervalDays = 1;
    easeFactor = prev.easeFactor;
  }

  // Вычисляем дату следующего показа от переданного "сейчас".
  const nextReviewAt = new Date(now.getTime());
  nextReviewAt.setUTCDate(nextReviewAt.getUTCDate() + intervalDays);

  return {
    state: { easeFactor, intervalDays, repetitions },
    nextReviewAt,
  };
}

/**
 * Начальное состояние для новой карточки.
 * Удобный шорткат вместо ручного `{ easeFactor: 2.5, ... }` в коде.
 */
export const INITIAL_STATE: SRState = {
  easeFactor: INITIAL_EASE_FACTOR,
  intervalDays: 0,
  repetitions: 0,
};
