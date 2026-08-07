import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { HeartCrack, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background bg-mesh px-6">
      <div className="animate-fade-up flex max-w-sm flex-col items-center rounded-3xl border border-border/50 bg-card/70 p-8 text-center shadow-card backdrop-blur-xl">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <HeartCrack className="h-10 w-10 text-primary" />
        </div>
        <h1
          className="bg-clip-text text-5xl font-extrabold tracking-tight text-transparent"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          404
        </h1>
        <p className="mt-3 text-lg font-semibold text-foreground">Страница не найдена</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Похоже, эта ссылка больше не существует или была перемещена.
        </p>
        <Link
          to="/"
          className="gradient-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться к обзору
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
