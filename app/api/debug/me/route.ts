import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Debug-эндпоинт: отдаёт всё, что сервер знает о тебе.
 *
 * ВРЕМЕННЫЙ. Удалить после диагностики.
 *
 * Полезен для проверок:
 * - Аутентификация работает? (auth.ok)
 * - Юзер создан в БД? (user.id, telegram_id)
 * - Стрики/XP считаются? (currentStreak, totalXp, dailyXp)
 * - Прогресс по урокам с КАКИМИ slug в БД? (progress[].lessonSlug)
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  // Достаём ВСЕ записи прогресса этого юзера — увидим, какие slug в БД
  const allProgress = await prisma.lessonProgress.findMany({
    where: { userId: auth.user.id },
    orderBy: { startedAt: "asc" },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: auth.user.id,
      telegramId: auth.user.telegramId.toString(), // BigInt → string для JSON
      firstName: auth.user.firstName,
      username: auth.user.username,
      currentStreak: auth.user.currentStreak,
      longestStreak: auth.user.longestStreak,
      totalXp: auth.user.totalXp,
      dailyXp: auth.user.dailyXp,
      dailyGoal: auth.user.dailyGoal,
      dailyXpDate: auth.user.dailyXpDate?.toISOString() ?? null,
      lastActivityAt: auth.user.lastActivityAt?.toISOString() ?? null,
      createdAt: auth.user.createdAt.toISOString(),
    },
    progressCount: allProgress.length,
    progress: allProgress.map((p) => ({
      lessonSlug: p.lessonSlug,
      status: p.status,
      bestScore: p.bestScore,
      attemptsCount: p.attemptsCount,
      startedAt: p.startedAt.toISOString(),
      completedAt: p.completedAt?.toISOString() ?? null,
    })),
  });
}
