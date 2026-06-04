/**
 * Модуль = группа уроков по одной теме (JavaScript, React, ...).
 *
 * Берётся из content/{module-folder}/module.json.
 * slug = имя папки модуля, например "01-javascript".
 */
export interface ModuleMeta {
  slug: string;           // имя папки модуля, "01-javascript"
  title: string;          // "JavaScript глубоко"
  description: string;    // короткое описание модуля
  order: number;          // порядок отображения модулей
}

/**
 * Метаданные урока из frontmatter блока lesson.md.
 *
 * Slug — составной: "{module-slug}/{lesson-folder}".
 * Например: "01-javascript/04-closures-deep".
 * Это позволяет одной строкой адресовать урок и в URL, и в БД.
 */
export interface LessonMeta {
  slug: string;           // составной: "01-javascript/04-closures-deep"
  moduleSlug: string;     // "01-javascript"
  title: string;          // из frontmatter
  description: string;    // из frontmatter
  order: number;          // порядок внутри модуля (из frontmatter)
  questionCount: number;  // количество вопросов в quiz.json (0 если нет)
}

/** Полный урок: метаданные + тело markdown */
export interface Lesson extends LessonMeta {
  content: string;        // markdown-текст (без frontmatter)
}

/**
 * Модуль вместе со своими уроками — удобно для группировки в UI.
 * Используется на странице /lessons, чтобы рендерить секции по модулям.
 */
export interface ModuleWithLessons extends ModuleMeta {
  lessons: LessonMeta[];
}

// ─── Вопросы ────────────────────────────────────────────────

/** Вопрос с вариантами ответа */
export interface ChoiceQuestion {
  id: string;
  type: "choice";
  question: string;
  options: string[];
  correct: number;        // индекс правильного варианта (с нуля)
  explanation?: string;   // пояснение, показывается после ответа
}

/** Вопрос с несколькими правильными ответами */
export interface MultiQuestion {
  id: string;
  type: "multi";
  question: string;
  options: string[];
  correct: number[];      // массив индексов правильных вариантов
  explanation?: string;
}

/** Вопрос со свободным вводом */
export interface InputQuestion {
  id: string;
  type: "input";
  question: string;
  answer: string;         // правильный ответ
  explanation?: string;   // пояснение, показывается после ответа
}

/** Объединённый тип — вопрос может быть любым из трёх */
export type Question = ChoiceQuestion | MultiQuestion | InputQuestion;
