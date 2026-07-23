import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Star, LogOut, MapPin, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import SwipeCard from "@/components/SwipeCard";
import SwipeFilters from "@/components/SwipeFilters";
import ThemeToggle from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useSwipeFilters, DEFAULT_FILTERS, isDefaultFilters } from "@/hooks/useSwipeFilters";
import { useProfilesCount } from "@/hooks/useProfilesCount";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
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
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  boost_until?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { filters, setFilters, reset } = useSwipeFilters();
  const [cards, setCards] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [superLikesLeft, setSuperLikesLeft] = useState<number>(1);
  const [lastSwipeId, setLastSwipeId] = useState<string | null>(null);
  const { count: liveCount, loading: countLoading, error: countError } = useProfilesCount({
    user,
    filters,
  });
  const onlineUsers = useOnlineUsers();
  const prefetchedRef = useRef<Set<string>>(new Set());


  const fetchProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch my profile via SECURITY DEFINER RPC so the scoring model can weigh
    // shared interests, age closeness, city and soft-preferences alignment.
    const { data: meRows } = await (supabase as any).rpc("get_my_profile");
    const me = Array.isArray(meRows) ? meRows[0] : meRows;

    // Exclusion (own id + already-swiped ids) is computed server-side in
    // search_profiles_v2 via auth.uid(); the client no longer ships the full
    // swipe history on every reload.
    const { data, error } = await (supabase as any).rpc("search_profiles_v2", {
      exclude_ids: null,
      min_age: filters.ageRange[0],
      max_age: filters.ageRange[1],
      gender_filter: filters.gender,
      city_query: filters.city.trim(),
      user_lat: filters.useGps ? filters.latitude : null,
      user_lng: filters.useGps ? filters.longitude : null,
      radius_km: filters.useGps ? filters.maxDistance : null,
      my_interests: me?.interests ?? null,
      my_age: me?.age ?? null,
      my_children: me?.children ?? null,
      my_smoking: me?.smoking ?? null,
      my_drinking: me?.drinking ?? null,
      my_city: me?.city ?? null,
    });

    if (error) {
      console.error("search_profiles_v2 failed", error);
    }


    // Fetch photos and prompts for all profiles
    const userIds = (data || []).map((p: DBProfile) => p.user_id);
    const [photosResp, promptsResp, videosResp, voicesResp] = userIds.length > 0
      ? await Promise.all([
          supabase.from("profile_photos").select("id, user_id, photo_url, position, created_at").in("user_id", userIds).order("position"),
          supabase.from("profile_prompts").select("*").in("user_id", userIds).order("position"),
          (supabase as any).from("profile_videos").select("user_id, video_url").in("user_id", userIds),
          (supabase as any).from("profile_voice_prompts").select("user_id, prompt, audio_url, duration_sec").in("user_id", userIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
    const allPhotos = photosResp.data || [];
    const allPrompts = promptsResp.data || [];
    const allVideos = videosResp.data || [];
    const allVoices = voicesResp.data || [];

    const mapped: (Profile & { isVerified?: boolean })[] = (data || []).map((p: DBProfile) => ({
      id: p.user_id,
      name: p.name,
      age: p.age || 0,
      bio: p.bio || "",
      distance: p.distance_km != null ? `${Math.round(p.distance_km)} км` : p.city || "—",
      image: p.avatar_url || "/placeholder.svg",
      images: (allPhotos as Array<{ user_id: string; photo_url: string }>)
        .filter((photo) => photo.user_id === p.user_id)
        .map((photo) => photo.photo_url),
      videoUrl: (allVideos as Array<{ user_id: string; video_url: string }>)
        .find((video) => video.user_id === p.user_id)?.video_url ?? null,
      voiceUrl: (allVoices as Array<{ user_id: string; audio_url: string }>)
        .find((v) => v.user_id === p.user_id)?.audio_url ?? null,
      voicePrompt: (allVoices as Array<{ user_id: string; prompt: string }>)
        .find((v) => v.user_id === p.user_id)?.prompt ?? null,
      voiceDurationSec: (allVoices as Array<{ user_id: string; duration_sec: number }>)
        .find((v) => v.user_id === p.user_id)?.duration_sec ?? null,
      interests: p.interests || [],
      isVerified: p.is_verified ?? false,
      heightCm: p.height_cm ?? null,
      education: p.education ?? null,
      occupation: p.occupation ?? null,
      zodiac: p.zodiac ?? null,
      children: p.children ?? null,
      smoking: p.smoking ?? null,
      drinking: p.drinking ?? null,
      createdAt: p.created_at ?? null,
      updatedAt: p.updated_at ?? null,
      isBoosted: !!p.boost_until && new Date(p.boost_until).getTime() > Date.now(),
      prompts: (allPrompts as Array<{ user_id: string; prompt: string; answer: string }>)
        .filter((pr) => pr.user_id === p.user_id)
        .map((pr) => ({ prompt: pr.prompt, answer: pr.answer })),
    }));

    setCards(mapped);
    setCurrentIndex(0);
    setLastSwipeId(null);

    const premium = Boolean((me as any)?.is_premium);
    setIsPremium(premium);
    const dailyQuota = premium ? 5 : 1;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count: usedToday } = await supabase
      .from("swipes")
      .select("id", { count: "exact", head: true })
      .eq("swiper_id", user.id)
      .eq("direction", "superlike")
      .gte("created_at", startOfDay.toISOString());
    setSuperLikesLeft(Math.max(0, dailyQuota - (usedToday ?? 0)));

    setLoading(false);
  }, [user, filters]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Prefetch the next 3 cards' images so they appear instantly when swiped to.
  useEffect(() => {
    const upcoming = cards.slice(currentIndex + 1, currentIndex + 4);
    for (const profile of upcoming) {
      const urls = [profile.image, ...profile.images].filter(Boolean).slice(0, 3);
      for (const url of urls) {
        if (prefetchedRef.current.has(url)) continue;
        prefetchedRef.current.add(url);
        const img = new Image();
        img.src = url;
      }
    }
  }, [cards, currentIndex]);

  const handleSwipe = useCallback(
    async (direction: "left" | "right" | "super") => {
      if (!user || currentIndex >= cards.length) return;
      const profile = cards[currentIndex];

      if (direction === "super" && superLikesLeft <= 0) {
        toast.info("Лимит Super Like исчерпан", {
          description: "Возвращайся завтра — даём 1 Super Like в день",
        });
        return;
      }

      const dbDirection =
        direction === "super" ? "superlike" : direction === "right" ? "like" : "dislike";

      const { data: inserted, error } = await supabase
        .from("swipes")
        .insert({
          swiper_id: user.id,
          swiped_id: profile.id,
          direction: dbDirection,
        })
        .select("id")
        .single();

      if (error) {
        toast.error("Не удалось сохранить свайп");
        return;
      }

      setLastSwipeId(inserted?.id ?? null);
      track(`swipe_${dbDirection}`, { profile_id: profile.id });
      if (direction === "super") {
        setSuperLikesLeft((n) => Math.max(0, n - 1));
        toast.success("⭐ Super Like отправлен!");
      }
      setCurrentIndex((prev) => prev + 1);
    },
    [user, currentIndex, cards, superLikesLeft]
  );

  const handleRewind = useCallback(async () => {
    if (!user) return;
    if (!isPremium) {
      toast("Rewind — фича Premium", {
        description: "Открой Premium, чтобы отменять свайпы",
        action: { label: "Смотреть", onClick: () => navigate("/premium") },
      });
      return;
    }
    if (!lastSwipeId || currentIndex === 0) return;
    const { error } = await supabase
      .from("swipes")
      .delete()
      .eq("id", lastSwipeId)
      .eq("swiper_id", user.id);
    if (error) {
      toast.error("Не удалось отменить свайп");
      return;
    }
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setLastSwipeId(null);
    track("swipe_rewind");
    toast("↩️ Свайп отменён");
  }, [user, lastSwipeId, currentIndex, isPremium, navigate]);

  const remaining = cards.slice(currentIndex);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative flex items-center justify-between px-4 py-4 md:py-6">
        <SwipeFilters filters={filters} onChange={setFilters} resultCount={liveCount} countLoading={countLoading} />
        <h1 className="bg-clip-text text-2xl font-extrabold tracking-tight text-transparent md:hidden" style={{ backgroundImage: 'var(--gradient-primary)' }}>
          LoveBel
        </h1>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle className="h-10 w-10" />
          <button onClick={signOut} aria-label="Выйти" className="rounded-full p-2.5 text-muted-foreground hover:bg-muted">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        <span className="hidden md:block" />
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
          {filters.useGps && filters.latitude && filters.longitude && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <MapPin className="h-3 w-3" />
              GPS до {filters.maxDistance} км
              <button
                onClick={() => setFilters({ ...filters, useGps: false })}
                className="ml-1 rounded-full text-primary/70 hover:text-primary"
                aria-label="Убрать GPS"
              >
                <X className="h-3 w-3" />
              </button>
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
            {filters.useGps && <> в радиусе {filters.maxDistance} км</>}
            {countLoading && <span className="ml-1 opacity-60">обновляем…</span>}
          </>
        ) : null}
      </p>

      <div className="relative mx-auto flex w-full max-w-sm flex-1 justify-center px-4 pb-32 md:max-w-md md:pb-40">
        <div className="relative h-[520px] w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Skeleton className="h-full w-full rounded-3xl" />
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
                    isOnline={onlineUsers.has(profile.id)}
                    onBlocked={() => {
                      setCards((prev) => prev.filter((p) => p.id !== profile.id));
                      fetchProfiles();
                    }}
                    onHide={() => {
                      setCards((prev) => prev.filter((p) => p.id !== profile.id));
                    }}
                  />
                ))}
            </AnimatePresence>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-full flex-col items-center justify-center px-6 text-center"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Star className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {!isDefaultFilters(filters) ? "Никого не нашли" : "Все просмотрено!"}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {!isDefaultFilters(filters)
                  ? "Попробуй смягчить фильтры — например, расширить возраст или радиус."
                  : "Новые анкеты скоро появятся"}
              </p>
              {!isDefaultFilters(filters) && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {filters.useGps && filters.maxDistance < 100 && (
                    <button
                      onClick={() => setFilters({ ...filters, maxDistance: 100 })}
                      className="rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/80"
                    >
                      Радиус до 100 км
                    </button>
                  )}
                  <button
                    onClick={reset}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {remaining.length > 0 && !loading && (
        <div className="fixed bottom-20 left-0 right-0 z-40 flex items-center justify-center gap-4 md:bottom-8 md:left-60 md:right-0">
          <button
            onClick={handleRewind}
            disabled={isPremium && !lastSwipeId}
            aria-label={isPremium ? "Отменить последний свайп" : "Rewind — Premium"}
            className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-secondary/40 bg-card shadow-card transition-transform hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          >
            <Undo2 className="h-6 w-6 text-secondary" />
            {!isPremium && (
              <span className="absolute -top-1 -right-1 rounded-full bg-secondary px-1 text-[9px] font-bold text-secondary-foreground">PRO</span>
            )}
          </button>
          <button
            onClick={() => handleSwipe("left")}
            aria-label="Не нравится"
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/30 bg-card shadow-card transition-transform hover:scale-110 active:scale-95"
          >
            <X className="h-7 w-7 text-primary" />
          </button>
          <button
            onClick={() => handleSwipe("super")}
            disabled={superLikesLeft <= 0}
            aria-label="Super Like"
            className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-400 bg-card shadow-card transition-transform hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          >
            <Star className="h-7 w-7 fill-blue-500 text-blue-500" />
            <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-primary-foreground">
              {superLikesLeft}
            </span>
          </button>
          <button
            onClick={() => handleSwipe("right")}
            aria-label="Нравится"
            className="gradient-primary flex h-20 w-20 items-center justify-center rounded-full shadow-elevated transition-transform hover:scale-110 active:scale-95"
          >
            <Heart className="h-9 w-9 text-primary-foreground" />
          </button>
        </div>
      )}

      
    </div>
  );
};

export default Index;
