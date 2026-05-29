import { validateInitData } from "./telegram-auth";
import { prisma } from "./prisma";

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

    return { ok: true, user };
  } catch (error) {
    console.error("Auth DB error:", error);
    return { ok: false, error: "Database error", status: 500 };
  }
}
