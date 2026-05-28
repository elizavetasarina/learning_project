---
title: "Event Loop: как JavaScript делает несколько дел сразу"
description: "Почему однопоточный язык не блокируется, и что такое микро- и макрозадачи"
order: 3
---

# Event Loop: как JavaScript делает несколько дел сразу

JavaScript однопоточный — он выполняет одну операцию за раз. Но при этом он умеет ждать ответ сервера, реагировать на клики и таймеры, не «зависая». Магия, которая это обеспечивает — event loop (цикл событий). Это тема, которую почти гарантированно спросят на собесе уровня мидл+.

> Ключевая идея: сам JavaScript однопоточный, но он живёт в окружении (браузер или Node.js), которое даёт ему таймеры, сеть и другие асинхронные возможности. Event loop — это диспетчер, который решает, что выполнять следующим.

## Главные участники

Чтобы понять event loop, нужно знать четыре части системы. Они работают вместе.

<svg width="100%" viewBox="0 0 680 320" role="img"><title>Компоненты event loop</title><desc>Call stack выполняет код, Web APIs обрабатывают асинхронные операции, очереди хранят готовые коллбэки, event loop переносит их в стек.</desc>
<defs><marker id="arrowe" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<g class="node c-blue"><rect x="40" y="40" width="240" height="70" rx="8" stroke-width="0.5"/>
<text class="th" x="160" y="64" text-anchor="middle" dominant-baseline="central">Call stack</text>
<text class="ts" x="160" y="84" text-anchor="middle" dominant-baseline="central">выполняет код,</text>
<text class="ts" x="160" y="100" text-anchor="middle" dominant-baseline="central">одна задача за раз</text></g>
<g class="node c-amber"><rect x="400" y="40" width="240" height="70" rx="8" stroke-width="0.5"/>
<text class="th" x="520" y="64" text-anchor="middle" dominant-baseline="central">Web APIs</text>
<text class="ts" x="520" y="84" text-anchor="middle" dominant-baseline="central">таймеры, сеть, события —</text>
<text class="ts" x="520" y="100" text-anchor="middle" dominant-baseline="central">работают параллельно</text></g>
<g class="node c-teal"><rect x="400" y="170" width="240" height="70" rx="8" stroke-width="0.5"/>
<text class="th" x="520" y="194" text-anchor="middle" dominant-baseline="central">Очереди задач</text>
<text class="ts" x="520" y="214" text-anchor="middle" dominant-baseline="central">готовые коллбэки ждут</text>
<text class="ts" x="520" y="230" text-anchor="middle" dominant-baseline="central">своей очереди</text></g>
<g class="node c-purple"><rect x="40" y="170" width="240" height="70" rx="8" stroke-width="0.5"/>
<text class="th" x="160" y="194" text-anchor="middle" dominant-baseline="central">Event loop</text>
<text class="ts" x="160" y="214" text-anchor="middle" dominant-baseline="central">диспетчер: переносит</text>
<text class="ts" x="160" y="230" text-anchor="middle" dominant-baseline="central">коллбэки в стек</text></g>
<text class="ts" x="340" y="62" text-anchor="middle">async-вызов</text>
<line x1="280" y1="75" x2="398" y2="75" class="arr" marker-end="url(#arrowe)" stroke="#185FA5"/>
<text class="ts" x="520" y="148" text-anchor="middle">готово</text>
<line x1="520" y1="110" x2="520" y2="168" class="arr" marker-end="url(#arrowe)" stroke="#854F0B"/>
<text class="ts" x="340" y="270" text-anchor="middle">когда стек пуст</text>
<line x1="398" y1="205" x2="282" y2="205" class="arr" marker-end="url(#arrowe)" stroke="#0F6E56"/>
<line x1="160" y1="168" x2="160" y2="112" class="arr" marker-end="url(#arrowe)" stroke="#534AB7"/>
</svg>

Поток такой: код выполняется в call stack. Когда встречается асинхронная операция (таймер, запрос), она передаётся в Web APIs, которые работают параллельно. Когда операция готова, её коллбэк кладётся в очередь. Event loop постоянно проверяет: если call stack пуст — он берёт коллбэк из очереди и кладёт в стек на выполнение.

## Почему код не блокируется

Вот тот самый момент, который объясняет всё:

```js
console.log("1");
setTimeout(() => console.log("2"), 0);
console.log("3");
// выведет: 1, 3, 2 — не 1, 2, 3!
```

