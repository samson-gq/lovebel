import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { SignedImg } from "@/components/SignedImg";
import { cn } from "@/lib/utils";
import { formatDayLabel, formatTime, sameDay } from "@/lib/chatUtils";

const formatWhen = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (sameDay(d, new Date())) return formatTime(d);
  return formatDayLabel(d);
};


const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useMatches(user?.id);
  const online = useOnlineUsers();

  const totalUnread = items.reduce((acc, m) => acc + m.unreadCount, 0);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24 md:pb-0">
      <header className="px-6 pt-6">
        <h1 className="text-2xl font-bold text-foreground">
          Сообщения
          {totalUnread > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-sm font-semibold text-primary-foreground">
              {totalUnread}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length > 0 ? `${items.length} чатов` : "Ваши диалоги появятся здесь"}
        </p>
      </header>

      {isLoading ? (
        <div className="mt-6 space-y-3 px-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <MessageSquare className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">Пока нет сообщений</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Получайте матчи и начинайте общение
          </p>
        </div>
      ) : (
        <nav className="mt-6 space-y-1 px-3 md:px-6">
          {items.map((item, i) => {
            const isOnline = online.has(item.userId);
            return (
              <motion.button
                key={item.matchId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                onClick={() => navigate(`/chat/${item.matchId}`)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors",
                  item.hasUnread ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted",
                )}
              >
                <div className="relative shrink-0">
                  <SignedImg
                    src={item.avatar_url}
                    alt={item.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-card" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("truncate", item.hasUnread ? "font-bold" : "font-medium")}>
                      {item.name}
                      {item.age ? `, ${item.age}` : ""}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatWhen(item.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "line-clamp-1 text-sm",
                        item.hasUnread ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {item.lastMessagePreview ?? "Начните разговор!"}
                    </p>
                    {item.unreadCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {item.unreadCount > 99 ? "99+" : item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default Messages;
