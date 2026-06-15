import { describe, it, expect } from "vitest";
import { pickNotification, type NotificationUser } from "@/lib/notifications";

/**
 * Фиксированный момент "сейчас" для всех тестов — UTC-полдень 10 января 2026.
 * Фиксируем дату, чтобы тесты не зависели от реального времени запуска.
 */
const NOW = new Date("2026-01-10T12:00:00Z");

/** Вчера в UTC */
const YESTERDAY = new Date("2026-01-09T12:00:00Z");
/** 2 дня назад */
const TWO_DAYS_AGO = new Date("2026-01-08T12:00:00Z");
/** 15 дней назад (за порогом STALE_THRESHOLD_DAYS=14) */
const STALE = new Date("2025-12-26T12:00:00Z");
/** Сегодня утром */
const TODAY_MORNING = new Date("2026-01-10T06:00:00Z");

/** Фабрика юзера с дефолтами — переопределяем только нужные поля в каждом тесте */
function makeUser(overrides: Partial<NotificationUser>): NotificationUser {
  return {
    currentStreak: 0,
    dailyXp: 0,
    dailyGoal: 100,
    lastActivityAt: YESTERDAY,
    timezone: null,
    dailyXpDate: null,
    ...overrides,
  };
}

// ─── Базовые случаи ─────────────────────────────────────────

describe("pickNotification — базовые случаи", () => {
  it("возвращает null если юзер никогда не заходил (lastActivityAt = null)", () => {
    const user = makeUser({ lastActivityAt: null });
    expect(pickNotification(user, NOW)).toBeNull();
  });

  it("возвращает null если юзер не заходил больше 14 дней (stale)", () => {
    const user = makeUser({ lastActivityAt: STALE });
    expect(pickNotification(user, NOW)).toBeNull();
  });
});

// ─── Приоритет 1: streak-at-risk ────────────────────────────

describe("pickNotification — streak-at-risk", () => {
  it("шлёт streak-at-risk если стрик >= 3 и юзер был вчера", () => {
    const user = makeUser({ currentStreak: 5, lastActivityAt: YESTERDAY });
    const result = pickNotification(user, NOW);
    expect(result?.trigger).toBe("streak-at-risk");
  });

  it("текст содержит количество дней стрика", () => {
    const user = makeUser({ currentStreak: 7, lastActivityAt: YESTERDAY });
    const result = pickNotification(user, NOW);
    expect(result?.text).toContain("7");
  });

  it("НЕ шлёт streak-at-risk если стрик < 3 (порог не достигнут)", () => {
    const user = makeUser({ currentStreak: 2, lastActivityAt: YESTERDAY });
    const result = pickNotification(user, NOW);
    // стрик < 3, daysSince = 1 (< 2) → comeback не срабатывает, xp нет → null
    expect(result).toBeNull();
  });

  it("НЕ шлёт streak-at-risk если стрик >= 3, но прошло 2+ дня (стрик уже мёртв)", () => {
    const user = makeUser({ currentStreak: 5, lastActivityAt: TWO_DAYS_AGO });
    const result = pickNotification(user, NOW);
    // стрик мёртв → должен быть comeback, не streak-at-risk
    expect(result?.trigger).toBe("comeback");
  });

  it("НЕ шлёт streak-at-risk если юзер уже зашёл сегодня", () => {
    const user = makeUser({
      currentStreak: 5,
      lastActivityAt: TODAY_MORNING,
      dailyXp: 50,
      dailyXpDate: TODAY_MORNING, // свежий
    });
    const result = pickNotification(user, NOW);
    // Зашёл сегодня, цель не выполнена → finish-goal
    expect(result?.trigger).toBe("finish-goal");
  });
});

// ─── Приоритет 2: comeback ───────────────────────────────────

