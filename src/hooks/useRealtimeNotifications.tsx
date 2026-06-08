import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Global toast notifications for new matches and incoming messages.
 * - Channels are scoped per user id and unique per mount, so HMR / StrictMode
 *   double-invocation does not leak duplicate subscriptions.
 */
export const useRealtimeNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let active = true;

    const suffix = `${user.id}-${Math.random().toString(36).slice(2, 8)}`;

    const matchChannel = supabase
      .channel(`realtime-matches-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        (payload) => {
          if (!active) return;
          const match = payload.new as { user1_id: string; user2_id: string };
          if (match.user1_id === user.id || match.user2_id === user.id) {
            toast.success("💘 У вас новый матч!", {
              description: "Перейдите в раздел матчей, чтобы начать общение",
              duration: 5000,
            });
          }
        },
      )
      .subscribe();

    const msgChannel = supabase
      .channel(`realtime-new-messages-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          if (!active) return;
          const msg = payload.new as { sender_id: string; content: string | null };
          if (msg.sender_id !== user.id && msg.content) {
            toast("💬 Новое сообщение", {
              description:
                msg.content.length > 50 ? msg.content.slice(0, 50) + "…" : msg.content,
              duration: 4000,
            });
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [user?.id]);
};
