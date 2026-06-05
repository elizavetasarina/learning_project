# Карта контента

Полный план модулей и уроков. Трекер прогресса по содержанию приложения.

**Обозначения:**
- ✅ Урок написан и в проекте
- 🔄 В работе
- ⏳ В очереди
- 💡 Идея / тема

**Текущая структура:** плоская (`content/{slug}/`). Переход на модульную (`content/{module}/{lesson}/`) запланирован после стабилизации недели 4.

---

## Существующие уроки (плоская структура)

| # | Slug | Тема | Статус |
|---|------|------|--------|
| 01 | `01-types-and-references` | Типы и ссылки | ✅ |
| 02 | `02-closures` | Замыкания базово | ✅ |
| 03 | `03-event-loop` | Event loop базово | ✅ |
| 04 | `04-project-architecture` | Архитектура fullstack-приложения | ✅ |
| 05 | `05-hmac-auth-deep` | HMAC-аутентификация глубже | ✅ |
| 06 | `06-closures-deep` | Замыкания на уровне мидл+ | ✅ |
| 07 | `07-microtasks-macrotasks` | Микро- и макрозадачи | ✅ |

---

## Модуль 01: JavaScript глубоко

Цель: довести базу до уровня уверенного мидла. Темы, без которых не пройти технический собес.

| # | Тема | Статус |
|---|------|--------|
| 01 | Примитивы vs объекты, ссылки и значения (есть, нужен апгрейд) | ✅→💡 |
| 02 | Замыкания глубже (написан) | ✅ |
| 03 | Event loop базово (есть) + микро/макро (написан) | ✅ |
| 04 | `this`, `call`/`apply`/`bind`, стрелочные функции | ✅ |
| 05 | Прототипы, классы, наследование | ✅ |
| 06 | Promise глубоко: цепочки, ошибки, утечки | ⏳ |
| 07 | async/await: ловушки и паттерны | ⏳ |
| 08 | Equality: `==`, `===`, `Object.is`, NaN, +0/-0 | ✅ |
| 09 | Iterators, generators, `for...of` | 💡 |
| 10 | Symbol, Map, Set, WeakMap/WeakSet | 💡 |

---

## Модуль 02: TypeScript для мидла

Цель: знать инструменты, которыми спрашивают на собесах.

| # | Тема | Статус |
|---|------|--------|
| 01 | Generics: основы, constraints, дефолты | ✅ |
| 02 | Utility types: Partial, Pick, Omit, Required, Readonly, Record | ✅ |
| 03 | `infer` и conditional types | ⏳ |
| 04 | Type narrowing: type guards, discriminated unions | ⏳ |
| 05 | `type` vs `interface`, declaration merging | ⏳ |
| 06 | Mapped types, template literal types | 💡 |
| 07 | `satisfies`, `as const` | 💡 |

---

## Модуль 03: React глубоко

Цель: внутренности React, без которых мидл-собес не пройти.

| # | Тема | Статус |
|---|------|--------|
| 01 | Reconciliation, virtual DOM, Fiber | ✅ |
| 02 | Как работают хуки изнутри (правила хуков) | ✅ |
| 03 | useMemo / useCallback — когда РЕАЛЬНО нужно | ⏳ |
| 04 | Context: цена и альтернативы | ⏳ |
| 05 | Server Components в Next.js (RSC) | ⏳ |
| 06 | State management: когда Context, Zustand, Redux | ⏳ |
| 07 | useEffect: ловушки, race conditions, cleanup | ⏳ |
| 08 | Suspense, Error Boundaries | 💡 |
| 09 | Кастомные хуки: паттерны, ошибки | 💡 |

---

## Модуль 04: Сеть и производительность

Цель: понимать, что происходит между браузером и сервером.

| # | Тема | Статус |
|---|------|--------|
| 01 | HTTP базово: методы, статусы, заголовки | ✅ |
| 02 | Кэширование: ETag, Cache-Control, max-age, immutable | ⏳ |
| 03 | CORS: что это, preflight, тонкости | ⏳ |
| 04 | Rendering strategies: CSR, SSR, SSG, ISR | ⏳ |
| 05 | Web Vitals: LCP, INP, CLS — что мерять, как оптимизировать | ⏳ |
| 06 | Code splitting, lazy loading, prefetch | ⏳ |
| 07 | REST правильно, базово GraphQL | 💡 |
| 08 | WebSocket, Server-Sent Events | 💡 |

---

## Модуль 05: Архитектура ЭТОГО проекта

