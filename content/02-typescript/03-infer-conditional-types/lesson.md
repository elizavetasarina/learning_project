---
title: "Conditional types и infer"
description: "Условные типы на уровне типов, ключевое слово infer для извлечения, distributive conditional, реальные примеры из стандартной библиотеки"
order: 3
---

# Conditional types и infer

`infer` и conditional types — самая «магическая» часть TypeScript. На них построены **встроенные** `ReturnType`, `Parameters`, `Awaited`, `Exclude`, `NonNullable` и сотни утилит в библиотеках. На собесе мидл+ обязан ответить: что такое conditional type, что делает `infer`, как написать `ElementOf<T>` для массива. Этот урок — про механику.

> Главная мысль: conditional types — это **`if/else` на уровне типов**. `infer` — это **«объявить переменную типа»** внутри ветви условия. Вместе они дают возможность **деконструировать** любой тип и извлечь его части.

## Простой conditional type

Синтаксис:
```ts
T extends U ? X : Y
```

Читается: «если T совместим с U → результат X, иначе Y». Это **тернарник на уровне типов**.

```ts
type IsString<T> = T extends string ? 'yes' : 'no';

type A = IsString<'hello'>;   // 'yes'
type B = IsString<42>;        // 'no'
type C = IsString<true>;      // 'no'
```

`extends` тут — не «наследование». Это **совместимость**. `'hello'` совместим с `string` → ветка 'yes'.

## Зачем

Без conditional types: каждая утилита-тип пишется руками для каждого случая.
С conditional: одна утилита автоматически работает для всех вариантов.

Пример. Хотим тип, который **убирает null и undefined** из union:

```ts
type Clean<T> = T extends null | undefined ? never : T;

type X = Clean<string | null | undefined>;   // string
type Y = Clean<number | null>;                // number
```

Это встроенный `NonNullable<T>`. Реализован ровно так.

## `never` — особое возвращаемое значение

`never` в conditional типе **удаляется** из union'а. Это и используется в `Exclude`, `NonNullable`.

```ts
type T = 'a' | 'b' | 'c';
type Result = T extends 'a' ? never : T;
// 'b' | 'c'  ← 'a' стало never и пропало
```

Это работает из-за **distributive conditional** (см. ниже).

## Distributive conditional — раздача по union'у

Главная особенность conditional types: если **левая часть** — это **naked generic** (просто `T`, не обёрнутый), TS **разводит** условие **по каждому члену union'а**:

```ts
type ToArray<T> = T extends unknown ? T[] : never;

type X = ToArray<string | number>;
// → (string extends unknown ? string[] : never) |
//   (number extends unknown ? number[] : never)
// → string[] | number[]
```

Это очень мощно. Утилита `Exclude<T, U>` работает именно за счёт distributive:

```ts
type Exclude<T, U> = T extends U ? never : T;

type Color = 'red' | 'green' | 'blue';
type Primary = Exclude<Color, 'green'>;
// → ('red' extends 'green' ? never : 'red') |  → 'red'
//   ('green' extends 'green' ? never : 'green') | → never
//   ('blue' extends 'green' ? never : 'blue')   → 'blue'
// → 'red' | 'blue'
```

### Как отключить distribution

Иногда нужно **не** разводить. Обернуть оба `T` в кортеж `[T]`:

```ts
type IsAny<T> = [T] extends [unknown] ? unknown extends T ? true : false : false;
```

Здесь `[T]` — не naked, поэтому conditional не distribute. Это нужно для **сложных проверок** вроде «это any?».

## `infer` — извлечение типа

Главная фишка. Внутри conditional можно **объявить переменную типа** через `infer`:

```ts
type ElementOf<T> = T extends Array<infer E> ? E : never;

type X = ElementOf<number[]>;          // number
type Y = ElementOf<string[]>;          // string
type Z = ElementOf<{ id: number }[]>;  // { id: number }
```

Что произошло: «если T — массив **какого-то** E, верни этот E. Иначе never». TS сам **выводит** E через сопоставление с шаблоном.

`infer` — это **placeholder** для типа, который TS должен сам разгадать из контекста. Как `var` в обычном коде, но на уровне типов.

## ReturnType изнутри

```ts
type ReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never;
```

Читается: «если T — функция, возвращающая **что-то** (`infer R`), верни это R».

```ts
function getUser() { return { id: 1, name: 'L' }; }
type User = ReturnType<typeof getUser>;
// { id: number, name: string }
```

