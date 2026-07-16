import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { canEnablePush, enablePush, getPushPermission, isPushSupported } from "@/lib/push";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "lovebel.pushOptIn.dismissedAt";
const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Non-blocking prompt to enable web push. Shown when:
 *  - browser supports push,
 *  - permission is still "default" (not asked or dismissed),
 *  - user isn't inside Lovable preview / iframe,
 *  - user hasn't dismissed the card in the last 7 days.
 */
const PushOptIn = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !isPushSupported() || !canEnablePush()) return;
    if (getPushPermission() !== "default") return;
    const raw = localStorage.getItem(DISMISS_KEY);
    if (raw) {
      const ts = Number(raw);
      if (Number.isFinite(ts) && Date.now() - ts < REMIND_AFTER_MS) return;
    }
    setVisible(true);
  }, [user]);

  if (!visible || !user) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    try {
      const ok = await enablePush(user.id);
      if (ok) {
        toast.success("Уведомления включены");
        setVisible(false);
      } else {
        toast.info("Разрешение не получено");
      }
    } catch (e) {
      toast.error("Не удалось включить уведомления");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-4 mb-3 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Bell className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Включить уведомления?</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Получайте оповещения о новых лайках, матчах и сообщениях, даже когда LoveBel закрыт.
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={enable} disabled={busy}>
            {busy ? "Включаем…" : "Включить"}
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} disabled={busy}>
            Позже
          </Button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Закрыть"
        className="rounded-full p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default PushOptIn;
