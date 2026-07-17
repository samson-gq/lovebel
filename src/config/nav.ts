import { Crown, Flame, Heart, Sparkles, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  /** Whether the route should be matched exactly (used as `end` prop in NavLink). */
  exact?: boolean;
}

/** Single source of truth for the main app navigation tabs (sidebar + bottom nav). */
export const NAV_ITEMS: NavItem[] = [
  { path: "/", icon: Flame, label: "Обзор", exact: true },
  { path: "/picks", icon: Sparkles, label: "Подборка" },
  { path: "/matches", icon: Heart, label: "Матчи" },
  { path: "/premium", icon: Crown, label: "Premium" },
  { path: "/profile", icon: User, label: "Профиль" },
];