То же с `Parameters`:
```ts
type Parameters<T> = T extends (...args: infer A) => any ? A : never;

function fn(a: string, b: number) {}
type Args = Parameters<typeof fn>;   // [a: string, b: number]
```

`infer A` собирает **все** аргументы в **кортеж**. На этой механике построен паттерн `wrapper(...args: Parameters<typeof fn>)`.

## Awaited — раскрутка Promise

```ts
type Awaited<T> =
  T extends null | undefined ? T :
  T extends object & { then(onfulfilled: infer F): any } ?
    F extends (value: infer V, ...args: any) => any ?
      Awaited<V> : never : T;
```

Сложно? Идея простая: «если T — Promise, разверни его. Если Promise внутри Promise — продолжай разворачивать рекурсивно».

```ts
type X = Awaited<Promise<string>>;             // string
type Y = Awaited<Promise<Promise<number>>>;    // number — два уровня
type Z = Awaited<number>;                       // number — не Promise, отдаём как есть
```

## Реальный пример: ParseRoute

Из современного TS-кода:
```ts
type ParseRoute<T extends string> =
  T extends `${string}/:${infer Param}/${infer Rest}`
    ? Param | ParseRoute<`/${Rest}`>
    : T extends `${string}/:${infer Param}`
      ? Param
      : never;

type RouteParams = ParseRoute<'/users/:id/posts/:postId'>;
// 'id' | 'postId'
```

Это **template literal types** + conditional + infer. TS парсит URL-шаблон на уровне типов и достаёт параметры. Это **точно то, чем впечатляет** на собесе.

## Практические задачи

### 1. Тип первого элемента массива

```ts
type First<T extends readonly unknown[]> = T extends readonly [infer F, ...unknown[]] ? F : never;

type A = First<[string, number, boolean]>;   // string
type B = First<[]>;                           // never
```

### 2. Длина кортежа

```ts
type Length<T extends readonly unknown[]> = T['length'];

type L = Length<[1, 2, 3]>;   // 3
```

### 3. Конкатенация строковых литералов

```ts
type Concat<A extends string, B extends string> = `${A}${B}`;

type R = Concat<'hello', 'world'>;   // 'helloworld'
```

### 4. Свой Pick (для упражнения)

```ts
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

type User = { id: number; name: string; email: string };
type PublicUser = MyPick<User, 'id' | 'name'>;
// { id: number; name: string }
```

Это **mapped type** — отдельная тема, но видно как они комбинируются с conditional/infer.

## Сводка `infer`

`infer` появляется **только** внутри `extends`-проверки. Он:
- Создаёт «переменную» типа
- TS заполняет её, сопоставляя структуру
- Можно использовать в результирующем типе

Грамматика: `T extends SomePattern<infer X> ? UseX : Fallback`

| Что в `SomePattern` | Что захватит `infer` |
|---|---|
| `Array<infer E>` | E — тип элемента |
| `(...args: infer A) => any` | A — кортеж аргументов |
| `(...args: any) => infer R` | R — тип возврата |
| `Promise<infer V>` | V — тип значения |
| `{ x: infer X }` | X — тип поля x |
| `[infer A, ...any]` | A — первый элемент кортежа |
| `[...any, infer L]` | L — последний элемент |
| `` `${infer A}-${string}` `` | A — префикс строкового литерала |

## Когда conditional / infer **не** нужны

Не пихай в каждый тип. Часто проще:
- Дженерик с constraint
- Готовая утилита (`Pick`, `Omit`, `Partial`)
- Простая union/intersection

Использовать когда:
- Деконструируешь тип библиотеки (вытащить тип из чужой функции)
- Делаешь утилиту для команды (рекуррентный паттерн)
- Парсишь литерал (route params, SQL queries в типах)

## Что важно вынести

- **Conditional type** = `T extends U ? X : Y` — `if/else` на уровне типов.
- **`extends`** в conditional — это **совместимость**, не наследование.
- **`never`** в результате — удаляется из union (за счёт distributive).
- **Distributive** — если T — naked generic, conditional раздаётся по union'у. Отключить — обернуть в `[T]`.
- **`infer X`** — объявление переменной типа внутри `extends`-шаблона. TS сам её выводит.
- **Встроенные утилиты на infer**: `ReturnType`, `Parameters`, `Awaited`, `Exclude`, `NonNullable`, `InstanceType`.
- **`infer` появляется только в `extends`** — нигде больше.
- **Применения**: extracting типа из функции/массива/Promise, parsing string literals (route params), сложные generic-утилиты.
- Не злоупотреблять. Простое — простыми утилитами. Conditional/infer — когда реально нужно деконструировать.
