---
title: "Mapped types и template literal types"
description: "Преобразование типов через [K in keyof T], модификаторы ?/-? и readonly/-readonly, key remapping через as, строковые типы-шаблоны"
order: 6
---

# Mapped types и template literal types

Это два самых **выразительных** инструмента TS-типов. Mapped types позволяют преобразовать **поля объекта** по правилу (сделать всё опциональным, readonly, поменять имена). Template literals — типы, которые **парсят строки**. На них стоят `Partial`, `Readonly`, `Pick`, и сложные парсеры роутов в стиле tRPC и Astro. На собесе мидл+ обязан написать `MyPartial<T>` и парсить простой route на типах.

> Главная мысль: mapped types — это **`for` по полям типа**. Template literal — **строковая интерполяция на уровне типов**. Вместе с conditional + infer они превращают TS-типы в мини-язык программирования.

## Mapped types: основа

Синтаксис:
```ts
type MapName<T> = {
  [K in keyof T]: T[K];
};
```

- `keyof T` — union ключей T
- `K in ...` — итерация: K принимает каждое значение
- `T[K]` — тип значения по ключу K в T

Это **идентичное копирование**. Реальная польза начинается, когда меняешь правую часть.

### Сделать всё опциональным — `Partial`

```ts
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

type User = { id: number; name: string };
type PartialUser = MyPartial<User>;
// { id?: number; name?: string }
```

`?` после имени — модификатор «опциональное».

### Всё readonly

```ts
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};
```

### Pick

```ts
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

type X = MyPick<User, 'id'>;   // { id: number }
```

K сужен через `extends keyof T` — итерируем только по выбранным ключам.

## Модификаторы `+` и `-`

По умолчанию `?` и `readonly` **добавляют**. Можно **снять**:

```ts
type Required<T> = {
  [K in keyof T]-?: T[K];   // -? убирает опциональность
};

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];   // -readonly убирает readonly
};
```

`+` тоже валидный (`+?`), но обычно опускается — он дефолт.

## Key remapping через `as`

С TS 4.1 можно **менять имя** ключа:

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type User = { name: string; age: number };
type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number; }
```

Что произошло:
- `K in keyof T` — итерация по `'name' | 'age'`
- `as \`get${Capitalize<string & K>}\`` — каждый K превращён в новое имя
- `Capitalize<string & K>` — встроенная утилита: `'name' → 'Name'`
- Значение `() => T[K]` — функция-геттер

Это уже **template literal types** в действии.

### Удалить поля через `as never`

```ts
type RemoveByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};

type X = RemoveByType<{ a: string; b: number; c: string }, string>;
// { b: number } — string-поля убраны
```

`as never` в key remapping **исключает** ключ из результата. Хороший трюк.

## Template literal types

Типы-строки с интерполяцией:

```ts
type Greeting = `hello, ${string}`;
type RouteName = `users.${string}.profile`;
type CSSVar = `--${string}`;

const x: Greeting = 'hello, world';   // ok
const y: Greeting = 'hi';              // ❌ Type '"hi"' is not assignable
```

Можно ставить **union'ы** в интерполяцию:
```ts
type Variant = 'primary' | 'secondary';
type Size = 'sm' | 'md';
type Class = `${Variant}-${Size}`;
// 'primary-sm' | 'primary-md' | 'secondary-sm' | 'secondary-md'
```

TS перемножает варианты — получается **декартово произведение**.

### Встроенные string-утилиты

```ts
Uppercase<'hello'>      // 'HELLO'
Lowercase<'HELLO'>      // 'hello'
Capitalize<'hello'>     // 'Hello'
Uncapitalize<'Hello'>   // 'hello'
```

Не библиотека — встроены в TS. Используются для key remapping (как в `Getters` выше).

## Парсинг строк через template + infer

Магия:
```ts
type ParseParams<T extends string> =
  T extends `${string}/:${infer Param}/${infer Rest}`
    ? Param | ParseParams<`/${Rest}`>
    : T extends `${string}/:${infer Param}`
      ? Param
      : never;

type R = ParseParams<'/users/:id/posts/:postId'>;
// 'id' | 'postId'
```

Что произошло:
1. Pattern `${string}/:${infer Param}/${infer Rest}` — pattern matching строки
2. `infer Param` — захват имени параметра
3. `infer Rest` — то, что осталось
4. Рекурсия по Rest, пока не упрёмся в одиночный `:param` в конце

Это **парсер на уровне типов**. Такая магия живёт в tRPC, Astro, Hono, фреймворках с автоматической типизацией роутов.

## Реальные применения

### 1. Event-handler типы из event-names

```ts
type EventName = 'click' | 'hover' | 'focus';
type Handlers = {
  [E in EventName as `on${Capitalize<E>}`]: () => void;
};
// { onClick: () => void; onHover: () => void; onFocus: () => void; }
```

### 2. Тип «глубоко readonly»

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

Рекурсия по полям. Полезно для immutable-state.

### 3. Тип «все поля в Promise»

```ts
type AsyncVersion<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : T[K];
};
```

Превращает методы класса/объекта в async-варианты. Используется в Comlink (web workers) и подобных либах.

## Что важно вынести

- **Mapped type** = `{ [K in keyof T]: ... }` — итерация по ключам T с правилом для каждого значения.
- **Модификаторы** `?`/`readonly` и **снятие через `-?`/`-readonly`** — для построения `Partial`, `Required`, `Mutable`, `Readonly`.
- **Key remapping `as`** — менять имя ключа. `as never` — исключить.
- **Template literal types** — типы-строки с интерполяцией. Поддержка union в скобках = декартово произведение.
- **Встроенные** `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize` для key remapping.
- **Pattern matching через `infer`** в template literal — основа парсеров роутов на типах.
- **Комбинации**: mapped + template literal + conditional + infer = TS-DSL для библиотек.
