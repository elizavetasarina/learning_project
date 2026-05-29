import crypto from "node:crypto";

/**
 * Валидация Telegram initData через HMAC-SHA256.
 *
 * Telegram подписывает данные пользователя секретным ключом,
 * производным от токена бота. Мы повторяем этот процесс
 * и сравниваем результат с hash из initData.
 *
 * Алгоритм (из документации Telegram):
 * 1. Парсим initData как URLSearchParams
 * 2. Извлекаем hash (подпись от Telegram)
 * 3. Остальные параметры сортируем по алфавиту и склеиваем через \n
 * 4. Создаём secret_key = HMAC-SHA256("WebAppData", BOT_TOKEN)
 * 5. Считаем нашу подпись = HMAC-SHA256(secret_key, data_check_string)
 * 6. Сравниваем с hash — если совпало, данные настоящие
 */

// ─── Типы ───────────────────────────────────────────────────

/** Данные пользователя из Telegram initData */
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

/** Результат успешной валидации */
interface ValidationSuccess {
  ok: true;
  user: TelegramUser;
  authDate: number;
}

/** Результат неудачной валидации */
interface ValidationFailure {
  ok: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ─── Константы ──────────────────────────────────────────────

// Максимальный возраст initData в секундах.
// Если auth_date старше — считаем данные устаревшими.
// 86400 = 24 часа. Telegram рекомендует проверять свежесть.
const MAX_AUTH_AGE_SECONDS = 86400;

// ─── Основная функция ───────────────────────────────────────

/**
 * Проверяет подлинность initData от Telegram.
 *
 * @param initData — строка из window.Telegram.WebApp.initData
 * @returns объект с ok: true и данными юзера, либо ok: false и ошибкой
 *
 * Используется в каждом API-запросе (stateless-подход):
 * клиент отправляет initData в заголовке, сервер проверяет.
 */
export function validateInitData(initData: string): ValidationResult {
  // 0. Проверяем, что BOT_TOKEN задан
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    return { ok: false, error: "BOT_TOKEN not configured" };
  }

  // 1. Парсим initData как URL-параметры
  //    initData выглядит так: "user=%7B...%7D&auth_date=123&hash=abc..."
  const params = new URLSearchParams(initData);

  // 2. Извлекаем hash — подпись от Telegram
  const hash = params.get("hash");
  if (!hash) {
    return { ok: false, error: "Missing hash" };
  }

  // 3. Проверяем auth_date — когда Telegram создал эти данные
  const authDateStr = params.get("auth_date");
  if (!authDateStr) {
    return { ok: false, error: "Missing auth_date" };
  }

  const authDate = Number(authDateStr);
  const now = Math.floor(Date.now() / 1000); // текущее время в секундах

  if (now - authDate > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, error: "initData expired" };
  }

  // 4. Собираем data_check_string:
  //    - убираем hash
  //    - сортируем оставшиеся параметры по ключу (алфавит)
  //    - склеиваем как "key=value" через \n
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // 5. Создаём секретный ключ:
  //    HMAC-SHA256 с ключом "WebAppData" и данными BOT_TOKEN.
  //    Это двухступенчатая деривация: сначала из строки "WebAppData"
  //    и токена получаем ключ, потом этим ключом подписываем данные.
  //    Зачем два шага? Чтобы сам токен бота никогда не использовался
  //    напрямую как ключ подписи — стандартная практика в криптографии.
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  // 6. Подписываем data_check_string секретным ключом
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // 7. Сравниваем подписи.
  //    timingSafeEqual — защита от timing attack.
  //    Обычное === сравнивает посимвольно и возвращает false на первом
  //    несовпадении. Атакующий может измерить время ответа и побайтово
  //    подобрать hash. timingSafeEqual всегда тратит одинаковое время.
  const isValid = crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(hash, "hex")
  );

  if (!isValid) {
    return { ok: false, error: "Invalid hash" };
  }

  // 8. Парсим данные пользователя
  const userStr = params.get("user");
  if (!userStr) {
    return { ok: false, error: "Missing user data" };
  }

  try {
    const user: TelegramUser = JSON.parse(userStr);
    return { ok: true, user, authDate };
  } catch {
    return { ok: false, error: "Invalid user JSON" };
  }
}
