Топ-5 из аудита слишком большой для одного шага. Разбиваю на 4 итерации — каждая законченная и тестируемая. После каждой возвращаю управление.

## Итерация 1 — Улучшенный алгоритм матчинга (сейчас)

Сейчас `search_profiles` сортирует только по boost + дистанции + дате. Апгрейд до scoring-модели:

- **Новая RPC `search_profiles_v2`** с числовым `match_score`:
  - +30 за общие интересы (пересечение массивов, нормализация по количеству)
  - +20 за общий город / близость (≤ 10 км)
  - +15 за совпадение по «дети», «курение», «алкоголь» (soft-preferences)
  - +10 за близкий возраст (разница ≤ 5 лет)
  - +25 boost-бонус (если `boost_until > now()`)
  - +10 если онлайн за последние 24ч (`updated_at`)
- Сортировка: `boost` DESC → `match_score` DESC → distance NULLS LAST
- `Index.tsx` переводится на новую RPC
- Никаких breaking changes — старая RPC остаётся для fallback

## Итерация 2 — Push-уведомления: замкнуть цикл

Уже есть: `push_subscriptions`, `send-push` edge function, триггеры на match/message, VAPID ключи.

Нужно:
- Убедиться что `public/push-sw.js` регистрируется в `main.tsx` (проверю)
- Компонент `PushOptIn` — карточка на `/matches` и `/profile`: «Включить уведомления» → `Notification.requestPermission()` → сохранение подписки
- Настройка в `Settings`: включить/выключить push, типы (матчи, сообщения, лайки)
- Триггер на новый лайк в `swipes` (сейчас только match/message)
- Reactivation-push: edge-функция + cron «Вас не было 7 дней» (это шаг за рамки — пока не делаю, отмечу как TODO)

## Итерация 3 — Аналитика воронки (PostHog)

- Спрошу пользователя: PostHog Cloud (нужен API-ключ) или собственная таблица `analytics_events` в Cloud
- Если PostHog: `posthog-js`, инициализация в `main.tsx`, ключ через `add_secret` как публичный `VITE_POSTHOG_KEY`
- Ключевые события: `signup`, `onboarding_step`, `swipe_left/right`, `match_created`, `message_sent`, `boost_activated`, `premium_view`, `push_enabled`
- Идентификация по `user.id` после логина
- Опциональная event-таблица в Cloud для собственных дашбордов

## Итерация 4 — Монетизация (Stripe Payments)

- Запуск `recommend_payment_provider` (dating apps — обычно Stripe)
- Enable Stripe payments (форма от Lovable)
- Продукты через `batch_create_product`:
  - **Premium Monthly** — $9.99/мес
  - **Premium Yearly** — $79/год
  - **Boost x5** — one-time $4.99
  - **Boost x25** — one-time $19.99
- Checkout flow из `/premium`
- Webhook: активация `is_premium` / инкремент `boost_credits` в `profiles`
- Замена текущей RPC `activate_boost` — списание кредита вместо 24ч кулдауна для купивших

## Дополнительная проверка безопасности

После итераций 1 и 4 — прогон `security--run_security_scan`, фикс новых находок.

## Стартую с Итерации 1

Она чисто backend + одна строка в `Index.tsx`, без внешних решений. Начинаю.