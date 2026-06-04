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

    return NextResponse.json({
      progress,
      // Данные юзера: стрик, XP — для главной и прогресса
      user: {
        currentStreak: auth.user.currentStreak,
        longestStreak: auth.user.longestStreak,
        totalXp: auth.user.totalXp,
        dailyXp: auth.user.dailyXp,
        dailyGoal: auth.user.dailyGoal,
      },
    });
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

    // Сначала получаем старый best_score (для расчёта XP)
    const existing = await prisma.lessonProgress.findUnique({
      where: { userId_lessonSlug: { userId: auth.user.id, lessonSlug } },
      select: { bestScore: true },
    });
    const oldBestScore = existing?.bestScore ?? 0;

    const [progress] = await prisma.$queryRawUnsafe<
      Array<{
        lesson_slug: string;
        status: string;
        best_score: number | null;
        attempts_count: number;
      }>
    >(
      // Важно: 'COMPLETED'/'STARTED' приходится явно кастить в "LessonStatus".
      // Postgres делает implicit text→enum cast только в UPDATE-присваивании,
      // а в INSERT VALUES — нет. Без ::"LessonStatus" падает с:
      //   column "status" is of type "LessonStatus" but expression is of type text
      `INSERT INTO lesson_progress
         (user_id, lesson_slug, status, best_score, attempts_count, started_at, completed_at)
       VALUES ($1, $2,
         (CASE WHEN $3 >= $4 THEN 'COMPLETED' ELSE 'STARTED' END)::"LessonStatus",
         $3, 1, NOW(),
         CASE WHEN $3 >= $4 THEN NOW() ELSE NULL END)
       ON CONFLICT (user_id, lesson_slug)
       DO UPDATE SET
         best_score = GREATEST(lesson_progress.best_score, EXCLUDED.best_score),
         attempts_count = lesson_progress.attempts_count + 1,
         status = (CASE
           WHEN GREATEST(lesson_progress.best_score, EXCLUDED.best_score) >= $4
           THEN 'COMPLETED' ELSE 'STARTED' END)::"LessonStatus",
         completed_at = CASE
           WHEN GREATEST(lesson_progress.best_score, EXCLUDED.best_score) >= $4
           THEN COALESCE(lesson_progress.completed_at, NOW()) ELSE NULL END
       RETURNING lesson_slug, status, best_score, attempts_count`,
      auth.user.id,
      lessonSlug,
      score,
      PASS_THRESHOLD
    );

    // ─── XP: начисляем за тест ──────────────────────────────
    // Формула: кол-во вопросов × 10 × (score / 100)
    // XP начисляется только за УЛУЧШЕНИЕ результата.
    // Если был 60%, стал 80% → получаешь разницу в XP.
    // Если был 80%, стал 60% → 0 XP (GREATEST не дал ухудшить best_score).
    const newBestScore = progress.best_score ?? 0;
    let xpEarned = 0;

    if (newBestScore > oldBestScore) {
      const { getQuestions } = await import("@/lib/lessons");
      const questions = await getQuestions(lessonSlug);
      const questionCount = questions.length || 1;

      const XP_PER_QUESTION = 10;
      const newXp = Math.round(questionCount * XP_PER_QUESTION * (newBestScore / 100));
      const oldXp = Math.round(questionCount * XP_PER_QUESTION * (oldBestScore / 100));
      xpEarned = newXp - oldXp;

      if (xpEarned > 0) {
        await prisma.user.update({
          where: { id: auth.user.id },
          data: {
            totalXp: { increment: xpEarned },
            dailyXp: { increment: xpEarned },
          },
        });
      }
    }

    return NextResponse.json({
      progress: {
        lessonSlug: progress.lesson_slug,
        status: progress.status,
        bestScore: progress.best_score,
        attemptsCount: progress.attempts_count,
      },
      xpEarned,
    });
  } catch (error) {
    console.error("POST /api/progress error:", error);
    // ВРЕМЕННО возвращаем реальный текст ошибки клиенту для диагностики.
    // Вернуть на "Internal server error" после починки.
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
