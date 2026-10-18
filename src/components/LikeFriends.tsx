import { useState } from "react";
import { Heart, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SignedImg } from "@/components/SignedImg";
import InviteFriend from "@/components/InviteFriend";
import type { Profile } from "@/data/profiles";

interface Props {
  profiles: Profile[];
  loading: boolean;
  onLike: (id: string) => Promise<boolean>;
  onOpenChange: (open: boolean) => void;
}

export default function LikeFriends({ profiles, loading, onLike, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const visible = profiles.filter((profile) => profile.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  const like = async (id: string) => {
    if (busy) return;
    setBusy(id);
    try { await onLike(id); } finally { setBusy(null); }
  };

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Users className="h-4 w-4" />Лайкнуть друзей</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>Лайкнуть друзей</DialogTitle>
          <DialogDescription>Анкеты из Обзора</DialogDescription>
        </DialogHeader>
        <Input aria-label="Поиск по имени" placeholder="Имя" value={query} onChange={(event) => setQuery(event.target.value)} />
        {loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-label="Загрузка анкет" /> : visible.length ? (
          <ul className="divide-y divide-border">
            {visible.map((profile) => (
              <li key={profile.id} className="flex items-start gap-3 py-3">
                <SignedImg src={profile.image} alt={profile.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold text-foreground">{profile.name}{profile.age ? `, ${profile.age}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{profile.distance}</p>
                  {profile.bio && <p className="mt-1 line-clamp-3 break-words text-sm text-muted-foreground">{profile.bio}</p>}
                </div>
                <Button variant="outline" size="icon" disabled={busy !== null} onClick={() => like(profile.id)} aria-label={`Лайкнуть ${profile.name}`} title={`Лайкнуть ${profile.name}`} className="shrink-0">
                  {busy === profile.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4 text-primary" />}
                </Button>
              </li>
            ))}
          </ul>
        ) : <p className="py-5 text-center text-sm text-muted-foreground">{query ? "Никого не нашли" : "Нет доступных анкет"}</p>}
        <InviteFriend />
      </DialogContent>
    </Dialog>
  );
}