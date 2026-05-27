/** Метаданные урока из frontmatter блока lesson.md */
export interface LessonMeta {
  slug: string;           // имя папки, например "01-what-is-mini-app"
  title: string;          // заголовок из frontmatter
  description: string;    // описание из frontmatter
  order: number;          // порядковый номер для сортировки
  questionCount: number;  // количество вопросов в quiz.json (0 если нет теста)
}

/** Полный урок: метаданные + тело markdown */
export interface Lesson extends LessonMeta {
  content: string;        // markdown-текст (без frontmatter)
}

/** Вопрос с вариантами ответа */
export interface ChoiceQuestion {
  id: string;
  type: "choice";
  question: string;
  options: string[];
  correct: number;        // индекс правильного варианта (с нуля)
  explanation?: string;   // пояснение, показывается после ответа
}

/** Вопрос со свободным вводом */
export interface InputQuestion {
  id: string;
  type: "input";
  question: string;
  answer: string;         // правильный ответ
  explanation?: string;   // пояснение, показывается после ответа
}

/** Объединённый тип — вопрос может быть любым из двух */
export type Question = ChoiceQuestion | InputQuestion;
