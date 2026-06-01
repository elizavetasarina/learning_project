/**
 * Склонение русских существительных по числу.
 *
 * Русский язык имеет 3 формы множественного числа:
 * - one:  1, 21, 31, 101...  → "вопрос"
 * - few:  2-4, 22-24...      → "вопроса"
 * - many: 5-20, 25-30, 100...→ "вопросов"
 *
 * Исключение: 11-19 всегда "many" (одиннадцать вопросОВ, не вопрос).
 *
 * @param n — число
 * @param one — форма для 1 (вопрос, урок, попытка)
 * @param few — форма для 2-4 (вопроса, урока, попытки)
 * @param many — форма для 5+ (вопросов, уроков, попыток)
 */
export function pluralize(
  n: number,
  one: string,
  few: string,
  many: string
): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;

  // 11-19 — особый случай: всегда "many"
  if (abs >= 11 && abs <= 19) return many;

  if (lastDigit === 1) return one;
  if (lastDigit >= 2 && lastDigit <= 4) return few;
  return many;
}
