import { useEffect, useState } from "react";
import { Check, Crown, Flame, Heart, Sparkles, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const plans = [
  { name: "Premium", price: "€9.99", period: "/мес", icon: Crown, perks: ["Кто лайкнул меня", "Безлимитные лайки", "5 Super Like в день", "Приоритет в выдаче"] },
];

const features = [
  { label: "Лайки в день", free: "100", premium: "∞" },
  { label: "Super Like", free: "1", premium: "5" },
  { label: "Кто лайкнул меня", free: false, premium: true },
  { label: "Откат свайпа", free: "1", premium: "∞" },
  { label: "Приоритет в выдаче", free: false, premium: true },
  { label: "Расширенные фильтры", free: false, premium: true },
];

/** Live countdown to a target ISO timestamp; returns mm:ss or null when expired. */
function useCountdown(targetIso: string | null): string | null {
  const [remaining, setRemaining] = useState<number>(() =>
    targetIso ? new Date(targetIso).getTime() - Date.now() : 0,
  );
  useEffect(() => {
    if (!targetIso) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(new Date(targetIso).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  if (!targetIso || remaining <= 0) return null;
  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const Premium = () => {
  const { user } = useAuth();
  const [boostUntil, setBoostUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const countdown = useCountdown(boostUntil);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_my_profile" as any);
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      setBoostUntil(row?.boost_until ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const activateBoost = async () => {
    if (!user) return;
    setActivating(true);
    const { data, error } = await (supabase as any).rpc("activate_boost");
    setActivating(false);
    if (error) {
      toast.error(error.message?.includes("cooldown") ? "Boost доступен раз в 24ч" : "Не удалось активировать Boost");
      return;
    }
    const next = Array.isArray(data) && data[0]?.boost_until ? data[0].boost_until : null;
    if (next) {
      setBoostUntil(next);
      toast.success("⚡ Boost активирован на 30 минут!");
    }
  };

  const placeholder = () => toast.info("Платежи пока в режиме UI-заглушки");

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="mx-auto w-full max-w-5xl px-6 pt-6">
        <h1 className="text-2xl font-bold text-foreground">Premium и Boost</h1>
        <p className="mt-1 text-sm text-muted-foreground">Больше видимости, лайков и контроля</p>
      </header>

      <main className="mx-auto mt-6 max-w-5xl space-y-6 px-6">
        <section className="gradient-primary overflow-hidden rounded-2xl p-6 text-primary-foreground shadow-elevated md:p-8">
          <Sparkles className="mb-4 h-9 w-9" />
          <h2 className="text-2xl font-extrabold md:text-3xl">Откройте полную картину</h2>
          <p className="mt-2 max-w-xl text-primary-foreground/85">
            Смотрите, кто уже проявил интерес, поднимайте анкету выше и не теряйте перспективные совпадения.
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Boost card with live state */}
          <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/15 text-secondary">
                  <Zap className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-xl font-bold text-card-foreground">Boost</h3>
                  <p className="text-sm text-muted-foreground">
                    <span className="text-lg font-semibold text-foreground">30 мин</span>
                    <span className="ml-1">в топе выдачи</span>
                  </p>
                </div>
              </div>
              <Flame className="h-5 w-5 text-secondary" />
            </div>

            <ul className="mt-5 space-y-2 text-sm text-card-foreground">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> До 10× больше показов</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Мгновенный старт</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Без подписки</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 1 бесплатный раз в сутки</li>
            </ul>

            <div className="mt-5">
              {loading ? (
                <Button disabled className="w-full">Загружаем…</Button>
              ) : countdown ? (
                <div className="flex flex-col items-center gap-1 rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-center">
                  <span className="text-xs font-medium uppercase tracking-wide text-secondary">Boost активен</span>
                  <span className="text-2xl font-bold tabular-nums text-foreground">{countdown}</span>
                </div>
              ) : (
                <Button
                  onClick={activateBoost}
                  disabled={activating}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {activating ? "Активируем…" : "Активировать Boost"}
                </Button>
              )}
            </div>
          </article>

          {plans.map(({ name, price, period, icon: Icon, perks }) => (
            <article key={name} className="rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-card-foreground">{name}</h3>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-lg font-semibold text-foreground">{price}</span>
                      <span className="ml-1">{period}</span>
                    </p>
                  </div>
                </div>
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <ul className="mt-5 space-y-2">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-sm text-card-foreground">
                    <Check className="h-4 w-4 text-primary" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Button onClick={placeholder} className="gradient-primary mt-5 w-full text-primary-foreground">
                Выбрать
              </Button>
            </article>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-lg font-bold text-card-foreground">Сравнение возможностей</h3>
          </div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-3 px-5 py-3 text-xs font-semibold uppercase text-muted-foreground">
              <span>Возможность</span>
              <span className="text-center">Free</span>
              <span className="text-center text-primary">Premium</span>
            </div>
            {features.map((f) => (
              <div key={f.label} className="grid grid-cols-3 items-center px-5 py-3 text-sm">
                <span className="text-foreground">{f.label}</span>
                <span className="text-center text-muted-foreground">
                  {typeof f.free === "boolean" ? (
                    f.free ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground/60" />
                  ) : (
                    f.free
                  )}
                </span>
                <span className="text-center font-semibold text-foreground">
                  {typeof f.premium === "boolean" ? (
                    f.premium ? <Check className="mx-auto h-4 w-4 text-primary" /> : <X className="mx-auto h-4 w-4 text-muted-foreground/60" />
                  ) : (
                    f.premium
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Premium;
