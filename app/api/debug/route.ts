import { NextResponse } from "next/server";
import { validateInitData } from "@/lib/telegram-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug — отладочный эндпоинт.
 * Проверяет: env-переменные, подключение к БД, валидацию initData.
 * УДАЛИТЬ перед продакшеном!
 */
export async function GET(request: Request) {
  const checks: Record<string, unknown> = {};

  // 1. Проверяем env-переменные (не показываем значения!)
  checks.DATABASE_URL = !!process.env.DATABASE_URL;
  checks.DIRECT_URL = !!process.env.DIRECT_URL;
  checks.BOT_TOKEN = !!process.env.BOT_TOKEN;

  // 2. Проверяем подключение к БД
  try {
    const userCount = await prisma.user.count();
    checks.db = { connected: true, userCount };
  } catch (error) {
    checks.db = { connected: false, error: String(error) };
  }

  // 3. Проверяем initData (если передан)
  const initData = request.headers.get("x-init-data");
  if (initData) {
    const result = validateInitData(initData);
    if (result.ok) {
      checks.initData = { valid: true, userId: result.user.id };
    } else {
      checks.initData = { valid: false, error: result.error };
    }
  } else {
    checks.initData = "not provided (add X-Init-Data header)";
  }

  return NextResponse.json(checks);
}
