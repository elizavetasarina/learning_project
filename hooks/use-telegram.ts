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
  }, []);

  return state;
}
