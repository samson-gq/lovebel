import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeSwipeStats, type SwipeStats } from "@/lib/swipeStats";

/**
 * Статистика моих лайков: сколько отправлено, сколько ответили взаимностью,
 * сколько осталось без ответа. Обновляется при монтировании и по запросу.
 */
export function useSwipeStats(userId: string | undefined) {
  const [stats, setStats] = useState<SwipeStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data: mine } = await supabase
      .from("swipes")
      .select("swiped_id")
      .eq("swiper_id", userId)
      .in("direction", ["like", "superlike"]);

    const myLikedIds = (mine || []).map((row) => row.swiped_id);

    let incomingLikerIds: string[] = [];
    if (myLikedIds.length > 0) {
      const { data: incoming } = await supabase
        .from("swipes")
        .select("swiper_id")
        .eq("swiped_id", userId)
        .in("direction", ["like", "superlike"])
        .in("swiper_id", myLikedIds);
      incomingLikerIds = (incoming || []).map((row) => row.swiper_id);
    }

    setStats(computeSwipeStats(myLikedIds, incomingLikerIds));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}