Хотя задержка таймера 0 миллисекунд, `"2"` выводится последним. Потому что `setTimeout` не выполняется сразу — его коллбэк уходит в Web API, потом в очередь, и event loop возьмёт его только когда стек освободится (то есть после `console.log("3")`).

> Даже setTimeout с задержкой 0 не выполняется немедленно. Он встаёт в очередь и ждёт, пока завершится весь текущий синхронный код. «0 мс» означает «как можно скорее, но не сейчас».

## Две очереди: микро и макро

Здесь начинается тонкость, которую любят на собесах. Очередей не одна, а две, и у них разный приоритет.

Макрозадачи (macrotasks): `setTimeout`, `setInterval`, события, I/O. Микрозадачи (microtasks): промисы (`.then`, `await`), `queueMicrotask`, `MutationObserver`.

Правило приоритета: после каждой задачи из стека event loop **полностью опустошает очередь микрозадач**, и только потом берёт одну макрозадачу.

<svg width="100%" viewBox="0 0 680 240" role="img"><title>Приоритет микро- и макрозадач</title><desc>Микрозадачи выполняются полностью перед каждой следующей макрозадачей.</desc>
<g class="c-teal"><rect x="40" y="40" width="280" height="160" rx="12" stroke-width="0.5"/>
<text class="th" x="60" y="66">Микрозадачи</text>
<text class="ts" x="60" y="84">высокий приоритет</text></g>
<g class="c-teal"><rect x="64" y="100" width="232" height="36" rx="6" stroke-width="0.5"/>
<text class="ts" x="180" y="118" text-anchor="middle" dominant-baseline="central">Promise .then / await</text></g>
<g class="c-teal"><rect x="64" y="146" width="232" height="36" rx="6" stroke-width="0.5"/>
<text class="ts" x="180" y="164" text-anchor="middle" dominant-baseline="central">queueMicrotask</text></g>
<g class="c-amber"><rect x="360" y="40" width="280" height="160" rx="12" stroke-width="0.5"/>
<text class="th" x="380" y="66">Макрозадачи</text>
<text class="ts" x="380" y="84">берутся по одной</text></g>
<g class="c-amber"><rect x="384" y="100" width="232" height="36" rx="6" stroke-width="0.5"/>
<text class="ts" x="500" y="118" text-anchor="middle" dominant-baseline="central">setTimeout / setInterval</text></g>
<g class="c-amber"><rect x="384" y="146" width="232" height="36" rx="6" stroke-width="0.5"/>
<text class="ts" x="500" y="164" text-anchor="middle" dominant-baseline="central">события, I/O</text></g>
</svg>

Это значит: микрозадачи всегда «протискиваются» вперёд макрозадач. Посмотри:

```js
console.log("1");
setTimeout(() => console.log("2"), 0);      // макро
Promise.resolve().then(() => console.log("3")); // микро
console.log("4");
// выведет: 1, 4, 3, 2
```

Разбор: `1` и `4` — синхронные, выполняются сразу. Когда стек опустел, event loop сначала опустошает микроочередь → `3`. И только потом берёт макрозадачу → `2`.

> Микрозадачи имеют приоритет над макрозадачами. Промис выполнится раньше setTimeout, даже если setTimeout был объявлен первым. Это самый частый «обманный» вопрос по event loop.

## Связь с async/await

`async/await` — это синтаксический сахар над промисами. Всё после `await` — это, по сути, микрозадача:

```js
async function demo() {
  console.log("A");
  await null;          // точка паузы
  console.log("B");    // это уйдёт в микроочередь
}
demo();
console.log("C");
// выведет: A, C, B
```

`A` выполняется синхронно. На `await` функция «приостанавливается», управление возвращается наружу → `C`. Продолжение (`B`) ставится в микроочередь и выполняется, когда стек освободится.

## Что важно вынести

JavaScript однопоточный, но окружение (браузер, Node) даёт ему асинхронные возможности. Event loop — диспетчер, который переносит готовые коллбэки в call stack, только когда тот пуст. `setTimeout(…, 0)` не выполняется немедленно — он ждёт завершения синхронного кода. Есть две очереди: микрозадачи (промисы, await) имеют приоритет над макрозадачами (таймеры, события) — микроочередь опустошается полностью перед каждой макрозадачей. `async/await` работает поверх промисов, поэтому код после `await` ведёт себя как микрозадача.
