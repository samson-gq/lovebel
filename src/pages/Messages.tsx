import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { SignedImg } from "@/components/SignedImg";
import { cn } from "@/lib/utils";
import { pluralize } from "@/lib/plural";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
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
  const { data: allItems = [], isLoading } = useMatches(user?.id);
  const online = useOnlineUsers();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "unread" | "online">("all");

  const totalUnread = allItems.reduce((acc, m) => acc + m.unreadCount, 0);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (tab === "unread" && !m.hasUnread) return false;
      if (tab === "online" && !online.has(m.userId)) return false;
      return true;
    });
  }, [allItems, query, tab, online]);

  const tabs: Array<{ id: typeof tab; label: string; count?: number }> = [
    { id: "all", label: "Все", count: allItems.length },
    { id: "unread", label: "Непрочитанные", count: allItems.filter((m) => m.hasUnread).length },
    { id: "online", label: "В сети", count: allItems.filter((m) => online.has(m.userId)).length },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24 md:pb-0">
      <PageHeader
        icon={MessageSquare}
        title="Сообщения"
        subtitle={allItems.length > 0 ? pluralize(allItems.length, "чат", "чата", "чатов") : "Ваши диалоги появятся здесь"}
        badge={
          totalUnread > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {totalUnread}
            </span>
          ) : null
        }
      />

      {allItems.length > 0 && (
        <div className="mx-auto w-full max-w-3xl px-3 pt-4 md:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени"
              aria-label="Поиск по чатам"
              className="rounded-full pl-9 pr-9"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Очистить поиск"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {t.count ? ` · ${t.count}` : ""}
              </button>
            ))}
          </div>
        </div>
      )}


      {isLoading ? (
        <div className="mx-auto mt-6 w-full max-w-3xl space-y-3 px-6">
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
          <p className="text-lg font-medium text-muted-foreground">
            {allItems.length === 0 ? "Пока нет сообщений" : "Ничего не найдено"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            {allItems.length === 0
              ? "Получайте матчи и начинайте общение"
              : "Попробуйте изменить запрос или фильтр"}
          </p>
          {allItems.length === 0 ? (
            <button
              onClick={() => navigate("/")}
              className="mt-5 rounded-full gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              Найти пару
            </button>
          ) : (
            <button
              onClick={() => {
                setQuery("");
                setTab("all");
              }}
              className="mt-5 rounded-full bg-muted px-6 py-2.5 text-sm font-semibold text-foreground"
            >
              Сбросить
            </button>
          )}
        </div>

      ) : (
        <nav className="mx-auto mt-4 w-full max-w-3xl space-y-1.5 px-3 md:px-6">
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
                  "flex w-full items-center gap-4 rounded-2xl border border-border/50 bg-card px-3.5 py-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card",
                  item.hasUnread && "border-primary/40 bg-primary/5",
                )}
              >
                <div className="relative shrink-0">
                  <SignedImg
                    src={item.avatar_url}
                    alt={item.name}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-border/60"
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
