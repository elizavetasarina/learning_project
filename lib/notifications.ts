/**
 * Логика выбора пуш-уведомления для юзера.
 *
 * Отдельный модуль, чтобы:
 * 1. Удобно покрывать тестами (чистая функция, без БД и HTTP).
 * 2. Логику можно править без касания cron-эндпоинта.
 *
 * Правило одного пуша в день: на каждого юзера выбирается
 * ОДИН триггер с наивысшим приоритетом, либо null если слать нечего.
 */

/** Минимальный набор полей юзера, нужных для выбора триггера */
export interface NotificationUser {
  currentStreak: number;
  dailyXp: number;
  dailyGoal: number;
  /** Когда юзер последний раз был активен. Может быть null если ни разу */
  lastActivityAt: Date | null;
  /** IANA-таймзона юзера ("Europe/Moscow"). null = считаем по UTC */
  timezone: string | null;
}

/** Результат выбора: текст и текст кнопки. URL добавляется в cron */
export interface Notification {
  trigger: "streak-at-risk" | "comeback" | "finish-goal";
  text: string;
  buttonText: string;
}

import { daysBetweenInTz } from "./datetime";

// ─── Пороги ─────────────────────────────────────────────────

/** Если активность была давнее этого — юзер «отвалился», не шлём */
const STALE_THRESHOLD_DAYS = 14;

/** Если активности не было N+ дней, и стрик уже 0 — триггер comeback */
const COMEBACK_THRESHOLD_DAYS = 2;

// ─── Основная функция ──────────────────────────────────────

/**
 * Выбрать пуш для юзера по приоритету.
 *
 * 1. Если юзер давно отвалился (>14 дней) — null (не спамим).
 * 2. Стрик > 0 и сегодня ничего не сделал — streak-at-risk (высший приоритет).
 * 3. Активность ≥ 2 дня назад, стрик 0 — comeback.
 * 4. Зашёл сегодня, но цель не добита — finish-goal (мягкий пинок).
 * 5. Иначе — null (всё ок, юзер активен).
 *
 * Returns null если уведомление не нужно.
 */
export function pickNotification(
  user: NotificationUser,
  now: Date = new Date(),
): Notification | null {
  // Юзер вообще ничего не делал — пока не трогаем (логика onboarding'а отдельна)
  if (!user.lastActivityAt) return null;

  // Считаем дни в таймзоне юзера: для МСК «вчера» != UTC-вчера на 3 часа.
  const daysSinceLastActivity = daysBetweenInTz(
    user.lastActivityAt,
    now,
    user.timezone,
  );

  // Cutoff: давно отвалившихся не пушим, чтобы не быть спамом
  if (daysSinceLastActivity > STALE_THRESHOLD_DAYS) return null;

  // ─── Приоритет 1: стрик под угрозой ─────────────────────
  // Юзер набрал стрик, но сегодня ещё ничего не сделал.
  // Самый ценный момент для нотификации — он потеряет привычку.
  if (user.currentStreak > 0 && user.dailyXp === 0) {
    const streakWord =
      user.currentStreak === 1 ? "день" :
      user.currentStreak < 5 ? "дня" : "дней";
    return {
      trigger: "streak-at-risk",
      text:
        `🔥 У тебя стрик <b>${user.currentStreak} ${streakWord}</b>!\n\n` +
        `Зайди сейчас и не потеряй его — нужно всего 5 минут.`,
      buttonText: "Продолжить",
    };
  }

  // ─── Приоритет 2: возврат отвалившегося ────────────────
  // Активность 2-14 дней назад, стрик уже сбросился — мягко возвращаем.
  if (
    user.currentStreak === 0 &&
    daysSinceLastActivity >= COMEBACK_THRESHOLD_DAYS
  ) {
    return {
      trigger: "comeback",
      text:
        `Давно тебя не было 👋\n\n` +
        `Вернись на 5 минут — один урок, и ты снова в потоке.`,
      buttonText: "Открыть приложение",
    };
  }

  // ─── Приоритет 3: добей дневную цель ───────────────────
  // Юзер зашёл сегодня (dailyXp > 0), но цель не закрыта.
  if (user.dailyXp > 0 && user.dailyXp < user.dailyGoal) {
    const left = user.dailyGoal - user.dailyXp;
    return {
      trigger: "finish-goal",
      text:
        `Сегодня у тебя <b>${user.dailyXp} XP</b> из ${user.dailyGoal}.\n\n` +
        `Осталось ${left} XP — пройди ещё один тест и закрой день.`,
      buttonText: "Доделать",
    };
  }

  // Всё ок — юзер активен, цель достигнута или близка к ней
  return null;
}
