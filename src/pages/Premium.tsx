import { Check, Crown, Flame, Heart, Sparkles, X, Zap } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";

const plans = [
  { name: "Premium", price: "€9.99", period: "/мес", icon: Crown, perks: ["Кто лайкнул меня", "Безлимитные лайки", "5 Super Like в день", "Приоритет в выдаче"] },
  { name: "Boost", price: "€3.99", period: "/30 мин", icon: Zap, perks: ["30 минут в топе", "До 10× больше показов", "Мгновенный старт", "Без подписки"] },
];

const features = [
  { label: "Лайки в день", free: "100", premium: "∞" },
  { label: "Super Like", free: "1", premium: "5" },
  { label: "Кто лайкнул меня", free: false, premium: true },
  { label: "Откат свайпа", free: "1", premium: "∞" },
  { label: "Приоритет в выдаче", free: false, premium: true },
  { label: "Расширенные фильтры", free: false, premium: true },
];

const Premium = () => {
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
                {name === "Premium" ? <Heart className="h-5 w-5 text-primary" /> : <Flame className="h-5 w-5 text-secondary" />}
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
