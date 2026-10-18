import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Subscribe only to profiles currently displayed, with cleanup on navigation. */
export function useProfileUpdates(userIds: string[], onUpdate: () => void) {
  const callback = useRef(onUpdate);
  callback.current = onUpdate;
  const idsKey = [...new Set(userIds)].sort().join(",");

  useEffect(() => {
    if (!idsKey) return;
    const channel = supabase.channel(`profile-updates:${idsKey}:${crypto.randomUUID()}`);
    for (const id of idsKey.split(",")) {
      channel.on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${id}`,
      }, () => callback.current());
    }
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") callback.current();
    });
    return () => { supabase.removeChannel(channel); };
  }, [idsKey]);
}