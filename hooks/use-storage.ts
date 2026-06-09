"use client";

import { useEffect, useState } from "react";
import { getStoredValue, setStoredValue } from "@/lib/client-storage";

/**
 * useStorage — useState + persistence в Telegram CloudStorage
 * (с fallback на localStorage). Async storage под капотом.
 *
 * Поведение:
 *   - Первый рендер: возвращает initialValue (на сервере и до загрузки).
 *   - useEffect: достаёт сохранённое значение и обновляет state.
 *   - setStoredState: оптимистично обновляет state + пишет в storage.
 *
 * Важно: запись в storage идёт fire-and-forget — мы не блокируем setState
 * ожиданием подтверждения. Если запись упала — состояние всё равно осталось
 * актуальным в памяти, при следующей записи догонит.
 *
 * Поскольку storage асинхронный, есть короткий момент после mount, когда
 * показывается initialValue. Для UX-настроек (аккордеон, dark mode) это норм.
 * Для критичных данных лучше явный loading-стейт.
 */
export function useStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    let cancelled = false;
    getStoredValue<T>(key).then((stored) => {
      // Защита от race: компонент мог размонтироваться
      if (cancelled) return;
      if (stored !== null) setValue(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  function setStoredState(next: T | ((prev: T) => T)) {
    setValue((prev) => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(prev)
          : next;
      // Fire-and-forget: не блокируем UI ожиданием записи
      void setStoredValue(key, resolved);
      return resolved;
    });
  }

  return [value, setStoredState];
}
