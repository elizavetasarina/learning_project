import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS } from "@/lib/achievements";

export const dynamic = "force-dynamic";

/**
 * GET /api/achievements
 *
 * Возвращает полный список ачивок с флагом unlocked и датой получения.
 * Определения — из кода (ACHIEVEMENTS), факты — из БД (user_achievements).
 */
export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const unlocked = await prisma.userAchievement.findMany({
      where: { userId: auth.user.id },
      select: { achievementId: true, unlockedAt: true },
    });

    const unlockedMap = new Map(unlocked.map((a) => [a.achievementId, a.unlockedAt]));

    const achievements = ACHIEVEMENTS.map((def) => ({
      ...def,
      unlocked: unlockedMap.has(def.id),
      unlockedAt: unlockedMap.get(def.id)?.toISOString() ?? null,
    }));

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error("GET /api/achievements error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
