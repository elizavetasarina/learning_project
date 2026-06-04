"use client";

import { useEffect, useState } from "react";

/**
 * ВРЕМЕННАЯ страница диагностики.
 * Удалить после починки бага сохранения прогресса.
 *
 * Делает GET /api/debug/me с правильным X-Init-Data и выводит ответ
 * как читаемый JSON прямо на экран. Так не нужен DevTools в Telegram.
 */
export default function DebugPage() {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initData =
      typeof window !== "undefined"
        ? window.Telegram?.WebApp?.initData
        : undefined;

    if (!initData) {
      setError("Нет initData — приложение не открыто из Telegram");
      return;
    }

    fetch("/api/debug/me", {
      headers: { "X-Init-Data": initData },
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(`HTTP ${r.status}: ${JSON.stringify(json)}`);
          return;
        }
        setResult(JSON.stringify(json, null, 2));
      })
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="flex flex-col gap-4 px-4 pb-24 pt-6">
      <h1 className="text-[22px] font-semibold">Debug</h1>

      {error && (
        <div className="rounded-xl bg-error/10 p-4 text-[13px] text-error">
          {error}
        </div>
      )}

      {result && (
        <pre className="overflow-x-auto rounded-xl bg-secondary-bg p-4 text-[11px] leading-relaxed">
          {result}
        </pre>
      )}

      {!result && !error && <p className="text-hint">Загрузка...</p>}
    </main>
  );
}
