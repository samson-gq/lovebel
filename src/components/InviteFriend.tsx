import { useState } from "react";
import { Bell, Copy, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { canEnablePush, enablePush, getPushPermission } from "@/lib/push";
import { getInvite, INVITE_URL } from "@/lib/invite";

const InviteFriend = () => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INVITE_URL);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать — выделите ссылку вручную");
    }
  };

  const share = async () => {
    if (!navigator.share) return copy();
    setSharing(true);
    try {
      await navigator.share(getInvite());
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        toast.error("Не удалось отправить приглашение — скопируйте ссылку");
      }
    } finally {
      setSharing(false);
    }
  };

  const subscribe = async () => {
    if (!user) return;
    if (!canEnablePush()) {
      toast.info("Откройте опубликованный LoveBel отдельно, чтобы включить уведомления");
      return;
    }
    if (getPushPermission() === "denied") {
      toast.info("Разрешите уведомления для LoveBel в настройках браузера");
      return;
    }
    setBusy(true);
    try {
      const ok = await enablePush(user.id);
      setEnabled(ok);
      if (ok) toast.success("Уведомления включены");
      else toast.info("Уведомления не включены — проверьте разрешение браузера");
    } catch {
      toast.error("Не удалось включить уведомления. Попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <UserPlus className="h-4 w-4" /> Пригласить друга
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-lg">
        <DialogHeader>
          <DialogTitle>Пригласить друга</DialogTitle>
          <DialogDescription>Присоединяйся ко мне в LoveBel!</DialogDescription>
        </DialogHeader>
        <Input aria-label="Ссылка приглашения" value={INVITE_URL} readOnly onFocus={(e) => e.target.select()} />
        <div className="flex flex-wrap gap-2">
          <Button className="flex-1 gap-2" onClick={share} disabled={sharing}>
            <Share2 className="h-4 w-4" /> Поделиться
          </Button>
          <Button variant="outline" size="icon" aria-label="Скопировать ссылку" title="Скопировать ссылку" onClick={copy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">Новые лайки, матчи и сообщения</h3>
          <Button variant="outline" className="mt-3 w-full gap-2" onClick={subscribe} disabled={busy || enabled}>
            <Bell className="h-4 w-4" />
            {busy ? "Включаем…" : enabled ? "Уведомления включены" : "Включить уведомления"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteFriend;