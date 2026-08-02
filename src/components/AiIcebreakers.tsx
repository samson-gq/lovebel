import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  partnerId: string;
  partnerName: string;
  onPick: (text: string) => void;
}

/** AI-generated openers based on the partner's profile. */
const AiIcebreakers = ({ partnerId, partnerName, onPick }: Props) => {
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<string[]>([]);

  const generate = async () => {
    setLoading(true);
    try {
      const [{ data: partner }, { data: mineRows }] = await Promise.all([
        supabase.from("profiles").select("name, bio, interests").eq("user_id", partnerId).maybeSingle(),
        supabase.rpc("get_my_profile" as any),
      ]);
      const mine = Array.isArray(mineRows) ? mineRows[0] : mineRows;

      const { data, error } = await supabase.functions.invoke("ai-profile-assistant", {
        body: {
          mode: "icebreakers",
          partnerName: partner?.name ?? partnerName,
          partnerBio: partner?.bio ?? "",
          partnerInterests: partner?.interests ?? [],
          myInterests: (mine as any)?.interests ?? [],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list: string[] = data?.variants ?? [];
      if (!list.length) throw new Error("Не удалось придумать подсказки");
      setIdeas(list);
    } catch (e) {
      toast.error((e as Error).message || "Ошибка генерации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {ideas.length === 0 ? (
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          AI-подсказка для знакомства
        </button>
      ) : (
        <div className="space-y-2 text-left">
          {ideas.map((idea, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPick(idea)}
              className="w-full rounded-xl border border-primary/30 bg-card p-3 text-left text-sm text-foreground transition-colors hover:border-primary"
            >
              {idea}
            </button>
          ))}
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Ещё варианты
          </button>
        </div>
      )}
    </div>
  );
};

export default AiIcebreakers;
