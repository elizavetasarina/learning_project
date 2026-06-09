---
title: "async/await: ловушки, отмена, race conditions"
description: "Параллельность vs последовательность, AbortController, race в useEffect, error handling — то, что реально спрашивают на собесах"
order: 10
---

# async/await: ловушки, отмена, race conditions

`async/await` — синтаксический сахар над Promise, который **выглядит** как обычный синхронный код. Эта иллюзия обманывает: ошибки делают именно потому, что async ведёт себя **не как** sync. Этот урок — про то, где этот сахар протекает: параллельность, отмена, race condition в React.

> Главная мысль: `await` — это **точка приостановки** функции до резолва Promise. Между `await` и следующей строкой может произойти **что угодно**: смена state, другой запрос, размонтирование компонента. Думать про async-код нужно через этот разрыв во времени.

## Что под капотом

```js
async function loadUser() {
  const user = await fetchUser();
  return user.name;
}
```

Это **в точности** эквивалентно:
```js
function loadUser() {
  return fetchUser().then(user => user.name);
}
```

- `async` помечает: «функция возвращает Promise»
- `await` помечает: «здесь точка перехода к `.then`»
- Возврат значения = resolve, throw = reject

Это нужно держать в голове, потому что **все ловушки async/await — это ловушки Promise**, замаскированные синтаксисом.

## Ловушка 1: последовательно вместо параллельно

```js
const user = await fetchUser();      // 200мс
const posts = await fetchPosts();    // 200мс
const tags = await fetchTags();      // 200мс
// Итого: 600мс
```

Каждый `await` блокирует **следующую строку** до резолва. Если запросы **независимы** — это потеря времени.

**Параллельно:**
```js
const [user, posts, tags] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchTags(),
]);
// Итого: ~200мс
```

`Promise.all` запускает все три одновременно. Время = max, а не сумма.

**Когда последовательно нужно:** когда следующий запрос **зависит от предыдущего**:
```js
const user = await fetchUser();           // нужен user.id
const posts = await fetchPosts(user.id);  // от user зависит
```

Это **dependent fetches** — без последовательности не обойтись. Но если ловишь себя на «5 независимых await подряд» — это почти всегда `Promise.all`.

## Ловушка 2: забыли await

```js
async function save() {
  saveToDb();           // ❌ нет await!
  console.log('done');
}
```

`saveToDb()` возвращает Promise. Без `await` мы:
- Запустили запрос
- Сразу написали 'done'
- Функция вернулась (resolved), пока запрос ещё летит

Это **fire-and-forget** — иногда сознательно, иногда баг. Если позже `saveToDb` падает → unhandled rejection.

**TypeScript-фишка:** `tsconfig.json` опция `"strict": true` включает `noFloatingPromises`-подобные правила в ESLint. Они подсветят забытый await.

## Ловушка 3: try/catch обнимает слишком много или мало

```js
try {
  const user = await fetchUser();
  const posts = await fetchPosts(user.id);
  render(user, posts);
} catch (err) {
  showError(err);
}
```

Этот try/catch ловит **всё**: ошибку fetchUser, fetchPosts, render. Если хочется их различать — **разделяй блоки**:

```js
let user;
try {
  user = await fetchUser();
} catch (err) {
  showError('Не удалось загрузить юзера');
  return;
}

let posts;
try {
  posts = await fetchPosts(user.id);
} catch (err) {
  showError('Не удалось загрузить посты, показываем без них');
  posts = [];
}

render(user, posts);
```

Громоздко, но **семантически точно**. Альтернатива — `.catch` на конкретном вызове:
```js
const user = await fetchUser().catch(err => null);
if (!user) { showError(...); return; }
```

## Ловушка 4: race condition в useEffect

Самый частый async-баг в React.

```js
function User({ id }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(id).then(setUser);
  }, [id]);

  return <div>{user?.name}</div>;
}
```

Сценарий: пропс `id` меняется быстро (юзер кликает по списку):
- Старый эффект (id=1) запускается, fetch идёт
- Юзер кликает id=2 → новый эффект
- Старый fetch заканчивается **позже** нового — setUser(user1) перетирает user2

Это **race condition**: гонка между запросами.

**Решение 1: флаг отмены через cleanup**
```js
useEffect(() => {
  let cancelled = false;
  fetchUser(id).then(u => {
    if (!cancelled) setUser(u);  // игнорируем результат, если эффект уже size
  });
  return () => { cancelled = true; };
}, [id]);
```

