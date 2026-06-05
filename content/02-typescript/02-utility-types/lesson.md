---
title: "TypeScript: Utility Types на практике"
description: "Partial, Required, Pick, Omit, Record, ReturnType — и когда какой использовать"
order: 2
---

# TypeScript: Utility Types на практике

`Pick`, `Omit`, `Partial` — это **встроенные дженерики** TS, которые трансформируют существующие типы. Не нужно знать все, но 7-8 базовых — обязательно, и на собесе именно про них спрашивают. Этот урок — про эти 7-8.

> Главная мысль: не дублируй типы. Если у тебя есть `User`, и нужен «то же, но всё опционально» — есть `Partial<User>`. Если нужен «только определённые поля» — `Pick<User, ...>`. Это инструменты для **производных** типов.

## Базовый тип, на котором будем играться

```ts
type User = {
  id: number;
  name: string;
  email: string;
  age?: number;
};
```

## `Partial<T>` — всё опционально

```ts
type PartialUser = Partial<User>;
// эквивалент:
// {
//   id?: number;
//   name?: string;
//   email?: string;
//   age?: number;
// }
```

Зачем: для функций «обнови юзера», которые принимают **подмножество полей**:
```ts
function updateUser(id: number, patch: Partial<User>) {
  // patch может содержать любые поля User
}

updateUser(1, { name: 'Лиза' });            // OK
updateUser(1, { name: 'Лиза', email: '' }); // OK
updateUser(1, { wat: 'x' });                // ❌ — нет такого поля
```

Без `Partial` пришлось бы дублировать тип со всеми `?`.

## `Required<T>` — всё обязательно

Обратное `Partial`. Все необязательные поля становятся обязательными:
```ts
type StrictUser = Required<User>;
// {
//   id: number;
//   name: string;
//   email: string;
//   age: number;   ← было age?, стало age
// }
```

Реже нужен, чем `Partial`. Полезно когда после нормализации данных гарантируешь полноту.

## `Readonly<T>` — нельзя менять

```ts
type FrozenUser = Readonly<User>;
const u: FrozenUser = { id: 1, name: 'L', email: '' };
u.name = 'M';   // ❌ Cannot assign to 'name' because it is a read-only property
```

Compile-time запрет мутации. В рантайме объект всё равно мутируем (это не `Object.freeze`) — только TS не пропустит.

## `Pick<T, K>` — взять только указанные ключи

```ts
type UserPublic = Pick<User, 'id' | 'name'>;
// {
//   id: number;
//   name: string;
// }
```

`K` — это union ключей. Если ошибиться в имени — TS ругается.

Реальный пример: тип публичного профиля юзера. У тебя есть полный `User`, в него хочется не светить `email` наружу:
```ts
type PublicProfile = Pick<User, 'id' | 'name' | 'age'>;
```

Меняется `User` (добавили `passwordHash`) — `PublicProfile` остаётся правильным (явно перечислены поля).

## `Omit<T, K>` — взять всё, КРОМЕ указанных ключей

Обратное `Pick`:
```ts
type UserWithoutId = Omit<User, 'id'>;
// {
//   name: string;
//   email: string;
//   age?: number;
// }
```

Когда использовать `Omit` vs `Pick`:
- Если **исключения мало, включения много** — `Omit` (не хочется перечислять 10 полей)
- Если **включений мало, остального много** — `Pick`

Часто `Omit` для «создаём нового юзера, у которого нет id (его генерит БД)»:
```ts
type CreateUserInput = Omit<User, 'id'>;
```

## `Record<K, V>` — словарь типа K → V

```ts
type UserRoles = Record<string, 'admin' | 'user'>;
// эквивалент:
// { [key: string]: 'admin' | 'user' }

const roles: UserRoles = {
  alice: 'admin',
  bob: 'user',
};
```

