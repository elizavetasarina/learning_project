/**
 * Клиентские функции для API-запросов с Telegram initData.
 *
 * Зачем отдельный модуль вместо голого fetch:
 * - Не копируем заголовок X-Init-Data в каждом компоненте
 * - Централизованная обработка ошибок
 * - Легко заменить/расширить (например, добавить retry или кеш)
 */

/** Получаем initData из Telegram SDK (строка с подписью) */
function getInitData(): string | undefined {
  // window.Telegram может не существовать в dev-режиме (вне Telegram)
  return window.Telegram?.WebApp?.initData || undefined;
}

/** Общая обёртка: добавляет заголовок и парсит ответ */
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const initData = getInitData();

  // В dev-режиме (вне Telegram) initData нет — запрос упадёт с 401.
  // Это нормально: API требует аутентификацию.
  if (!initData) {
    return { ok: false, error: "Not in Telegram" };
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        // Наш кастомный заголовок — сервер достанет и проверит подпись
        "X-Init-Data": initData,
        "Content-Type": "application/json",
      },
    });

    const json = await response.json();

    if (!response.ok) {
      return { ok: false, error: json.error || "Request failed" };
    }

    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

// ─── Типы ответов API ───────────────────────────────────────

/** Прогресс по одному уроку (из GET /api/progress) */
export interface LessonProgressData {
  lessonSlug: string;
  status: "STARTED" | "COMPLETED";
  bestScore: number | null;
  attemptsCount: number;
  startedAt: string;
  completedAt: string | null;
}

/** Ответ GET /api/progress */
interface ProgressResponse {
  progress: LessonProgressData[];
}

/** Ответ POST /api/progress */
interface SaveProgressResponse {
  progress: {
    lessonSlug: string;
    status: "STARTED" | "COMPLETED";
    bestScore: number | null;
    attemptsCount: number;
  };
}

// ─── Экспортируемые функции ─────────────────────────────────

/** Получить прогресс по всем урокам */
export function fetchProgress() {
  return apiRequest<ProgressResponse>("/api/progress");
}

/** Сохранить результат квиза */
export function saveProgress(lessonSlug: string, score: number) {
  return apiRequest<SaveProgressResponse>("/api/progress", {
    method: "POST",
    body: JSON.stringify({ lessonSlug, score }),
  });
}
