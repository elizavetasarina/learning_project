"use client";

import { useEffect, useRef } from "react";

/**
 * Декларативный хук для нативной главной кнопки Telegram.
 *
 * Идея: компонент описывает «что должно быть на кнопке прямо сейчас»,
 * хук синхронизирует это с реальным Telegram MainButton API.
 *
 * Если API недоступен (не Telegram, старый клиент) — хук молча ничего
 * не делает. Компонент сам должен решить, рендерить ли fallback-кнопку
 * в DOM (или прятать её, если хук работает).
 *
 * Жизненный цикл:
 *   - mount: setText + show + onClick(handler)
 *   - update: setParams (атомарно обновляет text/active/visible)
 *   - unmount: hide + offClick
 *
 * Важный нюанс с onClick:
 *   Telegram API регистрирует коллбэки по ССЫЛКЕ. Если на каждом рендере
 *   передавать новую функцию, придётся постоянно offClick + onClick — это
 *   создаёт окно гонки. Решение: один «стабильный» внутренний коллбэк,
 *   который через ref зовёт актуальный onClick. Так Telegram видит одну
 *   и ту же ссылку всё время компонента.
 */
export interface MainButtonOptions {
  text: string;
  onClick: () => void;
  /** Показывать ли кнопку. По умолчанию true */
  isVisible?: boolean;
  /** Активна ли (или серая) */
  isActive?: boolean;
  /** Спиннер вместо текста — для async-операций */
  isProgressVisible?: boolean;
}

export function useTelegramMainButton(opts: MainButtonOptions): void {
  // Рефлекс на актуальный onClick. Telegram API регистрирует
  // одну стабильную обёртку, которая всегда вызывает свежий onClick.
  // Запись в ref — в useEffect без deps, чтобы не нарушать react-hooks/refs.
  const onClickRef = useRef(opts.onClick);
  useEffect(() => {
    onClickRef.current = opts.onClick;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const btn = window.Telegram?.WebApp?.MainButton;
    if (!btn) return;

    const handler = () => onClickRef.current();
    btn.onClick(handler);

    return () => {
      btn.offClick(handler);
      btn.hide();
    };
  }, []); // onClick хранится в рефе — пересоздавать подписку не нужно

  const {
    text,
    isVisible = true,
    isActive = true,
    isProgressVisible = false,
  } = opts;

  // Синхронизация параметров: текст, активность, прогресс, видимость.
  // Зависимости — примитивы, поэтому effect не дёргается на каждом рендере.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const btn = window.Telegram?.WebApp?.MainButton;
    if (!btn) return;

    // setParams — атомарное обновление сразу нескольких параметров.
    // Лучше отдельных setText/enable/disable: меньше промежуточных
    // мерцаний на нативной кнопке.
    btn.setParams({
      text,
      is_active: isActive,
      is_visible: isVisible,
    });

    // Прогресс — отдельный API, в setParams не входит
    if (isProgressVisible) {
      btn.showProgress(false);
    } else {
      btn.hideProgress();
    }
  }, [text, isVisible, isActive, isProgressVisible]);
}