Часто:
```ts
type ColorMap = Record<'red' | 'green' | 'blue', string>;
// { red: string; green: string; blue: string; }

const colors: ColorMap = {
  red: '#f00',
  green: '#0f0',
  blue: '#00f',
};
```

`Record<K, V>` где K — литералы → даёт типобезопасный словарь, в котором **должны быть все ключи**.

## `ReturnType<T>` — тип возврата функции

```ts
function getUser() {
  return { id: 1, name: 'L' };
}

type UserFromFn = ReturnType<typeof getUser>;
// { id: number; name: string; }
```

Зачем: чтобы тип «всегда соответствовал» реализации. Меняешь функцию — тип меняется автоматически.

Реальный пример из проекта:
```ts
type DbUser = Awaited<ReturnType<typeof prisma.user.upsert>>;
```

Это: «возьми возвращаемый тип `prisma.user.upsert` → разверни Promise → получи тип User». Не нужно импортировать `User` из Prisma — выводится из самой функции.

## `Parameters<T>` — типы аргументов функции

```ts
function greet(name: string, age: number) {}

type Args = Parameters<typeof greet>;
// [name: string, age: number]
```

Возвращает **кортеж** (tuple) с типами всех параметров. Полезно когда нужно передать аргументы дальше:
```ts
function wrapper(...args: Parameters<typeof greet>) {
  console.log('calling');
  greet(...args);   // ✅ TS знает типы
}
```

## `Awaited<T>` — разворачивает Promise

```ts
type X = Awaited<Promise<string>>;   // string
type Y = Awaited<Promise<Promise<number>>>;   // number (рекурсивно разворачивает)
type Z = Awaited<number>;   // number (не Promise → как есть)
```

Появился в TS 4.5. До него были самописные:
```ts
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
```

Сейчас просто `Awaited<T>`.

## `NonNullable<T>` — убирает null и undefined

```ts
type X = NonNullable<string | null | undefined>;  // string
```

Удобно после narrowing'а:
```ts
function getName(user: User | null) {
  if (!user) return '';
  // user здесь типа User, но если нужно явно:
  const u: NonNullable<User | null> = user;  // User
}
```

## `Exclude<T, U>` и `Extract<T, U>` — фильтрация union'ов

```ts
type Color = 'red' | 'green' | 'blue' | 'yellow';
type Primary = Extract<Color, 'red' | 'green' | 'blue'>;   // 'red' | 'green' | 'blue'
type NonPrimary = Exclude<Color, 'red' | 'green' | 'blue'>; // 'yellow'
```

Используются для работы с union'ами на уровне типов. Реже нужны напрямую — чаще через `Omit`/`Pick` для объектов.

## Комбинации (где сила)

Реальный код часто комбинирует:

```ts
// Юзер для формы редактирования: всё опционально, без id и createdAt
type EditUserForm = Partial<Omit<User, 'id' | 'createdAt'>>;
```

```ts
// Только публичные поля, и все обязательные
type StrictPublic = Required<Pick<User, 'id' | 'name'>>;
```

```ts
// Тип данных для оптимистичного UI: всё что есть в БД + явный флаг
type OptimisticUser = User & { isOptimistic: true };
```

## Что важно вынести

- **`Partial<T>`** — все поля опциональные. Для функций обновления, формы.
- **`Required<T>`** — обратное `Partial`. Все обязательные.
- **`Readonly<T>`** — нельзя мутировать (compile-time only).
- **`Pick<T, K>`** — выбрать конкретные ключи (для публичных типов).
- **`Omit<T, K>`** — взять всё кроме указанных (для `CreateInput` без `id`).
- **`Record<K, V>`** — словарь, где K — union ключей.
- **`ReturnType<T>`** — тип возврата функции. Часто с `typeof functionName`.
- **`Parameters<T>`** — кортеж типов аргументов.
- **`Awaited<T>`** — разворачивает Promise.
- **Комбинируй**. `Partial<Omit<User, 'id'>>` — норма, не извращение.
