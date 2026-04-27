import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_POPULAR_CITIES } from "@/lib/cities";

let cache: string[] | null = null;
let inflight: Promise<string[]> | null = null;

async function loadOnce(): Promise<string[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("popular_cities")
      .select("name, display_order")
      .order("display_order", { ascending: true });
    if (error || !data || data.length === 0) {
      cache = FALLBACK_POPULAR_CITIES;
    } else {
      cache = data.map((row) => row.name);
    }
    return cache;
  })();
  return inflight;
}

export function usePopularCities(): string[] {
  const [cities, setCities] = useState<string[]>(cache ?? FALLBACK_POPULAR_CITIES);
  useEffect(() => {
    let active = true;
    loadOnce().then((list) => {
      if (active) setCities(list);
    });

    // Stay in sync with DB inserts/updates
    const channel = supabase
      .channel("popular_cities_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "popular_cities" },
        () => {
          cache = null;
          loadOnce().then((list) => active && setCities(list));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);
  return cities;
}
