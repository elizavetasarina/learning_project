---
title: "Iterators, Generators, for...of"
description: "Протокол итерации, Symbol.iterator, генераторы и yield, async-генераторы для стримов и пагинации"
order: 11
---

# Iterators, Generators, for...of

`for (const x of arr)`, `[...set]`, `Array.from(map)` — всё это работает благодаря **протоколу итерации**. Под капотом — единый интерфейс, который JS-движок зовёт при «прохождении» любой коллекции. На собесе спрашивают: что такое итератор, чем отличается от итерируемого, как написать свой `for...of`, и когда вообще нужны генераторы.

> Главная мысль: «итерируемое» (iterable) и «итератор» (iterator) — это **два разных, но связанных** контракта. Iterable говорит «у меня есть способ выдавать элементы». Iterator говорит «вот следующий элемент». Зная контракт, ты можешь делать **свои итерируемые объекты** и **бесконечные ленивые последовательности**.

## Протокол итерации

### Iterable — объект, который умеет дать итератор

```
у iterable есть метод [Symbol.iterator]()
который возвращает iterator
```

### Iterator — объект, который умеет дать «следующий элемент»

```
у iterator есть метод next()
который возвращает { value: any, done: boolean }
```

Когда вызываешь `for (const x of arr)`:
1. JS вызывает `arr[Symbol.iterator]()` — получает итератор
2. В цикле зовёт `iterator.next()`
3. Получает `{ value, done }`. Если `done: true` — выходит
4. Иначе `x = value`, тело цикла, шаг 2

Это **всё**. Простой механизм, на котором стоят `for...of`, spread, destructuring массивов.

## Свой iterable — пример

Сделаем объект «диапазон от a до b»:

```js
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        if (current <= last) {
          return { value: current++, done: false };
        }
        return { value: undefined, done: true };
      },
    };
  },
};

for (const n of range) {
  console.log(n);   // 1, 2, 3, 4, 5
}

[...range]          // [1, 2, 3, 4, 5]
Array.from(range)   // [1, 2, 3, 4, 5]
```

Один метод `[Symbol.iterator]` — и наш объект **работает везде**, где ожидается iterable.

## Встроенные iterables

| Тип | Iterable? | Что итерирует |
|---|---|---|
| `Array` | Да | Элементы |
| `String` | Да | Юникодные символы (не байты!) |
| `Set` | Да | Элементы в порядке вставки |
| `Map` | Да | `[key, value]` пары |
| `NodeList`, `HTMLCollection` | Да (с ES6) | Узлы DOM |
| `arguments` | Да | Аргументы функции |
| **Object** (обычный) | **Нет** | — |

Обычный объект **не итерируем**. `for (const x of {a:1})` → `TypeError`. Чтобы пройти по полям:
- `Object.keys(obj)` / `Object.values(obj)` / `Object.entries(obj)` → массивы (они итерируемы)
- `for...in` — отдельный синтаксис для свойств объекта (не использует протокол итерации)

## Iterator сам — итерируемый?

Тонкость: **обычный** iterator (с одним `next()`) — не iterable, его нельзя в `for...of`.

Но если добавить `[Symbol.iterator]() { return this; }` — он становится iterable. Это **«well-formed iterator»** — стандартная практика, и **все встроенные итераторы JS такие**.

Поэтому работает:
```js
const it = [1, 2, 3][Symbol.iterator]();  // iterator
for (const x of it) console.log(x);  // работает!
```

## Generators — компактный синтаксис для итераторов

Писать `[Symbol.iterator]` руками — много кода. Генераторы делают это короче:

```js
function* range(from, to) {
  for (let i = from; i <= to; i++) {
    yield i;
  }
}

for (const n of range(1, 5)) {
  console.log(n);   // 1, 2, 3, 4, 5
}
```

**`function*`** — генератор. Возвращает iterator (он же iterable). **`yield`** — пауза, отдаёт значение.

Под капотом каждый `yield`:
- Останавливает функцию
- Возвращает `{ value, done: false }`
- Сохраняет состояние (переменные, scope)
- При следующем `next()` продолжает с того места

Когда функция возвращается (`return` или конец) → `{ value, done: true }`.

## Бесконечные последовательности

Это **главный практический плюс** генераторов:

```js
function* naturals() {
  let n = 1;
  while (true) {
    yield n++;
  }
}

const nats = naturals();
nats.next();  // { value: 1, done: false }
nats.next();  // { value: 2, done: false }
// ... бесконечно
```

В памяти не лежит миллион чисел — мы генерируем **по запросу**. Это **lazy evaluation** на уровне коллекций.

Полезно для:
- Постраничного API без сборки массива в памяти
- Бесконечной прокрутки
- Стримов

## `yield*` — делегирование

