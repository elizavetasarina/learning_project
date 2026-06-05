import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextSRState, INITIAL_STATE } from "@/lib/sr";

/**
 * POST /api/reviews/answer
 *
 * Сохраняет один ответ юзера в режиме повторения.
 * Body: { lessonSlug, questionId, isCorrect }
 *
 * Отличие от /api/progress (который тоже умеет обновлять SR):
 *  - /api/progress принимает результат целого теста сразу
 *  - этот — атомарно по одному ответу, для интерактивного режима /review
 *
 * Логика:
 *  - Достаём текущее SR-состояние (если есть)
 *  - grade = isCorrect ? 5 : 0 (авто-режим, как в /api/progress)
 *  - Пересчитываем через SM-2
 *  - upsert: создаём или обновляем
 *
 * Ответ возвращает новые intervalDays и nextReviewAt — клиент может
 * показать «через N дней снова», но в MVP это не используется.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: {
      lessonSlug?: unknown;
      questionId?: unknown;
      isCorrect?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { lessonSlug, questionId, isCorrect } = body;
    if (typeof lessonSlug !== "string" || lessonSlug.length === 0) {
      return NextResponse.json(
        { error: "lessonSlug must be a non-empty string" },
        { status: 400 },
      );
    }
    if (typeof questionId !== "string" || questionId.length === 0) {
      return NextResponse.json(
        { error: "questionId must be a non-empty string" },
        { status: 400 },
      );
    }
    if (typeof isCorrect !== "boolean") {
      return NextResponse.json(
        { error: "isCorrect must be boolean" },
        { status: 400 },
      );
    }

    const existing = await prisma.reviewSchedule.findUnique({
      where: {
        userId_lessonSlug_questionId: {
          userId: auth.user.id,
          lessonSlug,
          questionId,
        },
      },
    });

    const prev = existing
      ? {
          easeFactor: existing.easeFactor,
          intervalDays: existing.intervalDays,
          repetitions: existing.repetitions,
        }
      : INITIAL_STATE;

    const now = new Date();
    const grade = isCorrect ? 5 : 0;
    const result = nextSRState(prev, grade, now);

    await prisma.reviewSchedule.upsert({
      where: {
        userId_lessonSlug_questionId: {
          userId: auth.user.id,
          lessonSlug,
          questionId,
        },
      },
      create: {
        userId: auth.user.id,
        lessonSlug,
        questionId,
        easeFactor: result.state.easeFactor,
        intervalDays: result.state.intervalDays,
        repetitions: result.state.repetitions,
        nextReviewAt: result.nextReviewAt,
        lastReviewedAt: now,
      },
      update: {
        easeFactor: result.state.easeFactor,
        intervalDays: result.state.intervalDays,
        repetitions: result.state.repetitions,
        nextReviewAt: result.nextReviewAt,
        lastReviewedAt: now,
      },
    });

    return NextResponse.json({
      intervalDays: result.state.intervalDays,
      nextReviewAt: result.nextReviewAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/reviews/answer error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
