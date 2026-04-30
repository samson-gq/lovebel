import { useState } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "inappropriate_photos", label: "Неприемлемые фото" },
  { value: "fake_profile", label: "Фейковый профиль" },
  { value: "harassment", label: "Домогательства / оскорбления" },
  { value: "spam", label: "Спам или реклама" },
  { value: "underage", label: "Несовершеннолетний" },
  { value: "offensive_behavior", label: "Оскорбительное поведение" },
  { value: "other", label: "Другое" },
];

type ReportReason =
  | "inappropriate_photos" | "fake_profile" | "harassment" | "spam"
  | "underage" | "offensive_behavior" | "other";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUserName?: string;
  onSubmitted?: () => void;
}

const ReportDialog = ({ open, onOpenChange, reportedUserId, reportedUserName, onSubmitted }: Props) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      reason,
      comment: comment.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Не удалось отправить жалобу");
      return;
    }
    toast.success("Жалоба отправлена. Мы рассмотрим её в ближайшее время.");
    setReason(null);
    setComment("");
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Пожаловаться{reportedUserName ? ` на ${reportedUserName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Расскажите, что не так. Мы рассмотрим жалобу анонимно.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                reason === r.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Дополнительные детали (необязательно)"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          rows={3}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason || submitting}
          >
            {submitting ? "Отправляем…" : "Отправить жалобу"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
