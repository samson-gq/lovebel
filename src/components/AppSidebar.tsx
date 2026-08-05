import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import { NAV_ITEMS } from "@/config/nav";
import logoImg from "@/assets/lovebel-logo.png";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all",
    isActive
      ? "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.15)]"
      : "text-muted-foreground hover:translate-x-0.5 hover:bg-muted hover:text-foreground",
  );

const AppSidebar = () => {
  const { signOut } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card/80 backdrop-blur-xl md:flex">
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <span className="flex items-center gap-2.5">
          <img src={logoImg} alt="" aria-hidden="true" className="h-8 w-8" />
          <span className="text-xl font-extrabold tracking-tight text-gradient">LoveBel</span>
        </span>
        <ThemeToggle className="h-9 w-9" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ path, icon: Icon, label, exact }) => (
          <NavLink key={path} to={path} end={exact} className={linkClass}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full gradient-primary" />
                )}
                <Icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110 fill-primary/20")} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>


      <div className="mt-auto flex flex-col gap-1 border-t border-border px-3 py-3">
        <NavLink to="/settings" className={linkClass}>
          <SettingsIcon className="h-5 w-5" />
          <span>Настройки</span>
        </NavLink>
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span>Выйти</span>
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Выйти из аккаунта?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы сможете снова войти в любой момент.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => signOut()}>Выйти</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
};

export default AppSidebar;
