import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Download, Trash2, Ban, BadgeCheck, Bell, BellOff } from "lucide-react";
import { canEnablePush, disablePush, enablePush, getPushPermission, isPushSupported } from "@/lib/push";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { SignedImg } from "@/components/SignedImg";

interface BlockedRow {
  id: string;
  blocked_id: string;
  created_at: string;
  profile?: { name: string; avatar_url: string | null } | null;
}

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    navigator.serviceWorker.getRegistration("/push-sw.js").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setPushEnabled(!!sub && getPushPermission() === "granted");
    });
  }, []);

  const togglePush = async () => {
    if (!user) return;
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disablePush();
        setPushEnabled(false);
        toast.success("Push-уведомления отключены");
      } else {
        if (!canEnablePush()) {
          toast.info("Push-уведомления доступны только в опубликованной версии", {
            description: "Откройте lovebel.lovable.app в обычной вкладке браузера",
          });
          return;
        }
        const ok = await enablePush(user.id);
        if (ok) {
          setPushEnabled(true);
          toast.success("Push-уведомления включены");
        } else {
          toast.error("Не удалось включить push", {
            description: "Проверьте разрешения уведомлений в браузере",
          });
        }
      }
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: blocks }, { data: profile }] = await Promise.all([
        supabase.from("blocks").select("id, blocked_id, created_at").eq("blocker_id", user.id),
        supabase.from("profiles").select("is_verified").eq("user_id", user.id).maybeSingle(),
      ]);
      setIsVerified(profile?.is_verified ?? false);

      if (blocks?.length) {
        const ids = blocks.map((b) => b.blocked_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", ids);
        const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
        setBlocked(
          blocks.map((b) => ({ ...b, profile: byId.get(b.blocked_id) ?? null })),
        );
      } else {
        setBlocked([]);
      }
    };
    load();
  }, [user]);

  const handleUnblock = async (id: string) => {
    const { error } = await supabase.from("blocks").delete().eq("id", id);
    if (error) {
      toast.error("Ошибка");
      return;
    }
    setBlocked((prev) => prev.filter((b) => b.id !== id));
    toast.success("Разблокировано");
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/account-management`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "export" }),
        },
      );
      if (!resp.ok) throw new Error("Export failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lovebel-export-${user.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Данные скачаны");
    } catch (e) {
      toast.error("Не удалось экспортировать данные");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/account-management`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "delete", reason: deleteReason.trim() || null }),
        },
      );
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error ?? "Delete failed");
      }
      toast.success("Аккаунт удалён");
      await signOut();
      navigate("/auth", { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить аккаунт");
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-12">
      <header className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate(-1)} className="text-foreground" aria-label="Назад">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Настройки и приватность</h1>
      </header>

      <div className="mx-auto w-full max-w-md space-y-6 p-4">
        {/* Verification */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              {isVerified ? (
                <BadgeCheck className="h-5 w-5 text-primary" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">
                Верификация {isVerified && <span className="text-primary">✓</span>}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isVerified
                  ? "Ваш профиль подтверждён. Знак верификации виден другим."
                  : "Подтвердите, что вы — реальный человек, и получите значок верификации."}
              </p>
              {!isVerified && (
                <Button
                  className="mt-3 gradient-primary text-primary-foreground"
                  onClick={() => navigate("/verification")}
                >
                  Пройти верификацию
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Push notifications */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              {pushEnabled ? <Bell className="h-5 w-5 text-primary" /> : <BellOff className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">Push-уведомления</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {pushEnabled
                  ? "Вы получаете уведомления о новых матчах и сообщениях."
                  : "Включите, чтобы не пропускать новые матчи и сообщения."}
              </p>
              <Button
                onClick={togglePush}
                disabled={pushBusy || !isPushSupported()}
                variant={pushEnabled ? "outline" : "default"}
                className={pushEnabled ? "mt-3" : "mt-3 gradient-primary text-primary-foreground"}
              >
                {pushBusy ? "..." : pushEnabled ? "Отключить" : "Включить уведомления"}
              </Button>
              {!isPushSupported() && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Ваш браузер не поддерживает Web Push.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Blocked users */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Ban className="h-5 w-5 text-foreground" />
            <h2 className="font-semibold text-foreground">Заблокированные ({blocked.length})</h2>
          </div>
          {blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">Никого не заблокировано.</p>
          ) : (
            <ul className="space-y-2">
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                  <SignedImg
                    src={b.profile?.avatar_url ?? null}
                    alt={b.profile?.name ?? "user"}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <span className="flex-1 text-sm text-foreground">
                    {b.profile?.name ?? "Пользователь"}
                  </span>
                  <button
                    onClick={() => handleUnblock(b.id)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Разблокировать
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Data export */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
              <Download className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">Экспорт данных (GDPR)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Скачайте все ваши данные: профиль, фото, матчи, сообщения, свайпы.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? "Готовим…" : "Скачать JSON"}
              </Button>
            </div>
          </div>
        </section>

        {/* Delete account */}
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-destructive">Удалить аккаунт</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Все ваши данные, фото, матчи и сообщения будут удалены безвозвратно.
              </p>
              <Button
                variant="destructive"
                className="mt-3"
                onClick={() => setConfirmOpen(true)}
              >
                Удалить аккаунт
              </Button>
            </div>
          </div>
        </section>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Точно удалить аккаунт?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие <strong>необратимо</strong>. Все данные будут удалены сразу.
              Если хотите, расскажите почему уходите — это поможет улучшить LoveBel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Причина (необязательно)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value.slice(0, 500))}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Удаляем…" : "Да, удалить навсегда"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
