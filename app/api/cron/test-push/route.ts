import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/telegram-bot";

/**
 * Тестовый эндпоинт: отправляет пробный push первому юзеру в БД.
 *
 * Минует логику pickNotification — нужен, чтобы убедиться, что
 * цепочка Vercel → sendMessage → Telegram API → чат бота работает.
 *
 * После проверки работы — удалить или прятать за feature flag.
 *
 * Защищён тем же CRON_SECRET, что и основной cron.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Та же проверка secret, что в основном cron
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Берём первого юзера в БД (для прода с одним юзером — это ты)
  const user = await prisma.user.findFirst({
    select: { id: true, telegramId: true, firstName: true },
    orderBy: { id: "asc" },
  });

  if (!user) {
    return NextResponse.json(
      { error: "No users in DB" },
      { status: 404 },
    );
  }

  const appUrl = process.env.APP_URL ?? "";

  const result = await sendMessage({
    chatId: user.telegramId,
    text:
      `🧪 <b>Тестовый push</b>\n\n` +
      `Если ты это видишь — рассылка работает.\n` +
      `Привет, ${user.firstName}!`,
    button: appUrl
      ? { text: "Открыть приложение", url: appUrl }
      : undefined,
  });

  // Возвращаем весь результат — статус и тело ответа Bot API.
  // По description от Telegram можно сразу понять что не так.
  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    botApiResponse: result.body,
    error: result.error,
    sentTo: {
      id: user.id,
      telegramId: user.telegramId.toString(),
      firstName: user.firstName,
    },
    hasAppUrl: !!appUrl,
  });
}
