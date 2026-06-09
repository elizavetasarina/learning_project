---
title: "type vs interface: что использовать"
description: "Различия type и interface, declaration merging, extension, реальные рекомендации"
order: 5
---

# type vs interface: что использовать

«Чем `type` отличается от `interface`?» — спрашивают **на каждом** TS-собесе. Большинство ответов — «interface для классов, type для остального». Это **неточно**. Правильный ответ — про конкретные различия в возможностях, и **есть случаи**, где работает только один из двух. Этот урок — про точные границы.

> Главная мысль: `type` — **более общий** инструмент (может всё, что interface, плюс ещё много чего). `interface` — **более специализированный** (только для объектов и классов), но имеет одну уникальную фичу — **declaration merging**. Эту фичу 90% времени **не используют**, поэтому `type` чаще практичнее.

## Что у них общего

Оба объявляют тип объекта:

```ts
type UserType = { id: number; name: string };
interface UserInterface { id: number; name: string }

// Используются одинаково
const a: UserType = { id: 1, name: 'L' };
const b: UserInterface = { id: 1, name: 'L' };
```

Оба поддерживают extending:
```ts
type AdminType = UserType & { role: 'admin' };
interface AdminInterface extends UserInterface { role: 'admin' }
```

Оба поддерживают generics:
```ts
type Box<T> = { value: T };
interface BoxI<T> { value: T }
```

Для **базового описания объекта** — полностью эквивалентны.

## Что может ТОЛЬКО `type`

### 1. Union'ы

```ts
type Status = 'pending' | 'done' | 'error';
type ID = string | number;
type Result<T> = { ok: true; data: T } | { ok: false; error: string };
```

**`interface` так не умеет.** `interface Status = 'a' | 'b'` — синтаксическая ошибка. interface работает только с **объектами**.

### 2. Примитивы и tuples

```ts
type CSSValue = string | number;
type Pair = [string, number];
type Point = readonly [number, number];
```

interface не описывает примитивы или кортежи.

### 3. Mapped types

```ts
type ReadonlyUser = { readonly [K in keyof User]: User[K] };
type Nullable<T> = { [K in keyof T]: T[K] | null };
```

Mapped types — синтаксис `{ [K in ...] }`. Работает только с `type`.

### 4. Conditional types и `infer`

```ts
type ReturnType<T> = T extends (...args: any) => infer R ? R : never;
type ElementOf<T> = T extends Array<infer E> ? E : never;
```

`interface` не поддерживает conditional. Все встроенные утилиты (`ReturnType`, `Awaited`, `Pick`, `Partial`) реализованы через `type`.

### 5. Template literal types

```ts
type RouteName = `users.${string}.profile`;
type CSSProp = `--${string}`;
```

Только `type`.

### 6. Алиасы для других типов

```ts
type StringOrNumber = string | number;
type UserKey = keyof User;
type Handler = (e: Event) => void;
```

`type` — это **алиас**. Может ссылаться на что угодно. `interface` — только описывает объекты.

## Что может ТОЛЬКО `interface`

### Declaration merging

Объявить interface с тем же именем **несколько раз** — TS их **объединит**:

```ts
interface Window {
  customField: string;
}

interface Window {
  anotherField: number;
}

// итог: Window имеет customField И anotherField
window.customField;   // ok
window.anotherField;  // ok
```

Для `type` — будет ошибка дубликата.

**Где это реально нужно:**

1. **Расширение типов сторонних библиотек**:
   ```ts
   // types/express.d.ts
   declare global {
     namespace Express {
       interface Request {
         user?: User;
       }
     }
   }
   ```
   Это паттерн middleware-augmentation. Express уже определил `Request`, ты добавляешь свои поля.

2. **Глобальные расширения**:
   ```ts
   declare global {
     interface Window {
       Telegram?: { WebApp: ... };
     }
   }
   ```
   Так у нас в `types/telegram.d.ts` расширен `Window`.

3. **Модульное расширение** (`@types/...`):
   Иногда `@types`-пакеты неполные. Ты дополняешь через declaration merging без форка библиотеки.

В **обычном** прикладном коде это **редко** используется. Если ты пишешь Next.js-приложение — почти никогда. Если пишешь библиотеку или интеграцию — может пригодиться.

## Extending: синтаксис разный, результат тот же

```ts
// interface
interface Animal { name: string }
interface Dog extends Animal { breed: string }

// type
type AnimalT = { name: string };
type DogT = AnimalT & { breed: string };
```

