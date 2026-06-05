import { ReviewView } from "./review-view";

/**
 * Серверная обёртка над страницей повторения.
 *
 * Данные подгружает клиентский ReviewView через API
 * (нужен initData из window.Telegram — на сервере его нет).
 * Эта страница просто рендерит компонент.
 */
export default function ReviewPage() {
  return <ReviewView />;
}
