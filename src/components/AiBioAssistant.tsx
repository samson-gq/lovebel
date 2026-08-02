import { useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  profile: {
    name?: string;
    age?: number | "";
    city?: string;
    occupation?: string;
    education?: string;
    interests?: string[];
    currentBio?: string;
  };
  onPick: (bio: string) => void;
}

const TONES = [
  { value: "friendly", label: "Дружелюбный" },
  { value: "witty", label: "С юмором" },
  { value: "serious", label: "Серьёзный" },
  { value: "adventurous", label: "Энергичный" },
];

/** AI helper that drafts three "About me" variants from the profile data. */
const AiBioAssistant = ({ profile, onPick }: Props) => {
  const [tone, setTone] = useState("friendly");
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-profile-assistant", {
        body: { ...profile, age: profile.age || null, tone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list: string[] = data?.variants ?? [];
      if (!list.length) throw new Error("Не удалось сгенерировать текст");
      setVariants(list);
    } catch (e) {
      toast.error((e as Error).message || "Ошибка генерации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold text-foreground">AI-помощник для «О себе»</span>
      </div>

      <div className="mt-3 flex gap-2">
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger className="h-9 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TONES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" className="h-9" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сгенерировать"}
        </Button>
      </div>

      {variants.length > 0 && (
        <ul className="mt-3 space-y-2">
          {variants.map((v, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onPick(v);
                  toast.success("Описание вставлено");
                }}
                className="group w-full rounded-lg border border-border bg-card p-3 text-left text-sm text-foreground transition-colors hover:border-primary"
              >
                {v}
                <span className="mt-1 flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  <Check className="h-3 w-3" /> Использовать
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AiBioAssistant;
