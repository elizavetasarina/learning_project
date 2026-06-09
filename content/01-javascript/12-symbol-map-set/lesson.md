---
title: "Symbol, Map, Set, WeakMap, WeakRef"
description: "Когда использовать Map вместо Object, что такое Symbol и well-known symbols, weak-структуры и интеграция с GC"
order: 12
---

# Symbol, Map, Set, WeakMap, WeakRef

ES6 принёс четыре новые коллекции и шестой примитивный тип. Каждая решает конкретную задачу, которую старые Object и Array делали плохо или никак. На собесе мидл+ обязан ответить: «когда Map, а не Object», «что такое Symbol и где применяется», «что такое weak-структуры и зачем GC интегрирован».

> Главная мысль: эти инструменты — не замена Object и Array. Это **специализированные коллекции** для конкретных задач: словарь с любыми ключами (Map), уникальная коллекция (Set), скрытое мета-поле (Symbol), кэш, который не держит память (WeakMap/WeakRef).

## Symbol — уникальный примитив

```js
const id = Symbol('description');
const id2 = Symbol('description');
id === id2   // false — каждый Symbol уникален
```

Symbol — это **седьмой примитив** (рядом с number, string, boolean, null, undefined, bigint). Каждый созданный Symbol **уникален** — даже с одинаковым описанием.

### Зачем

**1. Скрытые поля объекта** — Symbol-ключ не пересекается со строковыми:
```js
const cache = Symbol('cache');
const obj = { name: 'X', [cache]: { ... } };

Object.keys(obj)        // ['name'] — symbol скрыт
JSON.stringify(obj)     // '{"name":"X"}' — symbol игнорируется
obj[cache]              // {...} — можно достать, если знаешь
```

Это **псевдо-private**. Не безопасно (можно достать через `Object.getOwnPropertySymbols`), но полезно для «не попасть случайно».

**2. Well-known symbols** — крючки для стандартных протоколов:

| Symbol | Зачем |
|---|---|
| `Symbol.iterator` | Делает объект iterable (`for...of`) |
| `Symbol.asyncIterator` | Делает async-iterable (`for await...of`) |
| `Symbol.toPrimitive` | Кастомизация приведения к примитиву |
| `Symbol.hasInstance` | Кастомизация `instanceof` |
| `Symbol.toStringTag` | Кастомизация `toString()` для классов |

Пример с `Symbol.toPrimitive`:
```js
const money = {
  amount: 100,
  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return this.amount;
    if (hint === 'string') return `$${this.amount}`;
    return this.amount;
  },
};

+money       // 100  (hint='number')
`${money}`   // '$100' (hint='string')
money + 50   // 150  (hint='default' → 100 + 50)
```

**3. Глобальный реестр** — `Symbol.for(key)` возвращает один и тот же Symbol для одного key:
```js
const a = Symbol.for('app.id');
const b = Symbol.for('app.id');
a === b   // true — взяты из реестра
```

Полезно для координации между модулями/iframe'ами.

## Map — словарь с любыми ключами

```js
const m = new Map();
m.set('str', 1);
m.set(42, 2);
m.set({ id: 1 }, 3);     // объект как ключ!
m.set(true, 4);

m.get('str')    // 1
m.size          // 4
m.has(42)       // true
m.delete(true)
```

### Чем Map лучше Object для словарей

| | Object | Map |
|---|---|---|
| Ключи | Только string и Symbol | **Любой** тип (объекты, функции, null) |
| Порядок | По вставке (с ES2015) | Гарантирован по вставке |
| Размер | `Object.keys().length` | `.size` |
| Итерация | `for...in` (с прототипом!) | `for...of` (только свои) |
| По умолчанию | Имеет `toString`, `hasOwnProperty` из прототипа | Чистая коллекция |
| Производительность для частых set/delete | Хуже | Лучше (оптимизировано) |

### Когда Map

- Ключи **не строки** (объекты, числа, мутабельные значения)
- Нужны **частые** добавления/удаления
- Важен **порядок** (Object тоже даёт его с 2015, но для integer-keys порядок странный)
- Хочешь чистый словарь без `toString`/`hasOwnProperty` (или используй `Object.create(null)`)

### Когда Object

- Структурированные данные с известными именами полей
- Сериализация в JSON
- Если данные не часто меняются и ключи — строки

В нашем проекте в `store/progress.ts` используется именно `Map<string, LessonProgressData>` — оптимизировано для частых обновлений и не имеет лишних `toString`/`hasOwnProperty` в данных.

### Итерация

```js
const m = new Map([['a', 1], ['b', 2]]);

for (const [key, value] of m) { ... }      // деструктуризация пар
for (const key of m.keys()) { ... }
for (const value of m.values()) { ... }
for (const [k, v] of m.entries()) { ... }  // то же, что прямая итерация

m.forEach((value, key) => { ... });
```

## Set — уникальная коллекция

```js
const s = new Set();
s.add(1);
s.add(2);
s.add(1);  // игнор, уже есть
s.size     // 2
s.has(1)   // true
s.delete(2)

[...new Set([1, 2, 2, 3])]   // [1, 2, 3] — снять дубли из массива
```

### Когда Set

- Уникальность важна, не важен индекс
- Частые проверки `has()` — O(1) vs Array.includes() O(n)
- Membership tracking (множество «было ли это»)
- Снятие дублей из массива

### Сравнение Set и Array для membership

```js
const arr = [1, 2, 3, ..., 1000];
const set = new Set(arr);

arr.includes(999)   // O(n) — проходим до конца
set.has(999)        // O(1) — хэш-таблица
```

