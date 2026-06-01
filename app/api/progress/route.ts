import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Запрещаем Next.js пре-рендерить этот роут при билде.
// Без этого Next.js пытается выполнить код при сборке,
// что вызывает ошибку подключения к БД (её нет в build-окружении).
export const dynamic = "force-dynamic";

/**
 * GET /api/progress
 *
 * Возвращает прогресс текущего пользователя по всем урокам.
 * Клиент вызывает при загрузке главной страницы и списка уроков.
 *
 * Ответ: { progress: [{ lessonSlug, status, bestScore, attemptsCount }] }
 */
export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const progress = await prisma.lessonProgress.findMany({
      where: { userId: auth.user.id },
      select: {
        lessonSlug: true,
        status: true,
        bestScore: true,
        attemptsCount: true,
        startedAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("GET /api/progress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/progress
 *
 * Сохраняет результат прохождения теста.
 * Клиент вызывает после завершения квиза.
 *
 * Body: { lessonSlug: string, score: number }
 * - lessonSlug — идентификатор урока ("01-types-and-references")
 * - score — результат в процентах (0-100)
 *
 * Логика:
 * - Если записи нет — создаём (STARTED → COMPLETED если score > 0)
 * - Если запись есть — обновляем bestScore (только если новый выше),
 *   увеличиваем attemptsCount
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Парсим и валидируем тело запроса
    let body: { lessonSlug?: string; score?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { lessonSlug, score } = body;

    if (!lessonSlug || typeof lessonSlug !== "string") {
      return NextResponse.json(
        { error: "lessonSlug is required" },
        { status: 400 }
      );
    }

    if (score === undefined || typeof score !== "number" || score < 0 || score > 100) {
      return NextResponse.json(
        { error: "score must be a number 0-100" },
        { status: 400 }
      );
    }

    // Upsert прогресса + обновление lastActivityAt — один SQL-запрос.
    //
    // Почему raw SQL вместо Prisma ORM:
    // Prisma upsert не даёт доступа к текущему значению поля в update.
    // Нам нужно: "обнови bestScore только если новый выше" — это
    // GREATEST(текущее, новое) в SQL. ORM это не умеет.
    //
    // INSERT ON CONFLICT — PostgreSQL-версия upsert:
    // - INSERT пытается вставить новую строку
    // - ON CONFLICT (user_id, lesson_slug) — если пара уже существует...
    // - DO UPDATE SET — ...обновляем существующую строку
    // - GREATEST(best_score, $3) — берём максимум из старого и нового
    // - EXCLUDED — ссылка на данные, которые "пытались вставить"
    //
    // RETURNING — возвращает результат без дополнительного SELECT.
    // Порог: 85%+ = COMPLETED (тема пройдена), иначе STARTED.
    // CASE в SQL: если лучший результат (с учётом нового) >= 85 → COMPLETED.
    // При INSERT: просто проверяем $3 (score). При UPDATE: GREATEST из старого и нового.
    const PASS_THRESHOLD = 85;

    const [progress] = await prisma.$queryRawUnsafe<
      Array<{
        lesson_slug: string;
        status: string;
        best_score: number | null;
        attempts_count: number;
      }>
    >(
      `INSERT INTO lesson_progress
         (user_id, lesson_slug, status, best_score, attempts_count, started_at, completed_at)
       VALUES ($1, $2,
         CASE WHEN $3 >= $4 THEN 'COMPLETED' ELSE 'STARTED' END,
         $3, 1, NOW(),
         CASE WHEN $3 >= $4 THEN NOW() ELSE NULL END)
       ON CONFLICT (user_id, lesson_slug)
       DO UPDATE SET
         best_score = GREATEST(lesson_progress.best_score, EXCLUDED.best_score),
         attempts_count = lesson_progress.attempts_count + 1,
         status = CASE
           WHEN GREATEST(lesson_progress.best_score, EXCLUDED.best_score) >= $4
           THEN 'COMPLETED' ELSE 'STARTED' END,
         completed_at = CASE
           WHEN GREATEST(lesson_progress.best_score, EXCLUDED.best_score) >= $4
           THEN COALESCE(lesson_progress.completed_at, NOW()) ELSE NULL END
       RETURNING lesson_slug, status, best_score, attempts_count`,
      auth.user.id,
      lessonSlug,
      score,
      PASS_THRESHOLD
    );

    // lastActivityAt обновляется в authenticateRequest() с throttle — не дублируем.

    return NextResponse.json({
      progress: {
        lessonSlug: progress.lesson_slug,
        status: progress.status,
        bestScore: progress.best_score,
        attemptsCount: progress.attempts_count,
      },
    });
  } catch (error) {
    console.error("POST /api/progress error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
