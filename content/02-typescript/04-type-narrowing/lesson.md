---
title: "Type narrowing: guards, discriminated unions, exhaustive check"
description: "Как TS сужает типы по условиям, кастомные type guards, дискриминируемые юнионы и проверка полноты через never"
order: 4
---

# Type narrowing: guards, discriminated unions, exhaustive check

«У меня переменная типа `string | number`. Как обработать каждый случай отдельно?» — практическая задача, с которой сталкиваются каждый день. TS отвечает через **narrowing** — он автоматически сужает тип внутри `if`/`switch` по условиям. Это **главный инструмент работы с union'ами**. На собесе обязательно спросят про **type guards**, **discriminated unions**, и **exhaustive check через never**.

> Главная мысль: TS делает **control flow analysis** — анализ потока управления. В каждой точке кода он знает, какие типы возможны исходя из проверок выше. Твоя задача — писать **проверки**, понятные TS. Тогда внутри ветвей типы будут точные, без явных `as`.

## Что такое narrowing

```ts
function format(x: string | number) {
  if (typeof x === 'string') {
    return x.toUpperCase();   // ← x здесь string, не string | number
  }
  return x.toFixed(2);        // ← x здесь number, TS сам понял
}
```

TS видит `typeof x === 'string'` → **сужает** тип внутри `if` до `string`. После `if` — наоборот, сужает до `number` (раз не строка, значит число).

Без narrowing пришлось бы кастить вручную:
```ts
if (typeof x === 'string') {
  return (x as string).toUpperCase();   // лишний шум
}
```

TS избавляет от него **автоматически**, если ты пишешь правильные проверки.

## Встроенные type guards

### 1. `typeof` — для примитивов

```ts
typeof x === 'string'      // x — string
typeof x === 'number'      // x — number
typeof x === 'boolean'     // x — boolean
typeof x === 'symbol'      // x — symbol
typeof x === 'bigint'      // x — bigint
typeof x === 'undefined'   // x — undefined
typeof x === 'object'      // x — object | null (!!)
typeof x === 'function'    // x — Function
```

**Главная ловушка:** `typeof null === 'object'`. Это историческая бага JS, исправить нельзя. Для разделения объекта и null нужны другие проверки.

### 2. `instanceof` — для классов

```ts
if (err instanceof Error) {
  console.log(err.message);   // err: Error
}
```

Работает с любыми классами, включая встроенные (`Error`, `Date`, `Map`).

### 3. `in` — проверка наличия свойства

```ts
type Dog = { bark(): void };
type Cat = { meow(): void };

function speak(animal: Dog | Cat) {
  if ('bark' in animal) {
    animal.bark();   // animal: Dog
  } else {
    animal.meow();   // animal: Cat
  }
}
```

Полезно, когда нет дискриминирующего поля (см. ниже).

### 4. Truthiness narrowing

```ts
function greet(name: string | null) {
  if (name) {
    console.log(name.toUpperCase());   // name: string (null отпал)
  }
}
```

Простая `if (x)` отбрасывает `null`, `undefined`, `0`, `''`, `false`, `NaN`. **Осторожно:** иногда пустая строка валидна, и `if (name)` ошибочно отрежет её.

Безопаснее **явная** проверка:
```ts
if (name !== null && name !== undefined) {
  // только null/undefined отпали
}
// или:
if (name != null) {   // === null или === undefined — единственный осознанный == паттерн
}
```

### 5. Равенство литералу

```ts
function process(status: 'pending' | 'done' | 'error') {
  if (status === 'done') {
    // status: 'done'
  }
}
```

## Кастомные type guards — `x is T`

Иногда встроенных проверок не хватает. Можно написать **свою** функцию-предикат:

```ts
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function process(x: unknown) {
  if (isString(x)) {
    x.toUpperCase();   // x: string
  }
}
```

`x is string` — **type predicate**. Это говорит TS: «если функция вернула true, считай аргумент типа `string`».

### Реальный пример

В нашем проекте есть:
```ts
const lessons = results.filter(
  (l): l is LessonMeta => l !== null
);
```

`l is LessonMeta` — после `filter` массив имеет тип `LessonMeta[]`, а не `(LessonMeta | null)[]`. Без type guard'а пришлось бы `filter(Boolean) as LessonMeta[]` с явным кастом.

### Опасность

Тебе TS **верит** — он не проверяет, действительно ли функция корректно фильтрует. Можно написать:
```ts
function isString(x: unknown): x is string {
  return true;   // ← ложь!
}
```

И TS будет считать `string` где попало. Type guard — это **обещание** разработчика. Если соврёшь, сломаешь себе типизацию.

## Discriminated unions — лучший паттерн для типов-вариантов

Когда у тебя несколько вариантов значения, **дай им общее «дискриминирующее»** поле:

```ts
type Result =
  | { type: 'success'; data: number }
  | { type: 'error'; message: string }
  | { type: 'loading' };

function handle(r: Result) {
  switch (r.type) {
    case 'success':
      return r.data;       // r: { type: 'success'; data: number }
    case 'error':
      return r.message;    // r: { type: 'error'; ... }
    case 'loading':
      return null;
  }
}
```

