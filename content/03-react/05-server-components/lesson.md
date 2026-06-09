---
title: "React Server Components в Next.js"
description: "Чем серверный компонент отличается от клиентского, граница 'use client', что куда можно, streaming, типичные ошибки"
order: 5
---

# React Server Components в Next.js

С 2023 года React научился рендерить компоненты **на сервере и не отправлять их JS клиенту**. В Next.js App Router это **дефолтное поведение** — компоненты серверные, пока ты явно не пометишь `'use client'`. На собесе по Next.js эту тему спрашивают почти всегда — что это, зачем, чем отличается от SSR, какие правила границы.

> Главная мысль: серверный компонент **никогда не выполняется в браузере**. Его код не уезжает в JS-бандл, его HTML рендерится на сервере и присылается клиенту в готовом виде. Клиент потом «гидрирует» только клиентские части дерева — те, что помечены `'use client'`.

## Чем отличается от SSR

Это первое, на чём путаются. У них есть пересечение, но это **разные механизмы**:

| | SSR (классический) | RSC |
|---|---|---|
| Где рендерится | Сервер на каждый запрос | Сервер на каждый запрос |
| JS компонента в браузере | **Да** — для гидратации | **Нет** — никогда |
| Клиент получает | HTML + JS-бандл всего дерева | HTML + JS только клиентских частей |
| Можно использовать `useState` | Да (в браузере после гидратации) | **Нет** в серверной части |
| Можно читать файлы / БД | Нет | **Да** |
| Размер JS-бандла | Большой (всё дерево) | **Меньше** (только client islands) |

Главная новинка RSC — **меньший бандл** + **прямой доступ к серверным ресурсам** (файлы, БД, env) из компонента.

## Дефолт в App Router

Когда ты создаёшь компонент в `app/`, он **серверный** по умолчанию:

```tsx
// app/lessons/page.tsx — серверный
import { getAllLessons } from '@/lib/lessons';

export default async function LessonsPage() {
  const lessons = await getAllLessons();  // читаем файлы прямо здесь
  return <ul>{lessons.map(l => <li>{l.title}</li>)}</ul>;
}
```

Что тут можно, чего нельзя в браузере:
- `await getAllLessons()` — async-функция читает файловую систему (`fs.readdir`).
- Нет ни `useState`, ни обработчиков `onClick`.
- Импорт `lib/lessons.ts` с Node API (`fs`, `path`) — **ок**, мы на сервере.

Когда нужны клиентские фичи (state, effects, event handlers, `window`) — помечаешь файл `'use client'`:

```tsx
// app/lessons/lessons-list.tsx — клиентский
'use client';
import { useState } from 'react';

export function LessonsList({ lessons }) {
  const [filter, setFilter] = useState('');
  return /* ... */;
}
```

## Граница `use client`

`'use client'` — это **не флаг компонента**, а **флаг файла**. Всё, что импортируется в этот файл (и его модульный граф), становится частью **клиентского бандла**.

Главное правило:

```
Server → может импортировать Client
Client → НЕ может импортировать Server (для рендера)
```

Сервер может **рендерить** клиентский компонент и передавать ему пропсы. Клиент **не может вызвать** серверный компонент — он его не видит.

Но клиент может **получить серверный компонент как пропс** (паттерн **children через слот**):

```tsx
// server.tsx
import { ClientLayout } from './client';
import { ServerHeader } from './server-header';

export default function Page() {
  return (
    <ClientLayout>
      <ServerHeader />   {/* ← серверный, рендерится на сервере */}
    </ClientLayout>
  );
}
```

```tsx
// client.tsx
'use client';
import { useState } from 'react';

export function ClientLayout({ children }) {
  const [open, setOpen] = useState(false);
  return <div>{open && children}</div>;   // ← children приходит готовым HTML
}
```

Это **очень полезный паттерн**: клиентский layout с серверным контентом внутри. Без него пришлось бы делать весь layout клиентским.

## Что **нельзя** в серверных компонентах

| Что | Почему |
|---|---|
| `useState`, `useEffect`, `useRef` | хуки требуют React-runtime в браузере |
| `onClick`, `onChange`, любые обработчики | их некому привязать на сервере |
| `window`, `document`, `localStorage` | нет браузерного API |
| Импорт CSS Modules с `:hover`? | можно (CSS отдельно), но интерактивные стили часто требуют клиента |
| Создание Context'а с `createContext` | контекст создаётся, но `useContext` в серверном — недоступен |

Эти ограничения **строгие**: попытка использовать → ошибка билда или рантайма.

## Что **можно** в серверных компонентах (что круто)

- **Чтение файлов** — `fs.readFile()` прямо в компоненте
- **Запросы к БД** — `await prisma.user.findMany()` без API
- **Чтение env-переменных** — без `NEXT_PUBLIC_` префикса
- **Импорт тяжёлых либ** — markdown-парсеры, prisma, image-processing — **не попадают в клиент**
- **Streaming с Suspense** — отправка HTML по мере готовности

В нашем проекте этим пользуемся:
```tsx
// app/lessons/[...slug]/page.tsx
export default async function LessonPage({ params }) {
  const { slug } = await params;
  const [lesson, questions] = await Promise.all([
    getLesson(slug),       // читает lesson.md
    getQuestions(slug),    // читает quiz.json
  ]);
  return <LessonView lesson={lesson} questions={questions} />;
  //                          ↑ передаём клиенту готовые данные
}
```

