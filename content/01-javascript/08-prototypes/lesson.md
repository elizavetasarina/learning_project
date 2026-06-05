---
title: "Прототипы и классы изнутри"
description: "Цепочка прототипов, разница prototype и __proto__, что class на самом деле, и почему JS прототипный, а не классовый"
order: 8
---

# Прототипы и классы изнутри

JavaScript — **прототипный** язык, единственный из мейнстримных. Когда ты пишешь `class`, это просто синтаксический сахар. На собесе спрашивают: «что такое прототип», «чем `prototype` отличается от `__proto__`», «что делает `new`». Если на это не ответить — впечатление о знании JS падает резко.

> Главная мысль: **у каждого объекта в JS есть «прототип»** — другой объект, к которому идёт поиск свойства, если в самом объекте его нет. Эта цепочка прототипов и есть «наследование» в JS — без классов в OOP-смысле.

## Базовая идея

```js
const animal = { eats: true };
const dog = { barks: true };
Object.setPrototypeOf(dog, animal);

dog.barks   // true (своё свойство)
dog.eats    // true (нашлось у прототипа)
dog.flies   // undefined (нигде нет)
```

Когда читаешь `dog.eats`:
1. JS ищет `eats` в самом `dog` → нет
2. Идёт к **прототипу** `dog` → это `animal`
3. Ищет `eats` в `animal` → нашёл → возвращает `true`

Это **prototype chain** — цепочка прототипов. Можно сделать сколько угодно длинной:
```js
const big = { isBig: true };
const animal = { eats: true };
Object.setPrototypeOf(animal, big);
Object.setPrototypeOf(dog, animal);

dog.isBig   // true (dog → animal → big → нашлось)
```

Поиск идёт **по цепочке вверх**, пока не нашёл или не упёрся в `null` (вершина цепи).

## `__proto__` vs `prototype` — главная путаница

Это два **разных** свойства, и их легко спутать.

**`__proto__`** (или `Object.getPrototypeOf(obj)`) — это **ссылка на прототип конкретного объекта**. Есть у **любого** объекта:
```js
const x = {};
x.__proto__   // → Object.prototype
[].__proto__  // → Array.prototype
```

**`prototype`** — это **поле функции-конструктора**. Объект, который **станет прототипом** для всех инстансов, созданных через `new`:
```js
function Dog(name) {
  this.name = name;
}
Dog.prototype.bark = function () { console.log('гав'); };

const rex = new Dog('Rex');
rex.bark();   // 'гав'

// Связь:
rex.__proto__ === Dog.prototype   // true
```

Запоминалка: **`prototype` есть у функций**, **`__proto__` есть у объектов**. Когда делаешь `new Dog()`, происходит: создаётся новый объект, его `__proto__` ставится в `Dog.prototype`.

## Что делает `new`

```js
function User(name) {
  this.name = name;
}
const u = new User('Лиза');
```

Под капотом `new`:
1. Создаёт новый пустой объект `{}`.
2. Ставит его `__proto__` в `User.prototype`.
3. Вызывает функцию `User` с этим объектом как `this`.
4. Если функция явно не возвращает объект — возвращает созданный.

То есть `new User('Лиза')` ≈
```js
const obj = {};
Object.setPrototypeOf(obj, User.prototype);
User.call(obj, 'Лиза');
return obj;
```

Знание этого важно для понимания **что есть `class`** в современном JS.

## `class` — это синтаксический сахар

```js
class Dog {
  constructor(name) {
    this.name = name;
  }
  bark() {
    console.log('гав');
  }
}
```

Под капотом это **то же самое**, что:
```js
function Dog(name) {
  this.name = name;
}
Dog.prototype.bark = function () { console.log('гав'); };
```

Разница только:
- Синтаксис чище
- `class` обязательно вызывается через `new` (без — TypeError)
- Методы в `class` **не енумерабельны** (не появляются в `for...in`)
- Внутри `class` всегда strict mode

Под капотом — те же прототипы. Никакого «класса» в OOP-смысле (Java/C++) в JS нет. Это **видимость классов** поверх прототипов.

## Наследование через `extends`

```js
class Animal {
  eats = true;
}
class Dog extends Animal {
  bark() { console.log('гав'); }
}

const rex = new Dog();
rex.eats   // true
rex.bark() // 'гав'
```

Что происходит:
- `Dog.prototype.__proto__ === Animal.prototype`
- При `rex.eats`: идём по цепочке `rex → Dog.prototype → Animal.prototype` → нашли
- При `rex.bark()`: идём по цепочке `rex → Dog.prototype` → нашли

