import { Crown, Flame, Heart, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";

const plans = [
  { name: "Premium", price: "€9.99", icon: Crown, perks: ["Кто лайкнул меня", "Безлимитные лайки", "5 Super Like в день"] },
  { name: "Boost", price: "€3.99", icon: Zap, perks: ["30 минут в топе", "Больше показов", "Мгновенный старт"] },
];

const Premium = () => {
  const placeholder = () => toast.info("Платежи пока в режиме UI-заглушки");

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-6 pt-6">
        <h1 className="text-2xl font-bold text-foreground">Premium и Boost</h1>
        <p className="mt-1 text-sm text-muted-foreground">Больше видимости, лайков и контроля</p>
      </header>

      <main className="mx-auto mt-8 max-w-4xl px-6">
        <section className="gradient-primary overflow-hidden rounded-2xl p-6 text-primary-foreground shadow-elevated">
          <Sparkles className="mb-4 h-9 w-9" />
          <h2 className="text-3xl font-extrabold">Откройте полную картину</h2>
          <p className="mt-2 max-w-xl text-primary-foreground/85">Смотрите, кто уже проявил интерес, поднимайте анкету выше и не теряйте перспективные совпадения.</p>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {plans.map(({ name, price, icon: Icon, perks }) => (
            <article key={name} className="rounded-2xl bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                  <div>
                    <h3 className="text-xl font-bold text-card-foreground">{name}</h3>
                    <p className="text-sm text-muted-foreground">{price}</p>
                  </div>
                </div>
                {name === "Premium" ? <Heart className="h-5 w-5 text-primary" /> : <Flame className="h-5 w-5 text-secondary" />}
              </div>
              <ul className="mt-5 space-y-2">
                {perks.map((perk) => <li key={perk} className="text-sm text-card-foreground">• {perk}</li>)}
              </ul>
              <Button onClick={placeholder} className="gradient-primary mt-5 w-full text-primary-foreground">Выбрать</Button>
            </article>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Premium;