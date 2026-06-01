import { notFound } from "next/navigation";
import { getLesson, getQuestions } from "@/lib/lessons";
import { LessonView } from "./lesson-view";

interface LessonPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Страница урока — серверный компонент.
 *
 * Читает теорию (markdown) и вопросы (JSON) из файлов,
 * передаёт в клиентский LessonView с вкладками Theory / Quiz.
 */
export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params;

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
