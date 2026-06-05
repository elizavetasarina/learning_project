import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/reviews/due
 *
 * Возвращает список вопросов, которые юзеру пора повторить
 * (next_review_at <= NOW()).
 *
 * Используется в двух местах:
 *  - На главной — для карточки «На повтор: N вопросов» (берём .length)
 *  - На /review — для отрисовки самой сессии повторения
 *
 * Сортировка: по nextReviewAt asc, то есть «самые просроченные сначала».
 * Limit: 100. Если в очереди больше — юзер всё равно за раз больше
 * не повторит. Сетка из сотен карт переедет на FSRS-like batching, если
 * понадобится.
 *
 * Возвращаем только метаданные (slug + questionId). Полный текст вопроса
 * сервер достанет из файлов, когда юзер уже на экране /review.
 */
export const dynamic = "force-dynamic";

const MAX_DUE_PER_REQUEST = 100;

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Главный запрос приложения. Покрыт индексом @@index([userId, nextReviewAt]).
    const due = await prisma.reviewSchedule.findMany({
      where: {
        userId: auth.user.id,
        nextReviewAt: { lte: new Date() },
      },
      orderBy: { nextReviewAt: "asc" },
      take: MAX_DUE_PER_REQUEST,
      select: {
        lessonSlug: true,
        questionId: true,
      },
    });

    return NextResponse.json({ due });
  } catch (error) {
    console.error("GET /api/reviews/due error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
