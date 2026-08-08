import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { supabase } from "@/integrations/supabase/client";

/**
 * Counters shown as badges in the main navigation (sidebar + bottom nav).
 * Keyed by nav route path so both navs stay in sync from one source.
 */
export function useNavBadges(): Record<string, number> {
  const { user } = useAuth();
  const { data: matches } = useMatches(user?.id);

  const { data: likesCount = 0 } = useQuery({
    enabled: !!user?.id,
    queryKey: ["likes-me-count", user?.id],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("swipes")
        .select("id", { count: "exact", head: true })
        .eq("swiped_id", user!.id)
        .in("direction", ["like", "superlike"]);
      return count ?? 0;
    },
  });

  const unread = (matches ?? []).reduce((acc, m) => acc + (m.unreadCount ?? 0), 0);

  return {
    "/messages": unread,
    "/likes": likesCount,
  };
}
