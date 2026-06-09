"use client";

import { useEffect } from "react";

/**
 * useTelegramBackButton(onClick) — нативная кнопка «назад» в Mini App.
 *
 * При mount:
 *   - регистрируем onClick
 *   - вызываем show() — кнопка появляется в шапке Telegram (рядом с «Закрыть»)
 * При unmount:
 *   - снимаем onClick
 *   - вызываем hide() — кнопка исчезает
 *
 * Зачем native, а не своя «← К урокам»:
 *   1) Telegram-юзеры привыкли к этому месту, ищут там
 *   2) Освобождается верх UI — нет «съеденного» места под навигацию
 *   3) Меньше своего кода в каждой странице
 *
 * Если API недоступен (старый клиент, локальный dev) — хук молча ничего
 * не делает. Это безопасно: страница продолжит работать, юзер использует
 * системную «закрыть» или кастомную кнопку, если она оставлена.
 *
 * Важно: коллбэк передаётся через рефлекс — если меняется ссылка на функцию,
 * надо перепривязать. Для простоты тут пересоздаём подписку при каждом
 * изменении onClick. Это редкий случай в практике (onClick обычно стабилен).
 */
export function useTelegramBackButton(onClick: () => void): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bb = window.Telegram?.WebApp?.BackButton;
    if (!bb) return;

    bb.onClick(onClick);
    bb.show();

    return () => {
      bb.offClick(onClick);
      bb.hide();
    };
  }, [onClick]);
}
