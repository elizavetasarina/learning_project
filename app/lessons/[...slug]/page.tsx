import { notFound } from "next/navigation";
import { getLesson, getQuestions } from "@/lib/lessons";
import { LessonView } from "./lesson-view";

/**
 * Catch-all роут /lessons/[...slug].
 *
 * Зачем catch-all (а не обычный [slug]):
 * Slug урока составной — "module/lesson", например "01-javascript/04-closures-deep".
 * URL получается /lessons/01-javascript/04-closures-deep — два сегмента пути.
 * Обычный [slug] ловит только один сегмент.
 * [...slug] — catch-all — ловит сколько угодно сегментов в массив.
 *
 * params.slug приходит массивом: ["01-javascript", "04-closures-deep"].
 * Склеиваем обратно через "/" — получаем строковый slug, удобный для БД и API.
 */
interface LessonPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug: slugArray } = await params;
  const slug = slugArray.join("/");

  const [lesson, questions] = await Promise.all([
    getLesson(slug),
    getQuestions(slug),
  ]);

  if (!lesson) notFound();

  return (
    <LessonView
      slug={slug}
      order={lesson.order}
      title={lesson.title}
      description={lesson.description}
      content={lesson.content}
      questions={questions}
    />
  );
}
