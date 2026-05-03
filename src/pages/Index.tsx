import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Star, LogOut, MapPin, Undo2 } from "lucide-react";
import { toast } from "sonner";
import SwipeCard from "@/components/SwipeCard";
import BottomNav from "@/components/BottomNav";
import SwipeFilters from "@/components/SwipeFilters";
import { useAuth } from "@/hooks/useAuth";
import { useSwipeFilters, DEFAULT_FILTERS, isDefaultFilters } from "@/hooks/useSwipeFilters";
import { useProfilesCount } from "@/hooks/useProfilesCount";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/data/profiles";

interface DBProfile {
  user_id: string;
  name: string;
  age: number | null;
  bio: string | null;
  avatar_url: string | null;
  interests: string[] | null;
  gender: string | null;
  city: string | null;
  is_verified?: boolean;
  height_cm?: number | null;
  education?: string | null;
  occupation?: string | null;
  zodiac?: string | null;
  children?: string | null;
  smoking?: string | null;
  drinking?: string | null;
}

const Index = () => {
  const { user, signOut } = useAuth();
  const { filters, setFilters, reset } = useSwipeFilters();
  const [cards, setCards] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { count: liveCount, loading: countLoading, error: countError } = useProfilesCount({
    user,
    filters,
  });


  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get already swiped user ids
    const { data: swiped } = await supabase
      .from("swipes")
      .select("swiped_id")
      .eq("swiper_id", user.id);

    const swipedIds = swiped?.map((s) => s.swiped_id) || [];
    const excludeIds = [user.id, ...swipedIds];

    // Use server-side RPC that leverages the normalized-city index
    const { data, error } = await supabase.rpc("search_profiles", {
      exclude_ids: excludeIds,
      min_age: filters.ageRange[0],
      max_age: filters.ageRange[1],
      gender_filter: filters.gender,
      city_query: filters.city.trim(),
    });

    if (error) {
      console.error("search_profiles failed", error);
    }

    // Fetch photos and prompts for all profiles
    const userIds = (data || []).map((p: DBProfile) => p.user_id);
    const [photosResp, promptsResp] = userIds.length > 0
      ? await Promise.all([
          supabase.from("profile_photos").select("*").in("user_id", userIds).order("position"),
          supabase.from("profile_prompts").select("*").in("user_id", userIds).order("position"),
        ])
      : [{ data: [] }, { data: [] }];
    const allPhotos = photosResp.data || [];
    const allPrompts = promptsResp.data || [];

    const mapped: (Profile & { isVerified?: boolean })[] = (data || []).map((p: DBProfile) => ({
      id: p.user_id,
      name: p.name,
      age: p.age || 0,
      bio: p.bio || "",
      distance: p.city || "—",
      image: p.avatar_url || "/placeholder.svg",
      images: (allPhotos as Array<{ user_id: string; photo_url: string }>)
        .filter((photo) => photo.user_id === p.user_id)
        .map((photo) => photo.photo_url),
      interests: p.interests || [],
      isVerified: p.is_verified ?? false,
      heightCm: p.height_cm ?? null,
      education: p.education ?? null,
      occupation: p.occupation ?? null,
      zodiac: p.zodiac ?? null,
      children: p.children ?? null,
      smoking: p.smoking ?? null,
      drinking: p.drinking ?? null,
      prompts: (allPrompts as Array<{ user_id: string; prompt: string; answer: string }>)
        .filter((pr) => pr.user_id === p.user_id)
        .map((pr) => ({ prompt: pr.prompt, answer: pr.answer })),
    }));

    setCards(mapped);
    setCurrentIndex(0);
    setLoading(false);
  }, [user, filters]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleSwipe = useCallback(
    async (direction: "left" | "right") => {
      if (!user || currentIndex >= cards.length) return;
      const profile = cards[currentIndex];

      await supabase.from("swipes").insert({
        swiper_id: user.id,
        swiped_id: profile.id,
        direction: direction === "right" ? "like" : "dislike",
      });

      setCurrentIndex((prev) => prev + 1);
    },
    [user, currentIndex, cards]
  );

  const remaining = cards.slice(currentIndex);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative flex items-center justify-between px-4 py-4">
        <SwipeFilters filters={filters} onChange={setFilters} />
        <h1 className="bg-clip-text text-2xl font-extrabold tracking-tight text-transparent" style={{ backgroundImage: 'var(--gradient-primary)' }}>
          LoveBel
        </h1>
        <button onClick={signOut} className="rounded-full p-2.5 text-muted-foreground hover:bg-muted">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {!isDefaultFilters(filters) && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
          {filters.city.trim() && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <MapPin className="h-3 w-3" />
              Город: {filters.city.trim()}
              <button
                onClick={() => setFilters({ ...filters, city: "" })}
                className="ml-1 rounded-full text-primary/70 hover:text-primary"
                aria-label="Убрать город"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.gender !== "all" && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
              {filters.gender === "female" ? "Женщины" : "Мужчины"}
            </span>
          )}
          {(filters.ageRange[0] !== DEFAULT_FILTERS.ageRange[0] ||
            filters.ageRange[1] !== DEFAULT_FILTERS.ageRange[1]) && (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
              {filters.ageRange[0]}–{filters.ageRange[1]} лет
            </span>
          )}
          <button
            onClick={reset}
            className="ml-auto text-xs font-medium text-primary hover:underline"
          >
            Сбросить все
          </button>
        </div>
      )}

      <p className="px-4 pb-1 text-xs text-muted-foreground" aria-live="polite">
        {countError ? (
          <span className="text-destructive">Не удалось обновить счётчик</span>
        ) : countLoading && liveCount === null ? (
          <span className="opacity-70">Считаем анкеты…</span>
        ) : liveCount !== null ? (
          <>
            Найдено анкет:{" "}
            <span className="font-semibold text-foreground">{liveCount}</span>
            {filters.city.trim() && <> в городе «{filters.city.trim()}»</>}
            {countLoading && <span className="ml-1 opacity-60">обновляем…</span>}
          </>
        ) : null}
      </p>

      <div className="relative mx-auto flex w-full max-w-sm flex-1 px-4 pb-24">
        <div className="relative h-[520px] w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : remaining.length > 0 ? (
            <AnimatePresence>
              {remaining
                .slice(0, 2)
                .reverse()
                .map((profile, i) => (
                  <SwipeCard
                    key={profile.id}
                    profile={profile as Profile & { isVerified?: boolean }}
                    onSwipe={handleSwipe}
                    isTop={i === remaining.slice(0, 2).length - 1}
                    onBlocked={() => {
                      // Remove blocked profile from current stack and refetch
                      setCards((prev) => prev.filter((p) => p.id !== profile.id));
                      fetchProfiles();
                    }}
                  />
                ))}
            </AnimatePresence>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-full flex-col items-center justify-center text-center"
            >
              <Star className="mb-4 h-16 w-16 text-secondary" />
              <h2 className="text-2xl font-bold text-foreground">Все просмотрено!</h2>
              <p className="mt-2 text-muted-foreground">Новые анкеты скоро появятся</p>
            </motion.div>
          )}
        </div>
      </div>

      {remaining.length > 0 && !loading && (
        <div className="fixed bottom-20 left-0 right-0 flex items-center justify-center gap-6">
          <button
            onClick={() => handleSwipe("left")}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-card shadow-card transition-transform hover:scale-110 active:scale-95"
          >
            <X className="h-7 w-7 text-primary" />
          </button>
          <button
            onClick={() => handleSwipe("right")}
            className="gradient-primary flex h-20 w-20 items-center justify-center rounded-full shadow-elevated transition-transform hover:scale-110 active:scale-95"
          >
            <Heart className="h-9 w-9 text-primary-foreground" />
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Index;
