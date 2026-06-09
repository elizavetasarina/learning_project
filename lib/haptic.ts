/**
 * Тактильная обратная связь Telegram Mini App.
 *
 * Безопасные обёртки: на старых клиентах (<6.1) и вне Telegram (локальный dev)
 * методы просто молча ничего не делают. Это позволяет дёргать их везде, где
 * хочется, без проверки доступности на каждом вызове.
 *
 * На desktop Telegram haptic-методы существуют, но реальной вибрации нет —
 * это норма платформы (вибрация — мобильная фича).
 *
 * Когда что использовать:
 *   impact('light')   — выбор варианта, лёгкий тап
 *   impact('medium')  — основное действие (переход, отправка)
 *   impact('heavy')   — важный момент, редко
 *   success()         — правильный ответ, цель достигнута, сохранилось
 *   error()           — неправильный ответ, ошибка сохранения
 *   warning()         — внимание, нужно подтверждение
 *   selection()       — переключение чекбокса, тогл
 */

function getHaptic(): TelegramHapticFeedback | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp?.HapticFeedback ?? null;
}

export function impact(
  style: "light" | "medium" | "heavy" | "rigid" | "soft" = "light",
): void {
  getHaptic()?.impactOccurred(style);
}

export function success(): void {
  getHaptic()?.notificationOccurred("success");
}

export function error(): void {
  getHaptic()?.notificationOccurred("error");
}

export function warning(): void {
  getHaptic()?.notificationOccurred("warning");
}

export function selection(): void {
  getHaptic()?.selectionChanged();
}
