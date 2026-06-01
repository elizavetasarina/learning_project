import { create } from "zustand";

/**
 * Quiz Store — состояние текущего теста.
 *
 * Зачем отдельный store, а не useState в компоненте:
 * Когда урок будет с вкладками (Теория / Тест), переключение
 * между ними размонтирует компонент теста. useState сбросится —
 * юзер потеряет ответы. Zustand хранит state вне React.
 *
 * Store привязан к конкретному уроку (slug). При открытии
 * другого урока — state сбрасывается.
 */

// ─── Типы ───────────────────────────────────────────────────

interface QuizState {
  /** Slug урока, к которому привязан текущий тест */
  slug: string | null;
  /** Индекс текущего вопроса */
  currentIndex: number;
  /** Ответы: questionId → число (choice), число[] (multi) или строка (input) */
  answers: Record<string, number | number[] | string>;
  /** Показан ли результат текущего вопроса */
  showResult: boolean;
  /** Количество правильных ответов */
  correctCount: number;
  /** Тест завершён — показывается итоговый экран */
  isFinished: boolean;
}

interface QuizActions {
  /** Инициализировать тест для урока (сбросить если другой slug) */
  init: (slug: string) => void;
  /** Записать ответ на вопрос */
  setAnswer: (questionId: string, answer: number | number[] | string) => void;
  /** Переключить вариант для multi-вопроса (добавить/убрать из массива) */
  toggleMultiAnswer: (questionId: string, index: number) => void;
  /** Показать результат текущего вопроса */
  check: (isCorrect: boolean) => void;
  /** Перейти к следующему вопросу или завершить тест */
  next: (isLast: boolean) => void;
  /** Начать тест заново */
  retry: () => void;
}

// ─── Store ──────────────────────────────────────────────────

const initialState: QuizState = {
  slug: null,
  currentIndex: 0,
  answers: {},
  showResult: false,
  correctCount: 0,
  isFinished: false,
};

export const useQuizStore = create<QuizState & QuizActions>((set, get) => ({
  ...initialState,

  init: (slug) => {
    // Если тест уже для этого урока и не завершён — не сбрасываем.
    // Юзер переключился на теорию и вернулся — ответы на месте.
    if (get().slug === slug && !get().isFinished) return;

    set({ ...initialState, slug });
  },

  setAnswer: (questionId, answer) => {
    set((state) => ({
      answers: { ...state.answers, [questionId]: answer },
    }));
  },

  toggleMultiAnswer: (questionId, index) => {
    set((state) => {
      // Берём текущий массив выбранных или создаём пустой
      const current = (state.answers[questionId] as number[]) ?? [];
      const next = current.includes(index)
        ? current.filter((i) => i !== index)  // убираем если уже выбран
        : [...current, index];                // добавляем если не выбран
      return { answers: { ...state.answers, [questionId]: next } };
    });
  },

  check: (isCorrect) => {
    set((state) => ({
      showResult: true,
      correctCount: isCorrect ? state.correctCount + 1 : state.correctCount,
    }));
  },

  next: (isLast) => {
    if (isLast) {
      set({ isFinished: true });
    } else {
      set((state) => ({
        showResult: false,
        currentIndex: state.currentIndex + 1,
      }));
    }
  },

  retry: () => {
    const slug = get().slug;
    set({ ...initialState, slug });
  },
}));
