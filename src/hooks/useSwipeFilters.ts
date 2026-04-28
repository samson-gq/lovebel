import { useCallback, useEffect, useState } from "react";
import type { FilterValues } from "@/components/SwipeFilters";

const STORAGE_KEY = "lovebel.swipe.filters.v1";

export const DEFAULT_FILTERS: FilterValues = {
  ageRange: [18, 45],
  maxDistance: 50,
  gender: "all",
  city: "",
};

export const isDefaultFilters = (f: FilterValues) =>
  f.ageRange[0] === DEFAULT_FILTERS.ageRange[0] &&
  f.ageRange[1] === DEFAULT_FILTERS.ageRange[1] &&
  f.maxDistance === DEFAULT_FILTERS.maxDistance &&
  f.gender === DEFAULT_FILTERS.gender &&
  f.city.trim() === "";

const clampNum = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const sanitizeGender = (g: unknown): string => {
  return g === "male" || g === "female" || g === "all"
    ? (g as string)
    : DEFAULT_FILTERS.gender;
};

const fromObject = (obj: Record<string, unknown>): FilterValues => {
  const ageMin = clampNum(obj.ageMin ?? (obj.ageRange as any)?.[0], DEFAULT_FILTERS.ageRange[0]);
  const ageMax = clampNum(obj.ageMax ?? (obj.ageRange as any)?.[1], DEFAULT_FILTERS.ageRange[1]);
  return {
    ageRange: [Math.min(ageMin, ageMax), Math.max(ageMin, ageMax)],
    maxDistance: clampNum(obj.maxDistance, DEFAULT_FILTERS.maxDistance),
    gender: sanitizeGender(obj.gender),
    city: typeof obj.city === "string" ? obj.city : "",
  };
};

const fromUrl = (search: string): FilterValues | null => {
  const params = new URLSearchParams(search);
  if (![...params.keys()].some((k) => ["city", "gender", "ageMin", "ageMax", "maxDistance"].includes(k))) {
    return null;
  }
  return fromObject({
    city: params.get("city") ?? "",
    gender: params.get("gender") ?? undefined,
    ageMin: params.get("ageMin") ?? undefined,
    ageMax: params.get("ageMax") ?? undefined,
    maxDistance: params.get("maxDistance") ?? undefined,
  });
};

const fromStorage = (): FilterValues | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return fromObject(JSON.parse(raw));
  } catch {
    return null;
  }
};

const toUrl = (f: FilterValues): string => {
  const p = new URLSearchParams();
  if (f.city.trim()) p.set("city", f.city.trim());
  if (f.gender !== DEFAULT_FILTERS.gender) p.set("gender", f.gender);
  if (f.ageRange[0] !== DEFAULT_FILTERS.ageRange[0]) p.set("ageMin", String(f.ageRange[0]));
  if (f.ageRange[1] !== DEFAULT_FILTERS.ageRange[1]) p.set("ageMax", String(f.ageRange[1]));
  if (f.maxDistance !== DEFAULT_FILTERS.maxDistance) p.set("maxDistance", String(f.maxDistance));
  return p.toString();
};

const initial = (): FilterValues => {
  if (typeof window === "undefined") return DEFAULT_FILTERS;
  return fromUrl(window.location.search) ?? fromStorage() ?? DEFAULT_FILTERS;
};

/**
 * Filter state synced to URL (so back/forward restores it) AND localStorage
 * (so opening the app fresh restores the last used filters).
 */
export function useSwipeFilters() {
  const [filters, setFilters] = useState<FilterValues>(initial);

  // Persist to localStorage + reflect into URL whenever filters change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      /* ignore quota */
    }
    const qs = toUrl(filters);
    const target = qs ? `?${qs}` : window.location.pathname;
    const current = window.location.search.replace(/^\?/, "");
    if (qs !== current) {
      window.history.replaceState(null, "", target + window.location.hash);
    }
  }, [filters]);

  // React to back/forward navigation.
  useEffect(() => {
    const onPop = () => {
      const next = fromUrl(window.location.search) ?? DEFAULT_FILTERS;
      setFilters(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return { filters, setFilters, reset };
}
