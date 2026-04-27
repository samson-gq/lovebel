import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Star, LogOut, MapPin } from "lucide-react";
import SwipeCard from "@/components/SwipeCard";
import BottomNav from "@/components/BottomNav";
import SwipeFilters, { type FilterValues } from "@/components/SwipeFilters";
import { useAuth } from "@/hooks/useAuth";
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
}

const FILTERS_STORAGE_KEY = "lovebel.swipe.filters.v1";
const DEFAULT_FILTERS: FilterValues = {
  ageRange: [18, 45],
  maxDistance: 50,
  gender: "all",
  city: "",
};

const loadFilters = (): FilterValues => {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw);
    return {
      ageRange: Array.isArray(parsed.ageRange) && parsed.ageRange.length === 2
        ? [Number(parsed.ageRange[0]) || 18, Number(parsed.ageRange[1]) || 45]
        : DEFAULT_FILTERS.ageRange,
      maxDistance: Number(parsed.maxDistance) || DEFAULT_FILTERS.maxDistance,
      gender: typeof parsed.gender === "string" ? parsed.gender : DEFAULT_FILTERS.gender,
      city: typeof parsed.city === "string" ? parsed.city : "",
    };
  } catch {
    return DEFAULT_FILTERS;
  }
};

const isDefaultFilters = (f: FilterValues) =>
  f.ageRange[0] === DEFAULT_FILTERS.ageRange[0] &&
  f.ageRange[1] === DEFAULT_FILTERS.ageRange[1] &&
  f.maxDistance === DEFAULT_FILTERS.maxDistance &&
  f.gender === DEFAULT_FILTERS.gender &&
  f.city.trim() === "";

const Index = () => {
  const { user, signOut } = useAuth();
  const [cards, setCards] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterValues>(loadFilters);

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore quota errors
    }
  }, [filters]);


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

    let query = supabase
      .from("profiles")
      .select("*")
      .not("user_id", "in", `(${excludeIds.join(",")})`)
      .not("name", "eq", "")
      .gte("age", filters.ageRange[0])
      .lte("age", filters.ageRange[1]);

    if (filters.gender !== "all") {
      query = query.eq("gender", filters.gender);
    }

    if (filters.city.trim()) {
      query = query.ilike("city", `%${filters.city.trim()}%`);
    }

    const { data } = await query;

    // Fetch photos for all profiles
    const userIds = (data || []).map((p: DBProfile) => p.user_id);
    const { data: allPhotos } = userIds.length > 0
      ? await supabase.from("profile_photos").select("*").in("user_id", userIds).order("position")
      : { data: [] };

    const mapped: Profile[] = (data || []).map((p: DBProfile) => ({
      id: p.user_id,
      name: p.name,
      age: p.age || 0,
      bio: p.bio || "",
      distance: p.city || "—",
      image: p.avatar_url || "/placeholder.svg",
      images: (allPhotos || [])
        .filter((photo: any) => photo.user_id === p.user_id)
        .map((photo: any) => photo.photo_url),
      interests: p.interests || [],
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
                    profile={profile}
                    onSwipe={handleSwipe}
                    isTop={i === remaining.slice(0, 2).length - 1}
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
