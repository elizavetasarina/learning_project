"use client";

import { useEffect, useState } from "react";
import { fetchProgress, type LessonProgressData } from "@/lib/api-client";

/**
 * Кастомный хук — загрузка прогресса пользователя.
 *
 * Инкапсулирует всю логику: fetch, преобразование в Map, loading-состояние.
 * Используется в home-content, lessons-list, progress-view вместо
 * дублированного useEffect + useState в каждом компоненте.
 *
 * Возвращает:
 * - progressMap: Map<slug, progress> | null
 * - isLoading: boolean
 */
export function useProgress() {
  const [progressMap, setProgressMap] = useState<Map<
    string,
    LessonProgressData
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await fetchProgress();
      if (result.ok) {
        // Map вместо массива: O(1) поиск по slug вместо O(n)
        const map = new Map(
          result.data.progress.map((p) => [p.lessonSlug, p])
        );
        setProgressMap(map);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  return { progressMap, isLoading };
}
