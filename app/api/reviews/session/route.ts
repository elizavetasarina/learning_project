import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLesson, getQuestions } from "@/lib/lessons";
import type { Question } from "@/types/content";

/**
 * GET /api/reviews/session
 *
 * Возвращает полные данные вопросов для сессии повторения.
 * Это «жирная» версия /api/reviews/due: туда — только метаданные для
 * подсчёта, сюда — всё, что нужно UI чтобы отрисовать квиз.
 *
 * Алгоритм:
 * 1. Достаём due из БД (как в /api/reviews/due)
 * 2. Группируем по lessonSlug (уроков обычно меньше, чем вопросов)
 * 3. Для каждого уникального slug читаем lesson.md и quiz.json
 * 4. Маппим due → полный объект Question
 *
 * Файлы читаются с диска — относительно дорого. Поэтому за один запрос
 * берём максимум MAX = 50 карт. Если за день накопилось больше — юзер
 * закроет первую партию, потом откроет ещё.
 */
export const dynamic = "force-dynamic";

const MAX_SESSION = 50;

interface SessionItem {
  lessonSlug: string;
  lessonTitle: string;
  question: Question;
}

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const due = await prisma.reviewSchedule.findMany({
      where: {
        userId: auth.user.id,
        nextReviewAt: { lte: new Date() },
      },
      orderBy: { nextReviewAt: "asc" },
      take: MAX_SESSION,
      select: { lessonSlug: true, questionId: true },
    });

    if (due.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Группируем по slug чтобы прочитать каждый урок только раз
    const slugSet = new Set(due.map((d) => d.lessonSlug));

    // Параллельно читаем все уроки. Promise.all — для отзывчивости.
    const lessonData = await Promise.all(
      Array.from(slugSet).map(async (slug) => {
        const [lesson, questions] = await Promise.all([
          getLesson(slug),
          getQuestions(slug),
        ]);
        // Индекс questions по id для O(1) лукапа
        const qMap = new Map(questions.map((q) => [q.id, q]));
        return { slug, title: lesson?.title ?? slug, qMap };
      }),
    );
    const lessonBySlug = new Map(lessonData.map((l) => [l.slug, l]));

    // Собираем финальный список. Skip-ы происходят, если:
    // - урок удалён (slug в БД, но нет lesson.md)
    // - вопрос убран из quiz.json (id в БД, но нет в файле)
    // В таких случаях запись становится «осиротевшей» — UI её не покажет.
    // Они будут висеть в due навсегда. Для MVP — терпимо; чистка в v2.
    const items: SessionItem[] = [];
    for (const d of due) {
      const lesson = lessonBySlug.get(d.lessonSlug);
      if (!lesson) continue;
      const question = lesson.qMap.get(d.questionId);
      if (!question) continue;
      items.push({
        lessonSlug: d.lessonSlug,
        lessonTitle: lesson.title,
        question,
      });
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/reviews/session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
