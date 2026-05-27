import { notFound } from "next/navigation";
import { getLesson, getQuestions } from "@/lib/lessons";
import { QuizView } from "./quiz-view";

interface QuizPageProps {
  params: Promise<{ slug: string }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { slug } = await params;

  // Проверяем, что урок существует (защита от перехода по прямой ссылке)
  const [lesson, questions] = await Promise.all([
    getLesson(slug),
    getQuestions(slug),
  ]);

  if (!lesson || questions.length === 0) notFound();

  return <QuizView questions={questions} lessonTitle={lesson.title} slug={slug} />;
}