`getLesson` использует `fs` — в браузер это не уезжает. Клиент получает только распарсенные данные через пропсы.

## Streaming + Suspense

RSC поддерживает **стриминг**: можно отдавать HTML кусками. Если часть дерева медленно загружается — оборачиваем в `<Suspense>` с fallback:

```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <>
      <Header />
      <Suspense fallback={<Spinner />}>
        <SlowComments />   {/* async-компонент с медленным запросом */}
      </Suspense>
      <Footer />
    </>
  );
}
```

Что произойдёт:
1. Сервер сразу шлёт HTML `Header + Spinner + Footer`.
2. Клиент видит страницу, показывает спиннер для комментариев.
3. Когда `SlowComments` готов — сервер дописывает HTML, браузер вставляет на место спиннера.

Это **без JS** на клиенте — сервер пушит куски, браузер встраивает. Это и есть **React 18 streaming SSR**.

## RSC payload — что летит на клиент

Между сервером и клиентом нет HTML целиком — есть **RSC-формат** (специальная сериализация). Это что-то вроде:

```
0:["html",{"children":["body",{...}]}]
1:I["./LessonsList.tsx",["lessons-list"],"LessonsList"]
2:["LessonsList",{"lessons":[{...}]}]
```

Каждая строка — узел дерева. `I[...]` — ссылка на клиентский компонент (отдельный JS-чанк). Клиент парсит этот payload, гидрирует только клиентские части.

Понимать формат **не нужно**, но **знать что он есть** — полезно. На собесе могут спросить «как клиент узнаёт, что рендерить»?

## Серверные actions

Бонусная RSC-фича — **Server Actions**. Функция с `'use server'` запускается на сервере, но **вызывается с клиента** как обычная функция:

```tsx
// server-action.ts
'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function deletePost(id: number) {
  await prisma.post.delete({ where: { id } });
  revalidatePath('/posts');
}
```

```tsx
'use client';
import { deletePost } from './server-action';

export function DeleteButton({ id }) {
  return <button onClick={() => deletePost(id)}>Delete</button>;
}
```

Под капотом Next.js делает POST к скрытому эндпоинту. Это **замена API-роутам** для мутаций.

На наш проект пока не натягиваем — у нас полноценные API routes для прогресса. Но **знать** что Server Actions есть — обязательно.

## Типичные ошибки

### Ошибка 1: useState в серверном компоненте

```tsx
// app/page.tsx — серверный по умолчанию
export default function Page() {
  const [count, setCount] = useState(0);   // ❌ Error: useState only in client
  return <button>{count}</button>;
}
```

Фикс: либо `'use client'` в шапке, либо вынести в отдельный клиентский компонент.

### Ошибка 2: импорт сервера в клиент

```tsx
'use client';
import { prisma } from '@/lib/prisma';     // ❌ Prisma тянет node API в клиент
```

Фикс: данные подкачиваем через API route или передаём пропсами из серверного родителя.

### Ошибка 3: «оборачиваю всё в 'use client'»

Юзер видит `useState` в одном месте → ставит `'use client'` на весь файл → весь файл и его импорты летят в клиент. **Потеря бандла**.

Фикс: вынеси клиентскую часть в отдельный маленький файл. Серверный родитель пусть импортирует и передаёт пропсы.

### Ошибка 4: передача функции из сервера в клиент

```tsx
// server.tsx
export default function Page() {
  function onSave() { /* ... */ }
  return <ClientForm onSave={onSave} />;   // ❌ функции не сериализуются
}
```

Серверный → клиентский переход = **сериализация**. Функции через RSC payload передать нельзя. Можно только Server Action (`'use server'` функция).

## Когда что использовать

| Что нужно | Решение |
|---|---|
| Список из БД, без интерактива | **Сервер** |
| Кнопка с onClick | **Клиент** |
| Список из БД с фильтром-инпутом | **Сервер** для списка, **Клиент** для фильтра |
| Модалка / диалог / popover | **Клиент** |
| Markdown-рендеринг тяжёлой либой | **Сервер** (либа не уезжает в бандл) |
| Анимация | **Клиент** |
| SEO-критичный контент | **Сервер** (HTML на старте) |

## Что важно вынести

- **Серверный компонент** не рендерится в браузере, его JS не уезжает в бандл.
- **App Router**: компоненты серверные по умолчанию. **`'use client'`** на файл — превращает в клиентский (и всё его дерево импортов тоже).
- **Сервер → импортирует клиент** — да. **Клиент → импортирует сервер** — нет (только через `children` слот).
- **Что нельзя в сервере**: хуки, обработчики, `window`/`document`/`localStorage`.
- **Что можно в сервере**: `fs`, `prisma`, env без `NEXT_PUBLIC_`, тяжёлые либы без cost в бандле.
- **Streaming с Suspense** — куски HTML по мере готовности.
- **Server Actions (`'use server'`)** — функции, которые вызываются с клиента, но выполняются на сервере. Альтернатива API-роутам для мутаций.
- **Главная ошибка** — оборачивать слишком много в `'use client'`. Держи клиентские части маленькими.
