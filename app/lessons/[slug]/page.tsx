import { notFound } from "next/navigation";
import { ChevronLeft, HelpCircle, ArrowRight } from "lucide-react";
import { getLesson, getQuestions } from "@/lib/lessons";
import { pluralize } from "@/lib/pluralize";
import { LessonContent } from "./lesson-content";
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
      {/* Навигация */}
      <Link
        href="/lessons"
        className="flex items-center gap-1 text-sm text-hint transition-opacity active:opacity-70"
      >
        <ChevronLeft size={18} />
        К урокам
      </Link>

      {/* Шапка урока */}
      <div>
        <p className="text-xs text-hint">Урок {lesson.order}</p>
        <h1 className="mt-1 text-[22px] font-bold leading-tight">
          {lesson.title}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-hint">
          {lesson.description}
        </p>
      </div>

      {/* Разделитель */}
      <hr className="border-border/20" />

      {/* Теория */}
      <LessonContent content={lesson.content} />

      {/* CTA: перейти к тесту */}
      {questions.length > 0 && (
        <Link
          href={`/lessons/${slug}/quiz`}
          className="flex items-center gap-4 rounded-2xl bg-accent p-5 text-accent-text transition-all active:scale-[0.98]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <HelpCircle size={22} />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Проверь себя</p>
            <p className="text-[13px] opacity-80">
              {questions.length} {pluralize(questions.length, "вопрос", "вопроса", "вопросов")} по теме
            </p>
          </div>
          <ArrowRight size={20} />
        </Link>
      )}
    </main>
  );
}

