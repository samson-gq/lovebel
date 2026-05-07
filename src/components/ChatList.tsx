import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MatchItem {
  matchId: string;
  userId: string;
  name: string;
  avatar_url: string | null;
}

const ChatList = () => {
  const { user } = useAuth();
  const { matchId: activeId } = useParams<{ matchId: string }>();
  const [items, setItems] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!matches || matches.length === 0) {
        if (!cancelled) {
          setItems([]);
          setLoading(false);
        }
        return;
      }
      const otherIds = matches.map((m) => (m.user1_id === user.id ? m.user2_id : m.user1_id));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", otherIds);
      if (cancelled) return;
      setItems(
        matches.map((m) => {
          const oid = m.user1_id === user.id ? m.user2_id : m.user1_id;
          const p = profiles?.find((x) => x.user_id === oid);
          return { matchId: m.id, userId: oid, name: p?.name ?? "—", avatar_url: p?.avatar_url ?? null };
        }),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <aside className="hidden h-screen w-80 shrink-0 flex-col border-r border-border bg-card/60 md:flex">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-bold text-foreground">Чаты</h2>
      </header>
      <nav className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Heart className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm">Пока нет матчей</p>
          </div>
        ) : (
          items.map((item) => (
            <NavLink
              key={item.matchId}
              to={`/chat/${item.matchId}`}
              className={`flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors ${
                activeId === item.matchId ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <img
                src={item.avatar_url || "/placeholder.svg"}
                alt={item.name}
                className="h-10 w-10 rounded-full object-cover"
              />
              <span className="truncate font-medium">{item.name}</span>
            </NavLink>
          ))
        )}
      </nav>
    </aside>
  );
};

export default ChatList;
