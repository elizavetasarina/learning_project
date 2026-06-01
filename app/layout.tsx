import type { Metadata } from "next";
import Script from "next/script";
import { TabBar } from "./tab-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "TG Mini App",
  description: "Telegram Mini App для обучения",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    //   suppressHydrationWarning — разрешаем расхождение атрибутов
    //   между сервером и клиентом на этих тегах.
    //   Причина: Telegram SDK (telegram-web-app.js) при загрузке
    //   добавляет свои атрибуты и классы к <html> и <body>.
    //   React видит, что серверный HTML не совпадает с DOM — и ругается.
    //   Этот проп говорит: "на этом конкретном элементе — ок, не сравнивай".
    //   Важно: он действует только на сам элемент, не на его детей.
    <html lang="ru" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/*
          beforeInteractive — скрипт загрузится до гидрации React.
          Это нужно, чтобы к моменту вызова useTelegram объект
          window.Telegram.WebApp уже существовал.
        */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {children}
        <TabBar />
      </body>
    </html>
  );
}
