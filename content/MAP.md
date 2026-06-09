# Карта контента — Middle+ Fullstack

Полный план модулей и уроков. Цель — покрыть темы, которые спрашивают на собесах
**мидл+ fullstack** (фронт + бэк + БД + DevOps базово + system design).

**Обозначения:**
- ✅ Урок написан и в проекте
- 🔄 В работе
- ⏳ В очереди (high-priority)
- 💡 Идея (low-priority, рассмотреть позже)

**Текущее покрытие:** 15 уроков по 5 модулям.

---

## Существующие уроки

| Slug | Тема | Модуль |
|---|---|---|
| `01-javascript/01-types-and-references` | Типы и ссылки | JavaScript |
| `01-javascript/02-closures` | Замыкания базово | JavaScript |
| `01-javascript/03-event-loop` | Event loop базово | JavaScript |
| `01-javascript/04-closures-deep` | Замыкания мидл+ | JavaScript |
| `01-javascript/05-microtasks-macrotasks` | Микро/макрозадачи | JavaScript |
| `01-javascript/06-equality-and-primitives` | Equality, NaN, Object.is | JavaScript |
| `01-javascript/07-this-and-bind` | this, call/apply/bind | JavaScript |
| `01-javascript/08-prototypes` | Прототипы, классы | JavaScript |
| `02-typescript/01-generics` | Generics | TypeScript |
| `02-typescript/02-utility-types` | Utility types | TypeScript |
| `03-react/01-reconciliation` | Reconciliation, Fiber | React |
| `03-react/02-hooks-internals` | Хуки изнутри | React |
| `04-network-perf/01-http-basics` | HTTP basics | Network |
| `05-this-project/01-architecture` | Архитектура fullstack | Этот проект |
| `05-this-project/02-hmac-auth-deep` | HMAC глубже | Этот проект |

---

## Модуль 01: JavaScript глубоко

Фундамент. Без свободного владения этими темами мидл-собес не пройти.

| # | Тема | Статус |
|---|------|--------|
| 01 | Типы и ссылки (примитивы vs объекты) | ✅ |
| 02 | Замыкания базово | ✅ |
| 03 | Event loop базово | ✅ |
| 04 | Замыкания мидл+ ([[Environment]], stale closure, утечки) | ✅ |
| 05 | Микро- и макрозадачи (event loop детально) | ✅ |
| 06 | Equality, NaN, Object.is, ±0 | ✅ |
| 07 | this, call/apply/bind, стрелочные | ✅ |
| 08 | Прототипы, классы, наследование | ✅ |
| 09 | Promise глубоко (цепочки, ошибки, утечки Promise.all) | ✅ |
| 10 | async/await глубже (ловушки, race conditions, AbortController) | ✅ |
| 11 | Iterators, generators, for..of, async iterators | ⏳ |
| 12 | Symbol, Map, Set, WeakMap, WeakRef — когда что | ⏳ |
| 13 | Модули: ESM vs CommonJS, динамический import, tree-shaking | ⏳ |
| 14 | Bigint, типы коллекций, TypedArray | 💡 |
| 15 | Proxy и Reflect — практическое применение | 💡 |
| 16 | Garbage collection и leak patterns | 💡 |

---

## Модуль 02: TypeScript для мидла

Инструменты, которыми пишут типобезопасный код в больших проектах.

| # | Тема | Статус |
|---|------|--------|
| 01 | Generics: основы, constraints, дефолты | ✅ |
| 02 | Utility types: Partial, Pick, Omit, Record, ReturnType | ✅ |
| 03 | `infer` и conditional types | ⏳ |
| 04 | Type narrowing: type guards, discriminated unions, exhaustive check | ⏳ |
| 05 | `type` vs `interface`, declaration merging | ⏳ |
| 06 | Mapped types, template literal types | ⏳ |
| 07 | `satisfies`, `as const`, branded types | ⏳ |
| 08 | Variance, covariance, contravariance (для функций) | 💡 |
| 09 | Module augmentation и расширение типов библиотек | 💡 |
| 10 | TS-strict настройки: что включать, почему | 💡 |

