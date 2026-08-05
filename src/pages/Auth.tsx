import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import logoImg from "@/assets/lovebel-logo.png";

const HIGHLIGHTS = [
  { icon: Sparkles, title: "Умный подбор", text: "Анкеты ранжируются по интересам и близости" },
  { icon: MessageCircle, title: "Живое общение", text: "Чат, голосовые и AI-подсказки для первого шага" },
  { icon: ShieldCheck, title: "Безопасно", text: "Верификация селфи, модерация фото и блокировки" },
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Добро пожаловать в LoveBel!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Ошибка входа через Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh bg-background bg-mesh">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle className="h-10 w-10" />
      </div>

      <div className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-16">
        {/* Brand / value side */}
        <section className="hidden animate-fade-up flex-col lg:flex">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Логотип LoveBel" className="h-11 w-11" />
            <span className="text-2xl font-extrabold tracking-tight text-gradient">LoveBel</span>
          </div>

          <h1 className="mt-10 text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground">
            Знакомства,
            <br />
            которые
            <span className="text-gradient"> цепляют</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Свайпай, находи совпадения и начинай разговор — без неловких пауз.
          </p>

          <ul className="mt-10 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-foreground">{title}</span>
                  <span className="block text-sm text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Form side */}
        <section className="mx-auto w-full max-w-md animate-fade-up">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="relative">
              <span className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
              <img src={logoImg} alt="Логотип LoveBel" className="relative h-16 w-16 animate-float" />
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gradient">LoveBel</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Знакомства, которые цепляют
            </p>
          </div>

          <div className="glass rounded-3xl border border-border/60 p-6 shadow-elevated sm:p-8">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  isLogin
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Вход
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  !isLogin
                    ? "gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Регистрация
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="auth-name">Ваше имя</Label>
                  <Input
                    id="auth-name"
                    placeholder="Как вас зовут?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auth-password">Пароль</Label>
                <Input
                  id="auth-password"
                  type="password"
                  placeholder="Минимум 6 символов"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12 rounded-xl"
                />
              </div>
              <Button
                type="submit"
                className="gradient-primary h-12 w-full rounded-xl text-base font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99]"
                disabled={loading}
              >
                {loading ? "Загрузка..." : isLogin ? "Войти" : "Создать аккаунт"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">или</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="outline"
              className="h-12 w-full gap-2 rounded-xl text-base"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {googleLoading ? "Загрузка..." : "Продолжить с Google"}
            </Button>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Heart className="h-3.5 w-3.5 text-primary" />
              Более 10 000 знакомств в Беларуси
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Auth;
