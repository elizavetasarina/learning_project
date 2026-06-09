---
title: "Promise глубоко: state machine, цепочки, all/allSettled/race/any"
description: "Что такое Promise на самом деле, как работают then/catch/finally, разница между Promise.all/allSettled/race/any и типовые ловушки"
order: 9
---

# Promise глубоко: state machine, цепочки, all/allSettled/race/any

`fetch().then()` пишут каждый день, но мало кто может объяснить, **что такое Promise** на уровне state machine, **почему `then` всегда возвращает Promise**, и **в чём разница между `Promise.all` и `Promise.allSettled`** без подсказки. На собесе мидл+ это спрашивают всегда — обычно через задачи «что выведет этот код».

> Главная мысль: Promise — это **state machine с тремя состояниями**, переход между которыми **необратим**. Все остальные методы (`then`, `catch`, `finally`, `all`, `race`...) — это **функции, которые добавляют коллбэки к этим переходам** или **создают новый Promise из других**.

## State machine

Promise живёт в одном из трёх состояний:

| Состояние | Значение |
|---|---|
| **pending** | начальное, асинхронная работа в процессе |
| **fulfilled** | успех, есть `value` |
| **rejected** | ошибка, есть `reason` |

```
                    ┌──────────────┐
                    │   pending    │
                    └──────┬───────┘
                           │ resolve(value)    │ reject(reason)
                           ↓                   ↓
                   ┌───────────────┐   ┌───────────────┐
                   │   fulfilled   │   │   rejected    │
                   └───────────────┘   └───────────────┘
```

**Принципиально:**
- Переход из `pending` происходит **ровно один раз**. Повторные `resolve()` или `reject()` молча игнорируются.
- Переход **необратим**: fulfilled → ничего, rejected → ничего.
- `fulfilled` и `rejected` вместе называют **settled** (улаженный).

Слово «улаженный» полезно — оно появляется в названии `Promise.allSettled`.

## Promise constructor: executor

```js
const p = new Promise((resolve, reject) => {
  // executor — синхронно выполняется СРАЗУ при создании Promise
  setTimeout(() => {
    if (Math.random() > 0.5) resolve(42);
    else reject(new Error('Bad luck'));
  }, 1000);
});
```

**Executor** (функция-параметр) **синхронно** запускается прямо в `new Promise(...)`. Внутри ты должен:
1. Запустить асинхронную работу
2. Когда работа закончится — вызвать `resolve(value)` или `reject(reason)`

Если в executor бросить исключение — Promise отвергнется с этой ошибкой:
```js
new Promise(() => { throw new Error('boom') })  // → rejected с Error('boom')
```

## then всегда возвращает новый Promise

Это **самое важное** про цепочки.

```js
const a = Promise.resolve(1);
const b = a.then(x => x + 1);
// a и b — РАЗНЫЕ Promise'ы
// a — Promise<1>
// b — Promise<2>
```

`then` создаёт **новый** Promise. Этот новый Promise разрешается значением, которое **вернула функция-коллбэк**. Это и делает цепочки возможными:

```js
fetchUser()
  .then(user => fetchPosts(user.id))   // вернули новый Promise
  .then(posts => render(posts))          // получили posts из этого Promise
  .catch(handleError);
```

Если в `.then` коллбэк вернул **обычное значение** (не Promise) — новый Promise сразу разрешается этим значением:
```js
Promise.resolve(1).then(x => x * 2)
// → Promise<2>
```

Если вернул **Promise** — новый Promise «ждёт» этот возврат и разрешается его значением:
```js
Promise.resolve(1).then(x => Promise.resolve(x * 2))
// → Promise<2> (новый, разрешён значением внутреннего Promise)
```

Если в `.then` коллбэк **бросил исключение** — новый Promise отвергается этим исключением:
```js
Promise.resolve(1).then(x => { throw new Error('oops') })
// → rejected с Error('oops')
```

## catch — это .then с одним аргументом

```js
p.catch(handleError)
// эквивалент:
p.then(undefined, handleError)
```

