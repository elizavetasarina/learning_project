import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/user/settings
 *
 * Обновление пользовательских настроек.
 * Сейчас только dailyGoal. Можно расширять (timezone-override, notifications-prefs).
 *
 * Body: { dailyGoal?: number }
 * Поле опциональное — PATCH-семантика: меняем только то, что прислали.
 *
 * Валидация:
 *   dailyGoal — целое число в диапазоне [10, 500].
 *   Минимум 10 чтобы цель была реальной (1-2 минуты усилий),
 *   максимум 500 чтобы избежать опечаток вроде "5000".
 */
export const dynamic = "force-dynamic";

const MIN_DAILY_GOAL = 10;
const MAX_DAILY_GOAL = 500;

export async function PATCH(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: { dailyGoal?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { dailyGoal } = body;

    // Если поле не прислали — нечего обновлять. 400, чтобы клиент не делал
    // бессмысленных запросов.
    if (dailyGoal === undefined) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    if (
      typeof dailyGoal !== "number" ||
      !Number.isInteger(dailyGoal) ||
      dailyGoal < MIN_DAILY_GOAL ||
      dailyGoal > MAX_DAILY_GOAL
    ) {
      return NextResponse.json(
        {
          error: `dailyGoal must be an integer between ${MIN_DAILY_GOAL} and ${MAX_DAILY_GOAL}`,
        },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: { dailyGoal },
      select: { dailyGoal: true },
    });

    return NextResponse.json({ ok: true, dailyGoal: updated.dailyGoal });
  } catch (error) {
    console.error("PATCH /api/user/settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
