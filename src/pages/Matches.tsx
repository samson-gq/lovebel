import { motion } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { formatDayLabel, formatTime, sameDay } from "@/lib/chatUtils";
import { cn } from "@/lib/utils";

const formatWhen = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (sameDay(d, new Date())) return formatTime(d);
  return formatDayLabel(d);
};

const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: matchedProfiles = [], isLoading } = useMatches(user?.id);
  const online = useOnlineUsers();

  const totalUnread = matchedProfiles.reduce((acc, m) => acc + m.unreadCount, 0);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="px-6 pt-6">
        <h1 className="text-2xl font-bold text-foreground">
          Матчи {totalUnread > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-sm font-semibold text-primary-foreground">
              {totalUnread}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {matchedProfiles.length > 0
            ? `${matchedProfiles.length} совпадений`
            : "Начните свайпать, чтобы найти пару"}
        </p>
      </header>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 px-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : matchedProfiles.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 px-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {matchedProfiles.map((profile, i) => {
            const isOnline = online.has(profile.userId);
            return (
              <motion.button
                key={profile.matchId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.5) }}
                className="group relative overflow-hidden rounded-2xl text-left shadow-card"
                onClick={() => navigate(`/chat/${profile.matchId}`)}
              >
                <SignedImg
                  src={profile.avatar_url}
                  alt={profile.name}
                  className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent" />

                {/* Online dot on avatar */}
                {isOnline && (
                  <span
                    className="absolute right-2 top-2 inline-flex h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-card"
                    aria-label="В сети"
                  />
                )}

                {/* Unread badge */}
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
          })}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Heart className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">Пока нет матчей</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Лайкайте профили и ждите совпадения!
          </p>
        </div>
      )}
    </div>
  );
};

export default Matches;
