# Продолжение улучшений — 4 итерации

Все 4 направления выбраны. Разбиваю на самостоятельные итерации, после каждой возвращаю управление для проверки.

## Итерация 1 — Super Like + Rewind (стартую с неё)

Наименьший скоуп: `swipes.direction` уже поддерживает `superlike` (триггер `notify_new_like` учитывает). Не хватает UI и Rewind.

**База:**
- Новая колонка `profiles.superlikes_left` (int, default 1) + `profiles.last_superlike_reset` — 1 бесплатный в день, для Premium → 5.
- Функция `use_superlike()` — атомарный декремент с проверкой лимита.
- Функция `rewind_last_swipe()` — удаляет последний свайп текущего пользователя (только 1 откат подряд, только для Premium; иначе — ошибка).

**Фронт (`src/pages/Index.tsx` + `SwipeCard.tsx`):**
- Кнопка ⭐ Super Like между Nope/Like, синяя, с бейджем «×N осталось».
- Кнопка ↩️ Rewind слева от Nope; для не-Premium → редирект на `/premium`.
- Свайп вверх по карточке = Super Like (Framer Motion `y < -120`).
- Стикер «SUPER LIKE» на карточке во время жеста (аналогично LIKE/NOPE).
- Toast «Super Like отправлен» + аналитика `swipe_superlike` / `swipe_rewind`.

## Итерация 2 — Bumble-режим (женщина пишет первой)

**База:**
- В `matches` добавить `expires_at timestamptz`, `first_message_sender uuid`.
- Триггер `on_match_created`: если оба гетеро (M+F по `profiles.gender`), `expires_at = now() + 24h`; иначе NULL (обычный матч).
- Триггер `on_first_message`: сбрасывает `expires_at = NULL` и пишет `first_message_sender`.
- RLS/запрос: если `expires_at IS NOT NULL AND now() > expires_at` — матч скрыт из списков; если `expires_at IS NOT NULL AND sender != женщина` — INSERT в `messages` запрещён (правило в триггере BEFORE INSERT).
- Cron (pg_cron, ежечасно): удаляет истёкшие матчи + шлёт push «Матч истёк».

**Фронт (`Matches.tsx`, `ChatList.tsx`, `Chat.tsx`):**
- Бейдж «⏳ 23ч» на карточке матча (обратный отсчёт).
- В чате-заглушке для мужчины: «Ждём первого сообщения от {name} — 23:59:12».
- Инпут заблокирован соответственно.
- Тост «Матч истёк» когда истёк в реалтайме.
- Настройка в `Settings.tsx`: «Bumble-режим (женщина пишет первой)» — вкл/выкл. Если выкл — `expires_at` не проставляется.

## Итерация 3 — Voice prompts

**База:**
- Новый бакет `voice-prompts` (private).
- Таблица `profile_voice_prompts (id, user_id, prompt text, audio_url text, duration_sec int)` — max 1 на юзера.
- RLS: publicly readable authenticated (с учётом блокировок, как у `profile_prompts`).

**Фронт:**
- `src/components/VoiceRecorder.tsx` — Web Audio API запись WAV (следуя гайду `ai-speech-to-text`), максимум 30 сек, waveform во время записи.
- В `Profile.tsx` секция «🎙️ Голосовое приветствие» рядом с промптами — запись/прослушивание/удаление.
- В `SwipeCard.tsx` — плеер над bio если есть `voice_url` (кнопка ▶️, длительность, tap-play).
- Signed URLs через `useSignedUrl`.
- Аналитика: `voice_recorded`, `voice_played`.

## Итерация 4 — Reactivation-push + дашборд аналитики

**Push «Скучаем без вас»:**
- Edge-функция `reactivation-push` — обходит `profiles` где `updated_at < now() - 7d AND updated_at > now() - 30d`, шлёт push «У вас 3 новых лайка, загляните».
- pg_cron ежедневно в 18:00 UTC вызывает эту функцию.

**Дашборд `/admin/analytics`:**
- Доступ только для `has_role(uid, 'admin')`.
- SQL-агрегаты через новую RPC `admin_analytics(days int)`:
  - DAU/WAU/MAU (уникальные `analytics_events.user_id` по дням).
  - Воронка: `signup` → `onboarding_step:1..N` → первый `swipe_*` → первый `match_created` → первый `message_sent`.
  - Топ-события за период.
  - Retention D1/D7/D30.
- UI: `recharts` (уже в проекте), 3 карточки-метрики + line chart DAU + bar chart воронка + таблица топ-событий.
- Ссылка в `AppSidebar` только для админов.

## Порядок

Стартую с **Итерации 1** сейчас — она полностью независима, самая быстрая проверяемая победа. После неё возвращаю управление, вы гоняете, идём во 2-ю.