То есть `catch` — синтаксический сахар. `then` принимает **два** коллбэка: на fulfilled и на rejected. `catch` пропускает первый.

**Ловушка №1:** `.then(success, error)` ловит **только ошибки до then**, но НЕ ошибки внутри `success`:
```js
p.then(value => { throw new Error('inside success') },
       error => { /* НЕ поймает inside success */ });
```

**Правильно:**
```js
p.then(value => { throw new Error('inside success') })
 .catch(error => { /* поймает! */ });
```

`.catch` после — ловит ошибки **из любого этапа цепочки выше**.

## finally — для cleanup без потери значения

```js
fetchUser()
  .then(handleUser)
  .catch(handleError)
  .finally(() => hideLoader());
```

`finally` вызывается **в любом случае** — успех или ошибка. Его коллбэк **не получает** ни значения, ни ошибки. И **не меняет** значение Promise дальше:

```js
Promise.resolve(1)
  .finally(() => 'ignored')   // возврат игнорируется!
  .then(x => console.log(x)); // 1, не 'ignored'
```

Зачем: cleanup (закрыть лоадер, освободить ресурс), который не должен влиять на data flow.

**Исключение из правила:** если в `finally` бросить ошибку — это **изменит** Promise:
```js
Promise.resolve(1)
  .finally(() => { throw new Error('from finally') })
  .then(x => x, e => console.log(e.message)); // 'from finally'
```

Так что `finally` для **«молчаливого cleanup»**, без логики, которая может упасть.

## Promise.resolve и Promise.reject

Шорткаты для готовых Promise'ов:
```js
const p1 = Promise.resolve(42);     // уже fulfilled со значением 42
const p2 = Promise.reject(new Error()); // уже rejected
```

Зачем нужны: для единообразия API, когда функция **иногда возвращает Promise, а иногда нет**:
```js
function getUser(id) {
  const cached = cache.get(id);
  if (cached) return Promise.resolve(cached); // sync становится async
  return fetch(`/users/${id}`).then(r => r.json());
}
// caller всегда делает .then — поведение единое
```

## Promise.all — параллельность с быстрым отказом

```js
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments(),
]);
```

- Запускает все Promise'ы **параллельно** (если они уже запущены — просто ждёт).
- Резолвится массивом результатов **в порядке аргументов** (не по времени завершения).
- Если **любой** Promise отвергнется — `Promise.all` **немедленно** отвергается с этой ошибкой. Остальные продолжат выполняться, но результат потерян.

**Это и плюс, и минус.** Плюс — экономим время на ненужных запросах в случае ошибки. Минус — теряем данные, которые успели прийти.

## Promise.allSettled — параллельность без отказа

```js
const results = await Promise.allSettled([
  fetchUser(),
  fetchPosts(),
  fetchComments(),
]);
// результат: [
//   { status: 'fulfilled', value: ... },
//   { status: 'rejected', reason: ... },
//   { status: 'fulfilled', value: ... },
// ]
```

- Ждёт **всех**, даже если что-то отвергается.
- Никогда сам не отвергается.
- Каждый элемент массива описывает свой исход.

**Когда использовать:** когда частичный успех **тоже ценен**. Например, дашборд из 5 виджетов — если один упал, остальные должен показаться, не вся страница в ошибке.

## Promise.race — кто первый

```js
const result = await Promise.race([
  fetch('/api'),
  new Promise((_, reject) => setTimeout(() => reject('timeout'), 5000)),
]);
```

Резолвится **первым settled** Promise'ом — без разницы, fulfilled или rejected. Классическое применение — **таймаут**:

```js
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}
```

## Promise.any — первый успешный

```js
const result = await Promise.any([
  fetchFromMirror1(),
  fetchFromMirror2(),
  fetchFromMirror3(),
]);
```

- Резолвится **первым fulfilled** — отказы игнорирует.
- Если **все** отверглись — отвергается с `AggregateError` (массив всех ошибок).

**Когда:** хочется «возьми тот, который сработал». Например, fallback на зеркала, попытки разных серверов.

