import { useEffect, useRef, useState } from "react";
import { LocateFixed, SlidersHorizontal, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { suggestCities } from "@/lib/cities";
import { usePopularCities } from "@/hooks/usePopularCities";
import { useIsMobile } from "@/hooks/use-mobile";
import { DEFAULT_FILTERS, isDefaultFilters } from "@/hooks/useSwipeFilters";
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

const clampAge = (n: number) =>
  Math.max(AGE_MIN, Math.min(AGE_MAX, Math.round(Number.isFinite(n) ? n : AGE_MIN)));

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
    const b = clampAge(Math.max(lo, hi));
    onChange({ ...filters, ageRange: [a, b === a ? Math.min(AGE_MAX, a + 1) : b] });
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

  const body = (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto pb-2">
      {/* Age */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-card-foreground">
          <span>Возраст</span>
          <span className="text-xs text-muted-foreground">{AGE_MIN}–{AGE_MAX} лет</span>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={AGE_MIN}
            max={AGE_MAX}
            value={ageMinInput}
            onChange={(e) => setAgeMinInput(e.target.value)}
            onBlur={commitAgeMin}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label="Минимальный возраст"
            className="h-9 w-16 text-center"
          />
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
            className="flex-1"
          />
          <Input
            type="number"
            inputMode="numeric"
            min={AGE_MIN}
            max={AGE_MAX}
            value={ageMaxInput}
            onChange={(e) => setAgeMaxInput(e.target.value)}
            onBlur={commitAgeMax}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label="Максимальный возраст"
            className="h-9 w-16 text-center"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {AGE_PRESETS.map((p) => {
            const active = filters.ageRange[0] === p.range[0] && filters.ageRange[1] === p.range[1];
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setAgeRange(p.range[0], p.range[1])}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Distance */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-sm font-medium text-card-foreground">
            Радиус: до {filters.maxDistance} км
          </label>
          <button
            type="button"
            onClick={requestGps}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              filters.useGps && filters.latitude && filters.longitude
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {locating ? "Ищем…" : filters.useGps ? "GPS активен" : "Включить GPS"}
          </button>
        </div>
        <Slider
          min={1}
          max={100}
          step={1}
          value={[filters.maxDistance]}
          thumbLabels={["Радиус поиска"]}
          onValueChange={(val) => onChange({ ...filters, maxDistance: val[0] })}
        />
        {filters.useGps && filters.latitude && filters.longitude && (
          <p className="mt-2 text-xs text-muted-foreground">
            📍 GPS: {filters.latitude.toFixed(3)}, {filters.longitude.toFixed(3)} · до {filters.maxDistance} км
            <button
              type="button"
              onClick={() => onChange({ ...filters, useGps: false })}
              className="ml-2 font-medium text-primary hover:underline"
            >
              Отключить
            </button>
          </p>
        )}
      </div>

      {/* City */}
      <div>
        <label className="mb-2 block text-sm font-medium text-card-foreground">Город</label>
        <div className="relative">
          <Input
            placeholder="Любой город"
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
            className="pr-8"
          />
          {filters.city && (
            <button
              onClick={() => onChange({ ...filters, city: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
              className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-auto rounded-xl border border-border bg-popover p-1 shadow-elevated"
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
                      "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
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
          <p className="mt-1.5 text-xs text-muted-foreground">
            Подсказка: «спб», «мск» — тоже работает. ↑↓ Enter
          </p>
        )}
      </div>

      {/* Gender */}
      <div>
        <label className="mb-2 block text-sm font-medium text-card-foreground">Пол</label>
        <div className="flex gap-2">
          {[
            { value: "all", label: "Все" },
            { value: "female", label: "Женщины" },
            { value: "male", label: "Мужчины" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...filters, gender: opt.value })}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                filters.gender === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const footer = (
    <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
      {dirty && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="rounded-full bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Сбросить
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="ml-auto flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {countLoading
          ? "Считаем…"
          : resultCount === null
            ? "Применить"
            : resultCount === 0
              ? "Ничего не найдено"
              : `Показать ${resultCount} ${pluralProfiles(resultCount)}`}
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
            "flex flex-col",
            isMobile ? "max-h-[90vh] rounded-t-3xl" : "w-full sm:max-w-md",
          )}
        >
          <SheetHeader className="flex-row items-center justify-between space-y-0">
            <SheetTitle>Фильтры</SheetTitle>
          </SheetHeader>
          {body}
          {footer}
        </SheetContent>
      </Sheet>
    </>
  );
};

const pluralProfiles = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "анкету";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "анкеты";
  return "анкет";
};

export default SwipeFilters;
export type { FilterValues };
