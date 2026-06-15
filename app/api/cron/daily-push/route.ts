import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickNotification } from "@/lib/notifications";
import { sendMessage } from "@/lib/telegram-bot";

/**
 * Cron-эндпоинт ежедневной рассылки пушей.
 *
 * Дёргается Vercel Cron по расписанию (см. vercel.json).
 * Vercel шлёт GET с заголовком Authorization: Bearer <CRON_SECRET>.
 *
 * Без проверки secret любой мог бы дёргать эндпоинт и спамить
 * наших юзеров — поэтому первый шаг это проверка авторизации.
 *
 * Логика:
 * 1. Берём всех юзеров с активностью за последние 14 дней
 *    (давно отвалившихся пропускаем, см. STALE_THRESHOLD_DAYS).
 * 2. Для каждого вызываем pickNotification() — он решает, что слать.
 * 3. Если триггер вернул не null — отправляем через Bot API.
 * 4. Логируем агрегированный результат в response для удобной отладки.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // ─── Проверка secret ──────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ─── Берём кандидатов ─────────────────────────────────────
  // Только активные за последние 14 дней — оптимизация, чтобы
  // не перебирать давно отвалившихся (им мы всё равно не пушим).
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 14);

  const users = await prisma.user.findMany({
    where: {
      lastActivityAt: { gte: cutoff },
    },
    select: {
      id: true,
      telegramId: true,
      currentStreak: true,
      dailyXp: true,
      dailyGoal: true,
      lastActivityAt: true,
      timezone: true,
      // Нужен в pickNotification: проверяем, относится ли dailyXp к сегодня.
      // Без этого юзер с устаревшим dailyXp получает неверный finish-goal пуш.
      dailyXpDate: true,
    },
  });

  // ─── Перебираем и шлём ────────────────────────────────────
  // Счётчики для ответа: сколько проверили, по каким триггерам отправили
  const stats = {
    checked: users.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    byTrigger: {
      "streak-at-risk": 0,
      "comeback": 0,
      "finish-goal": 0,
    } as Record<string, number>,
  };

  // URL Mini App — кнопка в пуше будет открывать именно этот URL.
  // APP_URL должен быть задан в env (например https://itlearn.vercel.app).
  // .trim() — защита от случайных пробелов/табов при копировании в Vercel.
  const appUrl = (process.env.APP_URL ?? "").trim();

  // Параллелим отправки, но с лимитом 10 одновременно — чтобы не упереться
  // в rate limit Bot API (30 сообщений/сек на всех пользователей).
  // Простая реализация через нарезку чанками.
  const CHUNK_SIZE = 10;
  for (let i = 0; i < users.length; i += CHUNK_SIZE) {
    const chunk = users.slice(i, i + CHUNK_SIZE);

    await Promise.all(
      chunk.map(async (user) => {
        const notification = pickNotification(user);
        if (!notification) {
          stats.skipped++;
          return;
        }

        const result = await sendMessage({
          chatId: user.telegramId,
          text: notification.text,
          button: appUrl
            ? { text: notification.buttonText, url: appUrl }
            : undefined,
        });

        if (result.ok) {
          stats.sent++;
          stats.byTrigger[notification.trigger]++;
        } else {
          stats.failed++;
          // Лог в Vercel: telegram_id + статус + описание от Bot API
          console.error(
            `[cron] sendMessage failed for user ${user.id} (tg ${user.telegramId}):`,
            { status: result.status, body: result.body, error: result.error },
          );
        }
      }),
    );
  }

  return NextResponse.json({ ok: true, stats });
}
