---
title: "CORS: что это, preflight, credentials"
description: "Same-origin policy, простые vs preflight-запросы, Access-Control-* заголовки, ловушки с cookies"
order: 3
---

# CORS: что это, preflight, credentials

CORS — самая ненавидимая тема веба для джунов. «Почему мой fetch не работает на проде, хотя локально всё ок?» — обычно ответ про CORS. Понимать его на уровне мидл+ обязательно: рекрутер любит спросить «что такое CORS, в чём preflight, как настроить».

> Главная мысль: CORS — это **не баг и не препятствие**. Это **защита**, реализованная в браузере, чтобы код на одном сайте не мог тихо ходить от твоего имени на API другого сайта. Сервер сам разрешает кому ходить — через заголовки. Браузер их проверяет.

## Что такое origin

**Origin** — это тройка: `protocol + domain + port`.

| URL | Origin |
|---|---|
| `https://app.com/foo` | `https://app.com` (порт 443 дефолтный) |
| `https://api.app.com/foo` | `https://api.app.com` (другой поддомен → другой origin) |
| `http://app.com/foo` | `http://app.com` (http vs https → разный origin) |
| `https://app.com:8080/foo` | `https://app.com:8080` (другой порт → другой origin) |

Запросы с **одного origin на тот же origin** называются **same-origin**. С одного на другой — **cross-origin**.

## Same-origin policy

Главное правило безопасности браузера — **same-origin policy**. По умолчанию JS на одном сайте **не может** читать ответы с другого:

```js
// на странице https://app.com:
fetch('https://other-site.com/secret')
  .then(r => r.text())
  .then(console.log);
// → CORS error в консоли
```

**Почему это важно.** Без этой защиты:
1. Ты авторизован на `bank.com` через cookie.
2. Заходишь на `evil.com`.
3. Скрипт на `evil.com` делает `fetch('https://bank.com/balance')`.
4. Браузер автоматически **прикладывает твою cookie bank.com**.
5. Без same-origin — `evil.com` прочитал бы твой баланс.

Same-origin policy запрещает шаг 5: запрос **может** уйти, но результат `evil.com` **не прочитает**. CORS — это **механизм безопасного обхода** этой защиты, когда обе стороны явно согласны.

## CORS — это про разрешения

CORS позволяет серверу сказать: «да, я разрешаю этому origin делать ко мне запросы». Это передаётся через **заголовки ответа**:

```
Access-Control-Allow-Origin: https://app.com
```

Если браузер делает cross-origin запрос с `https://app.com`, **видит этот заголовок** в ответе → JS-коду разрешается прочитать ответ. Иначе — ошибка в консоли, JS читать не может.

## Два типа запросов: простые и preflight

CORS различает запросы по «сложности».

### Простые (simple) запросы

Это запросы, которые «могли бы быть» от обычной HTML-формы. Условия:
- Метод: `GET`, `HEAD`, или `POST`
- Заголовки: только из «безопасного» списка (`Accept`, `Accept-Language`, `Content-Language`, `Content-Type` с ограничениями)
- `Content-Type`: `application/x-www-form-urlencoded`, `multipart/form-data`, или `text/plain`

Для простого запроса браузер:
1. Шлёт запрос **сразу**.
2. Получает ответ.
3. **Проверяет** в ответе `Access-Control-Allow-Origin`.
4. Если origin разрешён — JS читает. Если нет — ошибка.

**Важно:** запрос **уже выполнился** на сервере. CORS защищает не «послать запрос», а «прочитать ответ JS-кодом». Поэтому в URL не должно быть side-effect: даже неуспешный с точки зрения CORS GET всё равно достиг сервера.

### Preflight (предзапросные) запросы

Если запрос **не простой** (например `Content-Type: application/json`, или метод `DELETE`, или кастомный заголовок `X-Init-Data`) — браузер шлёт **сначала** `OPTIONS`-запрос:

```
OPTIONS /api/data HTTP/1.1
Origin: https://app.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type, x-init-data
```

