import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface MatchProfile {
  matchId: string;
  userId: string;
  name: string;
  age: number | null;
  avatar_url: string | null;
}

const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matchedProfiles, setMatchedProfiles] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchMatches = async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!matches || matches.length === 0) {
        setLoading(false);
        return;
      }

      const otherIds = matches.map((m) =>
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, age, avatar_url")
        .in("user_id", otherIds);

      const result: MatchProfile[] = matches.map((m) => {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;
        const profile = profiles?.find((p) => p.user_id === otherId);
        return {
          matchId: m.id,
          userId: otherId,
          name: profile?.name || "—",
          age: profile?.age,
          avatar_url: profile?.avatar_url,
        };
      });

      setMatchedProfiles(result);
      setLoading(false);
    };

    fetchMatches();
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="px-6 pt-6">
        <h1 className="text-2xl font-bold text-foreground">Матчи</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {matchedProfiles.length > 0
            ? `${matchedProfiles.length} совпадений`
            : "Начните свайпать, чтобы найти пару"}
        </p>
      </header>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 px-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : matchedProfiles.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 px-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {matchedProfiles.map((profile, i) => (
            <motion.div
              key={profile.matchId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative cursor-pointer overflow-hidden rounded-2xl shadow-card"
              onClick={() => navigate(`/chat/${profile.matchId}`)}
            >
              <img
                src={profile.avatar_url || "/placeholder.svg"}
                alt={profile.name}
                className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-semibold text-primary-foreground">
                  {profile.name}{profile.age ? `, ${profile.age}` : ""}
                </p>
              </div>
              <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20 backdrop-blur-sm transition-colors group-hover:bg-primary">
                <MessageCircle className="h-4 w-4 text-primary-foreground" />
              </span>
            </motion.div>
          ))}
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

      <BottomNav />
    </div>
  );
};

export default Matches;
