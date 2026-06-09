import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Global toast notifications for new matches and incoming messages.
 *
 * - The matches channel is filtered server-side by user1_id / user2_id so we
 *   only receive rows that involve the current user.
 * - The messages channel is filtered by `match_id IN (...)` based on the user's
 *   current matches, which avoids fanning out every INSERT in the messages
 *   table to every client. The match list is refreshed whenever a new match
 *   row arrives, which triggers re-subscription of the messages channel.
 */
export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const [matchIds, setMatchIds] = useState<string[] | null>(null);

  // Load (and keep refreshing) the user's match ids.
  useEffect(() => {
    if (!user) {
      setMatchIds(null);
      return;
    }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("matches")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      if (active) setMatchIds((data ?? []).map((m) => m.id));
    };
    load();
    return () => {
      active = false;
    };
  }, [user?.id]);

  // Matches channel — toast on new match + refresh match ids list.
  useEffect(() => {
    if (!user) return;
    let active = true;
    const suffix = `${user.id}-${Math.random().toString(36).slice(2, 8)}`;

    const handle = (payload: { new: { user1_id: string; user2_id: string; id: string } }) => {
      if (!active) return;
      const match = payload.new;
      if (match.user1_id !== user.id && match.user2_id !== user.id) return;
      toast.success("💘 У вас новый матч!", {
        description: "Перейдите в раздел матчей, чтобы начать общение",
        duration: 5000,
      });
      setMatchIds((prev) => (prev && !prev.includes(match.id) ? [...prev, match.id] : prev));
    };

    const ch1 = supabase
      .channel(`matches-u1-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `user1_id=eq.${user.id}` },
        handle,
      )
      .subscribe();
    const ch2 = supabase
      .channel(`matches-u2-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `user2_id=eq.${user.id}` },
        handle,
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [user?.id]);

  // Messages channel — only listen to messages in the user's own matches.
  useEffect(() => {
    if (!user || !matchIds || matchIds.length === 0) return;
    let active = true;
    const suffix = `${user.id}-${Math.random().toString(36).slice(2, 8)}`;

    const channel = supabase
      .channel(`new-messages-${suffix}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=in.(${matchIds.join(",")})`,
        },
        (payload) => {
          if (!active) return;
          const msg = payload.new as { sender_id: string; content: string | null };
          if (msg.sender_id === user.id || !msg.content) return;
          toast("💬 Новое сообщение", {
            description:
              msg.content.length > 50 ? msg.content.slice(0, 50) + "…" : msg.content,
            duration: 4000,
          });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, matchIds?.join(",")]);
};
