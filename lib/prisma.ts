import { PrismaClient } from "@prisma/client";

/**
 * Синглтон Prisma Client.
 *
 * Проблема: в dev-режиме Next.js при hot reload каждый модуль
 * пересоздаётся, и `new PrismaClient()` вызывается снова и снова.
 * Каждый вызов — новое подключение к БД. За час можно исчерпать
 * лимит соединений Supabase free tier (~20).
 *
 * Решение: храним экземпляр в globalThis — это объект, который
 * переживает hot reload (Node.js не очищает его при перезагрузке
 * модулей). В production globalThis не используется — там модули
 * загружаются один раз.
 */

// Расширяем тип globalThis, чтобы TypeScript не ругался
// на несуществующее свойство prisma
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Используем существующий экземпляр или создаём новый.
// PrismaClient читает DATABASE_URL из .env автоматически (pooler, порт 6543).
// prisma.config.ts использует DIRECT_URL (порт 5432) для CLI-операций.
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// В dev-режиме сохраняем в globalThis для переиспользования
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
