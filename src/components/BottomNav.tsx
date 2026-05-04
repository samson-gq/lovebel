import { Crown, Flame, Heart, Sparkles, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", icon: Flame, label: "Обзор" },
  { path: "/likes", icon: Sparkles, label: "Лайки" },
  { path: "/matches", icon: Heart, label: "Матчи" },
  { path: "/premium", icon: Crown, label: "Premium" },
  { path: "/profile", icon: User, label: "Профиль" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 rounded-xl px-6 py-2 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? "fill-primary" : ""}`} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
