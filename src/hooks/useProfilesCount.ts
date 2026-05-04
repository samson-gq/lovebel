import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FilterValues } from "@/components/SwipeFilters";

interface Args {
  user: { id: string } | null;
  filters: FilterValues;
  /** ms to wait after the latest change before firing the request. */
  debounceMs?: number;
}

interface State {
  count: number | null;
  loading: boolean;
  error: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Live counter of matching profiles for the current filter.
 * - Debounces filter changes (default 300ms) so typing is smooth.
 * - Retries failed RPC calls with exponential backoff (200ms, 600ms) before
 *   surfacing an error.
 */
export function useProfilesCount({ user, filters, debounceMs = 300 }: Args): State {
  const [state, setState] = useState<State>({ count: null, loading: false, error: null });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const run = async () => {
      // Debounce
      await sleep(debounceMs);
      if (cancelled) return;

      setState((s) => ({ ...s, loading: true, error: null }));

      const swipedRes = await supabase
        .from("swipes")
        .select("swiped_id")
        .eq("swiper_id", user.id);
      if (cancelled) return;
      const excludeIds = [user.id, ...(swipedRes.data?.map((s) => s.swiped_id) ?? [])];

      const delays = [0, 200, 600];
      let lastError: string | null = null;
      for (let i = 0; i < delays.length; i++) {
        if (delays[i] > 0) await sleep(delays[i]);
        if (cancelled) return;
        const { data, error } = await supabase.rpc("count_search_profiles", {
          exclude_ids: excludeIds,
          min_age: filters.ageRange[0],
          max_age: filters.ageRange[1],
          gender_filter: filters.gender,
          city_query: filters.city.trim(),
          user_lat: filters.useGps ? filters.latitude : null,
          user_lng: filters.useGps ? filters.longitude : null,
          radius_km: filters.useGps ? filters.maxDistance : null,
        });
        if (cancelled) return;
        if (!error) {
          setState({ count: (data as number) ?? 0, loading: false, error: null });
          return;
        }
        lastError = error.message;
      }
      setState({ count: null, loading: false, error: lastError ?? "Не удалось загрузить" });
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user, filters.ageRange, filters.gender, filters.city, filters.maxDistance, filters.useGps, filters.latitude, filters.longitude, debounceMs]);

  return state;
}
