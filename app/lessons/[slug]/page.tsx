import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getLesson, getQuestions } from "@/lib/lessons";
import { LessonContent } from "./lesson-content";
import { Quiz } from "./quiz";
import Link from "next/link";

interface LessonPageProps {
  params: Promise<{ slug: string }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params;

  const [lesson, questions] = await Promise.all([
    getLesson(slug),
    getQuestions(slug),
  ]);

  if (!lesson) notFound();

  return (
    <main className="flex flex-col gap-6 px-4 py-6">
      {/* Навигация назад */}
      <Link
        href="/lessons"
        className="flex items-center gap-1 text-sm text-hint transition-opacity active:opacity-70"
      >
        <ChevronLeft size={18} />
        К урокам
      </Link>

      {/* Заголовок урока */}
      <h1 className="text-[22px] font-semibold leading-tight">
        {lesson.title}
      </h1>

      {/* Теория: markdown → HTML */}
      <LessonContent content={lesson.content} />

      {/* Разделитель и тест */}
      {questions.length > 0 && (
        <>
          <hr className="border-border/20" />
          <Quiz questions={questions} />
        </>
      )}
    </main>
  );
}
