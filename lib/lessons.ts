import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import type {
  Lesson,
  LessonMeta,
  ModuleMeta,
  ModuleWithLessons,
  Question,
} from "@/types/content";

/**
 * Файловая структура контента (2 уровня):
 *
 *   content/
 *     01-javascript/
 *       module.json            ← метаданные модуля (title, order)
 *       01-types-and-references/
 *         lesson.md            ← теория + frontmatter (title, description, order)
 *         quiz.json            ← вопросы
 *       02-closures/
 *         ...
 *     05-this-project/
 *       module.json
 *       01-architecture/
 *         ...
 *
 * Slug урока — составной: "{module-folder}/{lesson-folder}".
 * Например: "01-javascript/01-types-and-references".
 * Это удобно: одной строкой адресуем урок в URL, в БД, в Map'е прогресса.
 */

const CONTENT_DIR = path.join(process.cwd(), "content");

// ─── Вспомогательные функции ────────────────────────────────

/** Прочитать module.json из папки модуля. Если файла нет — null. */
async function readModuleMeta(moduleDir: string): Promise<ModuleMeta | null> {
  const metaPath = path.join(CONTENT_DIR, moduleDir, "module.json");

  try {
    const content = await fs.readFile(metaPath, "utf-8");
    const data = JSON.parse(content) as Omit<ModuleMeta, "slug">;
    return {
      slug: moduleDir,
      title: data.title,
      description: data.description,
      order: data.order,
    };
  } catch {
    return null;
  }
}

/**
 * Прочитать один урок: frontmatter + посчитать вопросы.
 * Если lesson.md не найден — null.
 */
async function readLessonMeta(
  moduleSlug: string,
  lessonDir: string,
): Promise<LessonMeta | null> {
  const lessonPath = path.join(CONTENT_DIR, moduleSlug, lessonDir, "lesson.md");

  try {
    const fileContent = await fs.readFile(lessonPath, "utf-8");
    const { data } = matter(fileContent);

    // Подсчёт вопросов — отдельный try (quiz.json может отсутствовать)
    let questionCount = 0;
    try {
      const quizPath = path.join(CONTENT_DIR, moduleSlug, lessonDir, "quiz.json");
      const quizContent = await fs.readFile(quizPath, "utf-8");
      questionCount = (JSON.parse(quizContent) as unknown[]).length;
    } catch {
      // quiz.json не найден — это нормально
    }

    return {
      slug: `${moduleSlug}/${lessonDir}`,
      moduleSlug,
      title: data.title as string,
      description: data.description as string,
      order: data.order as number,
      questionCount,
    };
  } catch {
    return null;
  }
}

// ─── Публичный API ──────────────────────────────────────────

/**
 * Получить все модули с их уроками — для группированной отрисовки.
 * Это основной способ чтения уроков на странице /lessons.
 */
export async function getModulesWithLessons(): Promise<ModuleWithLessons[]> {
  const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
  const moduleDirs = entries.filter((e) => e.isDirectory());

  const modules = await Promise.all(
    moduleDirs.map(async (moduleDir): Promise<ModuleWithLessons | null> => {
      const meta = await readModuleMeta(moduleDir.name);
      if (!meta) return null; // папка без module.json — не модуль

      // Читаем уроки внутри модуля
      const lessonEntries = await fs.readdir(
        path.join(CONTENT_DIR, moduleDir.name),
        { withFileTypes: true },
      );
      const lessonDirs = lessonEntries.filter((e) => e.isDirectory());

      const lessons = await Promise.all(
        lessonDirs.map((d) => readLessonMeta(moduleDir.name, d.name)),
      );

      // Отбрасываем null'ы (папки без lesson.md), сортируем по order
      const validLessons = lessons
        .filter((l): l is LessonMeta => l !== null)
        .sort((a, b) => a.order - b.order);

      return { ...meta, lessons: validLessons };
    }),
  );

  // Отбрасываем null'ы (папки без module.json), сортируем модули по order
  return modules
    .filter((m): m is ModuleWithLessons => m !== null)
    .sort((a, b) => a.order - b.order);
}

/**
 * Получить плоский список всех уроков (без тела markdown).
 * Используется там, где нужен общий список без группировки —
 * например, на главной для подсчёта статистики или карточки «Продолжить».
 */
export async function getAllLessons(): Promise<LessonMeta[]> {
  const modules = await getModulesWithLessons();
  return modules.flatMap((m) => m.lessons);
}

/**
 * Получить один урок по составному slug ("module/lesson").
 * Используется на странице /lessons/[...slug].
 */
export async function getLesson(slug: string): Promise<Lesson | null> {
  const [moduleSlug, lessonSlug] = slug.split("/");
  if (!moduleSlug || !lessonSlug) return null;

  const lessonPath = path.join(CONTENT_DIR, moduleSlug, lessonSlug, "lesson.md");

  try {
    const fileContent = await fs.readFile(lessonPath, "utf-8");
    const { data, content } = matter(fileContent);
    const questions = await getQuestions(slug);

    return {
      slug,
      moduleSlug,
      title: data.title as string,
      description: data.description as string,
      order: data.order as number,
      questionCount: questions.length,
      content,
    };
  } catch {
    return null;
  }
}

/**
 * Получить вопросы теста для урока по составному slug.
 * Пустой массив если quiz.json не найден.
 */
export async function getQuestions(slug: string): Promise<Question[]> {
  const [moduleSlug, lessonSlug] = slug.split("/");
  if (!moduleSlug || !lessonSlug) return [];

  const quizPath = path.join(CONTENT_DIR, moduleSlug, lessonSlug, "quiz.json");

  try {
    const fileContent = await fs.readFile(quizPath, "utf-8");
    return JSON.parse(fileContent) as Question[];
  } catch {
    return [];
  }
}
