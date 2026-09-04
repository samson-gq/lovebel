import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { suggestCities } from "@/lib/cities";
import { usePopularCities } from "@/hooks/usePopularCities";
import { useIsMobile } from "@/hooks/use-mobile";
import { DEFAULT_FILTERS, isDefaultFilters } from "@/hooks/useSwipeFilters";
import { plural } from "@/lib/plural";
import { cn } from "@/lib/utils";

interface FilterValues {
  ageRange: [number, number];
  maxDistance: number;
  gender: string;
  city: string;
  useGps: boolean;
  latitude: number | null;
  longitude: number | null;
}

interface FiltersProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  resultCount?: number | null;
  countLoading?: boolean;
}

const AGE_MIN = 18;
const AGE_MAX = 60;

const AGE_PRESETS: Array<{ label: string; range: [number, number] }> = [
  { label: "18–25", range: [18, 25] },
  { label: "25–35", range: [25, 35] },
  { label: "35–45", range: [35, 45] },
  { label: "45+", range: [45, 60] },
];

const DISTANCE_PRESETS = [5, 10, 25, 50, 100];

const GENDER_OPTIONS = [
  { value: "all", label: "Все" },
  { value: "female", label: "Женщины" },
  { value: "male", label: "Мужчины" },
];

const clampAge = (n: number) =>
  Math.max(AGE_MIN, Math.min(AGE_MAX, Math.round(Number.isFinite(n) ? n : AGE_MIN)));

const sectionLabel =
  "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground";

