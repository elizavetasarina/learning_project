import { validateInitData } from "./telegram-auth";
import { prisma } from "./prisma";

// ─── Хелперы для дат ────────────────────────────────────────

/** Обнуляем часы/минуты/секунды — получаем начало дня в UTC */
function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Разница в днях между двумя датами (обе должны быть началом дня) */
function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/**
 * Тип пользователя, выведенный из Prisma-схемы.
 * Awaited<ReturnType<...>> — берём тип возврата prisma.user.upsert().
 * Это надёжнее, чем import { User } from "@prisma/client",
 * потому что не зависит от того, как Prisma экспортирует типы
 * (в Prisma 7 это изменилось).
 */
type DbUser = Awaited<ReturnType<typeof prisma.user.upsert>>;

/**
 * Результат аутентификации API-запроса.
 * Discriminated union: ok: true → есть user, ok: false → есть error + status.
 */
type AuthResult =
  | { ok: true; user: DbUser }
  | { ok: false; error: string; status: number };

/**
 * Аутентифицирует API-запрос: проверяет initData и находит/создаёт юзера.
 *
 * Каждый API-роут вызывает эту функцию первой строкой:
 * ```ts
 * const auth = await authenticateRequest(request);
 * if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
 * const user = auth.user; // ← TypeScript знает тип User
 * ```
 *
 * Внутри происходит:
 * 1. Извлечение initData из заголовка X-Init-Data
 * 2. HMAC-валидация (подпись от Telegram)
 * 3. Upsert пользователя в БД (создать или обновить)
 */
export async function authenticateRequest(
  request: Request
): Promise<AuthResult> {
  // 1. Достаём initData из заголовка.
  //    Почему заголовок, а не тело запроса?
  //    - Работает для любого HTTP-метода (GET, POST, PUT...)
  //    - Не загрязняет body бизнес-данными
  //    - Стандартный паттерн (как Authorization: Bearer ...)
  const initData = request.headers.get("x-init-data");

  if (!initData) {
    return { ok: false, error: "Missing initData", status: 401 };
  }

  // 2. Проверяем подпись
  const validation = validateInitData(initData);

  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 401 };
  }

  // 3. Upsert: создаём юзера при первом визите, обновляем при повторном.
  //    prisma.user.upsert() — одна операция вместо "findFirst → if null → create":
  //    - where: ищем по telegramId
  //    - create: если не нашли — создаём с этими данными
  //    - update: если нашли — обновляем имя/username (могли измениться в Telegram)
  try {
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(validation.user.id) },
      create: {
        telegramId: BigInt(validation.user.id),
        firstName: validation.user.first_name,
        username: validation.user.username ?? null,
        languageCode: validation.user.language_code ?? null,
      },
      update: {
        // Обновляем данные — юзер мог сменить имя или username в Telegram
        firstName: validation.user.first_name,
        username: validation.user.username ?? null,
      },
    });

    // Обновляем активность и стрик с throttle: не чаще раза в час.
    const ONE_HOUR = 60 * 60 * 1000;
    const lastActivity = user.lastActivityAt?.getTime() ?? 0;

    if (Date.now() - lastActivity > ONE_HOUR) {
      // Считаем стрик: сравниваем дату последней активности с сегодня.
      // Все даты приводим к началу дня (UTC) для корректного сравнения.
      const today = startOfDayUTC(new Date());
      const lastDay = user.lastActivityAt
        ? startOfDayUTC(user.lastActivityAt)
        : null;

      let newStreak = user.currentStreak;

      if (!lastDay) {
        // Первый визит — стрик = 1
        newStreak = 1;
      } else {
        const diffDays = daysBetween(lastDay, today);
        if (diffDays === 0) {
          // Тот же день — стрик не меняется
        } else if (diffDays === 1) {
          // Следующий день — стрик растёт
          newStreak = user.currentStreak + 1;
        } else {
          // Пропуск 2+ дней — стрик сброшен, начинаем с 1
          newStreak = 1;
        }
      }

      const newLongest = Math.max(newStreak, user.longestStreak);

      // Сброс дневного XP: если dailyXpDate не сегодня — обнуляем
      const dailyXpDay = user.dailyXpDate
        ? startOfDayUTC(user.dailyXpDate)
        : null;
      const isNewDay = !dailyXpDay || daysBetween(dailyXpDay, today) > 0;
      const newDailyXp = isNewDay ? 0 : user.dailyXp;

      // fire-and-forget: не блокируем ответ
      prisma.user
        .update({
          where: { id: user.id },
          data: {
            lastActivityAt: new Date(),
            currentStreak: newStreak,
            longestStreak: newLongest,
            ...(isNewDay && { dailyXp: 0, dailyXpDate: new Date() }),
          },
        })
        .catch(() => {});

      // Обновляем объект user для текущего ответа
      user.currentStreak = newStreak;
      user.longestStreak = newLongest;
      user.dailyXp = newDailyXp;
      user.lastActivityAt = new Date();
    }

    return { ok: true, user };
  } catch (error) {
    console.error("Auth DB error:", error);
    return { ok: false, error: "Database error", status: 500 };
  }
}
