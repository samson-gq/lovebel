import { Crown, Flame, Heart, LogOut, Settings as SettingsIcon, Sparkles, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { path: "/", icon: Flame, label: "Обзор" },
  { path: "/likes", icon: Sparkles, label: "Лайки" },
  { path: "/matches", icon: Heart, label: "Матчи" },
  { path: "/premium", icon: Crown, label: "Premium" },
  { path: "/profile", icon: User, label: "Профиль" },
];

const AppSidebar = () => {
  const { signOut } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card/80 backdrop-blur-xl md:flex">
      <div className="flex items-center gap-2 px-6 py-5">
        <span
          className="bg-clip-text text-2xl font-extrabold tracking-tight text-transparent"
          style={{ backgroundImage: "var(--gradient-primary)" }}
        >
          LoveBel
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {items.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-5 w-5 ${isActive ? "fill-primary/20" : ""}`} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-border px-3 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`
          }
        >
          <SettingsIcon className="h-5 w-5" />
          <span>Настройки</span>
        </NavLink>
        <button
          onClick={signOut}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span>Выйти</span>
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