Для большой коллекции и частых проверок — **всегда Set**.

### Set операции (новое в 2024)

ES2024 добавил методы операций над множествами:
```js
const a = new Set([1, 2, 3]);
const b = new Set([2, 3, 4]);

a.union(b)        // Set { 1, 2, 3, 4 }
a.intersection(b) // Set { 2, 3 }
a.difference(b)   // Set { 1 }
a.symmetricDifference(b)  // Set { 1, 4 }
a.isSubsetOf(b)
a.isSupersetOf(b)
a.isDisjointFrom(b)
```

Поддержка: Chrome 122+, Safari 17.4+. **Очень полезно знать** на собесе.

## WeakMap — ключи держатся «слабо»

```js
const cache = new WeakMap();
let user = { id: 1 };
cache.set(user, { profile: '...' });

user = null;   // объект больше нигде не ссылается
// → cache.get(user) — что? user уже не существует
// → WeakMap позволил GC собрать user, запись удалилась автоматически
```

В **обычной Map** ссылка на ключ-объект **удерживает** его от сборки мусора. В **WeakMap** — нет: если на ключ-объект больше никто не ссылается, GC соберёт и его, и запись в WeakMap.

### Ограничения WeakMap

- Ключ **только объект** (примитивы не годятся — на них нечего держать слабо)
- **Не итерируемая** — нет `keys()`, `values()`, `size`. Только `get`/`set`/`has`/`delete`
- Содержимое **непредсказуемо** — записи могут исчезать «сами»

### Зачем

**1. Кэш по объекту, который автоматически очищается:**
```js
const computeCache = new WeakMap();

function expensive(obj) {
  if (computeCache.has(obj)) return computeCache.get(obj);
  const result = /* тяжёлое вычисление */;
  computeCache.set(obj, result);
  return result;
}
// Когда obj выходит из памяти — кэш чистится сам
```

**2. Хранение «доп. данных» для DOM-элементов**:
```js
const elementMetadata = new WeakMap();
elementMetadata.set(domNode, { lastClickAt: ... });
// DOM-узел удалили → метаданные автоматически уйдут
```

**3. Псевдо-приватные поля до `#field` (паттерн module pattern + WeakMap):**
```js
const privates = new WeakMap();
class User {
  constructor(name) {
    privates.set(this, { name });
  }
  getName() { return privates.get(this).name; }
}
// поля недоступны извне
```

## WeakSet — то же для Set

`WeakSet` — Set, который слабо держит элементы:
```js
const visited = new WeakSet();
visited.add(node);
// Когда node будет собран GC, запись уйдёт автоматически
```

Применения: tracking «уже видели этот объект» (например, в обходе графа с циклами).

## WeakRef (ES2021) — слабая ссылка

```js
let user = { id: 1, name: 'L' };
const ref = new WeakRef(user);

// Где-то позже:
user = null;
// ... может быть, GC уже собрал user

const deref = ref.deref();
// → либо { id: 1, name: 'L' } если ещё жив
// → либо undefined если уже собран
```

`WeakRef` — указатель на объект, который **не удерживает его от сборки**. Через `.deref()` пробуем достать.

### Зачем

Когда нужно: «отслеживать объект, если он жив, но не **мешать** его удалению».

Применения:
- Кэши, которые не должны держать объекты в памяти
- Мониторинг (слежение за объектами, но не их продление)
- React-разработка: иногда для отслеживания компонентов (редко)

**Опасность:** код становится непредсказуемым — `deref()` может вернуть `undefined` в любой момент. Использовать только когда **очень** нужно. На собесе про существование знать обязательно, использовать — редко.

## FinalizationRegistry (ES2021) — коллбэк при сборке

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log('Объект собран:', heldValue);
});

let obj = { id: 1 };
registry.register(obj, 'описание-1');

obj = null;
// ... когда GC соберёт obj, вызовется коллбэк с 'описание-1'
```

Тоже редко нужно — для cleanup'а внешних ресурсов (file handles, native resources в Node addons). На фронте практически бесполезно. **Существование** знать — да.

## Сводная таблица

| Структура | Память | Итерация | Ключ | Когда |
|---|---|---|---|---|
| `Map` | Удерживает ключи и значения | Да (по вставке) | Любой | Словарь со сложными ключами |
| `WeakMap` | Не удерживает ключи | **Нет** | Только объект | Кэш по объектам, метаданные DOM |
| `Set` | Удерживает | Да | Любой | Уникальная коллекция |
| `WeakSet` | Не удерживает | **Нет** | Только объект | Tracking без удержания |
| `WeakRef` | Слабая ссылка | — | Любой объект | Опционально жив |

## Что важно вынести

- **Symbol** — седьмой примитив. Уникальный. Для скрытых полей объекта (псевдо-private), well-known протоколов (`Symbol.iterator`, `Symbol.toPrimitive`), глобального реестра.
- **Map** vs **Object**: Map для словарей с любыми ключами, частыми мутациями, гарантированным порядком. Object — для структурированных данных с известными полями.
- **Set** — уникальная коллекция. O(1) `has()` против O(n) у `Array.includes()`. ES2024 добавил set операции (union, intersection и т.д.).
- **WeakMap/WeakSet** — не удерживают ключи от GC. Не итерируемы. Идеальны для кэшей и метаданных, привязанных к объекту.
- **WeakRef** — слабая ссылка. `.deref()` может вернуть `undefined`. Редко нужен.
- **FinalizationRegistry** — коллбэк при сборке GC. Для cleanup нативных ресурсов. На фронте почти не нужен.
