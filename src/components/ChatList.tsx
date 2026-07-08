import { NavLink, useParams } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { cn } from "@/lib/utils";

const ChatList = () => {
  const { user } = useAuth();
  const { matchId: activeId } = useParams<{ matchId: string }>();
  const { data: items = [], isLoading } = useMatches(user?.id);
  const online = useOnlineUsers();

  return (
    <aside className="hidden h-screen w-80 shrink-0 flex-col border-r border-border bg-card/60 md:flex">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-bold text-foreground">Чаты</h2>
      </header>
      <nav className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
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
          items.map((item) => {
            const isActive = activeId === item.matchId;
            const isOnline = online.has(item.userId);
            return (
              <NavLink
                key={item.matchId}
                to={`/chat/${item.matchId}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
                )}
              >
                <div className="relative">
                  <SignedImg
                    src={item.avatar_url}
                    alt={item.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-card" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{item.name}</span>
                    {item.unreadCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {item.unreadCount > 99 ? "99+" : item.unreadCount}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "line-clamp-1 text-xs",
                      item.hasUnread ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {item.lastMessagePreview ?? "Начните разговор!"}
                  </p>
                </div>
              </NavLink>
            );
          })
        )}
      </nav>
    </aside>
  );
};

export default ChatList;
