/**
 * Обёртка над Telegram Bot API.
 *
 * Bot API — HTTP-сервер Telegram'а. Никаких SDK: дёргаем
 * https://api.telegram.org/bot<TOKEN>/<method> через fetch.
 *
 * Используется в cron-эндпоинте для рассылки пушей юзерам.
 */

const BOT_API_BASE = "https://api.telegram.org";

/**
 * Кнопка-ссылка на Mini App.
 *
 * web_app — специальный тип кнопки, открывает Mini App
 * внутри Telegram, передавая initData. Это лучше обычной URL-кнопки:
 * не нужно открывать браузер, юзер сразу попадает в приложение.
 */
interface WebAppButton {
  text: string;
  url: string; // URL Mini App
}

interface SendMessageOptions {
  /** Telegram ID получателя (у нас = users.telegram_id) */
  chatId: bigint | number;
  /** Текст сообщения. Поддерживает HTML: <b>, <i>, <code> */
  text: string;
  /** Опциональная кнопка под сообщением */
  button?: WebAppButton;
}

/**
 * Результат отправки: bool + детали для диагностики.
 *
 * Раньше возвращали только bool, но это слишком мало для отладки —
 * теряли причину отказа. Теперь возвращаем сырой ответ Telegram'а:
 * status (200/400/403/...) и body (текст ответа Bot API).
 *
 * В массовом cron используется только поле `ok`. В test-push и логах
 * читаем status/body для диагностики.
 */
export interface SendResult {
  ok: boolean;
  status: number | null;     // HTTP-статус от Bot API, null если fetch упал
  body: unknown;             // тело ответа (JSON или текст)
  error?: string;            // текст исключения, если был throw
}

/**
 * Отправить сообщение юзеру через бота.
 * Не бросает: в массовой рассылке одна упавшая отправка
 * не должна валить весь cron.
 */
export async function sendMessage(opts: SendMessageOptions): Promise<SendResult> {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error("[telegram-bot] BOT_TOKEN не задан");
    return { ok: false, status: null, body: null, error: "BOT_TOKEN missing" };
  }

  // Собираем body. reply_markup добавляется только если есть кнопка.
  const body: Record<string, unknown> = {
    chat_id: opts.chatId.toString(),
    text: opts.text,
    parse_mode: "HTML",
  };

  if (opts.button) {
    body.reply_markup = {
      inline_keyboard: [
        [
          {
            text: opts.button.text,
            web_app: { url: opts.button.url },
          },
        ],
      ],
    };
  }

  try {
    const response = await fetch(`${BOT_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Bot API всегда отдаёт JSON: { ok, result?, error_code?, description? }
    const parsed = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(
        `[telegram-bot] sendMessage failed: ${response.status}`,
        parsed,
      );
      return { ok: false, status: response.status, body: parsed };
    }

    return { ok: true, status: response.status, body: parsed };
  } catch (err) {
    console.error("[telegram-bot] sendMessage threw:", err);
    return {
      ok: false,
      status: null,
      body: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
