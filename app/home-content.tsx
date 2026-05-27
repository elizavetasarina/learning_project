"use client";

import { useTelegram } from "@/hooks/use-telegram";

export function HomeContent() {
  const { user, isReady } = useTelegram();

  if (!isReady) return null;

  const displayName = user?.first_name ?? "Гость";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">
        Привет, {displayName}!
      </h1>
      <p className="text-center text-hint">
        Добро пожаловать в учебное Mini App
      </p>
      <button
        type="button"
        className="rounded-xl bg-button-bg px-6 py-3 text-button-text font-medium transition-opacity active:opacity-70"
      >
        Начать обучение
      </button>
    </main>
  );
}
