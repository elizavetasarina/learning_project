/**
 * Типы для Telegram WebApp SDK.
 * Описываем только то, что используем — расширяем по мере надобности.
 * Полная документация: https://core.telegram.org/bots/webapps
 */

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface TelegramWebApp {
  // Сырая строка initData для отправки на бэкенд (валидация)
  initData: string;
  // Распарсенные данные — удобно для чтения, но НЕ для доверия
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramWebAppUser;
    auth_date?: number;
    hash?: string;
  };
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  viewportHeight: number;
  viewportStableHeight: number;
  platform: string;
  // Сигнализирует Telegram, что приложение загрузилось и готово к показу
  ready: () => void;
  expand: () => void;
  close: () => void;
}

// Расширяем глобальный Window, чтобы TypeScript знал про window.Telegram
interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
