import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, BadgeCheck, MapPin, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SignedImg } from "@/components/SignedImg";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

interface Pick {
  user_id: string;
  name: string;
  age: number | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  interests: string[] | null;
  is_verified: boolean | null;
  match_score: number | null;
}

const DailyPicks = () => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("daily_picks");
      if (cancelled) return;
      if (error) {
        toast.error("Не удалось загрузить подборку");
      } else {
        setPicks((data ?? []) as Pick[]);
      }
      setLoading(false);
      track("daily_picks_view", { count: data?.length ?? 0 });
    })();
    return () => { cancelled = true; };
  }, []);

  const like = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("swipes").insert({
      swiper_id: user.id, swiped_id: id, direction: "right",
    });
    if (error) {
      toast.error("Не удалось лайкнуть");
      return;
    }
    setPicks((p) => p.filter((x) => x.user_id !== id));
    toast.success("Лайк отправлен ❤");
    track("daily_pick_like", { profile_id: id });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="mx-auto w-full max-w-5xl px-6 pt-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Подборка дня</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          5 анкет, подобранных лично для вас. Обновляется каждый день.
        </p>
      </header>

      <main className="mx-auto mt-6 grid max-w-5xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-2xl" />
          ))}

        {!loading && picks.length === 0 && (
          <div className="col-span-full rounded-2xl border border-border bg-card p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Подборка на сегодня закончилась</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Загляните завтра — мы подберём новые анкеты.
            </p>
            <Link
              to="/"
              className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Смотреть всех
            </Link>
          </div>
        )}

        {!loading && picks.map((p) => (
          <article key={p.user_id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="relative aspect-[4/5] w-full bg-muted">
              <SignedImg
                src={p.avatar_url}
                alt={p.name}
                className="h-full w-full object-cover"
              />
              {p.match_score != null && (
                <span className="absolute right-3 top-3 rounded-full bg-primary/90 px-2 py-1 text-xs font-semibold text-primary-foreground">
                  {p.match_score}% совпадение
                </span>
              )}
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {p.name}{p.age ? `, ${p.age}` : ""}
                </h3>
                {p.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
              </div>
              {p.city && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {p.city}
                </p>
              )}
              {p.bio && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>
              )}
              <button
                onClick={() => like(p.user_id)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Heart className="h-4 w-4" /> Лайк
              </button>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
};

export default DailyPicks;
