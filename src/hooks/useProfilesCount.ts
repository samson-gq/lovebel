import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

/**
 * Live counter of matching profiles for the current filter.
 * - Debounces filter changes (default 300ms) before triggering a fresh query.
 * - Cached via React Query so re-mounts (or filter toggles back to a known
 *   combination) are instant.
 */
export function useProfilesCount({ user, filters, debounceMs = 300 }: Args): State {
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters(filters), debounceMs);
    return () => clearTimeout(t);
  }, [filters, debounceMs]);

  const query = useQuery({
    enabled: !!user,
    queryKey: [
      "profiles_count",
      user?.id,
      debouncedFilters.ageRange[0],
      debouncedFilters.ageRange[1],
      debouncedFilters.gender,
      debouncedFilters.city.trim(),
      debouncedFilters.maxDistance,
      debouncedFilters.useGps,
      debouncedFilters.useGps ? debouncedFilters.latitude : null,
      debouncedFilters.useGps ? debouncedFilters.longitude : null,
    ],
    queryFn: async () => {
      if (!user) return 0;
      // exclude_ids is null → count_search_profiles excludes self + swipes via auth.uid()
      const { data, error } = await (supabase as any).rpc("count_search_profiles", {
        exclude_ids: null,
        min_age: debouncedFilters.ageRange[0],
        max_age: debouncedFilters.ageRange[1],
        gender_filter: debouncedFilters.gender,
        city_query: debouncedFilters.city.trim(),
        user_lat: debouncedFilters.useGps ? debouncedFilters.latitude : null,
        user_lng: debouncedFilters.useGps ? debouncedFilters.longitude : null,
        radius_km: debouncedFilters.useGps ? debouncedFilters.maxDistance : null,
      });
      if (error) throw new Error(error.message);
      return (data as number) ?? 0;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => 200 * Math.pow(3, attempt),
  });

  return {
    count: query.data ?? null,
    loading: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
  };
}
