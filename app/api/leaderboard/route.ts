import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/leaderboard
 *
 * Возвращает топ-20 юзеров по totalXp и позицию текущего юзера.
 * Если текущий юзер в топ-20 — он помечен isMe:true внутри списка.
 * Если за топ-20 — он возвращается отдельно в поле `me`.
 */
export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [top, rank] = await Promise.all([
      prisma.user.findMany({
        take: 20,
        orderBy: { totalXp: "desc" },
        select: { id: true, firstName: true, username: true, totalXp: true },
      }),
      // Ранг: сколько юзеров обогнали нас + 1
      prisma.user
        .count({ where: { totalXp: { gt: auth.user.totalXp } } })
        .then((n) => n + 1),
    ]);

    const entries = top.map((u, i) => ({
      rank: i + 1,
      firstName: u.firstName,
      username: u.username,
      totalXp: u.totalXp,
      isMe: u.id === auth.user.id,
    }));

    // Текущий юзер за топ-20 — отдаём отдельно для закреплённой карточки
    const meInTop = entries.some((e) => e.isMe);
    const me = meInTop
      ? null
      : {
          rank,
          firstName: auth.user.firstName,
          username: auth.user.username ?? null,
          totalXp: auth.user.totalXp,
        };

    return NextResponse.json({ top: entries, me });
  } catch (error) {
    console.error("GET /api/leaderboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
