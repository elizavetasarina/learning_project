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

/**
 * CloudStorage — стандартное хранилище Telegram Mini App.
 * Синхронизируется между устройствами одного юзера, переживает переустановку.
 * API callback-based: callback(error, value), error: string | null.
 *
 * Лимиты (на 2024): 1024 ключа на бот×юзера, ключ ≤ 128 символов,
 * значение ≤ 4096 символов.
 *
 * Доступен с версии WebApp 6.9+. На старых клиентах — undefined.
 */
interface TelegramCloudStorage {
  setItem: (
    key: string,
    value: string,
    callback?: (error: string | null, success?: boolean) => void,
  ) => void;
  getItem: (
    key: string,
    callback: (error: string | null, value?: string) => void,
  ) => void;
  getItems: (
    keys: string[],
    callback: (error: string | null, values?: Record<string, string>) => void,
  ) => void;
  removeItem: (
    key: string,
    callback?: (error: string | null, success?: boolean) => void,
  ) => void;
  removeItems: (
    keys: string[],
    callback?: (error: string | null, success?: boolean) => void,
  ) => void;
  getKeys: (
    callback: (error: string | null, keys?: string[]) => void,
  ) => void;
}

/**
 * Тактильная обратная связь Telegram Mini App.
 * Только на мобильных устройствах с поддержкой haptics — на десктопе
 * методы существуют, но ничего не происходит. На WebApp 6.0 и старше — undefined.
 */
interface TelegramHapticFeedback {
  /** Удар: light/medium/heavy/rigid/soft. Для UI-событий (тап, переход) */
  impactOccurred: (
    style: "light" | "medium" | "heavy" | "rigid" | "soft",
  ) => void;
  /** Уведомление: success/error/warning. Для исхода действия */
  notificationOccurred: (type: "error" | "success" | "warning") => void;
  /** Смена выбора (тонкий тик). Для пикеров и тоглов */
  selectionChanged: () => void;
}

/**
 * Нативная главная кнопка внизу экрана Mini App.
 * Сильнее всех CTA-кнопок: видна всегда, прибита к низу, цвет из темы.
 * Используется для основного действия экрана (Сохранить, Далее, Завершить).
 */
interface TelegramMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText: (text: string) => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  setParams: (params: {
    text?: string;
    color?: string;
    text_color?: string;
    is_active?: boolean;
    is_visible?: boolean;
  }) => void;
}

/**
 * Нативная кнопка «назад» в шапке Telegram. Удобнее кастомной — юзер уже знает,
 * где её искать. Появилась в WebApp 6.1.
 */
interface TelegramBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
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
  version: string;
  /** Доступен на WebApp 6.9+, иначе undefined */
  CloudStorage?: TelegramCloudStorage;
  /** Тактильные импульсы. Доступно с WebApp 6.1+ */
  HapticFeedback?: TelegramHapticFeedback;
  /** Нативная кнопка «назад» в шапке Telegram. Доступно с 6.1+ */
  BackButton?: TelegramBackButton;
  /** Нативная главная кнопка внизу. Доступно всегда (с очень старых версий) */
  MainButton?: TelegramMainButton;
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
