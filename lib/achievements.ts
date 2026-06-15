/**
 * Система ачивок.
 *
 * Определения хранятся в коде — не в БД. Это позволяет добавлять
 * новые ачивки без миграций: просто добавь в ACHIEVEMENTS и задеплой.
 * Факты получения (кто и когда) — в таблице user_achievements.
 */

import { getAllLessons } from "./lessons";
import type { prisma as PrismaType } from "@/lib/prisma";

type PrismaClient = typeof PrismaType;

// ─── Типы ───────────────────────────────────────────────────

export interface AchievementDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

// ─── Список всех ачивок ─────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [
  // Уроки
  { id: "first-lesson",  emoji: "🎯", title: "Первый шаг",       description: "Прошёл первый урок" },
  { id: "half-lessons",  emoji: "📚", title: "Половина пути",    description: "Прошёл половину всех уроков" },
  { id: "all-lessons",   emoji: "🏅", title: "Выпускник",        description: "Прошёл все уроки" },
  { id: "perfect-score", emoji: "⭐", title: "Отличник",         description: "Сдал тест на 100%" },
  { id: "five-perfect",  emoji: "💎", title: "Перфекционист",    description: "Сдал 5 тестов на 100%" },
  // Модули
  { id: "js-master",     emoji: "🟡", title: "JS-мастер",        description: "Прошёл все уроки JavaScript" },
  { id: "ts-master",     emoji: "🔵", title: "TS-мастер",        description: "Прошёл все уроки TypeScript" },
  { id: "react-master",  emoji: "⚛️", title: "React-мастер",     description: "Прошёл все уроки React" },
  // Стрик
  { id: "streak-3",      emoji: "🔥", title: "Первый огонёк",    description: "Стрик 3 дня подряд" },
  { id: "streak-7",      emoji: "🔥", title: "Недельный марафон", description: "Стрик 7 дней подряд" },
  { id: "streak-30",     emoji: "🏆", title: "Месяц без перерыва", description: "Стрик 30 дней подряд" },
  // XP
  { id: "xp-100",        emoji: "⚡", title: "Первые шаги",      description: "Набрал 100 XP" },
  { id: "xp-500",        emoji: "⚡", title: "В потоке",         description: "Набрал 500 XP" },
  { id: "xp-1000",       emoji: "💪", title: "Ветеран",          description: "Набрал 1000 XP" },
];

// ─── Проверка и выдача ──────────────────────────────────────

/**
 * Проверяет все условия и выдаёт новые ачивки юзеру.
 * Вызывается после POST /api/progress (завершение теста).
 *
 * Возвращает список ID ачивок, выданных именно сейчас (новых).
 * Пустой массив — всё уже было получено или условия не выполнены.
 */
export async function checkAndAward(
  userId: number,
  prismaClient: PrismaClient,
): Promise<string[]> {
  // Загружаем всё параллельно: состояние юзера, прогресс, уже полученные ачивки
  const [user, progress, existing, allLessons] = await Promise.all([
    prismaClient.user.findUnique({
      where: { id: userId },
      select: { totalXp: true, longestStreak: true },
    }),
    prismaClient.lessonProgress.findMany({
      where: { userId },
      select: { lessonSlug: true, status: true, bestScore: true },
    }),
    prismaClient.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    }),
    getAllLessons(),
  ]);

  if (!user) return [];

  const existingIds = new Set(existing.map((e) => e.achievementId));
  const completedSlugs = new Set(
    progress.filter((p) => p.status === "COMPLETED").map((p) => p.lessonSlug),
  );
  const perfectCount = progress.filter((p) => p.bestScore === 100).length;

  // Слаги уроков по модулям — для модульных ачивок
  const jsLessons = allLessons.filter((l) => l.moduleSlug === "01-javascript");
  const tsLessons = allLessons.filter((l) => l.moduleSlug === "02-typescript");
  const reactLessons = allLessons.filter((l) => l.moduleSlug === "03-react");

  // Собираем список ачивок, условия которых выполнены и которые ещё не выданы
  const toAward: string[] = [];

  function check(id: string, condition: boolean) {
    if (!existingIds.has(id) && condition) toAward.push(id);
  }

  // Уроки
  check("first-lesson",  completedSlugs.size >= 1);
  check("half-lessons",  completedSlugs.size >= Math.ceil(allLessons.length / 2));
  check("all-lessons",   completedSlugs.size >= allLessons.length);
  check("perfect-score", perfectCount >= 1);
  check("five-perfect",  perfectCount >= 5);

  // Модули — прошёл ВСЕ уроки модуля
  check("js-master",    jsLessons.length > 0 && jsLessons.every((l) => completedSlugs.has(l.slug)));
  check("ts-master",    tsLessons.length > 0 && tsLessons.every((l) => completedSlugs.has(l.slug)));
  check("react-master", reactLessons.length > 0 && reactLessons.every((l) => completedSlugs.has(l.slug)));

  // Стрик — longestStreak чтобы не зависеть от lazy reset текущего стрика
  check("streak-3",  user.longestStreak >= 3);
  check("streak-7",  user.longestStreak >= 7);
  check("streak-30", user.longestStreak >= 30);

  // XP
  check("xp-100",  user.totalXp >= 100);
  check("xp-500",  user.totalXp >= 500);
  check("xp-1000", user.totalXp >= 1000);

  if (toAward.length > 0) {
    await prismaClient.userAchievement.createMany({
      data: toAward.map((achievementId) => ({ userId, achievementId })),
      skipDuplicates: true,
    });
  }

  return toAward;
}
