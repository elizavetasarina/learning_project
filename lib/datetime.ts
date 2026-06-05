/**
 * Утилиты для работы с датами в произвольной IANA-таймзоне.
 *
 * Зачем не date-fns-tz / dayjs / moment:
 * Нам нужны всего две функции (offset и startOfDay в tz).
 * Тащить либу на 40-100KB ради двух функций — overkill.
 * Используем нативный Intl.DateTimeFormat — он есть во всех Node 14+
 * и поддерживает все IANA-tz из системной базы tzdata.
 *
 * Главная функция здесь — startOfDayInTz(date, tz):
 * возвращает UTC-instant, который соответствует 00:00:00 локального дня
 * в указанной таймзоне.
 */

/**
 * Сколько минут таймзона опережает UTC в указанный момент.
 * Учитывает летнее время, исторические сдвиги и т.д. — всё через tzdata.
 *
 * Пример: tz="Europe/Moscow" → +180 (МСК всегда UTC+3, без DST)
 * tz="America/New_York" → -240 летом, -300 зимой (с учётом DST)
 *
 * Алгоритм: форматируем дату как «локальное время в tz» (получаем Y-M-D H:M:S
 * как если бы это была UTC-дата), переводим в timestamp через Date.UTC,
 * вычитаем оригинальный timestamp — разница и есть offset.
 */
export function getTzOffsetMinutes(date: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  // Hour в hour12: false может быть "24" в полночь (нестандарт) — нормализуем
  const hour = get("hour") === 24 ? 0 : get("hour");

  const tzAsUtcMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return Math.round((tzAsUtcMs - date.getTime()) / 60000);
}

/**
 * UTC-instant, соответствующий 00:00:00 текущего локального дня в tz.
 *
 * Пример (tz="Europe/Moscow", UTC+3):
 *   date = 2026-06-05T01:00 UTC (= 04:00 МСК того же дня) → 2026-06-04T21:00 UTC
 *                                                            (= 00:00 МСК 5 июня)
 *
 * Алгоритм:
 * 1. Узнаём offset (например +180 минут для МСК).
 * 2. Сдвигаем дату в UTC на offset — получаем «как будто локальное время в UTC».
 * 3. Обнуляем часы/минуты — получаем начало локального дня.
 * 4. Сдвигаем обратно на -offset → UTC-instant начала локального дня.
 *
 * Если tz пустая или невалидная — возвращаем startOfDay по UTC (фолбэк).
 */
export function startOfDayInTz(date: Date, tz: string | null | undefined): Date {
  if (!tz) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  try {
    const offsetMin = getTzOffsetMinutes(date, tz);
    const shifted = new Date(date.getTime() + offsetMin * 60_000);
    shifted.setUTCHours(0, 0, 0, 0);
    return new Date(shifted.getTime() - offsetMin * 60_000);
  } catch {
    // Невалидная tz — фолбэк на UTC, не валим запрос
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
}

/**
 * Разница в полных днях между двумя датами в указанной tz.
 * Обе даты приводятся к началу локального дня в tz, затем вычитаются.
 */
export function daysBetweenInTz(
  a: Date,
  b: Date,
  tz: string | null | undefined,
): number {
  const startA = startOfDayInTz(a, tz);
  const startB = startOfDayInTz(b, tz);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((startB.getTime() - startA.getTime()) / MS_PER_DAY);
}
