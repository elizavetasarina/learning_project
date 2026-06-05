import { validateInitData } from "./telegram-auth";
import { prisma } from "./prisma";
import { startOfDayInTz, daysBetweenInTz } from "./datetime";

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
 * 4. Сохранение таймзоны юзера из заголовка X-Timezone
 * 5. Пересчёт стрика и дневного XP в таймзоне юзера
 */
export async function authenticateRequest(
  request: Request
): Promise<AuthResult> {
  // 1. Достаём initData из заголовка.
  const initData = request.headers.get("x-init-data");
  if (!initData) {
    return { ok: false, error: "Missing initData", status: 401 };
  }

  // Таймзона юзера приходит отдельным заголовком.
  // Клиент берёт её через Intl.DateTimeFormat().resolvedOptions().timeZone.
  // Может быть undefined — тогда фолбэк на UTC в datetime.ts.
  const tzHeader = request.headers.get("x-timezone") || undefined;

  // 2. Проверяем подпись
  const validation = validateInitData(initData);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 401 };
  }

  // 3. Upsert: создаём при первом визите, обновляем при повторном.
  try {
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(validation.user.id) },
      create: {
        telegramId: BigInt(validation.user.id),
        firstName: validation.user.first_name,
        username: validation.user.username ?? null,
        languageCode: validation.user.language_code ?? null,
        // Если клиент уже прислал tz — сохраняем сразу при создании
        timezone: tzHeader ?? null,
      },
      update: {
        firstName: validation.user.first_name,
        username: validation.user.username ?? null,
        // undefined → Prisma пропустит поле и не затрёт существующее значение.
        // Это важно: tz могла быть сохранена раньше, не хотим её обнулять,
        // если клиент по какой-то причине не прислал заголовок.
        timezone: tzHeader ?? undefined,
      },
    });

    // Эффективная таймзона: только что пришедшая или сохранённая, фолбэк UTC.
    const effectiveTz = tzHeader ?? user.timezone ?? null;

    // Обновляем активность и стрик с throttle: не чаще раза в час.
    const ONE_HOUR = 60 * 60 * 1000;
    const lastActivity = user.lastActivityAt?.getTime() ?? 0;

    if (Date.now() - lastActivity > ONE_HOUR) {
      // ВАЖНО: все сравнения дней — в таймзоне юзера.
      // Если юзер в МСК заходит в 00:30 МСК — это уже новый день для него,
      // даже если в UTC ещё 21:30 предыдущих суток.
      const now = new Date();
      const today = startOfDayInTz(now, effectiveTz);
      const lastDay = user.lastActivityAt
        ? startOfDayInTz(user.lastActivityAt, effectiveTz)
        : null;

      let newStreak = user.currentStreak;

      if (!lastDay) {
        newStreak = 1;
      } else {
        const diffDays = daysBetweenInTz(lastDay, today, effectiveTz);
        if (diffDays === 0) {
          // Тот же локальный день — стрик не меняется
        } else if (diffDays === 1) {
          newStreak = user.currentStreak + 1;
        } else {
          newStreak = 1;
        }
      }

      const newLongest = Math.max(newStreak, user.longestStreak);

      // Сброс dailyXp: если dailyXpDate относится к другому локальному дню — обнуляем
      const dailyXpDay = user.dailyXpDate
        ? startOfDayInTz(user.dailyXpDate, effectiveTz)
        : null;
      const isNewDay =
        !dailyXpDay || daysBetweenInTz(dailyXpDay, today, effectiveTz) > 0;
      const newDailyXp = isNewDay ? 0 : user.dailyXp;

      prisma.user
        .update({
          where: { id: user.id },
          data: {
            lastActivityAt: now,
            currentStreak: newStreak,
            longestStreak: newLongest,
            ...(isNewDay && { dailyXp: 0, dailyXpDate: now }),
          },
        })
        .catch(() => {});

      // Обновляем объект user для текущего ответа
      user.currentStreak = newStreak;
      user.longestStreak = newLongest;
      user.dailyXp = newDailyXp;
      user.lastActivityAt = now;
    }

    return { ok: true, user };
  } catch (error) {
    console.error("Auth DB error:", error);
    return { ok: false, error: "Database error", status: 500 };
  }
}
