# Design System

## Вайб
Минималистично, "взрослый продукт", не "обучалка для детей". 
Референсы: Linear, Vercel Dashboard, Telegram нативный UI.
Эмоция: спокойная фокусировка, без отвлекающего шума.

## Цвета
Используем CSS-переменные Telegram WebApp (--tg-theme-bg-color и т.д.) 
как базу, чтобы приложение адаптировалось под тему пользователя.

Поверх:
- Accent (основной): #6366F1 (индиго)
- Success: #10B981
- Error: #EF4444
- Warning: #F59E0B

Текст:
- Primary: var(--tg-theme-text-color)
- Secondary: var(--tg-theme-hint-color)
- На акцентном фоне: #FFFFFF

## Типографика
Шрифт: системный (-apple-system, SF Pro Display, Inter)
- H1: 28px, weight 700, line-height 1.2
- H2: 22px, weight 600, line-height 1.3
- H3: 18px, weight 600, line-height 1.4
- Body: 16px, weight 400, line-height 1.5
- Small: 14px, weight 400, line-height 1.4
- Code: JetBrains Mono, 14px

## Отступы (используем шкалу Tailwind)
- xs: 4px (gap-1)
- sm: 8px (gap-2)
- md: 16px (gap-4)
- lg: 24px (gap-6)
- xl: 32px (gap-8)

## Радиусы
- Маленький (кнопки, инпуты, чипы): 8px (rounded-lg)
- Средний (карточки): 12px (rounded-xl)
- Большой (модалки, основные блоки): 16px (rounded-2xl)

## Компоненты

### Кнопки
- Primary: bg-индиго, белый текст, height 48px, padding 16px, font 16px weight 600
- Secondary: прозрачная, border 1px var(--tg-theme-hint-color), text цвета primary
- Ghost: только текст индиго, без фона
- Все: переход 150ms ease, при нажатии scale 0.97

### Карточки урока
- Фон: var(--tg-theme-secondary-bg-color)
- Padding: 20px
- Border-radius: 12px
- Hover: subtle shadow

### Прогресс-бар
- Высота 6px, rounded-full
- Trail: var(--tg-theme-hint-color) с opacity 0.2
- Filled: linear-gradient от индиго к более светлому индиго

### Тесты
- Варианты ответов как карточки с border
- При выборе — border становится индиго, фон чуть-чуть индиго (10% opacity)
- При правильном ответе — зелёный border, иконка чек
- При неправильном — красный border, иконка крест

## Анимации
- Все переходы: 150-200ms ease
- При входе на экран: fade + slight slide-up (10px), 250ms
- Не использовать spring, bounce — это для детских приложений
- GSAP — для сложных анимаций (например, появление результата теста)

## Иконки
Lucide React — единственная библиотека иконок. Размер 20px для inline, 24px для кнопок.

## Что НЕ делаем
- Градиенты повсюду (только в прогресс-баре и опционально в hero)
- Тени везде (только при hover на интерактивных элементах)
- Скруглённые углы 24px+ (слишком "детски")
- Эмодзи как украшения (только в контенте уроков)
- Анимированные фоны, частицы, мерцания