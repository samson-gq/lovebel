import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatchSummary {
  matchId: string;
  userId: string;
  name: string;
  age: number | null;
  avatar_url: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  /** True when the most recent message in the chat is from the other user and unread. */
  hasUnread: boolean;
  /** Bumble expiry: when set and in future, first message must come from the female. */
  expiresAt: string | null;
  firstMessageSender: string | null;
}

async function fetchMatches(userId: string): Promise<MatchSummary[]> {
  const { data: matches } = await supabase
    .from("matches")
    .select("id, user1_id, user2_id, created_at, expires_at, first_message_sender")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (!matches || matches.length === 0) return [];

  // Hide fully-expired bumble matches (expires_at set AND in the past AND no message ever sent).
  const active = matches.filter(
    (m) => !m.expires_at || new Date(m.expires_at).getTime() > Date.now(),
  );
  if (active.length === 0) return [];

  const matchIds = matches.map((m) => m.id);
  const otherIds = matches.map((m) => (m.user1_id === userId ? m.user2_id : m.user1_id));

  const [profilesRes, messagesRes] = await Promise.all([
    supabase.from("profiles").select("user_id, name, age, avatar_url").in("user_id", otherIds),
    supabase
      .from("messages")
      .select("match_id, sender_id, content, content_type, created_at, read_at, deleted_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false }),
  ]);

  const profiles = profilesRes.data ?? [];
  const messages = messagesRes.data ?? [];

  const lastByMatch = new Map<string, (typeof messages)[number]>();
  const unreadByMatch = new Map<string, number>();
  for (const m of messages) {
    if (!lastByMatch.has(m.match_id)) lastByMatch.set(m.match_id, m);
    if (m.sender_id !== userId && !m.read_at && !m.deleted_at) {
      unreadByMatch.set(m.match_id, (unreadByMatch.get(m.match_id) ?? 0) + 1);
    }
  }

  const preview = (m: (typeof messages)[number] | undefined): string | null => {
    if (!m) return null;
    if (m.deleted_at) return "Сообщение удалено";
    if (m.content_type === "image") return "📷 Изображение";
    if (m.content_type === "gif") return "🎞️ GIF";
    return m.content ?? null;
  };

  const items: MatchSummary[] = matches.map((m) => {
    const otherId = m.user1_id === userId ? m.user2_id : m.user1_id;
    const profile = profiles.find((p) => p.user_id === otherId);
    const last = lastByMatch.get(m.id);
    const unread = unreadByMatch.get(m.id) ?? 0;
    return {
      matchId: m.id,
      userId: otherId,
      name: profile?.name ?? "—",
      age: profile?.age ?? null,
      avatar_url: profile?.avatar_url ?? null,
      lastMessageAt: last?.created_at ?? m.created_at ?? null,
      lastMessagePreview: preview(last),
      unreadCount: unread,
      hasUnread: !!last && last.sender_id !== userId && !last.read_at && !last.deleted_at,
    };
  });

  // Newest activity first
  items.sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  return items;
}

export function useMatches(userId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    enabled: !!userId,
    queryKey: ["matches", userId],
    queryFn: () => fetchMatches(userId!),
    staleTime: 30 * 1000,
  });

  // Invalidate on new messages / matches so the list reflects fresh state.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`matches-list-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["matches", userId] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, () => {
        qc.invalidateQueries({ queryKey: ["matches", userId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return query;
}
