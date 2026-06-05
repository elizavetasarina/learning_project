import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/reviews/init
 *
 * Eager-инициализация записей в review_schedule.
 * Клиент шлёт при открытии страницы урока:
 *   { lessonSlug: "01-javascript/02-closures", questionIds: ["q1", "q2", ...] }
 * Сервер создаёт SR-запись для каждой пары (юзер × вопрос), которой ещё нет.
 *
 * Идемпотентность: повторный вызов с теми же данными ничего не меняет
 * (дубликаты по unique constraint молча пропускаются).
 *
 * Реализация — Prisma createMany с skipDuplicates: { skipDuplicates: true }.
 * Это под капотом INSERT ... ON CONFLICT DO NOTHING на Postgres.
 *
 * Дефолты SR-записи (из schema.prisma):
 *   easeFactor = 2.5
 *   intervalDays = 0
 *   repetitions = 0
 *   nextReviewAt = now()  ← попадёт сразу в выдачу "к повтору"
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Парсим тело
    let body: { lessonSlug?: unknown; questionIds?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { lessonSlug, questionIds } = body;

    // Валидация — без any. Принимаем только конкретные типы.
    if (!lessonSlug || typeof lessonSlug !== "string") {
      return NextResponse.json(
        { error: "lessonSlug must be a non-empty string" },
        { status: 400 },
      );
    }
    if (
      !Array.isArray(questionIds) ||
      !questionIds.every((q) => typeof q === "string" && q.length > 0)
    ) {
      return NextResponse.json(
        { error: "questionIds must be a non-empty array of strings" },
        { status: 400 },
      );
    }

    // Пустой массив вопросов — тихо выходим, нечего создавать.
    // (бывает, если урок без quiz.json — getAllQuestionIds вернул [])
    if (questionIds.length === 0) {
      return NextResponse.json({ ok: true, created: 0 });
    }

    // Bulk-insert с пропуском дубликатов.
    // Под капотом: INSERT ... ON CONFLICT (user_id, lesson_slug, question_id) DO NOTHING
    // count возвращает кол-во РЕАЛЬНО вставленных строк (без дубликатов).
    const result = await prisma.reviewSchedule.createMany({
      data: questionIds.map((questionId) => ({
        userId: auth.user.id,
        lessonSlug,
        questionId,
        // Остальные поля берут default из schema.prisma
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ ok: true, created: result.count });
  } catch (error) {
    console.error("POST /api/reviews/init error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