**Решение 2: AbortController (правильный путь)**
```js
useEffect(() => {
  const ctrl = new AbortController();
  fetchUser(id, { signal: ctrl.signal })
    .then(setUser)
    .catch(err => {
      if (err.name === 'AbortError') return;
      // настоящая ошибка
    });
  return () => ctrl.abort();
}, [id]);
```

`AbortController` — нативный API отмены. Передаёшь `signal` в fetch, при `.abort()` сам fetch отменяется (запрос реально прекращается, не просто результат игнорируется). Плюс — сервер получит сигнал и тоже может прекратить работу.

## AbortController: для чего ещё

Помимо fetch, `AbortSignal` принимают:
- `addEventListener('click', handler, { signal })` — снятие обработчика
- Многие современные API: `EventTarget`, web platforms streams
- Можно встраивать в свои API

```js
function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}
```

Это — **стандартный** способ делать отменяемые async-операции в JS. На собесе про «как отменить fetch» — ответ AbortController, без лишних обёрток.

## Top-level await

В ESM-модулях (но не в скриптах) можно писать `await` **на верхнем уровне** файла:

```js
// data.ts
const data = await fetchInitialData();
export { data };
```

Что происходит:
- Импорт модуля ждёт резолва верхнеуровнего await
- Если импортируется кем-то — тот тоже ждёт

Полезно для конфигов, кэшей, инициализации. Минус: импорт становится async — может неожиданно замедлить tree.

Поддержка: Node 14.8+, современные браузеры, Webpack 5+, Vite/Bun из коробки.

## Async iterators (`for await...of`)

Когда источник данных приходит **порциями** во времени — стрим, paginated API:

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

`async function*` — async-генератор. `for await...of` итерирует, обрабатывая каждый `yield` через await. Удобно для:
- Постраничного API без сборки массива в памяти
- Server-sent events
- WebSocket-сообщений

Тема для сеньоров — на мидл-собесе спрашивают редко, но **знать, что есть** — плюс.

## Тонкости

### Async + forEach = баг

```js
[1, 2, 3].forEach(async (n) => {
  await doSomething(n);
});
console.log('done');  // выведется СРАЗУ, не дождавшись
```

`forEach` не работает с async-коллбэком: возврат Promise игнорируется. Если нужно ждать:

**Параллельно:**
```js
await Promise.all([1, 2, 3].map(n => doSomething(n)));
```

**Последовательно:**
```js
for (const n of [1, 2, 3]) {
  await doSomething(n);
}
```

`for...of` ждёт каждый await. Это и есть правильный способ «обработать массив последовательно».

### async-функция без await

```js
async function foo() {
  return 42;
}
```

Возвращает `Promise<42>`. Async-ключевое слово работает **независимо** от наличия `await`. Иногда полезно: контракт «функция возвращает Promise», даже если внутри ничего не ждёт.

### return await — нужно ли?

```js
async function foo() {
  return await bar();  // ❌ лишнее await
}
```

vs

```js
async function foo() {
  return bar();  // ✅ так же работает
}
```

`return await x` и `return x` (где x — Promise) — почти эквивалентны. Async-функция всё равно завернёт возврат в Promise.

**Исключение:** внутри try/catch разница важна:
```js
async function foo() {
  try {
    return bar();        // ❌ ошибка bar() не поймается этим try
  } catch (e) { ... }
}

async function foo() {
  try {
    return await bar();  // ✅ ошибка поймается
  } catch (e) { ... }
}
```

Без `await` Promise возвращается «снаружи» try/catch — и rejection ловится только в внешнем catch вызывающего.

## Что важно вынести

- **async/await — сахар над Promise.** Все ловушки = ловушки Promise.
- **`await` блокирует следующую строку.** Параллельте независимые операции через `Promise.all`.
- **Забытый await** = fire-and-forget = риск unhandled rejection.
- **try/catch вокруг await** ловит любую ошибку внутри, в т.ч. throw из вашего же кода.
- **Race condition в useEffect**: пропс меняется быстро → старый запрос приходит позже нового. Лечится `AbortController` или флагом cancelled в cleanup.
- **AbortController** — стандартный способ отмены. Работает не только с fetch.
- **Async + forEach = баг.** Используй `Promise.all` или `for...of` с await.
- **`return await x`** vs `return x` — обычно нет разницы, **кроме** случая внутри try/catch.
- **Top-level await** в ESM, **async iterators** через `for await...of`.
