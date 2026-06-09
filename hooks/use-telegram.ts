"use client";

import { useEffect, useState } from "react";

interface TelegramState {
  user: TelegramWebAppUser | null;
  colorScheme: "light" | "dark";
  isReady: boolean;
  /**
   * Доступна ли нативная MainButton.
   * Используется компонентами, чтобы решить — рендерить ли свою
   * кастомную кнопку (fallback) или скрыть в пользу нативной.
   * На SSR / в браузере вне Telegram = false.
   */
  hasMainButton: boolean;
}

export function useTelegram(): TelegramState {
  const [state, setState] = useState<TelegramState>({
    user: null,
    colorScheme: "light",
    isReady: false,
    hasMainButton: false,
  });

  useEffect(() => {
    // ПРИМЕЧАНИЕ: setState внутри useEffect — корректный паттерн для
    // ОДНОРАЗОВОЙ синхронизации React-state с внешним API (window.Telegram).
    // Это не cascading renders, это «прочитал external once at mount».
    // Альтернатива useSyncExternalStore не подходит: Telegram не эмитит
    // изменений своего состояния, мы просто читаем его наличие.
    /* eslint-disable react-hooks/set-state-in-effect */
    const webApp = window.Telegram?.WebApp;

    if (!webApp) {
      // Приложение открыто вне Telegram (например, в браузере при разработке).
      // Не падаем — просто работаем без данных пользователя.
      setState((prev) => ({ ...prev, isReady: true }));
      return;
    }

    // ready() убирает лоадер Telegram и показывает Mini App пользователю.
    // Без этого вызова Telegram может показывать спиннер бесконечно.
    webApp.ready();

    // expand() разворачивает Mini App на весь экран.
    // По умолчанию он открывается на ~80% высоты.
    webApp.expand();

    setState({
      user: webApp.initDataUnsafe.user ?? null,
      colorScheme: webApp.colorScheme,
      isReady: true,
      hasMainButton: !!webApp.MainButton,
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  return state;
}
