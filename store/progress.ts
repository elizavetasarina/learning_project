import { create } from "zustand";
import { fetchProgress, saveProgress, type LessonProgressData } from "@/lib/api-client";

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
  /** Идёт ли загрузка */
  isLoading: boolean;
  /** Была ли ошибка */
  error: string | null;
}

interface ProgressActions {
  /** Загрузить прогресс из API (вызывается один раз при старте) */
  load: () => Promise<void>;
  /** Сохранить результат квиза и обновить локальный state */
  save: (lessonSlug: string, score: number) => Promise<boolean>;
}

// ─── Store ──────────────────────────────────────────────────

export const useProgressStore = create<ProgressState & ProgressActions>(
  (set, get) => ({
    // Начальное состояние
    progressMap: null,
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
        set({ progressMap: map, isLoading: false });
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
          // Сохраняем существующие даты или ставим текущую
          startedAt: existing?.startedAt ?? new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });

        // new Map() чтобы React увидел изменение (Map мутабельный,
        // Zustand сравнивает по ===, поэтому нужна новая ссылка)
        set({ progressMap: new Map(currentMap) });
        return true;
      }

      return false;
    },
  })
);
