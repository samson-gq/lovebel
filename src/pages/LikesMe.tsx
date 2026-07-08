import { useEffect, useMemo, useState } from "react";
import { Crown, Heart, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface LikeRow {
  swiper_id: string;
  direction: string;
  created_at: string;
}

interface LikerProfile {
  user_id: string;
  name: string;
  age: number | null;
  avatar_url: string | null;
}

const LikesMe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [profiles, setProfiles] = useState<LikerProfile[]>([]);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: ownProfileData }, { data: likeRows }] = await Promise.all([
        supabase.rpc("get_my_profile" as any),
        supabase
          .from("swipes")
          .select("swiper_id, direction, created_at")
          .eq("swiped_id", user.id)
          .in("direction", ["like", "superlike"])
          .order("created_at", { ascending: false }),
      ]);

      const rows = (likeRows || []) as LikeRow[];
      setLikes(rows);
      const ownProfile = Array.isArray(ownProfileData) ? ownProfileData[0] : ownProfileData;
      setPremiumUntil(ownProfile?.premium_until ?? null);

      const ids = [...new Set(rows.map((row) => row.swiper_id))];
      if (ids.length) {
        const { data: likerProfiles } = await supabase
          .from("profiles")
          .select("user_id, name, age, avatar_url")
          .in("user_id", ids);
        setProfiles((likerProfiles || []) as LikerProfile[]);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const isPremium = useMemo(() => premiumUntil ? new Date(premiumUntil) > new Date() : false, [premiumUntil]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-6 pt-6">
        <h1 className="text-2xl font-bold text-foreground">Лайкнули меня</h1>
        <p className="mt-1 text-sm text-muted-foreground">{likes.length ? `${likes.length} симпатий` : "Пока нет новых лайков"}</p>
      </header>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 px-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : likes.length > 0 ? (
        <main className="mt-6 px-6">
          {!isPremium && (
            <button onClick={() => navigate("/premium")} className="gradient-primary mb-5 flex w-full items-center justify-between rounded-2xl px-5 py-4 text-primary-foreground shadow-card">
              <span className="flex items-center gap-2 font-semibold"><Crown className="h-5 w-5" /> Откройте имена и фото</span>
              <Sparkles className="h-5 w-5" />
            </button>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {likes.map((like) => {
              const profile = profiles.find((item) => item.user_id === like.swiper_id);
              return (
                <article key={`${like.swiper_id}-${like.created_at}`} className="relative overflow-hidden rounded-2xl bg-card shadow-card">
                  <SignedImg src={profile?.avatar_url} alt={isPremium ? profile?.name || "Профиль" : "Скрытый профиль"} className={`aspect-[3/4] w-full object-cover ${isPremium ? "" : "scale-105 blur-lg"}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-primary-foreground">
                    <p className="font-semibold">{isPremium ? `${profile?.name || "—"}${profile?.age ? `, ${profile.age}` : ""}` : "Скрыто"}</p>
                    <p className="mt-0.5 text-xs opacity-80">{like.direction === "superlike" ? "Super Like" : "Лайк"}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </main>
      ) : (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
          <Heart className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-semibold text-foreground">Лайки появятся здесь</p>
        </div>
      )}

      
    </div>
  );
};

export default LikesMe;