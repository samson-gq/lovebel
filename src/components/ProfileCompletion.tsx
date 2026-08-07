import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompletionInput {
  avatarUrl: string | null;
  name: string;
  bio: string;
  age: number | "";
  city: string;
  interests: string[];
  photosCount: number;
  hasVideo: boolean;
  occupation: string;
  isVerified: boolean;
}

/** Small progress widget that nudges the user to finish their profile. */
const ProfileCompletion = ({ data, className }: { data: CompletionInput; className?: string }) => {
  const { percent, missing } = useMemo(() => {
    const checks: Array<{ ok: boolean; label: string }> = [
      { ok: !!data.avatarUrl, label: "главное фото" },
      { ok: data.name.trim().length > 1, label: "имя" },
      { ok: data.age !== "" && Number(data.age) >= 18, label: "возраст" },
      { ok: data.city.trim().length > 1, label: "город" },
      { ok: data.bio.trim().length >= 40, label: "рассказ о себе (от 40 символов)" },
      { ok: data.interests.length >= 3, label: "3 интереса" },
      { ok: data.photosCount >= 3, label: "3 фото в галерее" },
      { ok: data.occupation.trim().length > 1, label: "работа" },
      { ok: data.hasVideo, label: "видео-клип" },
      { ok: data.isVerified, label: "верификация" },
    ];
    const done = checks.filter((c) => c.ok).length;
    return {
      percent: Math.round((done / checks.length) * 100),
      missing: checks.filter((c) => !c.ok).map((c) => c.label),
    };
  }, [data]);

  const tone =
    percent >= 90 ? "Отличный профиль!" : percent >= 60 ? "Почти готово" : "Профиль заполнен не полностью";

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-muted/40 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          {tone}
        </span>
        <span className="text-sm font-bold text-primary">{percent}%</span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-border/70">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      {missing.length > 0 && (
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          Добавьте: {missing.slice(0, 3).join(", ")}
          {missing.length > 3 ? ` и ещё ${missing.length - 3}` : ""}
        </p>
      )}
    </div>
  );
};

export default ProfileCompletion;
