---
title: "TypeScript: Generics с нуля до infer"
description: "Зачем дженерики, как читать сигнатуры, constraints, дефолты, и где применять в реальном коде"
order: 1
---

# TypeScript: Generics с нуля до infer

Дженерики — самая частая «у меня не получается, что это» проблема при переходе на TS. На собесе их любят: «напиши тип утилиты, которая делает X». Без свободного владения дженериками — мидл по TS не закроешь.

> Главная мысль: дженерик — это **параметр типа**. То же, что аргумент функции, но на уровне типов. Если функция принимает значения, дженерик принимает типы и возвращает тип.

## Зачем

Без дженериков ты вынужден выбирать между:

**1. Слишком конкретно:**
```ts
function firstString(arr: string[]): string {
  return arr[0];
}
function firstNumber(arr: number[]): number {
  return arr[0];
}
function firstUser(arr: User[]): User {
  return arr[0];
}
// ...копипаста для каждого типа
```

**2. Слишком абстрактно:**
```ts
function first(arr: any[]): any {
  return arr[0];
}
// any теряет всю типизацию
```

**С дженериком — то, что надо:**
```ts
function first<T>(arr: T[]): T {
  return arr[0];
}
first([1, 2, 3])        // T = number, возвращает number
first(['a', 'b'])       // T = string, возвращает string
first<User>([u1, u2])   // T = User явно
```

`<T>` — это «параметр типа». TS подставляет туда конкретный тип на основании аргумента. Один код, любой тип, полная типизация.

## Как читать сигнатуру

```ts
function map<T, U>(arr: T[], fn: (item: T) => U): U[]
```

Пошагово:
1. `<T, U>` — у функции два параметра типа
2. `arr: T[]` — аргумент: массив элементов типа T
3. `fn: (item: T) => U` — аргумент: функция, которая принимает T и возвращает U
4. `: U[]` — возвращаемый тип: массив U

Вызов:
```ts
map([1, 2, 3], n => String(n))
// T = number (вывелся из [1,2,3])
// U = string (вывелся из возврата String(n))
// → string[]
```

TS **выводит** типы автоматически — это **type inference**. Указывать явно не нужно, кроме редких случаев.

## Дженерики в типах (не только функциях)

Дженерики работают и для `type`/`interface`:

```ts
type Box<T> = { value: T };

const x: Box<number> = { value: 42 };
const y: Box<string> = { value: 'hello' };
```

Аналог из API:
```ts
type Response<T> = {
  data: T;
  status: number;
  error?: string;
};

type UserResponse = Response<User>;
type PostsResponse = Response<Post[]>;
```

Один шаблон — разные использования. Идеально для API-обёрток (как наш `apiRequest<T>`).

## Constraints (ограничения)

Иногда дженерику нужно «уметь» что-то — например, иметь поле `length`:

```ts
function logLength<T>(item: T) {
  console.log(item.length);   // ❌ Property 'length' does not exist on type 'T'
}
```

TS не знает, что у `T` есть `length`. Скажем ему:
```ts
function logLength<T extends { length: number }>(item: T) {
  console.log(item.length);   // ✅
}

logLength('hello')        // OK (string has length)
logLength([1, 2, 3])      // OK (array has length)
logLength(42)             // ❌ number has no length
```

`<T extends X>` — ограничение: «T должен быть совместим с X». Это **верхняя граница**: T может быть X или подтипом.

Пример из реального кода:
```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Лиза', age: 30 };
getProperty(user, 'name')   // string
getProperty(user, 'age')    // number
getProperty(user, 'wat')    // ❌ Argument of type '"wat"' is not assignable to keyof
```

`K extends keyof T` — «K может быть любым ключом T». TS вычислит `T[K]` — тип значения по ключу.

Это **типобезопасный геттер**. На собесах любят такое спросить — «как обеспечить, что ключ существует?». Ответ — `keyof T`.

## Дефолты

Можно задать дефолтное значение типа:

```ts
type Response<T = unknown> = {
  data: T;
};

type R1 = Response;          // Response<unknown>
type R2 = Response<User>;    // Response<User>
```

Дефолт работает там же, где дефолт у аргументов функций — если не передали, используется он.

## Когда дженерик НЕ нужен

Частая ошибка — пихать дженерики туда, где их не нужно:

```ts
// ❌ дженерик не используется
function greet<T>(name: string): string {
  return `Hello, ${name}`;
}
```

Здесь `T` не появляется ни в аргументах, ни в возврате — это просто `function greet(name: string): string`. Дженерик ради дженерика — шум.

Правило: **если параметр типа не появляется ни в аргументах, ни в возврате — он не нужен**.

## `infer` — извлечение типа из другого типа

`infer` — самая «магическая» часть TS. Появляется в conditional types:

```ts
type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never;

type Fn = () => string;
type X = ReturnTypeOf<Fn>;    // string
```

Что произошло:
- `T extends (...args: any[]) => infer R` — «если T это функция, выведи её возврат в R»
- `? R : never` — если да, верни R; если нет, never

Это и есть встроенный `ReturnType<T>` из TS. Так же реализованы `Parameters<T>`, `Awaited<T>`, и многие другие.

`infer` нужен редко в обычном коде, но **на собесе обязательно спросят** — «как извлечь тип элемента массива?»:
```ts
type ElementOf<T> = T extends Array<infer E> ? E : never;

type X = ElementOf<number[]>;   // number
type Y = ElementOf<string[]>;   // string
type Z = ElementOf<{name: string}[]>;   // {name: string}
```

## Реальные применения

В нашем проекте есть:

```ts
// lib/api-client.ts
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string }>
```

`<T>` — тип ожидаемых данных в успешном ответе. Вызывающий передаёт его через type assertion:
```ts
return apiRequest<ProgressResponse>("/api/progress");
```

И TS знает: если `result.ok`, то `result.data` имеет тип `ProgressResponse`. Без дженерика пришлось бы либо приводить вручную (`as ProgressResponse`), либо терять типы.

## Что важно вынести

- **Дженерик = параметр типа**. То же, что параметр функции, но на уровне типов.
- **`<T>`** — обычный синтаксис. TS выводит тип автоматически из аргументов (inference).
- **`<T extends X>`** — ограничение. T должен быть совместим с X.
- **`<T = D>`** — дефолтный тип, если не передан.
- **`keyof T`** — все ключи объекта T. Используется с `K extends keyof T` для типобезопасных геттеров.
- **`infer`** — извлекает тип из другого типа в conditional. Основа для `ReturnType`, `Parameters`, `Awaited` и собственных утилит.
- **Правило**: дженерик нужен только если параметр типа реально используется в аргументах или возврате. Иначе — шум.
