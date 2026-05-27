import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type { Lesson, LessonMeta, Question } from "@/types/content";

// Абсолютный путь к папке с контентом.
// process.cwd() — корень проекта (где лежит package.json).
const CONTENT_DIR = path.join(process.cwd(), "content");

/**
 * Получить список всех уроков (без тела markdown).
 * Используется на странице /lessons для отображения списка.
 */
export async function getAllLessons(): Promise<LessonMeta[]> {
  // Читаем содержимое content/ — получаем имена папок
  const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });

  // Фильтруем только директории (игнорируем случайные файлы в корне content/)
  const dirs = entries.filter((entry) => entry.isDirectory());

  // Для каждой папки пробуем прочитать lesson.md и извлечь frontmatter.
  // Если в папке нет lesson.md — пропускаем (возвращаем null, потом фильтруем).
  const results = await Promise.all(
    dirs.map(async (dir): Promise<LessonMeta | null> => {
      const filePath = path.join(CONTENT_DIR, dir.name, "lesson.md");

      try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        const { data } = matter(fileContent);

        // Считаем количество вопросов для отображения в карточке
        let questionCount = 0;
        try {
          const quizPath = path.join(CONTENT_DIR, dir.name, "quiz.json");
          const quizContent = await fs.readFile(quizPath, "utf-8");
          questionCount = (JSON.parse(quizContent) as unknown[]).length;
        } catch {
          // quiz.json не найден — тест отсутствует, это нормально
        }

        return {
          slug: dir.name,
          title: data.title as string,
          description: data.description as string,
          order: data.order as number,
          questionCount,
        };
      } catch {
        // Папка без lesson.md — не урок, пропускаем
        return null;
      }
    }),
  );

  // Убираем null (папки без уроков) и сортируем по order
  const lessons = results.filter((lesson): lesson is LessonMeta => lesson !== null);
  return lessons.sort((a, b) => a.order - b.order);
}

/**
 * Получить один урок по slug (имени папки).
 * Используется на странице /lessons/[slug] для рендеринга урока.
 * Возвращает null если урок не найден — компонент покажет 404.
 */
export async function getLesson(slug: string): Promise<Lesson | null> {
  const filePath = path.join(CONTENT_DIR, slug, "lesson.md");

  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    // Считаем вопросы (нужно для типа Lesson, наследующего LessonMeta)
    const questions = await getQuestions(slug);

    return {
      slug,
      title: data.title as string,
      description: data.description as string,
      order: data.order as number,
      questionCount: questions.length,
      content,
    };
  } catch {
    // Файл не найден — урок с таким slug не существует
    return null;
  }
}

/**
 * Получить вопросы теста для урока.
 * Возвращает пустой массив если quiz.json не найден —
 * не все уроки обязаны иметь тест.
 */
export async function getQuestions(slug: string): Promise<Question[]> {
  const filePath = path.join(CONTENT_DIR, slug, "quiz.json");

  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContent) as Question[];
  } catch {
    return [];
  }
}
