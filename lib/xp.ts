/**
 * Расчёт уровня и прогресса по XP.
 *
 * Формула: level = floor(sqrt(xp / 50))
 * Каждый следующий уровень требует больше XP:
 *   Уровень 1:   50 XP
 *   Уровень 2:  200 XP
 *   Уровень 3:  450 XP
 *   Уровень 4:  800 XP
 *   Уровень 5: 1250 XP
 *
 * Прогресс до следующего уровня считается как процент
 * между XP текущего и следующего уровня.
 */

const XP_FACTOR = 50;

/** XP, необходимый для достижения данного уровня */
export function xpForLevel(level: number): number {
  return level * level * XP_FACTOR;
}

/** Текущий уровень по количеству XP */
export function getLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / XP_FACTOR));
}

/** Прогресс до следующего уровня (0-100%) */
export function getLevelProgress(xp: number): number {
  const currentLevel = getLevel(xp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const range = nextLevelXp - currentLevelXp;

  if (range === 0) return 0;
  return Math.round(((xp - currentLevelXp) / range) * 100);
}