describe("pickNotification — comeback", () => {
  it("шлёт comeback если не заходил 2 дня, стрик 0", () => {
    const user = makeUser({ currentStreak: 0, lastActivityAt: TWO_DAYS_AGO });
    expect(pickNotification(user, NOW)?.trigger).toBe("comeback");
  });

  it("шлёт comeback если не заходил 2 дня, а в БД стрик > 0 (lazy reset не сработал)", () => {
    // Это главный баг, который мы фиксили: в БД currentStreak=5,
    // но юзер не заходил 2 дня — стрик уже сломан, нужен comeback, не streak-at-risk.
    const user = makeUser({ currentStreak: 5, lastActivityAt: TWO_DAYS_AGO });
    expect(pickNotification(user, NOW)?.trigger).toBe("comeback");
  });

  it("шлёт comeback если не заходил 7 дней", () => {
    const sevenDaysAgo = new Date("2026-01-03T12:00:00Z");
    const user = makeUser({ lastActivityAt: sevenDaysAgo });
    expect(pickNotification(user, NOW)?.trigger).toBe("comeback");
  });

  it("НЕ шлёт comeback если прошёл только 1 день (ещё рано)", () => {
    const user = makeUser({ currentStreak: 0, lastActivityAt: YESTERDAY });
    // daysSince = 1, streak = 0 → не streak-at-risk (нет стрика), не comeback (< 2 дней) → null
    expect(pickNotification(user, NOW)).toBeNull();
  });
});

// ─── Приоритет 3: finish-goal ────────────────────────────────

describe("pickNotification — finish-goal", () => {
  it("шлёт finish-goal если зашёл сегодня и цель не выполнена", () => {
    const user = makeUser({
      lastActivityAt: TODAY_MORNING,
      dailyXp: 40,
      dailyGoal: 100,
      dailyXpDate: TODAY_MORNING, // свежий — относится к сегодня
    });
    expect(pickNotification(user, NOW)?.trigger).toBe("finish-goal");
  });

  it("текст содержит набранные XP и остаток", () => {
    const user = makeUser({
      lastActivityAt: TODAY_MORNING,
      dailyXp: 40,
      dailyGoal: 100,
      dailyXpDate: TODAY_MORNING,
    });
    const result = pickNotification(user, NOW);
    expect(result?.text).toContain("40");  // набранные
    expect(result?.text).toContain("60");  // осталось
  });

  it("НЕ шлёт finish-goal если цель уже выполнена", () => {
    const user = makeUser({
      lastActivityAt: TODAY_MORNING,
      dailyXp: 100,
      dailyGoal: 100,
      dailyXpDate: TODAY_MORNING,
    });
    expect(pickNotification(user, NOW)).toBeNull();
  });
});

// ─── Фикс stale dailyXp ─────────────────────────────────────

describe("pickNotification — stale dailyXp (баг с устаревшим dailyXpDate)", () => {
  it("считает effectiveDailyXp = 0 если dailyXpDate вчерашний", () => {
    // Юзер набрал 80 XP вчера, сегодня не заходил.
    // В БД dailyXp=80, dailyXpDate=вчера. Стрик=5.
    // Ожидаем streak-at-risk (не finish-goal).
    const user = makeUser({
      currentStreak: 5,
      lastActivityAt: YESTERDAY,
      dailyXp: 80,
      dailyGoal: 100,
      dailyXpDate: YESTERDAY, // вчерашний → устаревший
    });
    expect(pickNotification(user, NOW)?.trigger).toBe("streak-at-risk");
  });

  it("считает dailyXp свежим если dailyXpDate сегодня", () => {
    const user = makeUser({
      currentStreak: 0,
      lastActivityAt: TODAY_MORNING,
      dailyXp: 50,
      dailyGoal: 100,
      dailyXpDate: TODAY_MORNING, // сегодняшний → свежий
    });
    expect(pickNotification(user, NOW)?.trigger).toBe("finish-goal");
  });

  it("считает dailyXp = 0 если dailyXpDate = null", () => {
    // dailyXpDate не заполнен, dailyXp=80 → effectiveDailyXp=0 → не finish-goal
    const user = makeUser({
      currentStreak: 5,
      lastActivityAt: YESTERDAY,
      dailyXp: 80,
      dailyGoal: 100,
      dailyXpDate: null,
    });
    expect(pickNotification(user, NOW)?.trigger).toBe("streak-at-risk");
  });
});