Твой персональный «тест на понимание». Каждый урок = твой код из репозитория, разобранный как для собеса.

| # | Тема | Статус |
|---|------|--------|
| 01 | Общая архитектура fullstack (есть) | ✅ |
| 02 | HMAC-аутентификация (написан) | ✅ |
| 03 | Prisma 7: driver adapter, ленивый синглтон через Proxy | ⏳ |
| 04 | Stateless vs sessions: выбор и tradeoffs | ⏳ |
| 05 | Lazy reset: стрики и дневная цель — паттерн без cron | ⏳ |
| 06 | Атомарные операции: increment в Prisma, гонки и защита | ⏳ |
| 07 | Zustand: store вне React, точечные подписки, паттерны | ⏳ |
| 08 | Server-side throttle: lastActivityAt раз в час | 💡 |
| 09 | Raw SQL в Prisma 7: type casts `::int`, `::"LessonStatus"` (тот баг) | ⏳ |
| 10 | IANA timezones: UTC в БД, Intl.DateTimeFormat, X-Timezone header | ⏳ |
| 11 | Push через Telegram Bot API: cron-secret, web_app кнопка, rate limit | ⏳ |
| 12 | Spaced repetition: SM-2, кривая забывания, eager-init, fire-and-forget answers | ⏳ |
| 09 | Content-as-code: уроки как файлы, не как БД-записи | 💡 |
| 10 | Структура папок: lib vs hooks vs components — правила | 💡 |

---

## Модуль 06: System Design фронтенда

Уровень, который отличает мидла от сеньора.

| # | Тема | Статус |
|---|------|--------|
| 01 | Дизайн чат-приложения (real-time, message ordering, offline) | ⏳ |
| 02 | Дизайн ленты с бесконечной прокруткой (pagination, кэш) | ⏳ |
| 03 | Дизайн большого дашборда (модули, кэш, авторизация) | ⏳ |
| 04 | Монорепо, микрофронтенды | 💡 |
| 05 | Архитектурные паттерны: layered, hexagonal, feature-based | 💡 |

---

## Модуль 07: AI для разработчика

База, без которой не построить AI-ментор и не пройти собес в AI-команду.

| # | Тема | Статус |
|---|------|--------|
| 01 | LLM базово: токены, контекст, температура, top-p | ⏳ |
| 02 | Prompt engineering: структура, few-shot, chain-of-thought | ⏳ |
| 03 | Tool use / function calling | ⏳ |
| 04 | Streaming ответов: SSE, обработка чанков | ⏳ |
| 05 | RAG: embeddings, vector search, retrieval | ⏳ |
| 06 | Claude API: модели, prompt caching, batch | ⏳ |
| 07 | Agents: что это, когда нужно, ограничения | 💡 |
| 08 | Evals: как тестировать LLM-приложения | 💡 |

---

## Приоритет на ближайшие сессии

Подобрано под `NOTES.md` (где ты сама себе ставила оценки):

1. **`01-08 Equality`** — «примитивные типы 6/10, каждый раз сливаюсь»
2. **`01-04 this и bind`** — типовой собесовский вопрос
3. **`03-01 Reconciliation`** — мидл-вопрос на каждом React-собесе
4. **`03-02 Hooks внутри`** — то же
5. **`05-03 Prisma driver adapter`** — твой код, твой собесовский ответ
6. **`05-05 Lazy reset`** — то же, очень элегантная тема для собеса

Каждый урок ≈ 250-400 строк markdown + 12-15 вопросов в quiz.json.

---

## Решения по структуре

**Что будет потом** (когда уроков станет 15+):
1. Создать папки модулей: `content/01-javascript/`, `content/02-typescript/` и т.д.
2. Переместить уроки внутрь модулей. Slug станет двухуровневым: `javascript/closures-deep`.
3. Обновить `lib/lessons.ts` — рекурсивное чтение, поддержка модулей.
4. Обновить `types/content.ts` — добавить `moduleSlug`, `moduleTitle` в `LessonMeta`.
5. Обновить страницу `/lessons` — группировка карточек по модулям.
6. Обновить роут `/lessons/[slug]` → `/lessons/[...slug]` (catch-all для двухсегментных путей).
7. **БД:** существующий прогресс по старым slug орфанится. Для тебя (единственный юзер) — не проблема: пройдёшь заново. Для будущих юзеров — нужна миграция slug-маппинга.

Эти 7 пунктов = одна сессия рефакторинга.
