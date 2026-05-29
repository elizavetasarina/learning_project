import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Ленивый синглтон Prisma Client с driver adapter (Prisma 7).
 *
 * В Prisma 7 PrismaClient не умеет подключаться к БД сам —
 * нужно дать ему "адаптер" (готовый драйвер PostgreSQL).
 *
 * Архитектура:
 * - @prisma/adapter-pg — адаптер, который использует библиотеку `pg`
 * - pg (node-postgres) — стандартная библиотека для PostgreSQL в Node.js
 * - PrismaClient({ adapter }) — Prisma использует pg для запросов
 *
 * Это разделение ответственности: Prisma отвечает за ORM (типы, запросы),
 * pg — за сетевое подключение. На собесе можно рассказать про adapter pattern.
 *
 * Ленивость: PrismaClient создаётся при первом запросе, не при импорте.
 * Синглтон: globalThis хранит экземпляр между hot reload в dev-режиме.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // PrismaPg создаёт пул соединений внутри себя,
  // используя DATABASE_URL из env для подключения.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({ adapter });
}

// Proxy — ленивая обёртка: создаёт PrismaClient при первом обращении.
// При билде Next.js модуль загружается, но Proxy — пустой объект,
// реальное подключение к БД не происходит.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    const client = globalForPrisma.prisma;
    const value = client[property as keyof PrismaClient];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