Оба дают одинаковый итоговый тип. Можно **смешивать**:
```ts
type AnimalT = { name: string };
interface Dog extends AnimalT { breed: string }  // interface extends type — ОК

interface AnimalI { name: string }
type DogT = AnimalI & { breed: string };          // type intersection с interface — ОК
```

### Тонкость: конфликт полей

`interface extends` **не разрешит** конфликт типов:
```ts
interface A { x: string }
interface B extends A { x: number }   // ❌ Error: 'x' has wrong type
```

`type` через `&` **смержит** в `never`:
```ts
type A = { x: string };
type B = A & { x: number };
// B['x']: never (intersection несовместимых типов)
```

TS не упадёт сразу, но при использовании поля будет `never` — баг тише, но опаснее.

## Производительность

В больших кодовых базах **interface быстрее** для TS-компилятора. Причины:
- Кеш сравнения работает лучше для interface
- type через `&` создаёт новый тип каждый раз

На малых проектах разница незаметна. На монорепах с тысячами файлов — заметна. **Microsoft рекомендует** для общедоступных API библиотек — interface. Для внутренней работы — что удобнее.

## Реальная рекомендация

Сообщество разделилось примерно так:

**«Только type»** (Vercel, многие React-проекты):
- Единообразие
- Можно union, mapped, conditional — без переключения парадигмы
- Decleration merging не нужен в обычном коде

**«Interface для объектов, type для всего остального»** (Microsoft):
- Lучшая производительность TS-компилятора
- Возможность declaration merging если понадобится
- Аутосовместимость с библиотеками

**На собесе** — отвечай так:

> «Я предпочитаю `type` для единообразия. Он более общий: умеет union, mapped, conditional. Interface использую, когда нужен declaration merging — например, расширить тип сторонней библиотеки или глобальный объект. На больших проектах могу выбрать interface для основных доменных моделей ради лучшей TS-производительности, но в маленьких — пишу всё через type.»

## Когда что использовать (моя рекомендация)

| Случай | Использовать |
|---|---|
| Объект-модель: User, Post, Order | Любой, выбери один и держись его |
| Union: `type ID = string \| number` | **type** (interface не умеет) |
| Mapped: `{ [K in keyof T]: ... }` | **type** |
| Conditional: `T extends U ? X : Y` | **type** |
| Tuple: `[number, string]` | **type** |
| Расширение `window`/глобалов | **interface** + `declare global` |
| Расширение типа из библиотеки | **interface** |
| Утилиты на основе других типов | **type** |
| API-контракт публичной библиотеки | **interface** (производительность) |

## Анти-паттерны

### 1. `type Box = { value: number }` где можно interface

Если тип — простой объект, оба варианта эквивалентны. Не убирай `type` ради `interface` без причины. Главное — **последовательность в проекте**.

### 2. Конвертация type → interface, потерять union

```ts
// было:
type Result = { ok: true } | { ok: false; error: string };

// решил перейти на interface — НЕ ПОЛУЧИТСЯ
interface Result = { ok: true } | { ok: false; error: string };  // ❌ синтакс ошибка
```

Union — только через `type`. Игнорировать это правило — не получится.

### 3. Declaration merging там, где не ожидают

```ts
// файл 1
interface User { name: string }

// файл 2 (думал, что переопределяет)
interface User { age: number }

// итог: User имеет ОБА поля. Молчаливый сюрприз
```

Если хочешь отдельный тип — используй другое имя или `type`. `interface` молча мержится — это легко пропустить.

## В нашем проекте

В `types/content.ts`:
```ts
export interface LessonMeta { ... }
export interface ModuleMeta { ... }
export interface Question = ChoiceQuestion | MultiQuestion | InputQuestion;
//                ^ ошибка не будет тут, потому что Question это type, не interface
export type Question = ChoiceQuestion | MultiQuestion | InputQuestion;
```

Объекты — interface (договорённость стиля). Union — type. Это смешанный подход, **самый частый** в реальных проектах.

## Что важно вынести

- **Совпадают:** базовое описание объектов, extending, generics.
- **Только `type`:** union, mapped, conditional, template literal, tuple, алиасы примитивов.
- **Только `interface`:** declaration merging — несколько объявлений с одним именем сливаются в один.
- **Declaration merging** реально нужен для расширения сторонних библиотек (Express.Request, Window.Telegram).
- **Performance:** interface быстрее для TS-компилятора на больших базах. На малых — незаметно.
- **Реальная стратегия:** type как дефолт, interface для declaration merging и публичных API библиотек.
- **Анти-паттерны:** молчаливый merge через одинаковые interface-имена, попытка конвертировать union-type в interface.
