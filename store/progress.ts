import { create } from "zustand";
import { fetchProgress, saveProgress, type LessonProgressData, type UserData } from "@/lib/api-client";

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
   * Возвращает: null = успех, строка = текст ошибки от сервера.
   * Раньше возвращал boolean — но тогда теряли причину ошибки.
   */
  save: (lessonSlug: string, score: number) => Promise<string | null>;
}

// ─── Store ──────────────────────────────────────────────────

export const useProgressStore = create<ProgressState & ProgressActions>(
  (set, get) => ({
    // Начальное состояние
    progressMap: null,
    userData: null,
    lastXpEarned: 0,
    isLoading: false,
    error: null,

    // Загрузка прогресса из API
    load: async () => {
      // Если уже загрузили — не загружаем повторно.
      // Это ключевое отличие от useProgress хука: хук загружал
      // при каждом mount компонента, store — один раз.
      if (get().progressMap !== null || get().isLoading) return;

      set({ isLoading: true, error: null });

      const result = await fetchProgress();

      if (result.ok) {
        const map = new Map(
          result.data.progress.map((p) => [p.lessonSlug, p])
        );
        set({ progressMap: map, userData: result.data.user, isLoading: false });
      } else {
        set({ error: result.error, isLoading: false });
      }
    },

    // Сохранение результата квиза
    save: async (lessonSlug, score) => {
      const result = await saveProgress(lessonSlug, score);

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
  })
);
