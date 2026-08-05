import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "@/config/nav";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="glass mx-3 mb-3 flex items-center justify-around rounded-2xl border border-border/60 p-1.5 shadow-elevated">
        {NAV_ITEMS.map(({ path, icon: Icon, label, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            className={({ isActive }) =>
              cn(
                "relative flex min-w-[44px] flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground active:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-primary/10" aria-hidden="true" />
                )}
                <Icon
                  className={cn(
                    "relative h-[22px] w-[22px] transition-transform",
                    isActive && "scale-110 fill-primary/20",
                  )}
                />
                <span className="relative text-[10px] font-semibold leading-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
