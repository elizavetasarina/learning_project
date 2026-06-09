import { create } from "zustand";
import {
  fetchProgress,
  saveProgress,
  fetchDueReviews,
  updateDailyGoal,
  type LessonProgressData,
  type QuestionAnswer,
  type UserData,
} from "@/lib/api-client";

/**
 * Progress Store — глобальное состояние прогресса пользователя.
 *
 * Заменяет хук useProgress. Преимущества перед хуком:
 * 1. State живёт вне React — не сбрасывается при навигации между страницами
 * 2. Загрузка один раз — при первом обращении, а не при каждом mount компонента
 * 3. Actions (load, save) рядом с данными — единый источник правды
 * 4. Точечные подписки — компонент перерендерится только если изменилось
 *    поле, на которое он подписан
 */

// ─── Типы ───────────────────────────────────────────────────

interface ProgressState {
  /** Map: lessonSlug → прогресс. null = ещё не загружали */
  progressMap: Map<string, LessonProgressData> | null;
  /** Данные юзера: стрик, XP */
  userData: UserData | null;
  /** XP, полученный за последний save (для показа "+N XP" в quiz-view) */
  lastXpEarned: number;
  /** Сколько вопросов сейчас к повтору (для карточки на главной) */
  dueCount: number;
  /** Идёт ли загрузка */
  isLoading: boolean;
  /** Была ли ошибка */
  error: string | null;
}

interface ProgressActions {
  /** Загрузить прогресс из API (вызывается один раз при старте) */
  load: () => Promise<void>;
  /**
   * Сохранить результат квиза и обновить локальный state.
   * answers — массив { questionId, isCorrect } для обновления SR-расписания.
   * Возвращает: null = успех, строка = текст ошибки от сервера.
   */
  save: (
    lessonSlug: string,
    score: number,
    answers?: QuestionAnswer[],
  ) => Promise<string | null>;
  /** Уменьшить счётчик «к повтору» (оптимистичное обновление) */
  decrementDue: () => void;
  /**
   * Поменять дневную цель.
   * Оптимистично применяет, шлёт PATCH на сервер.
   * На ошибке откатывает. Возвращает null = ok, string = ошибка.
   */
  setDailyGoal: (value: number) => Promise<string | null>;
}

// ─── Store ──────────────────────────────────────────────────

export const useProgressStore = create<ProgressState & ProgressActions>(
  (set, get) => ({
    // Начальное состояние
    progressMap: null,
    userData: null,
    lastXpEarned: 0,
    dueCount: 0,
    isLoading: false,
    error: null,

    // Загрузка прогресса + due-counts параллельно из API.
    // Promise.all: оба запроса уходят одновременно, общий wall-time = max,
    // а не сумма. На медленной сети заметно.
    load: async () => {
      // Если уже загрузили — не загружаем повторно.
      if (get().progressMap !== null || get().isLoading) return;

      set({ isLoading: true, error: null });

      const [progressResult, dueResult] = await Promise.all([
        fetchProgress(),
        fetchDueReviews(),
      ]);

      if (progressResult.ok) {
        const map = new Map(
          progressResult.data.progress.map((p) => [p.lessonSlug, p]),
        );
        // dueResult — мягкая ошибка: если упал, считаем 0. Не валим главный.
        const dueCount = dueResult.ok ? dueResult.data.due.length : 0;
        set({
          progressMap: map,
          userData: progressResult.data.user,
          dueCount,
          isLoading: false,
        });
      } else {
        set({ error: progressResult.error, isLoading: false });
      }
    },

    // Сохранение результата квиза
    save: async (lessonSlug, score, answers) => {
      const result = await saveProgress(lessonSlug, score, answers);

      if (result.ok) {
        // Обновляем локальный state, не дожидаясь повторной загрузки.
        // Это "оптимистичное обновление": UI сразу показывает новый результат.
        const currentMap = get().progressMap ?? new Map();
        const existing = currentMap.get(lessonSlug);

        currentMap.set(lessonSlug, {
          lessonSlug,
          status: result.data.progress.status,
          bestScore: result.data.progress.bestScore,
          attemptsCount: result.data.progress.attemptsCount,
          startedAt: existing?.startedAt ?? new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });

        // Обновляем XP локально: totalXp и dailyXp + дельта из ответа
        const prevUser = get().userData;
        const updatedUser = prevUser
          ? {
              ...prevUser,
              totalXp: prevUser.totalXp + result.data.xpEarned,
              dailyXp: prevUser.dailyXp + result.data.xpEarned,
            }
          : null;

        set({
          progressMap: new Map(currentMap),
          userData: updatedUser,
          lastXpEarned: result.data.xpEarned,
        });
        return null; // успех
      }

      return result.error; // текст ошибки от сервера
    },

    decrementDue: () => {
      set({ dueCount: Math.max(0, get().dueCount - 1) });
    },

    setDailyGoal: async (value) => {
      const prevUser = get().userData;
      if (!prevUser) return "User data not loaded yet";

      // Оптимистично применяем — UI мгновенный
      set({ userData: { ...prevUser, dailyGoal: value } });

      const result = await updateDailyGoal(value);
      if (!result.ok) {
        // Откат: вернуть прежнее значение
        set({ userData: prevUser });
        return result.error;
      }
      // На успехе — серверное значение (на случай нормализации)
      set({ userData: { ...prevUser, dailyGoal: result.data.dailyGoal } });
      return null;
    },
  })
);