---

## Модуль 03: React глубоко

Без этого — нельзя пройти ни одного React-собеса.

| # | Тема | Статус |
|---|------|--------|
| 01 | Reconciliation, vDOM, Fiber, ключи | ✅ |
| 02 | Хуки изнутри (dispatcher, memoizedState, правила) | ✅ |
| 03 | useMemo/useCallback — когда РЕАЛЬНО нужно | ⏳ |
| 04 | Context: цена, перерендеры, как разрезать | ⏳ |
| 05 | Server Components (RSC) в Next.js | ⏳ |
| 06 | State management: Context vs Zustand vs Redux | ⏳ |
| 07 | useEffect глубоко: race conditions, cleanup, AbortController | ⏳ |
| 08 | Suspense и Error Boundaries | ⏳ |
| 09 | Кастомные хуки: паттерны, антипаттерны | ⏳ |
| 10 | Refs: useRef, forwardRef, useImperativeHandle | ⏳ |
| 11 | Concurrent rendering: useTransition, useDeferredValue | ⏳ |
| 12 | React.memo, useMemo, useCallback — комбо | ⏳ |
| 13 | Server Actions в Next.js | 💡 |
| 14 | Streaming SSR | 💡 |

---

## Модуль 04: Сеть и производительность

Что происходит между клиентом и сервером + Core Web Vitals.

| # | Тема | Статус |
|---|------|--------|
| 01 | HTTP basics: методы, статусы, заголовки, идемпотентность | ✅ |
| 02 | Кэширование: ETag, Cache-Control, max-age, immutable, stale-while-revalidate | ⏳ |
| 03 | CORS: что это, preflight, credentials, нюансы | ⏳ |
| 04 | Rendering strategies: CSR, SSR, SSG, ISR, streaming | ⏳ |
| 05 | Web Vitals: LCP, INP, CLS — что мерять, как оптимизировать | ⏳ |
| 06 | Code splitting, lazy loading, dynamic import, prefetch | ⏳ |
| 07 | HTTP/2 vs HTTP/3, multiplexing, head-of-line blocking | ⏳ |
| 08 | WebSocket vs Server-Sent Events vs long polling | ⏳ |
| 09 | Service Workers, offline-first, PWA | ⏳ |
| 10 | CDN: что делает, типичная конфигурация | 💡 |
| 11 | DNS, TLS handshake, что в RTT | 💡 |
| 12 | Compression: gzip, brotli, когда что | 💡 |

---

## Модуль 05: Архитектура этого проекта

Каждый урок = твой код, разобранный как для собеса. Личный «тест понимания».

| # | Тема | Статус |
|---|------|--------|
| 01 | Общая архитектура fullstack | ✅ |
| 02 | HMAC-аутентификация глубоко | ✅ |
| 03 | Stateless vs sessions: выбор и tradeoffs | ⏳ |
| 04 | Prisma 7 driver adapter: ленивый синглтон через Proxy | ⏳ |
| 05 | Lazy reset: стрики и дневная цель без cron | ⏳ |
| 06 | Атомарные операции в БД: increment, race conditions | ⏳ |
| 07 | Zustand: store вне React, точечные подписки | ⏳ |
| 08 | Raw SQL в Prisma 7: type casts ::int / ::"LessonStatus" | ⏳ |
| 09 | IANA timezones: UTC в БД vs локальный день, Intl | ⏳ |
| 10 | Telegram Mini App API: initData, CloudStorage, Haptic, MainButton, BackButton | ⏳ |
| 11 | Push через Bot API + Vercel Cron + чистая функция | ⏳ |
| 12 | Spaced Repetition: SM-2, кривая забывания, fire-and-forget answers | ⏳ |
| 13 | Eager-init с createMany skipDuplicates | ⏳ |
| 14 | Catch-all routing для составных slug | ⏳ |
| 15 | Throttle lastActivityAt — раз в час | ⏳ |
| 16 | Content-as-code: уроки как файлы, не как БД-записи | ⏳ |
| 17 | Optimistic UI с откатом (Edit dailyGoal) | ⏳ |
| 18 | requestAnimationFrame для счётчика-анимации | ⏳ |