Сервер должен ответить:
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.com
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Init-Data
Access-Control-Max-Age: 3600
```

Только после успешного preflight браузер шлёт **настоящий** запрос. Это **двойной запрос** — в Network tab видишь сначала OPTIONS, потом POST.

**`Access-Control-Max-Age`** — на сколько секунд браузер закэширует разрешение и не будет каждый раз делать preflight. По умолчанию ~5 секунд, рекомендация — 600-3600.

## Credentials: cookies и Authorization

По умолчанию cross-origin запросы **НЕ прикладывают** cookies. Это вторая линия защиты.

Чтобы попросить браузер их приложить:
```js
fetch('https://api.com/profile', { credentials: 'include' })
```

Сервер тоже должен явно разрешить:
```
Access-Control-Allow-Credentials: true
```

И **главная ловушка**: при `credentials: true` нельзя использовать wildcard:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

Это **не работает**. Браузер отбросит. Нужен **конкретный origin**:
```
Access-Control-Allow-Origin: https://app.com
Access-Control-Allow-Credentials: true
```

То же для `Allow-Headers` и `Allow-Methods`: с credentials нельзя `*`.

Это **самая частая ошибка**: dev делает `Access-Control-Allow-Origin: *`, потом включает credentials — и не понимает, почему перестало работать.

## Wildcard `*`

```
Access-Control-Allow-Origin: *
```

Разрешает всем. Подходит для **публичных** API (без credentials). С credentials — не работает (см. выше).

**Правильный паттерн** для нескольких разрешённых origins — сервер сам решает:
```ts
const ALLOWED = ['https://app.com', 'https://staging.app.com'];
const origin = req.headers.get('origin');
if (ALLOWED.includes(origin)) {
  res.headers.set('Access-Control-Allow-Origin', origin);
}
```

Сервер **отражает** валидный origin обратно. Не `*` и не статичный список в заголовке (значение может быть **только одно**, не список).

## Типичные ошибки и их сообщения

### `No 'Access-Control-Allow-Origin' header is present`

Сервер вообще не настроен на CORS. Добавь заголовок.

### `The value of the 'Access-Control-Allow-Origin' header...does not equal the supplied origin`

Сервер указал конкретный origin, но другой. Проверь, какой origin шлёт твой клиент (включая порт).

### `Request header field x-init-data is not allowed by Access-Control-Allow-Headers`

Сервер не разрешил твой кастомный заголовок. Добавь его в `Access-Control-Allow-Headers`.

### `Method DELETE is not allowed by Access-Control-Allow-Methods`

Сервер разрешает `GET, POST`, но не `DELETE`. Добавь `DELETE` в `Allow-Methods`.

### `Credentials flag is true, but the 'Access-Control-Allow-Origin' is '*'`

Главная ловушка credentials. Замени `*` на конкретный origin.

### `Preflight request doesn't pass access control check`

OPTIONS-запрос упал. Часто причина: сервер не обрабатывает OPTIONS вообще или возвращает 401/403/500. **Preflight должен пройти без аутентификации** — браузер не шлёт credentials в OPTIONS.

## CORS — НЕ для безопасности сервера

Распространённая иллюзия:
> «У меня CORS настроен, мой API защищён»

Нет. CORS работает **только в браузере**. Запрос с `curl`, Postman, Python-скрипта **игнорирует** CORS — там нет браузера, который бы его проверял.

```bash
curl https://api.app.com/secret  # CORS никак не влияет
```

CORS защищает **твоих юзеров** от чужих сайтов, использующих **их браузеры**. Не защищает API. Серверная защита — это **аутентификация и авторизация** (токены, проверка origin/referer для anti-CSRF, rate limiting).

## CORS в Next.js (наш проект)

В нашем проекте CORS **не настроен и не нужен**, потому что:
- Mini App открывается по нашему домену (`itlearn.vercel.app`)
- API — на том же домене (`/api/...`)
- Это **same-origin** — CORS не вступает в игру

Если бы Mini App была на одном домене, а API на другом (`api.itlearn.vercel.app`) — пришлось бы настроить CORS:

```ts
// app/api/progress/route.ts
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const ALLOWED = ['https://itlearn.vercel.app'];

  const response = NextResponse.json({ ok: true });
  if (origin && ALLOWED.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin');
  // ... ответить на preflight
}
```

Альтернатива — middleware на уровне всего приложения.

## Что важно вынести

- **Origin** = protocol + domain + port. Разный port = другой origin.
- **Same-origin policy** — браузер не даёт JS читать ответы с других origin. Защита, не баг.
- **CORS** — механизм, через который сервер разрешает чтение. Через `Access-Control-Allow-*` заголовки.
- **Простые** запросы (`GET`/`POST` без кастомных заголовков и нестандартного `Content-Type`) шлются сразу.
- **Preflight** (OPTIONS) — для всех остальных. Браузер сначала спрашивает разрешения.
- **`credentials: 'include'`** + сервер с `Access-Control-Allow-Credentials: true` — для cookies. С credentials **нельзя** `*` в Allow-*.
- **Preflight должен пройти без аутентификации** — браузер не шлёт credentials в OPTIONS.
- **CORS защищает юзера в браузере**, не сервер. `curl` и Postman игнорируют CORS.
