import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Hourglass, Search, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { useCountdown, formatCountdown } from "@/hooks/useCountdown";
import { formatDayLabel, formatTime, sameDay } from "@/lib/chatUtils";
import { cn } from "@/lib/utils";
import { pluralize } from "@/lib/plural";
import { SignedImg } from "@/components/SignedImg";
import PushOptIn from "@/components/PushOptIn";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ExpiryBadge = ({ expiresAt }: { expiresAt: string }) => {
  const ms = useCountdown(expiresAt);
  if (ms <= 0) return null;
  return (
    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-secondary/95 px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground shadow">
      <Hourglass className="h-3 w-3" /> {formatCountdown(ms)}
    </span>
  );
};

const formatWhen = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (sameDay(d, new Date())) return formatTime(d);
  return formatDayLabel(d);
};

type MatchProfile = ReturnType<typeof useMatches>["data"] extends (infer T)[] | undefined ? T : never;

const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: matchedProfiles = [], isLoading } = useMatches(user?.id);
  const online = useOnlineUsers();
  const [query, setQuery] = useState("");

  const totalUnread = matchedProfiles.reduce((acc, m) => acc + m.unreadCount, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matchedProfiles;
    return matchedProfiles.filter((m) => m.name.toLowerCase().includes(q));
  }, [matchedProfiles, query]);

  // Fresh matches (no conversation yet) get their own spotlight row.
  const fresh = filtered.filter((m) => !m.lastMessageAt);
  const conversations = filtered.filter((m) => m.lastMessageAt);

  const renderCard = (profile: MatchProfile, i: number) => {
    const isOnline = online.has(profile.userId);
    return (
      <motion.button
        key={profile.matchId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.04, 0.5) }}
        className="group relative overflow-hidden rounded-3xl text-left shadow-card ring-1 ring-border/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
        onClick={() => navigate(`/chat/${profile.matchId}`)}
      >
        <SignedImg
          src={profile.avatar_url}
          alt={profile.name}
          className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent" />

        {isOnline && !profile.expiresAt && (
          <span
            className="absolute right-2 top-2 inline-flex h-3 w-3 rounded-full bg-success ring-2 ring-card"
            aria-label="В сети"
          />
        )}

        {profile.expiresAt && <ExpiryBadge expiresAt={profile.expiresAt} />}

        {profile.unreadCount > 0 && (
          <span className="absolute left-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground shadow">
            {profile.unreadCount > 99 ? "99+" : profile.unreadCount}
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 space-y-1 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-primary-foreground">
              {profile.name}
              {profile.age ? `, ${profile.age}` : ""}
            </p>
            <span className="shrink-0 text-[10px] text-primary-foreground/75">
              {formatWhen(profile.lastMessageAt)}
            </span>
          </div>
          <p
            className={cn(
              "line-clamp-1 text-xs",
              profile.hasUnread
                ? "font-semibold text-primary-foreground"
                : "text-primary-foreground/75",
            )}
          >
            {profile.lastMessagePreview ?? "Начните разговор!"}
          </p>
        </div>
        <span className="absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/20 backdrop-blur-sm transition-colors group-hover:bg-primary">
          <MessageCircle className="h-3.5 w-3.5 text-primary-foreground" />
        </span>
      </motion.button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <PageHeader
        icon={Heart}
        title="Матчи"
        subtitle={
          matchedProfiles.length > 0
            ? pluralize(matchedProfiles.length, "совпадение", "совпадения", "совпадений")
            : "Начните свайпать, чтобы найти пару"
        }
        badge={
          totalUnread > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
              {totalUnread}
            </span>
          ) : null
        }
      />

      <div className="mt-4">
        <PushOptIn />
      </div>

      {matchedProfiles.length > 3 && (
        <div className="mx-auto mt-4 w-full max-w-5xl px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по имени…"
              className="h-11 rounded-full border-border/60 bg-card/70 pl-10 pr-10 backdrop-blur-md"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Очистить поиск"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="mx-auto mt-5 grid w-full max-w-5xl grid-cols-2 gap-4 px-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : matchedProfiles.length > 0 ? (
        filtered.length > 0 ? (
          <div className="mx-auto w-full max-w-5xl space-y-8 px-6 pb-6">
            {fresh.length > 0 && (
              <section>
                <div className="mb-3 mt-5 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Новые матчи · {fresh.length}
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {fresh.map(renderCard)}
                </div>
              </section>
            )}
            {conversations.length > 0 && (
              <section>
                <div className="mb-3 mt-5 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Диалоги · {conversations.length}
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {conversations.map(renderCard)}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">Никого не нашлось</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              По запросу «{query}» матчей нет
            </p>
            <Button variant="outline" className="mt-4 rounded-full" onClick={() => setQuery("")}>
              Сбросить поиск
            </Button>
          </div>
        )
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold">Пока нет матчей</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Лайкайте анкеты в Обзоре — когда симпатия взаимна, она появится здесь
          </p>
          <Button className="mt-5 rounded-full" onClick={() => navigate("/")}>
            К анкетам
          </Button>
        </div>
      )}
    </div>
  );
};

export default Matches;
