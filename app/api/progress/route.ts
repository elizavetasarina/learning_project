import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/progress
 *
 * Возвращает прогресс текущего пользователя по всем урокам.
 * Клиент вызывает при загрузке главной страницы и списка уроков.
 *
 * Ответ: { progress: [{ lessonSlug, status, bestScore, attemptsCount }] }
 */
export async function GET(request: Request) {
  // Аутентификация — первая строка любого API-роута
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

  // Upsert прогресса: создать или обновить.
  // Используем составной уникальный ключ [userId, lessonSlug].
  const existing = await prisma.lessonProgress.findUnique({
    where: {
      userId_lessonSlug: {
        userId: auth.user.id,
        lessonSlug,
      },
    },
  });

  let progress;

  if (!existing) {
    // Первое прохождение — создаём запись
    progress = await prisma.lessonProgress.create({
      data: {
        userId: auth.user.id,
        lessonSlug,
        status: "COMPLETED",
        bestScore: score,
        attemptsCount: 1,
        completedAt: new Date(),
      },
    });
  } else {
    // Повторное прохождение — обновляем
    progress = await prisma.lessonProgress.update({
      where: {
        userId_lessonSlug: {
          userId: auth.user.id,
          lessonSlug,
        },
      },
      data: {
        // bestScore обновляем только если новый результат лучше
        bestScore:
          existing.bestScore === null || score > existing.bestScore
            ? score
            : existing.bestScore,
        attemptsCount: existing.attemptsCount + 1,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  // Обновляем lastActivityAt пользователя (для стриков в будущем)
  await prisma.user.update({
    where: { id: auth.user.id },
    data: { lastActivityAt: new Date() },
  });

  return NextResponse.json({
    progress: {
      lessonSlug: progress.lessonSlug,
      status: progress.status,
      bestScore: progress.bestScore,
      attemptsCount: progress.attemptsCount,
    },
  });
}