```js
function* sub() {
  yield 'a';
  yield 'b';
}

function* main() {
  yield 1;
  yield* sub();   // встраивает все yields из sub
  yield 2;
}

[...main()]  // [1, 'a', 'b', 2]
```

`yield* iter` — «перебери `iter` и отдавай каждый его элемент как свой». Удобно для композиции генераторов.

## Передача данных В генератор

Менее известная фишка: можно **передать значение** через `next(value)`:

```js
function* dialog() {
  const name = yield 'Как тебя зовут?';
  yield `Привет, ${name}!`;
}

const it = dialog();
it.next();         // { value: 'Как тебя зовут?', done: false }
it.next('Лиза');   // { value: 'Привет, Лиза!', done: false }
```

`yield` — это **выражение**: возвращает значение, переданное в следующий `next()`. Эта механика — основа того, как `async/await` работает под капотом.

## Async-генераторы и `for await...of`

Когда источник данных приходит **порциями во времени** — используются async-генераторы:

```js
async function* paginate(url) {
  let page = 1;
  while (true) {
    const res = await fetch(`${url}?page=${page}`);
    const data = await res.json();
    if (data.length === 0) return;
    yield* data;
    page++;
  }
}

for await (const item of paginate('/api/items')) {
  console.log(item);
}
```

- **`async function*`** — async-генератор. Возвращает async-iterator.
- **`for await...of`** — async-версия `for...of`. Ждёт каждый `yield` через `await`.

Применения:
- Постраничные API (как выше) — итерируем без сборки всех страниц в памяти
- Server-Sent Events / WebSocket — обработка каждого сообщения
- Файловые стримы в Node — `for await (const chunk of fileStream)`

## Lazy chains: map, filter, take без массивов

Стандартные `arr.map().filter()` создают **промежуточные массивы**. Для больших данных это плохо. Генераторы дают **lazy** альтернативу:

```js
function* map(iter, fn) {
  for (const x of iter) yield fn(x);
}
function* filter(iter, pred) {
  for (const x of iter) if (pred(x)) yield x;
}
function* take(iter, n) {
  let i = 0;
  for (const x of iter) {
    if (i++ >= n) return;
    yield x;
  }
}

// Бесконечный поток чисел → удвоить → чётные → первые 5
const result = take(
  filter(map(naturals(), x => x * 2), x => x % 4 === 0),
  5,
);
[...result];   // [4, 8, 12, 16, 20]
```

Никаких массивов в памяти — пайплайн lazy. На обычных небольших данных можно `.map().filter()`, но для миллионов / бесконечных потоков — генераторы спасают.

> Это похоже на Java Stream, Python iterators, Haskell lazy lists. Универсальный паттерн.

## Когда генератор НЕ нужен

Не оборачивай каждый цикл в генератор. Случаи когда не нужен:
- Просто пройти массив `arr.forEach`/`.map`/`.filter`
- Данные уже все в памяти и компактные
- Нужна случайная индексация (`arr[i]`) — итераторы только sequential

Генератор реально нужен когда: **бесконечный поток**, **lazy цепочка**, **async-стрим**, **парсер с состоянием**, **сложный obhод дерева**.

## `for...of` vs `for...in` vs `forEach`

| | По чему идёт | Поддерживает `break`? | Async-await? |
|---|---|---|---|
| `for...of` | По iterable | Да | Да |
| `for...in` | По ключам объекта (включая прототип!) | Да | Да |
| `arr.forEach` | По элементам массива | **Нет** | **Нет** (callback не ждётся) |

`for...in` — **не для массивов**: идёт по всем enumerable ключам, включая унаследованные. Для массивов всегда `for...of` или index-based.

`forEach` нельзя прервать `break` (только `return` в callback — но это пропуск, а не выход). И не работает с async.

## Что важно вынести

- **Iterable**: объект с `[Symbol.iterator]()` → возвращает iterator.
- **Iterator**: объект с `next()` → возвращает `{ value, done }`.
- **`for...of`** работает с любым iterable. Spread, destructuring, `Array.from` — тоже.
- **Встроенные iterables**: массивы, строки (по символам), Set, Map, NodeList. **Обычный объект — НЕ iterable**.
- **Генератор** (`function*` + `yield`) — компактный синтаксис для итератора. Сохраняет состояние между вызовами.
- **Бесконечные последовательности** через `while (true) yield n++` — память O(1), вычисление lazy.
- **`yield*`** — делегирование другому iterable.
- **Async-генераторы** (`async function*`) + **`for await...of`** — для пагинации, SSE, файловых стримов.
- **Lazy chains** через `map`/`filter`/`take` генераторы — без промежуточных массивов.
- **`for...of` ≠ `for...in`** — первый по iterable, второй по ключам объекта (включая прототип).