const SwipeFilters = ({ filters, onChange, resultCount = null, countLoading = false }: FiltersProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [locating, setLocating] = useState(false);
  const [ageMinInput, setAgeMinInput] = useState(String(filters.ageRange[0]));
  const [ageMaxInput, setAgeMaxInput] = useState(String(filters.ageRange[1]));
  const popularCities = usePopularCities();
  const suggestions = suggestCities(filters.city, popularCities);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Sync inputs when slider/external changes
  useEffect(() => {
    setAgeMinInput(String(filters.ageRange[0]));
    setAgeMaxInput(String(filters.ageRange[1]));
  }, [filters.ageRange]);

  useEffect(() => setActiveIndex(0), [filters.city, popularCities.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!cityFocused || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onChange({ ...filters, city: suggestions[activeIndex] });
      setCityFocused(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setCityFocused(false);
    }
  };

  const requestGps = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          ...filters,
          useGps: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const setAgeRange = (lo: number, hi: number) => {
    const a = clampAge(Math.min(lo, hi));
    const rawB = clampAge(Math.max(lo, hi));
    const b = rawB === a ? Math.min(AGE_MAX, a + 1) : rawB;
    if (a === filters.ageRange[0] && b === filters.ageRange[1]) return;
    onChange({ ...filters, ageRange: [a, b] });
  };

  const commitAgeMin = () => {
    const n = clampAge(parseInt(ageMinInput, 10));
    setAgeRange(n, filters.ageRange[1]);
  };
  const commitAgeMax = () => {
    const n = clampAge(parseInt(ageMaxInput, 10));
    setAgeRange(filters.ageRange[0], n);
  };

  const dirty = !isDefaultFilters(filters);

  /** Removable summary chips shown under the header (tactile-glass direction). */
  const chips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (filters.ageRange[0] !== DEFAULT_FILTERS.ageRange[0] || filters.ageRange[1] !== DEFAULT_FILTERS.ageRange[1]) {
    chips.push({
      key: "age",
      label: `${filters.ageRange[0]}–${filters.ageRange[1]} лет`,
      clear: () => onChange({ ...filters, ageRange: [...DEFAULT_FILTERS.ageRange] as [number, number] }),
    });
  }
  if (filters.gender !== "all") {
    chips.push({
      key: "gender",
      label: filters.gender === "female" ? "Женщины" : "Мужчины",
      clear: () => onChange({ ...filters, gender: "all" }),
    });
  }
  if (filters.city.trim()) {
    chips.push({
      key: "city",
      label: filters.city.trim(),
      clear: () => onChange({ ...filters, city: "" }),
    });
  } else if (filters.useGps) {
    chips.push({
      key: "gps",
      label: `до ${filters.maxDistance} км`,
      clear: () => onChange({ ...filters, useGps: false, latitude: null, longitude: null }),
    });
  } else if (filters.maxDistance !== DEFAULT_FILTERS.maxDistance) {
    chips.push({
      key: "dist",
      label: `до ${filters.maxDistance} км`,
      clear: () => onChange({ ...filters, maxDistance: DEFAULT_FILTERS.maxDistance }),
    });
  }

  const ageInputCls =
    "w-11 border-0 border-b border-primary/30 bg-transparent py-0.5 text-center text-sm font-bold text-primary outline-none transition-colors focus:border-primary";

  const body = (
    <div className="flex-1 space-y-8 overflow-y-auto px-7 py-5">
      {/* Age */}
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <span className={sectionLabel}>Возраст</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              min={AGE_MIN}
              max={AGE_MAX}
              value={ageMinInput}
              onChange={(e) => setAgeMinInput(e.target.value)}
              onBlur={commitAgeMin}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              aria-label="Минимальный возраст"
              className={ageInputCls}
            />
            <span className="text-sm text-muted-foreground/60">—</span>
            <input
              type="number"
              inputMode="numeric"
              min={AGE_MIN}
              max={AGE_MAX}
              value={ageMaxInput}
              onChange={(e) => setAgeMaxInput(e.target.value)}
              onBlur={commitAgeMax}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              aria-label="Максимальный возраст"
              className={ageInputCls}
            />
          </div>
        </div>
        <Slider
          min={AGE_MIN}
          max={AGE_MAX}
          step={1}
          minStepsBetweenThumbs={1}
          value={filters.ageRange}
          thumbLabels={["Минимальный возраст", "Максимальный возраст"]}
          onValueChange={(val) => {
            const [a, b] = val as [number, number];
            setAgeRange(a, b);
          }}
        />
        <div className="grid grid-cols-4 gap-2">
          {AGE_PRESETS.map((p) => {
            const active = filters.ageRange[0] === p.range[0] && filters.ageRange[1] === p.range[1];
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setAgeRange(p.range[0], p.range[1])}
                className={cn(
                  "rounded-2xl py-2 text-xs font-medium transition-all active:scale-95",
                  active
                    ? "gradient-primary font-semibold text-primary-foreground shadow-glow"
                    : "border border-border bg-card text-muted-foreground shadow-card hover:border-primary/50 hover:text-primary",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Distance */}
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <span className={sectionLabel}>Расстояние</span>
          <button
            type="button"
            onClick={requestGps}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-all active:scale-95",
              filters.useGps && filters.latitude && filters.longitude
                ? "gradient-primary text-primary-foreground shadow-glow"
                : "bg-primary/10 text-primary hover:bg-primary/15",
            )}
          >
            <LocateFixed className="h-3 w-3" />
            {locating ? "Ищем…" : filters.useGps ? "GPS активен" : "Включить GPS"}
          </button>
        </div>
        <div className="relative">
          <Slider
            min={1}
            max={100}
            step={1}
            value={[filters.maxDistance]}
            thumbLabels={["Радиус поиска"]}
            onValueChange={(val) => onChange({ ...filters, maxDistance: val[0] })}
          />
          <p className="mt-2 text-center text-xs font-bold text-primary">{filters.maxDistance} км</p>
        </div>
        <div className="flex justify-between px-1">
          {DISTANCE_PRESETS.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => onChange({ ...filters, maxDistance: km })}
              className={cn(
                "text-xs transition-all active:scale-95",
                filters.maxDistance === km
                  ? "font-semibold text-primary underline underline-offset-4"
                  : "font-medium text-muted-foreground hover:text-primary",
              )}
            >
              {km}
            </button>
          ))}
        </div>

        {filters.useGps && filters.latitude && filters.longitude && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {filters.latitude.toFixed(3)}, {filters.longitude.toFixed(3)}
            <button
              type="button"
              onClick={() => onChange({ ...filters, useGps: false })}
              className="ml-1 font-medium text-primary hover:underline"
            >
              Отключить
            </button>
          </p>
        )}
      </section>

      {/* City */}
      <section className="space-y-4">
        <span className={sectionLabel}>Город</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            placeholder="Начните вводить город…"
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            onFocus={() => setCityFocused(true)}
            onBlur={() => setTimeout(() => setCityFocused(false), 150)}
            onKeyDown={handleCityKeyDown}
            role="combobox"
            aria-expanded={cityFocused && suggestions.length > 0}
            aria-controls="city-suggestions"
            aria-activedescendant={
              cityFocused && suggestions.length > 0 ? `city-opt-${activeIndex}` : undefined
            }
            className="w-full rounded-2xl border border-border bg-muted/50 py-3.5 pl-11 pr-10 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-card focus:ring-2 focus:ring-primary/20"
          />
          {filters.city && (
            <button
              onClick={() => onChange({ ...filters, city: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Очистить город"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {cityFocused && suggestions.length > 0 && (
            <div
              ref={listRef}
              id="city-suggestions"
              role="listbox"
              className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-auto rounded-2xl border border-border bg-popover/95 p-1 shadow-elevated backdrop-blur-xl"
            >
              {suggestions.map((c, idx) => {
                const active = idx === activeIndex;
                return (
                  <button
                    key={c}
                    type="button"
                    id={`city-opt-${idx}`}
                    data-idx={idx}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange({ ...filters, city: c });
                      setCityFocused(false);
                    }}
                    className={cn(
                      "block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-popover-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {!filters.city && (
          <p className="text-xs text-muted-foreground">
            Подсказка: «спб», «мск» — тоже работает. ↑↓ Enter
          </p>
        )}
      </section>

      {/* Gender — segmented control */}
      <section className="space-y-4">
        <span className={sectionLabel}>Кого показывать</span>
        <div className="flex rounded-[24px] border border-border bg-muted/50 p-1.5">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...filters, gender: opt.value })}
              className={cn(
                "flex-1 rounded-[20px] py-2.5 text-sm transition-all active:scale-95",
                filters.gender === opt.value
                  ? "bg-card font-semibold text-primary shadow-card ring-1 ring-border"
                  : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  const footer = (
    <div className="border-t border-border/60 bg-card/60 p-6 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="gradient-primary w-full rounded-3xl py-4 text-base font-bold text-primary-foreground shadow-glow transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
      >
        {countLoading
          ? "Считаем…"
          : resultCount === null
            ? "Применить"
            : resultCount === 0
              ? "Ничего не найдено"
              : `Показать ${resultCount} ${plural(resultCount, "анкету", "анкеты", "анкет")}`}
      </button>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Открыть фильтры"
        className={cn(
          "relative rounded-full border border-border bg-card p-2.5 shadow-card transition-colors hover:bg-muted",
          dirty && "border-primary text-primary",
        )}
      >
        <SlidersHorizontal className="h-5 w-5" />
        {dirty && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "flex flex-col gap-0 border-border/60 bg-card/80 p-0 backdrop-blur-xl",
            isMobile ? "max-h-[90vh] rounded-t-[32px]" : "w-full sm:max-w-md",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 pb-3 pt-7">
            <h2 className="text-2xl font-bold text-foreground">Фильтры</h2>
            {dirty && (
              <button
                type="button"
                onClick={() => onChange(DEFAULT_FILTERS)}
                className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
              >
                Сбросить всё
              </button>
            )}
          </div>

          {/* Active filters summary chips */}
          {chips.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-7 pb-2 [scrollbar-width:none]">
              {chips.map((chip) => (
                <span
                  key={chip.key}
                  className="flex flex-none items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.clear}
                    aria-label={`Убрать фильтр ${chip.label}`}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-110"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {body}
          {footer}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default SwipeFilters;
export type { FilterValues };
