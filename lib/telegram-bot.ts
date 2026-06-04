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
 * Отправить сообщение юзеру через бота.
 *
 * Возвращает true при успехе, false при ошибке.
 * Не бросает — в массовой рассылке одна упавшая отправка
 * не должна валить весь cron.
 */
export async function sendMessage(opts: SendMessageOptions): Promise<boolean> {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error("[telegram-bot] BOT_TOKEN не задан");
    return false;
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

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `[telegram-bot] sendMessage failed: ${response.status} ${text}`,
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[telegram-bot] sendMessage threw:", err);
    return false;
  }
}