TS сужает по `r.type` — внутри каждой ветки доступны только нужные поля. Это **самый чистый** способ работать с типами-вариантами.

В нашем `apiRequest`:
```ts
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

if (result.ok) {
  result.data;    // T
} else {
  result.error;   // string
}
```

`ok` — discriminator. После `if (result.ok)` TS знает, что доступно `.data` (а `.error` — нет, и наоборот).

## Exhaustive check через `never`

Что если ты обработал не все случаи?

```ts
type Status = 'pending' | 'done' | 'error';

function label(s: Status): string {
  switch (s) {
    case 'pending': return 'В работе';
    case 'done': return 'Готово';
    // забыли 'error'
  }
  // TS НЕ ругается — возвращаем undefined
}
```

TS пропустил, потому что implicit return possible. Чтобы заставить TS **проверить полноту**, используй `never`:

```ts
function label(s: Status): string {
  switch (s) {
    case 'pending': return 'В работе';
    case 'done': return 'Готово';
    case 'error': return 'Ошибка';
    default:
      const _exhaustive: never = s;   // TS ругается, если s ещё может быть чем-то
      throw new Error(_exhaustive);
  }
}
```

После всех case'ов TS считает, что `s` имеет тип `never` (нет нерасрассмотренных вариантов). Если что-то забыли — тип `s` не сводится к `never`, и `const _exhaustive: never = s` не скомпилится.

**Эффект:** при добавлении нового варианта в `Status` все switches с exhaustive check **подсветятся как ошибки**. TS заставит обработать новый случай везде.

### Идиома assertNever

Часто выносят в утилиту:
```ts
function assertNever(x: never): never {
  throw new Error(`Unexpected: ${x}`);
}

switch (s) {
  case 'pending': return 'В работе';
  // ...
  default:
    return assertNever(s);
}
```

Короче и читабельнее.

## Control flow analysis: чуть сложнее

TS отслеживает narrowing **через присваивания**, **через функции**, **через циклы**:

### После присваивания тип может сужаться

```ts
let x: string | number = 'hello';
// x: string | number

x = 42;
// теперь x: number  (TS видит присваивание)

x.toFixed();   // ok
```

### После `return` ветка отрезана

```ts
function format(x: string | null) {
  if (x === null) return '';
  // дальше x: string (null уже вернули)
  return x.toUpperCase();
}
```

Это **«narrow by return»**. Альтернатива `if/else`-блокам.

### Asserts функции — assertion functions

Похоже на type guard, но без if'а:
```ts
function assertIsString(x: unknown): asserts x is string {
  if (typeof x !== 'string') throw new Error();
}

function process(x: unknown) {
  assertIsString(x);
  x.toUpperCase();   // x: string (TS поверил функции)
}
```

`asserts x is string` — **assertion predicate**. После вызова TS считает `x` строкой (и предполагает, что функция бросит, если нет).

## Narrowing через `instanceof` для своих классов

```ts
class FetchError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

class ValidationError extends Error {
  constructor(public field: string) { super(`Invalid: ${field}`); }
}

try {
  await doSomething();
} catch (err) {
  if (err instanceof FetchError) {
    console.log('HTTP', err.status);     // err: FetchError
  } else if (err instanceof ValidationError) {
    console.log('Field:', err.field);    // err: ValidationError
  } else {
    throw err;
  }
}
```

Это и есть идиоматичная обработка ошибок в TS-проектах.

## Сравнительная таблица type guards

| Способ | Когда | Пример |
|---|---|---|
| `typeof` | Примитивы | `typeof x === 'string'` |
| `instanceof` | Классы (включая встроенные) | `err instanceof Error` |
| `in` | Проверка по полю | `'bark' in animal` |
| Truthiness | Отбросить `null`/`undefined`/`0`/`''` | `if (name) { ... }` |
| Равенство литералу | Один из union | `status === 'done'` |
| Discriminator | Помеченные варианты | `r.type === 'success'` |
| Кастомный `x is T` | Сложная логика | `function isUser(x): x is User` |
| Assertion `asserts x is T` | Throw если не подходит | `assertIsUser(x)` |

## Что важно вынести

- **Narrowing** — TS сужает тип внутри ветвей по условиям. Делает control flow analysis автоматически.
- **`typeof null === 'object'`** — ловушка, не разделяет object и null.
- **`instanceof`** — для классов. **`in`** — для проверки поля. **Truthiness** — для отбрасывания falsy.
- **Кастомный type guard** — функция с возвратом `x is T`. TS верит, ответственность — на тебе.
- **Discriminated union** — лучший паттерн для типов-вариантов. Общее поле-discriminator, switch по нему.
- **Exhaustive check через `never`** — заставит TS проверить, что все варианты обработаны. При добавлении нового случая все switches подсветятся.
- **Idiom `assertNever`** — короче, чем `const _: never = x`.
- **Assertion functions (`asserts x is T`)** — narrowing без `if`, через throw.
