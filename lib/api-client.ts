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

/**
 * IANA-таймзона юзера, как её видит браузер: "Europe/Moscow", "Asia/Tokyo" и т.д.
 * Это нативный браузерный API, никаких либ. Возвращает undefined в самых старых
 * браузерах — тогда сервер фолбэкнется на UTC.
 */
function getTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
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
    const tz = getTimezone();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        // Наш кастомный заголовок — сервер достанет и проверит подпись
        "X-Init-Data": initData,
        // Таймзона юзера — сервер сохранит и будет считать стрики в его дне
        ...(tz && { "X-Timezone": tz }),
        "Content-Type": "application/json",
      },
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Логируем для диагностики: какой статус и что вернул сервер
      console.error(
        `[api] ${options.method ?? "GET"} ${url} → ${response.status}`,
        json,
      );
      return {
        ok: false,
        error: json.error || `HTTP ${response.status}`,
      };
    }

    return { ok: true, data: json as T };
  } catch (err) {
    console.error(`[api] ${options.method ?? "GET"} ${url} threw:`, err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
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

/** Данные юзера из API */
export interface UserData {
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  dailyXp: number;
  dailyGoal: number;
  rank: number;
}

/** Ответ GET /api/progress */
interface ProgressResponse {
  progress: LessonProgressData[];
  user: UserData;
}

/** Ответ POST /api/progress */
interface SaveProgressResponse {
  progress: {
    lessonSlug: string;
    status: "STARTED" | "COMPLETED";
    bestScore: number | null;
    attemptsCount: number;
  };
  /** XP, заработанный за это прохождение (0 если не улучшил результат) */
  xpEarned: number;
  /** Сколько SR-записей обновили (для аналитики, может быть 0) */
  srUpdated?: number;
}

/** Один ответ юзера в тесте для обновления SR */
export interface QuestionAnswer {
  questionId: string;
  isCorrect: boolean;
}

// ─── Экспортируемые функции ─────────────────────────────────

/** Получить прогресс по всем урокам */
export function fetchProgress() {
  return apiRequest<ProgressResponse>("/api/progress");
}

/**
 * Сохранить результат квиза.
 *
 * Параметр answers (опциональный) — массив ответов юзера на каждый вопрос.
 * Если передан, сервер дополнительно пересчитает SR-расписание для каждого
 * вопроса через SM-2. Если не передан — SR-логика пропускается, только
 * lesson_progress обновится (обратная совместимость).
 */
export function saveProgress(
  lessonSlug: string,
  score: number,
  answers?: QuestionAnswer[],
) {
  return apiRequest<SaveProgressResponse>("/api/progress", {
    method: "POST",
    body: JSON.stringify({ lessonSlug, score, answers }),
  });
}

/** Ответ /api/reviews/init */
interface InitReviewsResponse {
  ok: true;
  created: number;
}

/** Элемент списка «к повтору сейчас» */
export interface DueReview {
  lessonSlug: string;
  questionId: string;
}

/** Ответ /api/reviews/due */
interface DueReviewsResponse {
  due: DueReview[];
}

/** Один элемент сессии повторения — урок + полный вопрос */
export interface ReviewSessionItem {
  lessonSlug: string;
  lessonTitle: string;
  // Полный объект вопроса с типом из @/types/content.
  // Не импортирую тип сюда чтобы не плодить deep-импорты; импортируем там, где используем.
  question: import("@/types/content").Question;
}

/** Ответ /api/reviews/session */
interface ReviewSessionResponse {
  items: ReviewSessionItem[];
}

/** Ответ /api/reviews/answer */
interface ReviewAnswerResponse {
  intervalDays: number;
  nextReviewAt: string;
}

/**
 * Список вопросов, которые пора повторить сейчас.
 * Главная использует .length для бейджа, /review — полный массив.
 */
export function fetchDueReviews() {
  return apiRequest<DueReviewsResponse>("/api/reviews/due");
}

/** Сессия повторения — полные данные вопросов для UI экрана /review */
export function fetchReviewSession() {
  return apiRequest<ReviewSessionResponse>("/api/reviews/session");
}

/** Обновить дневную цель юзера */
export function updateDailyGoal(dailyGoal: number) {
  return apiRequest<{ ok: true; dailyGoal: number }>("/api/user/settings", {
    method: "PATCH",
    body: JSON.stringify({ dailyGoal }),
  });
}

/** Один ответ в режиме повторения */
export function answerReview(
  lessonSlug: string,
  questionId: string,
  isCorrect: boolean,
) {
  return apiRequest<ReviewAnswerResponse>("/api/reviews/answer", {
    method: "POST",
    body: JSON.stringify({ lessonSlug, questionId, isCorrect }),
  });
}

/**
 * Eager-инициализация SR-записей для урока.
 *
 * Вызывается при mount LessonView: «вот slug + id вопросов, добавь в SR
 * те, которых ещё нет». Идемпотентно — можно дёргать сколько угодно раз.
 *
 * Fire-and-forget на клиенте: если запрос упал — урок всё равно открылся,
 * SR подхватит вопросы при следующем заходе.
 */
export function initReviews(lessonSlug: string, questionIds: string[]) {
  return apiRequest<InitReviewsResponse>("/api/reviews/init", {
    method: "POST",
    body: JSON.stringify({ lessonSlug, questionIds }),
  });
}
