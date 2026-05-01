import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROMPT_OPTIONS } from "@/lib/profileOptions";

export interface ProfilePrompt {
  id: string;
  user_id: string;
  prompt: string;
  answer: string;
  position: number;
}

interface Props {
  userId: string;
  editing: boolean;
}

const MAX_PROMPTS = 3;

const PromptsEditor = ({ userId, editing }: Props) => {
  const [prompts, setPrompts] = useState<ProfilePrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState<string>("");
  const [draftAnswer, setDraftAnswer] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profile_prompts")
        .select("*")
        .eq("user_id", userId)
        .order("position");
      if (active) {
        setPrompts((data as ProfilePrompt[]) || []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const handleAdd = async () => {
    if (!draftPrompt || !draftAnswer.trim()) {
      toast.error("Выберите вопрос и напишите ответ");
      return;
    }
    if (prompts.length >= MAX_PROMPTS) {
      toast.error(`Максимум ${MAX_PROMPTS} промпта`);
      return;
    }
    const { data, error } = await supabase
      .from("profile_prompts")
      .insert({
        user_id: userId,
        prompt: draftPrompt,
        answer: draftAnswer.trim(),
        position: prompts.length,
      })
      .select()
      .single();

    if (error) {
      toast.error("Не удалось сохранить промпт");
      return;
    }
    setPrompts((prev) => [...prev, data as ProfilePrompt]);
    setDraftPrompt("");
    setDraftAnswer("");
    setAdding(false);
    toast.success("Промпт добавлен");
  };

  const handleUpdate = async (id: string, answer: string) => {
    const { error } = await supabase
      .from("profile_prompts")
      .update({ answer })
      .eq("id", id);
    if (error) {
      toast.error("Ошибка обновления");
      return;
    }
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, answer } : p)));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("profile_prompts").delete().eq("id", id);
    if (error) {
      toast.error("Не удалось удалить");
      return;
    }
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Промпт удалён");
  };

  if (loading) return null;

  const usedPrompts = new Set(prompts.map((p) => p.prompt));
  const availablePrompts = PROMPT_OPTIONS.filter((p) => !usedPrompts.has(p));

  return (
    <div className="space-y-3">
      {prompts.map((p) => (
        <div
          key={p.id}
          className="rounded-2xl border border-border bg-card p-4 shadow-card"
        >
          <p className="text-sm font-semibold text-primary">{p.prompt}</p>
          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                defaultValue={p.answer}
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== p.answer) {
                    handleUpdate(p.id, e.target.value.trim());
                  }
                }}
                rows={2}
              />
              <button
                onClick={() => handleDelete(p.id)}
                className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
              >
                <Trash2 className="h-3 w-3" /> Удалить
              </button>
            </div>
          ) : (
            <p className="mt-1 text-card-foreground">{p.answer}</p>
          )}
        </div>
      ))}

      {editing && prompts.length < MAX_PROMPTS && (
        adding ? (
          <div className="space-y-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
            <Select value={draftPrompt} onValueChange={setDraftPrompt}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите вопрос" />
              </SelectTrigger>
              <SelectContent>
                {availablePrompts.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={draftAnswer}
              onChange={(e) => setDraftAnswer(e.target.value)}
              placeholder="Ваш ответ…"
              rows={3}
              maxLength={250}
            />
            <div className="flex gap-2">
              <Button onClick={handleAdd} className="gradient-primary flex-1 text-primary-foreground">
                Добавить
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAdding(false);
                  setDraftPrompt("");
                  setDraftAnswer("");
                }}
              >
                Отмена
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Добавить промпт ({prompts.length}/{MAX_PROMPTS})
          </button>
        )
      )}

      {!editing && prompts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Промпты ещё не добавлены. Нажмите «Редактировать», чтобы рассказать о себе.
        </p>
      )}
    </div>
  );
};

export default PromptsEditor;