---

## Модуль 06: Node.js (backend)

Серверная среда. Мидл-фуллстак обязан понимать, как устроен Node.

| # | Тема | Статус |
|---|------|--------|
| 01 | Event loop в Node: фазы, отличия от браузера | ⏳ |
| 02 | `process.nextTick`, `setImmediate`, микротаски в Node | ⏳ |
| 03 | Streams: Readable, Writable, Transform, backpressure | ⏳ |
| 04 | Buffer, encoding, бинарные данные | ⏳ |
| 05 | Cluster, worker_threads, child_process | ⏳ |
| 06 | Модули: CJS vs ESM, package.json exports | ⏳ |
| 07 | Async hooks и AsyncLocalStorage (контекст запроса) | ⏳ |
| 08 | npm vs pnpm vs yarn, lock-файлы, реестр | ⏳ |
| 09 | npm scripts, монорепо (turborepo, nx) | 💡 |
| 10 | Process management (pm2, systemd) | 💡 |

---

## Модуль 07: Базы данных и SQL

Постгрес-фокус (то, что используется в проекте).

| # | Тема | Статус |
|---|------|--------|
| 01 | Реляционные БД: таблицы, ключи, отношения 1:N, N:N | ⏳ |
| 02 | SQL основы: SELECT, JOIN, GROUP BY, агрегаты | ⏳ |
| 03 | Индексы: B-tree, hash, GIN, частичные индексы | ⏳ |
| 04 | Транзакции: ACID, isolation levels, dirty reads | ⏳ |
| 05 | Блокировки: row-level, advisory, deadlocks | ⏳ |
| 06 | EXPLAIN ANALYZE — чтение query plan | ⏳ |
| 07 | Нормализация (1NF, 2NF, 3NF) и денормализация | ⏳ |
| 08 | Postgres особенности: JSONB, enum, arrays, sequences | ⏳ |
| 09 | Миграции: shadow DB, blue-green, zero-downtime | ⏳ |
| 10 | Connection pooling (pgBouncer, transaction vs session) | ⏳ |
| 11 | Партиционирование, шардирование (концепции) | 💡 |
| 12 | NoSQL: когда что (MongoDB, Redis, Elasticsearch) | 💡 |
| 13 | Read replicas, репликация, CAP-теорема | 💡 |

---

## Модуль 08: Backend архитектура

Как организовать backend-код, чтобы его читали и расширяли.

| # | Тема | Статус |
|---|------|--------|
| 01 | REST design: ресурсо-ориентированные URL, версионирование | ⏳ |
| 02 | Layered architecture: controller / service / repository | ⏳ |
| 03 | Middleware: auth, logging, rate limit, validation | ⏳ |
| 04 | Error handling: централизованный, типизированные ошибки | ⏳ |
| 05 | Dependency injection (на примере NestJS / простого DI) | ⏳ |
| 06 | Идемпотентность: ключи в POST, retry-логика | ⏳ |
| 07 | Pagination: offset vs cursor-based | ⏳ |
| 08 | API versioning стратегии (v1 в URL, header, etc) | ⏳ |
| 09 | GraphQL: когда нужен, плюсы и минусы | ⏳ |
| 10 | gRPC, tRPC, OpenAPI/Swagger | 💡 |
| 11 | Queues (Bull, RabbitMQ, Kafka): когда нужны | 💡 |
| 12 | Event sourcing, CQRS (концепции) | 💡 |

