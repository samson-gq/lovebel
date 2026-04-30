import { useState } from "react";
import { toast } from "sonner";
import { Ban, Flag, MoreVertical } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ReportDialog from "./ReportDialog";

interface Props {
  targetUserId: string;
  targetUserName?: string;
  onBlocked?: () => void;
  triggerClassName?: string;
}

const ProfileActionsMenu = ({ targetUserId, targetUserName, onBlocked, triggerClassName }: Props) => {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const handleBlock = async () => {
    if (!user) return;
    setBlocking(true);
    const { error } = await supabase.from("blocks").insert({
      blocker_id: user.id,
      blocked_id: targetUserId,
    });
    setBlocking(false);

    if (error && !error.message.includes("duplicate")) {
      toast.error("Не удалось заблокировать");
      return;
    }
    toast.success("Пользователь заблокирован");
    setBlockConfirmOpen(false);
    onBlocked?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={triggerClassName ?? "flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm hover:bg-background"}
            aria-label="Действия"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setReportOpen(true)}>
            <Flag className="mr-2 h-4 w-4" /> Пожаловаться
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setBlockConfirmOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Ban className="mr-2 h-4 w-4" /> Заблокировать
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reportedUserId={targetUserId}
        reportedUserName={targetUserName}
      />

      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Заблокировать{targetUserName ? ` ${targetUserName}` : "пользователя"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы больше не увидите этот профиль, и он не сможет писать вам сообщения. Существующий матч (если есть) пропадёт. Действие обратимо в настройках.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blocking}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={blocking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {blocking ? "Блокируем…" : "Заблокировать"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProfileActionsMenu;
