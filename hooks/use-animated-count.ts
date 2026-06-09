"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Плавно анимирует число от текущего отображаемого значения к target.
 *
 * Когда target меняется → запускается requestAnimationFrame-цикл,
 * считающий промежуточные значения с easing-ом, и обновляет state.
 *
 * Прерывание: если target изменится посередине, анимация плавно
 * переключится на новый target из ТЕКУЩЕГО анимированного значения,
 * без рывка обратно к началу.
 *
 * @param target — целевое значение
 * @param duration — длительность анимации в мс (по умолчанию 600)
 * @param initial — стартовое значение для первого рендера. Полезно для
 *   «появляющихся» элементов (бейдж «+N XP» начинает с 0). По умолчанию
 *   равно target — то есть на первом рендере анимации нет, только при
 *   последующих изменениях target.
 *
 * Easing — easeOutCubic: быстрый старт, плавное замедление.
 * Это «телефонная» кривая, ощущается естественно для счётчиков.
 */
export function useAnimatedCount(
  target: number,
  duration: number = 600,
  initial: number = target,
): number {
  const [value, setValue] = useState<number>(initial);

  // Храним последнее отображаемое значение в ref'е — чтобы при изменении
  // target знать «откуда» начинать анимацию (не из устаревшего initial).
  // Запись в ref делаем в useEffect без deps (бежит после каждого render),
  // а не во время render — это удовлетворяет правило react-hooks/refs.
  const currentRef = useRef<number>(initial);
  useEffect(() => {
    currentRef.current = value;
  });

  useEffect(() => {
    const startValue = currentRef.current;
    if (startValue === target) return; // нечего анимировать

    const startTime = performance.now();
    let rafId = 0;

    function step(now: number) {
      const elapsed = now - startTime;
      // t от 0 до 1 — нормализованное время
      const t = Math.min(elapsed / duration, 1);
      // easeOutCubic: 1 - (1-t)^3
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(startValue + (target - startValue) * eased);
      setValue(next);

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      }
    }

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}