---

## Модуль 09: Безопасность fullstack

Темы, которые регулярно спрашивают (и на которых легко завалиться).

| # | Тема | Статус |
|---|------|--------|
| 01 | OWASP Top 10: что это и почему важно | ⏳ |
| 02 | XSS: типы, защита (CSP, escaping, sanitization) | ⏳ |
| 03 | CSRF: что это, SameSite cookies, CSRF-токены | ⏳ |
| 04 | SQL injection: prepared statements, ORM-защита | ⏳ |
| 05 | JWT: устройство, alg=none атака, refresh tokens | ⏳ |
| 06 | OAuth 2.0 и OpenID Connect: flows и применение | ⏳ |
| 07 | Хранение паролей: bcrypt, argon2, salt | ⏳ |
| 08 | HMAC vs digital signatures (RSA, ECDSA) | ⏳ |
| 09 | HTTPS: TLS handshake, certificates, MITM | ⏳ |
| 10 | Rate limiting, brute-force защита | ⏳ |
| 11 | Secrets management: env vars, vault, не коммитить | ⏳ |
| 12 | CORS как security feature, не баг | ⏳ |
| 13 | Content Security Policy глубоко | 💡 |
| 14 | Subresource Integrity, security headers | 💡 |

---

## Модуль 10: Testing

Тестирование — мидл+ обязан уметь, ML не выполняет.

| # | Тема | Статус |
|---|------|--------|
| 01 | Пирамида тестов: unit / integration / e2e | ⏳ |
| 02 | Vitest / Jest: основы, моки, snapshots | ⏳ |
| 03 | Testing Library: query priority, user-event, accessibility | ⏳ |
| 04 | Mocking: модулей, HTTP (MSW), таймеров | ⏳ |
| 05 | E2E: Playwright vs Cypress | ⏳ |
| 06 | Coverage: line, branch, function, ставить ли 100% | ⏳ |
| 07 | TDD vs тесты после кода | ⏳ |
| 08 | Тестирование async кода, race conditions | ⏳ |
| 09 | Visual regression testing | 💡 |
| 10 | Property-based testing (fast-check) | 💡 |
| 11 | Mutation testing | 💡 |

---

## Модуль 11: DevOps базово

Что мидл должен знать про деплой и эксплуатацию.

| # | Тема | Статус |
|---|------|--------|
| 01 | Docker: образ vs контейнер, Dockerfile, multi-stage | ⏳ |
| 02 | docker-compose: локальная разработка с БД | ⏳ |
| 03 | CI/CD: GitHub Actions, что в pipeline у фронт-проекта | ⏳ |
| 04 | Env variables: dev/staging/prod, секреты | ⏳ |
| 05 | Logging: structured logs, log levels, агрегация | ⏳ |
| 06 | Monitoring: Sentry, Datadog, OpenTelemetry | ⏳ |
| 07 | Deployment стратегии: rolling, blue-green, canary | ⏳ |
| 08 | Reverse proxy: nginx, Cloudflare basics | ⏳ |
| 09 | Healthchecks, graceful shutdown | ⏳ |
| 10 | Linux basics для разработчика | 💡 |
| 11 | Kubernetes концептуально (поды, сервисы) | 💡 |

---

## Модуль 12: System Design фронтенда и фуллстака

Это то, что **отличает мидла от сеньора**. Спрашивают на интервью на seniority+.

