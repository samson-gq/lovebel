import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useRealtimeNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const matchChannel = supabase
      .channel("realtime-matches")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        (payload) => {
          const match = payload.new as { user1_id: string; user2_id: string };
          if (match.user1_id === user.id || match.user2_id === user.id) {
            toast.success("💘 У вас новый матч!", {
              description: "Перейдите в раздел матчей, чтобы начать общение",
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    const msgChannel = supabase
      .channel("realtime-new-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as { sender_id: string; content: string };
          if (msg.sender_id !== user.id) {
            toast("💬 Новое сообщение", {
              description: msg.content.length > 50 ? msg.content.slice(0, 50) + "…" : msg.content,
              duration: 4000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [user]);
};
