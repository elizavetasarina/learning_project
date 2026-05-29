import { PrismaClient } from "@prisma/client";

/**
 * Ленивый синглтон Prisma Client.
 *
 * Почему "ленивый": PrismaClient создаётся НЕ при импорте модуля,
 * а при первом обращении к prisma. Это важно, потому что Next.js
 * может загрузить модуль при билде (сборке), когда БД недоступна.
 * Если создавать PrismaClient сразу — билд упадёт с ошибкой подключения.
 *
 * Почему синглтон: в dev-режиме Next.js при hot reload пересоздаёт
 * модули, и без синглтона каждая перезагрузка создаёт новое подключение.
 * Храним экземпляр в globalThis — он переживает hot reload.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Функция создаёт или возвращает существующий PrismaClient.
 * Вызывается только при реальном обращении к БД, не при импорте.
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

// Proxy перехватывает обращения к свойствам (prisma.user, prisma.lessonProgress)
// и делегирует их реальному PrismaClient, создавая его по требованию.
// Снаружи работает как обычный PrismaClient — разницы в использовании нет.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = client[property as keyof PrismaClient];
    // Если свойство — метод, привязываем контекст (this) к клиенту
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