| # | Тема | Статус |
|---|------|--------|
| 01 | Дизайн чат-приложения (WebSocket, ordering, offline) | ⏳ |
| 02 | Дизайн ленты с бесконечной прокруткой (pagination, кэш, virtualization) | ⏳ |
| 03 | Дизайн большого дашборда (модули, lazy load, RBAC) | ⏳ |
| 04 | Дизайн системы уведомлений (email, push, websocket, queues) | ⏳ |
| 05 | Дизайн e-commerce checkout (распределённые транзакции, idempotency) | ⏳ |
| 06 | Дизайн URL shortener (id generation, redirects, аналитика) | ⏳ |
| 07 | Дизайн системы поиска (search index, ranking, autocomplete) | ⏳ |
| 08 | Дизайн файлового хранилища (S3-style, chunked upload) | ⏳ |
| 09 | Микрофронтенды: когда нужны, как реализовать | ⏳ |
| 10 | Monorepo vs polyrepo, тулинг | 💡 |
| 11 | CAP-теорема и distributed systems базово | 💡 |

---

## Модуль 13: AI для разработчика

База, без которой не построить AI-фичу и не пройти собес в AI-команду.

| # | Тема | Статус |
|---|------|--------|
| 01 | LLM базово: токены, контекст-окно, температура, top-p | ⏳ |
| 02 | Prompt engineering: структура, few-shot, chain-of-thought | ⏳ |
| 03 | Tool use / function calling | ⏳ |
| 04 | Streaming ответов: SSE, обработка чанков | ⏳ |
| 05 | RAG: embeddings, vector search, retrieval | ⏳ |
| 06 | Claude API: модели, prompt caching, batch | ⏳ |
| 07 | Agents: что это, ReAct, ограничения | ⏳ |
| 08 | Evals: тестирование LLM-приложений | ⏳ |
| 09 | Голосовые: Web Speech API, ElevenLabs, Whisper | 💡 |
| 10 | Fine-tuning vs RAG vs few-shot | 💡 |

---

## Модуль 14: Поведенческие и soft skills

Для собеса, не для кода. Но это **отличает мидла от сеньора** не меньше hard skills.

| # | Тема | Статус |
|---|------|--------|
| 01 | STAR-метод для рассказа о проектах | ⏳ |
| 02 | Tell me about yourself, why are you leaving | ⏳ |
| 03 | Conflicts in team, disagreement with manager | ⏳ |
| 04 | Decision making и tradeoffs (как обсуждать на собесе) | ⏳ |
| 05 | Mentoring, code review, как давать фидбэк | ⏳ |
| 06 | Estimation, breaking down tasks | ⏳ |
| 07 | Когда сказать «не знаю» и как | ⏳ |

---

## Приоритеты на следующие сессии

Подобрано так, чтобы балансировать:
- Слабые места (по `NOTES.md`)
- Высокую вероятность собесового вопроса
- Истории, которые **уже есть в коде проекта** (короче подготовка)

**Top-priority (следующие 5-7 уроков):**

1. ~~`01-javascript/09-promises-deep` — Promise глубоко~~ ✅
2. ~~`01-javascript/10-async-await-deep` — async/await ловушки~~ ✅
3. `03-react/03-memo-callback` — useMemo / useCallback
4. `03-react/05-server-components` — RSC в Next.js
5. `04-network-perf/02-caching` — кэширование HTTP
6. `04-network-perf/03-cors` — CORS
7. `05-this-project/05-lazy-reset` — наш паттерн без cron

После них — **переходим к Node.js / SQL / Security**, чтобы покрыть fullstack.

---

## Решения по структуре

**Slug формат:** `{module-folder}/{lesson-folder}`. Например `04-network-perf/01-http-basics`.
В БД хранится составной slug. В URL идёт через catch-all `/lessons/[...slug]`.

**Каждый урок:**
- `lesson.md` — теория с frontmatter (`title`, `description`, `order`)
- `quiz.json` — массив вопросов (choice / multi / input)
- Объём: 200-280 строк markdown + 12-15 вопросов

**`module.json` в папке модуля** — `{ title, description, order }`.
Модули отсортированы по `order`, уроки внутри модуля по `order` из frontmatter.

**Минимум для полноценного курса:** ~50 уроков по 8-10 модулям.
Сейчас 15 уроков по 5 модулям — это ~30% от цели.
