import { getAllLessons } from "@/lib/lessons";
import { HomeContent } from "./home-content";

// Серверный компонент: читает список уроков из файловой системы
// и передаёт в клиентский HomeContent через props.
export default async function Home() {
  const lessons = await getAllLessons();
  return <HomeContent lessons={lessons} />;
}
