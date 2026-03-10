import { useState } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface FilterValues {
  ageRange: [number, number];
  maxDistance: number;
  gender: string;
}

interface FiltersProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
}

const INTERESTS_OPTIONS = [
  "Путешествия", "Музыка", "Спорт", "Кино", "Книги",
  "Фотография", "Кофе", "Йога", "Дизайн", "Фитнес",
];

const SwipeFilters = ({ filters, onChange }: FiltersProps) => {
  const [open, setOpen] = useState(false);

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
          onValueChange={(val) =>
            onChange({ ...filters, maxDistance: val[0] })
          }
        />
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