Цепочка прототипов — это ВСЁ, что нужно для «наследования» в JS.

## Вершина цепи

Цепочка не бесконечна. У большинства объектов наверху — `Object.prototype`, у которого `__proto__ === null`:

```js
const obj = {};
obj.__proto__              // Object.prototype
obj.__proto__.__proto__    // null  (вершина)
```

У `Object.prototype` живут «общие» методы: `hasOwnProperty`, `toString`, `valueOf`. Поэтому ты можешь вызывать `({}).toString()` на любом объекте — он наследован.

**`Object.create(null)`** — создаёт объект **без прототипа**:
```js
const dict = Object.create(null);
dict.foo                   // undefined
dict.hasOwnProperty        // undefined  ← нет, потому что нет цепочки
```

Используют для **«чистых словарей»** (dictionaries) — когда не хочешь, чтобы случайные имена ключей (`toString`, `constructor`) ломали логику. Полезно в редких случаях.

## Свойство своё или унаследованное

```js
const animal = { eats: true };
const dog = { barks: true };
Object.setPrototypeOf(dog, animal);

'eats' in dog                          // true (видно через цепочку)
dog.hasOwnProperty('eats')             // false (унаследовано, не своё)
dog.hasOwnProperty('barks')            // true (своё)
Object.hasOwn(dog, 'eats')             // false (современный аналог)
```

Зачем разделять:
- `for...in` идёт по **всей цепочке** (плохо для словарей)
- `Object.keys(obj)` — только **свои** свойства
- При сериализации в JSON — только свои

**Современный `Object.hasOwn(obj, key)`** заменяет `obj.hasOwnProperty(key)`. Преимущества:
- Не ломается, если `obj.hasOwnProperty` переопределён
- Работает на `Object.create(null)` (где `hasOwnProperty` нет)

## Прототипы массивов и функций

Массивы и функции — тоже объекты. У них своя цепочка:
```js
const arr = [];
arr.__proto__              // Array.prototype  (откуда map, filter, slice)
arr.__proto__.__proto__    // Object.prototype (откуда toString, hasOwnProperty)

const fn = () => {};
fn.__proto__               // Function.prototype  (откуда call, apply, bind)
fn.__proto__.__proto__     // Object.prototype
```

**Поэтому работают встроенные методы.** `[1,2,3].map(...)` — это вызов `Array.prototype.map`, к которому ты добираешься через `__proto__`.

Раньше **меняли** прототипы стандартных типов, чтобы добавить «свои методы»:
```js
Array.prototype.last = function () { return this[this.length - 1]; };
[1, 2, 3].last();   // 3
```

**Это считается плохим тоном** — конфликтуют с будущими стандартными методами. Так делали с jQuery и lo-dash. Сегодня используют утилитные функции.

## Производительность

Поиск по цепи **не бесплатный**. Каждое `obj.x` это walk по `__proto__` до тех пор, пока не нашёл. Длинные цепи замедляют чтение.

V8 оптимизирует через **inline caches** и **hidden classes** — но это работает только если объекты «похожи» (одинаковый порядок добавления свойств). Хаотично добавляющиеся поля ломают оптимизацию.

**Практические следствия:**
- Не делать очень глубокую иерархию `class Foo extends Bar extends Baz extends ...`
- Инициализировать поля в конструкторе **сразу** все, в одном порядке для всех инстансов
- Не вешать новые поля на готовые объекты («shape» меняется → re-compile)

## Что важно вынести

- **Прототип** объекта — другой объект, в котором ищется свойство, если в самом не нашлось. Цепочка прототипов = prototype chain.
- **`__proto__`** (или `Object.getPrototypeOf`) — ссылка на прототип **конкретного объекта**. Есть у каждого.
- **`prototype`** — поле **функции-конструктора**. Объект, который **станет** `__proto__` для инстансов через `new`.
- **`new Fn()`** = создаёт `{}`, ставит `__proto__ = Fn.prototype`, вызывает `Fn` с `this = obj`, возвращает obj.
- **`class`** — синтаксический сахар над прототипами. Под капотом то же самое + строгие правила (новь через new, strict mode).
- **`extends`** ставит `Child.prototype.__proto__ = Parent.prototype` — наследование через цепочку.
- **`Object.create(null)`** — объект без цепи, для словарей. **`Object.hasOwn`** — современный `hasOwnProperty`.
- **Производительность**: глубокие цепи замедляют чтение. V8 оптимизирует через hidden classes — порядок добавления полей имеет значение.
