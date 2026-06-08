import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Global presence: tracks the current user as online and exposes a Set of
 * user ids that are currently online. Single shared channel for the whole app.
 */
export function useOnlineUsers(): Set<string> {
  const { user } = useAuth();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    let active = true;

    const channel = supabase.channel("online_users", {
      config: { presence: { key: user.id } },
    });

    const sync = () => {
      if (!active) return;
      const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
      const ids = new Set<string>();
      for (const key of Object.keys(state)) {
        ids.add(key);
        for (const meta of state[key]) {
          if (meta?.user_id) ids.add(meta.user_id);
        }
      }
      setOnlineIds(ids);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      active = false;
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return onlineIds;
}
