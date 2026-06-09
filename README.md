# ITlearn — Telegram Mini App для подготовки к собеседованиям

Учебное приложение для фронтенд-разработчиков, оформленное как Telegram Mini App.
Уроки в markdown, тесты с пояснениями, прогресс с XP/стриками/уровнями,
spaced repetition по алгоритму SM-2, push-уведомления через бота.

**Демо:** [@learning_pet_project_bot](https://t.me/learning_pet_project_bot) в Telegram (нажмите Menu Button → «Открыть»)

---

## Скриншоты

> _Сюда — 4-6 скриншотов в готовом виде:_
> Главная (XP/стрик/цель) · Список уроков с модулями ·
> Урок (теория) · Тест с пояснениями · Экран повтора · Прогресс

---

## Что это и зачем

Я мидл-фронтенд разработчик и делаю этот проект **одновременно** как учебный
полигон и как pet-project для портфолио. Содержание уроков покрывает темы,
которые спрашивают на собесах: глубокий JS/TS, React internals, сеть,
архитектура, system design.

Сам проект — fullstack: фронт на Next.js 16 (App Router), бэк на Next.js API
Routes, БД Postgres через Supabase + Prisma 7, авторизация через
HMAC-валидацию Telegram initData, деплой на Vercel.

**Ключевые архитектурные решения** разобраны ниже — они и есть основная
ценность проекта для портфолио.

---

## Стек

| Слой              | Технология                                  |
| ----------------- | ------------------------------------------- |
| Frontend          | Next.js 16 (App Router), React 19           |
| Язык              | TypeScript strict                           |
| Стили             | Tailwind CSS 4                              |
| State             | Zustand                                     |
| Markdown          | react-markdown + gray-matter + rehype-raw   |
| Backend           | Next.js API Routes                          |
| БД                | Postgres (Supabase free tier)               |
| ORM               | Prisma 7 + `@prisma/adapter-pg`             |
| Auth              | Telegram initData + HMAC-SHA256             |
| Deploy            | Vercel                                      |
| Cron              | Vercel Cron Jobs                            |
| Bot               | Telegram Bot API через `fetch`              |
| Иконки            | lucide-react                                |

---

## Архитектурные решения

Раздел для тех, кто открыл README ради «расскажи технические решения». Каждое
решение — это **выбор с обоснованием**, а не догма. По любому могу объяснить
альтернативы и почему остановилась на этом.

### 1. Stateless-аутентификация через Telegram initData

При открытии Mini App Telegram передаёт строку `initData`, подписанную HMAC-SHA256
(ключ — производный от токена бота). Сервер на каждом API-запросе:

1. Достаёт `initData` из заголовка `X-Init-Data`.
2. Пересчитывает HMAC через **двухступенчатую деривацию ключа**
   (`secret = HMAC("WebAppData", BOT_TOKEN)`, потом `hash = HMAC(secret, data)`).
3. Сравнивает подписи через `crypto.timingSafeEqual` (защита от timing attack).

**Что это даёт:** не нужны сессии в БД, токены, JWT. Каждый запрос
самодостаточен — можно горизонтально масштабировать без stickness.

**Tradeoff:** ~0.5мс HMAC на каждом запросе vs одна стоимость + лёгкий БД-запрос
для проверки сессии. Для нашего масштаба HMAC дешевле.

Код: [`lib/telegram-auth.ts`](lib/telegram-auth.ts), [`lib/auth.ts`](lib/auth.ts).

### 2. Lazy reset стриков и дневной цели

Вместо cron-задачи «в 00:00 обнули всем dailyXp» — `authenticateRequest`
при каждом запросе проверяет: «изменилась ли календарная дата по сравнению
с последней активностью? Если да — обнули dailyXp, увеличь стрик».

```ts
const today = startOfDayInTz(now, user.timezone);
const lastDay = startOfDayInTz(user.lastActivityAt, user.timezone);
const isNewDay = daysBetweenInTz(lastDay, today, user.timezone) > 0;
if (isNewDay) {
  newDailyXp = 0;
  newStreak = isStreakDay ? user.currentStreak + 1 : 1;
}
```

**Что это даёт:** работа делается **только когда юзер реально пришёл**.
Никакого cron на тысячи обнулений в пустую. Это паттерн **lazy evaluation**.

**Бонус:** работает с тайм-зонами юзера. Я считаю «новый день» в его IANA-tz
через `Intl.DateTimeFormat`, не в UTC. Юзер в МСК видит «новый день»
ровно в 00:00 МСК, а не в 03:00.

Код: [`lib/auth.ts`](lib/auth.ts), [`lib/datetime.ts`](lib/datetime.ts).

### 3. XP только за улучшение результата (с защитой от race condition)

Пройденный тест начисляет XP **только если новый результат выше предыдущего
лучшего**. Это решает: грайнд («прохожу 10 раз одну тему ради XP»),
отсутствие стимула («один раз прошёл — XP получил, дальше нет смысла улучшать»).

Под капотом:

```sql
INSERT INTO lesson_progress (...) VALUES (...)
ON CONFLICT (user_id, lesson_slug)
DO UPDATE SET
  best_score = GREATEST(lesson_progress.best_score, EXCLUDED.best_score),
  ...
```

XP в БД обновляется атомарно через Prisma `{ increment: xpEarned }`. Это
гарантия от race condition при параллельных запросах: вместо
`SELECT total_xp → +N → UPDATE` (классический lost update) — одна атомарная
SQL-операция.

Код: [`app/api/progress/route.ts`](app/api/progress/route.ts).

### 4. Spaced repetition по SM-2

Реализован **алгоритм SuperMemo-2** (1985, основа Anki) — каждый вопрос
запоминается отдельной картой с состоянием:

- `easeFactor` — «лёгкость» вопроса (2.5 на старте, минимум 1.3)
- `intervalDays` — через сколько дней показать снова
- `repetitions` — подряд правильных ответов
- `nextReviewAt` — конкретная дата следующего показа

После каждого ответа вызывается чистая функция `nextSRState(prev, grade, now)`
и пересчитывает все три значения по канонической формуле SM-2.

```
Правильно: интервал растёт (1 → 6 → 6×EF → ...). EF чуть прибавляется.
Ошибка:    интервал = 1 (показать завтра). EF не меняется
           (одна ошибка не делает карту фундаментально сложнее).
```

Запись добавляется **eager** при открытии урока через
`createMany({ skipDuplicates: true })` — это под капотом Postgres
`INSERT ... ON CONFLICT DO NOTHING`. Эндпоинт идемпотентен: повторный
вызов с теми же данными — `created: 0`.

Чтение вопросов «к повтору сейчас» — индекс
`@@index([userId, nextReviewAt])`, запрос `WHERE next_review_at <= NOW()`
работает за O(log n).

Код: [`lib/sr.ts`](lib/sr.ts), [`app/api/reviews/`](app/api/reviews/),
[`app/review/`](app/review/).

### 5. Raw SQL casts в Prisma 7 + adapter-pg

Реальный баг и фикс, который пришлось ловить: в `$queryRawUnsafe` параметры
уходят в `pg`-драйвер как unknown-тип, и Postgres интерпретирует их как
`text` по умолчанию. Колонки же типизированные:

```
column "status" is of type "LessonStatus" but expression is of type text
column "best_score" is of type integer but expression is of type text
```

Фикс — явные касты в SQL:

```sql
INSERT INTO lesson_progress (..., status, best_score)
VALUES (...,
  (CASE WHEN $3::int >= $4::int THEN 'COMPLETED' ELSE 'STARTED' END)::"LessonStatus",
  $3::int, ...)
```

Полезная тема для собеса — конкретное столкновение с особенностью Postgres
implicit cast'ов и ORM-абстракции.

### 6. Telegram Mini App API на максимум

Помимо initData, проект использует **четыре** Mini App-специфичных API,
которые отличают «webapp в Telegram» от настоящего Mini App:

| API                    | Где использован                                       |
| ---------------------- | ----------------------------------------------------- |
| **HapticFeedback**     | Вибрация на правильный/неправильный ответ, при достижении дневной цели, при сохранении настроек |
| **BackButton**         | Нативная стрелка «назад» в шапке Telegram заменяет нашу |
| **MainButton**         | Кнопка «Проверить» / «Следующий» / «Завершить» — нативная Telegram-кнопка с прогресс-индикатором |
| **CloudStorage**       | Persistence открытых модулей аккордеона между устройствами |

Везде сделан **fallback** на стандартное поведение (custom button, localStorage), если API недоступно — локальный dev и старые клиенты работают.

Код: [`hooks/use-telegram-*.ts`](hooks/), [`lib/haptic.ts`](lib/haptic.ts),
[`lib/client-storage.ts`](lib/client-storage.ts).

### 7. Push-уведомления через Bot API + Vercel Cron

Ежедневный cron (`vercel.json`, `0 18 * * *` UTC) дёргает защищённый
эндпоинт `/api/cron/daily-push`. Эндпоинт:

1. Проверяет `Authorization: Bearer ${CRON_SECRET}` (защита от внешних дёрганий).
2. Берёт юзеров с активностью за последние 14 дней.
3. Для каждого вызывает **чистую функцию** `pickNotification(user)` —
   выбирает один из трёх триггеров по приоритету:
   - `streak-at-risk` (стрик > 0 и dailyXp = 0 сегодня)
   - `comeback` (≥ 2 дня без активности)
   - `finish-goal` (dailyXp > 0, но < dailyGoal)
4. Отправляет через Bot API с `web_app` кнопкой,
   нарезая на чанки по 10 параллельных запросов (защита от rate limit).

`pickNotification` — чистая функция: не зависит от БД, не делает HTTP-вызовов,
легко тестируется. Разделение **бизнес-правил** от **инфраструктуры**.

Код: [`lib/notifications.ts`](lib/notifications.ts),
[`lib/telegram-bot.ts`](lib/telegram-bot.ts),
[`app/api/cron/daily-push/route.ts`](app/api/cron/daily-push/route.ts).

### 8. Контент как файлы, а не БД-записи

Уроки и тесты — это файлы в репозитории
(`content/{module}/{lesson}/lesson.md` + `quiz.json`). БД хранит только
прогресс юзера. Решения:

- Markdown писать быстрее, чем заполнять формы или TS-объекты
- Git-версионирование контента
- Можно попросить AI сгенерировать готовый .md и положить в проект
- Профессиональный паттерн (так делают Vercel docs, Stripe docs)
- На собесе можно рассказать про **content-as-code**

Slug урока — составной (`"01-javascript/04-closures-deep"`), хранится в БД и
идёт в URL через **catch-all routing** Next.js (`[...slug]`). Это позволяет
2-уровневую иерархию модулей без сложного роутинга.

Код: [`content/`](content/), [`lib/lessons.ts`](lib/lessons.ts),
[`app/lessons/[...slug]/page.tsx`](app/lessons/[...slug]/page.tsx).

---

## Структура проекта

```
app/
  api/                  Серверные API-роуты
    progress/           GET/POST прогресс
    reviews/            SR: init, due, session, answer
    user/settings/      PATCH dailyGoal
    cron/daily-push/    Cron для пушей
  lessons/[...slug]/    Страница урока (теория + квиз)
  review/               Сессия повторения
  progress/             Экран «Мой прогресс»

content/                Контент как файлы
  01-javascript/        module.json + папки уроков
  02-typescript/
  03-react/
  04-network-perf/
  05-this-project/

lib/                    Серверная логика и утилиты
  auth.ts               HMAC-аутентификация + стрики + dailyXp
  prisma.ts             Ленивый singleton клиента
  telegram-auth.ts      Криптография валидации initData
  telegram-bot.ts       Обёртка Bot API
  notifications.ts      Чистая функция выбора пуша
  sr.ts                 Алгоритм SM-2
  datetime.ts           startOfDayInTz через Intl
  lessons.ts            Чтение контента из файловой системы
  api-client.ts         Клиентские fetch-обёртки с типами
  client-storage.ts     CloudStorage / localStorage fallback
  haptic.ts             Тактильные импульсы

hooks/                  React-хуки (только клиентские)
  use-telegram.ts       initData, юзер, hasMainButton
  use-storage.ts        Persistent state
  use-telegram-main-button.ts
  use-telegram-back-button.ts
  use-animated-count.ts requestAnimationFrame-анимация чисел

store/                  Zustand-стора (вне React-дерева)
  progress.ts           Прогресс, userData, dueCount
  quiz.ts               State текущего теста, переживает unmount

types/                  Только типы
  content.ts            Lesson, Module, Question
  telegram.d.ts         Глобальные типы window.Telegram
```

---

## БД-схема (упрощённо)

```prisma
model User {
  id              Int       @id @default(autoincrement())
  telegramId      BigInt    @unique
  firstName       String
  username        String?
  currentStreak   Int       @default(0)
  longestStreak   Int       @default(0)
  totalXp         Int       @default(0)
  dailyGoal       Int       @default(50)
  dailyXp         Int       @default(0)
  dailyXpDate     DateTime?
  timezone        String?    // IANA, "Europe/Moscow"
  lastActivityAt  DateTime?
  createdAt       DateTime  @default(now())
}

model LessonProgress {
  id              Int          @id @default(autoincrement())
  userId          Int
  lessonSlug      String       // "01-javascript/02-closures"
  status          LessonStatus // STARTED | COMPLETED (порог 85%)
  bestScore       Int?
  attemptsCount   Int          @default(0)
  startedAt       DateTime     @default(now())
  completedAt     DateTime?
  @@unique([userId, lessonSlug])
}

model ReviewSchedule {
  id              Int       @id @default(autoincrement())
  userId          Int
  lessonSlug      String
  questionId      String
  easeFactor      Float     @default(2.5)
  intervalDays    Int       @default(0)
  repetitions     Int       @default(0)
  nextReviewAt    DateTime  @default(now())
  lastReviewedAt  DateTime?
  @@unique([userId, lessonSlug, questionId])
  @@index([userId, nextReviewAt])  // для запроса "к повтору сегодня"
}
```

---

## Локальный запуск

```bash
# Установка
npm install

# Заполнить .env.local:
#   DATABASE_URL=...     (Supabase pooler, transaction mode)
#   DIRECT_URL=...       (Supabase pooler, session mode — для миграций)
#   BOT_TOKEN=...        (из BotFather)
#   CRON_SECRET=...      (любая случайная hex-строка)
#   APP_URL=https://...  (URL Mini App)

# Применить схему к БД
npx prisma db push

# Сгенерировать клиент Prisma
npx prisma generate

# Запустить dev-сервер
npm run dev
```

**Замечание:** локальный dev запускается вне Telegram, поэтому
аутентификация падает с 401 (нет `initData`). API-запросы не работают, но
можно проверить рендеринг страниц, типизацию, контент. Полное тестирование
— через ngrok / Telegram WebApp с подменённым URL.

---

## Tradeoffs и осознанные ограничения

| Решение | Альтернатива | Почему так |
| --- | --- | --- |
| Stateless HMAC на каждом запросе | Сессии + JWT | Tradeoff: HMAC ~0.5мс vs БД-чтение сессии. Для масштаба проще |
| Lazy reset дневного XP | Cron в 00:00 | Не делаем работу для давно отвалившихся юзеров |
| Контент как файлы | Админка + БД | Не нужна админка, контент пишется быстрее, версионируется в Git |
| Один cron на 18:00 UTC всем | Cron в локальный полдень каждого юзера | Free tier Vercel — 1 cron в день. Достаточно для MVP |
| SM-2 (1985) | FSRS (2022) | FSRS требует тысячи ответов для тренировки модели. SM-2 работает с первого ответа |
| `prisma db push` | `prisma migrate` | Один разработчик, проще без миграционной истории |
| Прокидывание реальных ошибок клиенту (временно, для багфикса) | Generic 500 | Сейчас вернулось к generic после починки. Логи в Vercel |
| CloudStorage с localStorage-fallback | Только CloudStorage | Локальный dev работает без Telegram |

---

## Что покрывает проект для собеса

Поднимаемые на mid-собесе темы, которые проект реально иллюстрирует кодом:

- **JS/TS:** Замыкания, this, прототипы, equality, generics, utility types, infer
- **React:** Reconciliation, Fiber, хуки изнутри, stale closure, Zustand vs Context, RSC
- **Сеть:** HTTP-методы и статусы, идемпотентность, CORS, кэширование, REST
- **Безопасность:** HMAC, timing-attack, replay attack, deriving keys, IP rate limit
- **БД:** ON CONFLICT, GREATEST, raw SQL, индексы, атомарные операции,
  N+1 и его избежание
- **Архитектура:** Чистые функции, separation of concerns, idempotency,
  optimistic UI, fire-and-forget, race conditions, lazy evaluation,
  state machine в UI

В папке [`content/05-this-project/`](content/05-this-project/) живут уроки,
разбирающие именно этот проект — можно открыть в Mini App и пройти как
квиз.

---

## Что не сделано (осознанно отложено)

- **Статистика по темам** (экран «Замыкания: 12 в long-term, 3 в свежей памяти»)
- **Марафон 250 вопросов** (рандомная выборка без SR, отдельный режим)
- **AI-ментор** (Claude API + streaming, голосовой режим — опционально)
- **Тесты на код** (планируются vitest для `lib/sr.ts`, `lib/notifications.ts`,
  `lib/datetime.ts` — чистые функции)
- **Админка**, мультиязычность, мульти-юзерные фичи (контент в файлах,
  юзер один по дизайну MVP)

---

## Контакт

Елизавета Сарина — фронт-разработчик, 3+ года, в поиске работы middle/senior.

Telegram: [@elizaveta_sarina](https://t.me/elizaveta_sarina)
Email: eliz.sarina17@gmail.com
