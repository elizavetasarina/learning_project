/**
 * Универсальный клиентский storage с приоритетом Telegram CloudStorage
 * и fallback на localStorage.
 *
 * Зачем абстракция:
 *   - Telegram CloudStorage — стандартное решение для Mini App, синхронизация
 *     между устройствами, переживает переустановку.
 *   - Но он callback-based и недоступен в локальной разработке (нет WebApp).
 *   - localStorage — простой sync fallback, чтобы dev не ломался.
 *
 * API одинаковый: async get/set. Внутри сам решает куда писать.
 *
 * Сериализация — JSON.stringify/parse. Хранится как строка (этого требует
 * CloudStorage: только строковые значения, лимит 4096 символов).
 */

/** Берём CloudStorage из window.Telegram.WebApp, если он доступен */
function getCloudStorage(): TelegramCloudStorage | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp?.CloudStorage ?? null;
}

/**
 * Получить значение по ключу.
 * Возвращает распарсенный JSON или null если значения нет.
 */
export async function getStoredValue<T>(key: string): Promise<T | null> {
  const cloud = getCloudStorage();

  // Сначала — Telegram CloudStorage (стандарт)
  if (cloud) {
    try {
      const raw = await new Promise<string | undefined>((resolve, reject) => {
        cloud.getItem(key, (error, value) => {
          if (error) reject(new Error(error));
          else resolve(value);
        });
      });
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      // CloudStorage упал — пробуем localStorage как страховку
    }
  }

  // Fallback: localStorage (для локального dev или клиентов без CloudStorage)
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Сохранить значение по ключу.
 * Пишет одновременно в CloudStorage (если есть) и localStorage —
 * вторая запись играет роль локального кэша, чтобы следующее чтение было
 * быстрым даже до того, как CloudStorage синхронизируется с сервером Telegram.
 */
export async function setStoredValue<T>(key: string, value: T): Promise<void> {
  const raw = JSON.stringify(value);

  // Локальный кэш ставим всегда — это бесплатно и ускоряет «следующее чтение»
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    // storage заблокирован — пропускаем
  }

  const cloud = getCloudStorage();
  if (!cloud) return;

  // Промисуем callback для красивого await
  await new Promise<void>((resolve) => {
    cloud.setItem(key, raw, (error) => {
      if (error) {
        console.error(`[storage] CloudStorage.setItem failed for ${key}:`, error);
      }
      // Не реджектим: запись в localStorage уже прошла, страховка есть
      resolve();
    });
  });
}
