Большой список — разобью на 3 волны, чтобы каждая была обозримой и тестируемой.

## Волна 1 — Рефактор и фундамент (без новых фич)

1. **React Query для `usePopularCities` и `useProfilesCount`**
   - Заменить ручной кэш на `useQuery` с `staleTime: 5 * 60_000`.
   - `useProfilesCount` оставить debounce 300мс через `useDeferredValue` + `staleTime`.
2. **Debounce URL-sync в `useSwipeFilters`**
   - `replaceState` вызывается через 300мс таймер после последнего изменения фильтра. `localStorage` тоже debounce'нуть.
3. **`useRealtimeNotifications` — гарантированный cleanup**
   - Проверить, что `supabase.removeChannel(channel)` вызывается в return cleanup; добавить guard от двойного subscribe в StrictMode/HMR.
4. **`src/config/nav.ts`**
   - Единый источник списка табов: `{ to, label, icon, exact }[]`. Подключить в `AppSidebar` и `BottomNav`.
5. **Разбить `SwipeFilters.tsx` (401 строка)**
   - `AgeFilter`, `DistanceFilter`, `CityFilter` (с попапом подсказок), `GenderFilter` — каждый в свой файл. Корневой `SwipeFilters` — только композиция и Sheet.
6. **Тесты на `Chat`**
   - Юнит-тесты на `chatUtils` (группировка по дате/отправителю, форматирование), и компонентный тест на optimistic-добавление + удаление реакции.

## Волна 2 — UX поверх существующих данных

7. **Presence «в сети сейчас» на карточках свайпа**
   - Глобальный presence-канал `online_users` с `track({ user_id })` при логине. На `SwipeCard` зелёная точка, если `user_id` в presence-state. Хук `useOnlineUsers()`.
8. **Прочитанные/непрочитанные индикаторы в `/matches`**
   - Уже есть `messages.read_at`? Проверю. Если нет — добавить колонку миграцией. На `ChatList` показывать точку, если последнее сообщение от собеседника и `read_at IS NULL`.
9. **Skeleton + prefetch следующих карточек свайпа**
   - `search_profiles` уже возвращает пачку. Префетч следующих фото через `new Image()` для топ-3 в очереди. Skeleton-карточка, пока первая партия грузится.
10. **Ярлык «Новый» (< 24ч с регистрации) / «Возвращается» (был неактивен > 30 дней и вернулся)**
    - Бейдж на `SwipeCard` поверх фото. Логика: `profiles.created_at` и `profiles.updated_at`.
11. **«Не показывать снова» в чужих матчах (anti-déjà-vu)**
    - Добавить запись в `swipes` с `direction='hide'` при действии «не показывать» из меню профиля. `search_profiles` уже исключает по `swipes.swiper_id`.

## Волна 3 — Boost (монетизация)

12. **Boost — буст видимости 30 мин**
    - `search_profiles` уже сортирует по `boost_until` (вижу в существующей RPC). Значит колонка есть.
    - Кнопка «Boost 30 мин» в `Profile` и `Premium`. RPC `activate_boost()`: `SET boost_until = now() + interval '30 min'` (с лимитом 1 раз в сутки).
    - Визуальный таймер обратного отсчёта.
    - Пока без реальной оплаты — фича-флаг «premium» (отдельный шаг, если попросишь).

---

## Что предлагаю сделать сейчас

Если согласен — стартую с **Волной 1** (рефактор + тесты Chat) одним заходом. Это самый безопасный блок и разгребает технический долг перед фичами. Затем по очереди Волна 2 и Волна 3.

Если хочется быстрее увидеть видимые изменения — могу начать с Волны 2 (presence + unread + «Новый» бейдж).

Какой порядок?