## Сводная таблица

| Метод | Резолвится когда | Отвергается когда |
|---|---|---|
| `all` | **все** успешны | **любой** отвергся (немедленно) |
| `allSettled` | **все** settled | никогда |
| `race` | **первый** settled (fulfilled или rejected) | **первый** settled (rejected) |
| `any` | **первый** fulfilled | **все** отверглись |

Запомни как «и/или/первый»:
- `all` = всеи И успешны → массив
- `allSettled` = всеи И settled → массив с описанием
- `race` = ИЛИ первый settled
- `any` = ИЛИ первый успешный

## Микротаски: where in event loop

Из урока про micro/macro: **коллбэки `.then`/`.catch`/`.finally` — микротаски**. Это значит:

```js
console.log('1');
Promise.resolve().then(() => console.log('2'));
setTimeout(() => console.log('3'), 0);
console.log('4');
// порядок: 1, 4, 2, 3
```

Микротаски опустошаются **полностью** между макротасками. Поэтому `.then` всегда раньше `setTimeout(0)`, как бы поздно ни был поставлен.

## async/await — это сахар над Promise

```js
async function loadUser() {
  const user = await fetchUser();
  const posts = await fetchPosts(user.id);
  return posts;
}
```

Это эквивалент:
```js
function loadUser() {
  return fetchUser().then(user => fetchPosts(user.id));
}
```

- `async` функция **всегда** возвращает Promise.
- `await` — **«пауза»** до резолва. Под капотом: `.then(...rest of function...)`.
- Throw внутри async = rejected Promise.
- try/catch внутри async ловит rejected'ы from `await`.

## Типовые ловушки

### Забыл return в then

```js
fetchUser()
  .then(user => {
    fetchPosts(user.id);  // ❌ не вернули
  })
  .then(posts => render(posts));  // posts === undefined!
```

Без `return` следующий `.then` получит `undefined` и пойдёт дальше, не дождавшись внутреннего Promise. Это **stale chain** — частая причина «у меня пропали данные».

### Двойной await (когда нужно параллельно)

```js
const user = await fetchUser();      // 1 сек
const posts = await fetchPosts();    // 1 сек
// Итого: 2 секунды (последовательно)
```

vs

```js
const [user, posts] = await Promise.all([
  fetchUser(),
  fetchPosts(),
]);
// Итого: 1 секунда (параллельно)
```

`await` блокирует код до резолва. Если запросы независимы — параллельте через `Promise.all`.

### Unhandled rejection

```js
const p = doSomething();
// нет .catch
// если doSomething отвергнется — будет Unhandled Promise Rejection
```

Node и браузеры выкидывают **warning** в консоль на unhandled rejection. В будущем — будет crash. Всегда либо `.catch`, либо `await` внутри `try/catch`.

### Promise.all с потерями

```js
const results = await Promise.all([
  saveUserToDb(),
  sendWelcomeEmail(),
]);
// Если sendWelcomeEmail упал — saveUserToDb всё равно записал.
// Promise.all отверг, но данные в БД остались.
```

`Promise.all` не «откатывает» уже выполненные операции. Если нужна транзакционность — обрабатывай в БД-транзакции или вручную.

## Что важно вынести

- **Promise = state machine** с 3 состояниями. Переход необратим, ровно один раз.
- **then всегда возвращает новый Promise**. Возврат коллбэка определяет, чем разрешается новый Promise.
- **catch = then(undefined, error)**. `.then(s, e)` НЕ ловит ошибки из `s`.
- **finally** для cleanup без изменения значения. Бросать там опасно.
- **Promise.all** — отказ при первой ошибке. **Promise.allSettled** — ждёт всех. **Promise.race** — первый settled. **Promise.any** — первый успешный.
- **Коллбэки .then — микротаски.** Выполнятся раньше любого setTimeout(0).
- **async/await — сахар** над `.then`. Под капотом — Promise-цепочка.
- **Ловушки:** забытый return в then, последовательный await вместо параллельного all, unhandled rejection.
