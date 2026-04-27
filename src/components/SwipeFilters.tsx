import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { suggestCities } from "@/lib/cities";
import { usePopularCities } from "@/hooks/usePopularCities";

interface FilterValues {
  ageRange: [number, number];
  maxDistance: number;
  gender: string;
  city: string;
}

interface FiltersProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
}

const SwipeFilters = ({ filters, onChange }: FiltersProps) => {
  const [open, setOpen] = useState(false);
  const [cityFocused, setCityFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const popularCities = usePopularCities();
  const suggestions = suggestCities(filters.city, popularCities);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Reset highlight when suggestions change
  useEffect(() => {
    setActiveIndex(0);
  }, [filters.city, popularCities.length]);

  // Keep highlighted item visible
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-idx="${activeIndex}"]`,
    );
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-border bg-card p-2.5 shadow-card transition-colors hover:bg-muted"
      >
        <SlidersHorizontal className="h-5 w-5 text-foreground" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute left-4 right-4 top-16 z-50 rounded-2xl bg-card p-5 shadow-elevated"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground">Фильтры</h3>
        <button onClick={() => setOpen(false)} className="text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Age */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium text-card-foreground">
          Возраст: {filters.ageRange[0]}–{filters.ageRange[1]}
        </label>
        <Slider
          min={18}
          max={60}
          step={1}
          value={filters.ageRange}
          onValueChange={(val) =>
            onChange({ ...filters, ageRange: val as [number, number] })
          }
        />
      </div>

      {/* Distance */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium text-card-foreground">
          Расстояние: до {filters.maxDistance} км
        </label>
        <Slider
          min={1}
          max={100}
          step={1}
          value={[filters.maxDistance]}
          onValueChange={(val) => onChange({ ...filters, maxDistance: val[0] })}
        />
      </div>

      {/* City */}
      <div className="mb-5">
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
              cityFocused && suggestions.length > 0
                ? `city-opt-${activeIndex}`
                : undefined
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
                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-popover-foreground hover:bg-muted"
                    }`}
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
      <div className="mb-2">
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
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filters.gender === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SwipeFilters;
export type { FilterValues };
