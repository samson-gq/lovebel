import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_POPULAR_CITIES } from "@/lib/cities";

const QUERY_KEY = ["popular_cities"] as const;

async function fetchPopularCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from("popular_cities")
    .select("name, display_order")
    .order("display_order", { ascending: true });
  if (error || !data || data.length === 0) return FALLBACK_POPULAR_CITIES;
  return data.map((row) => row.name);
}

export function usePopularCities(): string[] {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPopularCities,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: FALLBACK_POPULAR_CITIES,
  });

  // Keep cache in sync with realtime DB changes.
  useEffect(() => {
    const channel = supabase
      .channel("popular_cities_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "popular_cities" },
        () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return data ?? FALLBACK_POPULAR_CITIES;
}
