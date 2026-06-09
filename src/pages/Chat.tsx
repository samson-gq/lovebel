import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  BadgeCheck,
  Smile,
  ImagePlus,
  Sparkles,
  Check,
  CheckCheck,
  X,
  Loader2,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import ProfileActionsMenu from "@/components/ProfileActionsMenu";
import ChatList from "@/components/ChatList";
import ImageLightbox from "@/components/ImageLightbox";
import { formatDayLabel, formatTime, sameDay, linkify } from "@/lib/chatUtils";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  content_type?: "text" | "image" | "gif" | "sticker";
  attachment_url?: string | null;
  read_at?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  // client-only:
  _optimistic?: boolean;
  _failed?: boolean;
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

interface TenorGif {
  id: string;
  preview: string;
  url: string;
}

const STARTERS = [
  "Привет! Как настроение? ✨",
  "Что обычно делаешь по выходным?",
  "Расскажи о себе в трёх словах 😊",
  "Куда бы поехал(а) прямо сейчас?",
];

const Chat = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerVerified, setPartnerVerified] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const isAtBottomRef = useRef(true);

  // Fetch partner + messages + realtime
  useEffect(() => {
    if (!matchId || !user) return;

    const fetchPartner = async () => {
      const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single();
      if (match) {
        const pid = match.user1_id === user.id ? match.user2_id : match.user1_id;
        setPartnerId(pid);
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, avatar_url, is_verified")
          .eq("user_id", pid)
          .single();
        if (profile) {
          setPartnerName(profile.name);
          setPartnerAvatar(profile.avatar_url);
          setPartnerVerified(profile.is_verified ?? false);
        }
      }
    };

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });
      const msgs = (data as Message[]) || [];
      setMessages(msgs);
      // Fetch reactions for these messages
      if (msgs.length) {
        const { data: rx } = await supabase
          .from("message_reactions")
          .select("*")
          .in("message_id", msgs.map((m) => m.id));
        setReactions((rx as Reaction[]) || []);
      }
    };

    fetchPartner();
    fetchMessages();

    const channel = supabase
      .channel(`chat:${matchId}`, { config: { presence: { key: user.id } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            // Replace matching optimistic message (same sender + content + content_type) or append
            const idx = prev.findIndex(
              (m) =>
                m._optimistic &&
                m.sender_id === incoming.sender_id &&
                m.content === incoming.content &&
                (m.content_type ?? "text") === (incoming.content_type ?? "text"),
            );
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = incoming;
              return next;
            }
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => {
          const r = payload.new as Reaction;
          setReactions((prev) =>
            prev.some((x) => x.id === r.id) ? prev : [...prev, r],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const old = payload.old as { id: string };
          setReactions((prev) => prev.filter((x) => x.id !== old.id));
        },
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const senderId = (payload.payload as { user_id: string }).user_id;
        if (senderId !== user.id) {
          setPartnerTyping(true);
          if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
          typingTimerRef.current = window.setTimeout(() => setPartnerTyping(false), 3000);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, unknown[]>;
        const others = Object.keys(state).filter((k) => k !== user.id);
        setPartnerOnline(others.length > 0);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, [matchId, user]);

  // Mark partner messages as read
  useEffect(() => {
    if (!user || !matchId) return;
    const unread = messages
      .filter((m) => m.sender_id !== user.id && !m.read_at && !m._optimistic)
      .map((m) => m.id);
    if (unread.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread)
      .then();
  }, [messages, user, matchId]);

  // Sign image URLs (private bucket)
  useEffect(() => {
    const need = messages.filter(
      (m) => m.content_type === "image" && m.attachment_url && !signedUrls[m.id],
    );
    if (need.length === 0) return;
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        need.map(async (m) => {
          const path = m.attachment_url!;
          const { data } = await supabase.storage.from("chat-images").createSignedUrl(path, 3600);
          if (data?.signedUrl) updates[m.id] = data.signedUrl;
        }),
      );
      if (Object.keys(updates).length) setSignedUrls((p) => ({ ...p, ...updates }));
    })();
  }, [messages, signedUrls]);

  // Smart auto-scroll: only when user is at bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, partnerTyping]);

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance < 80;
    isAtBottomRef.current = atBottom;
    setShowScrollDown(!atBottom);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    isAtBottomRef.current = true;
    setShowScrollDown(false);
  };

  const broadcastTyping = useCallback(() => {
    if (!user || !channelRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
  }, [user]);

  const insertOptimistic = useCallback(
    (msg: Omit<Message, "id" | "created_at" | "sender_id">) => {
      if (!user) return null;
      const optimistic: Message = {
        ...msg,
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        sender_id: user.id,
        created_at: new Date().toISOString(),
        _optimistic: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      isAtBottomRef.current = true;
      return optimistic.id;
    },
    [user],
  );

  const markFailed = (tmpId: string | null) => {
    if (!tmpId) return;
    setMessages((prev) => prev.map((m) => (m.id === tmpId ? { ...m, _failed: true } : m)));
  };

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !user || !matchId) return;
      const tmpId = insertOptimistic({ content: trimmed, content_type: "text" });
      const { error } = await supabase.from("messages").insert({
        match_id: matchId,
        sender_id: user.id,
        content: trimmed,
        content_type: "text",
      });
      if (error) {
        markFailed(tmpId);
        toast.error("Не удалось отправить");
      }
    },
    [user, matchId, insertOptimistic],
  );

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage;
    setNewMessage("");
    await sendText(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const text = newMessage;
      setNewMessage("");
      sendText(text);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user || !matchId) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Файл слишком большой (макс. 8MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${matchId}/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-images")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: msgErr } = await supabase.from("messages").insert({
        match_id: matchId,
        sender_id: user.id,
        content: "📷 Изображение",
        content_type: "image",
        attachment_url: path,
      });
      if (msgErr) throw msgErr;
    } catch (err) {
      toast.error("Не удалось загрузить", { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const fetchGifs = useCallback(async (q: string) => {
    setGifLoading(true);
    try {
      // Use the user's JWT so the edge function can authenticate the caller
      // and rate-limit by user (not by anon key).
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Нужна авторизация");
        return;
      }
      const base = import.meta.env.VITE_SUPABASE_URL;
      const r = await fetch(
        `${base}/functions/v1/tenor-search?q=${encodeURIComponent(q)}&limit=24`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );
      const json = await r.json();
      setGifs(json.results || []);
    } catch {
      toast.error("Не удалось загрузить GIF");
    } finally {
      setGifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showGif) fetchGifs(gifQuery);
  }, [showGif, gifQuery, fetchGifs]);

  const sendGif = async (gif: TenorGif) => {
    if (!user || !matchId) return;
    setShowGif(false);
    await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: user.id,
      content: "GIF",
      content_type: "gif",
      attachment_url: gif.url,
    });
  };

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [newMessage]);

  const myMessages = messages.filter((m) => m.sender_id === user?.id && !m._optimistic);
  const lastReadMyId = [...myMessages].reverse().find((m) => !!m.read_at)?.id;

  // Reactions grouped by message
  const reactionsByMessage = useMemo(() => {
    const map: Record<string, Reaction[]> = {};
    for (const r of reactions) {
      (map[r.message_id] ||= []).push(r);
    }
    return map;
  }, [reactions]);

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const mine = reactions.find(
      (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji,
    );
    if (mine) {
      // Optimistic remove
      setReactions((prev) => prev.filter((r) => r.id !== mine.id));
      const { error } = await supabase.from("message_reactions").delete().eq("id", mine.id);
      if (error) toast.error("Не удалось убрать реакцию");
    } else {
      const { data, error } = await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji })
        .select()
        .single();
      if (error) {
        toast.error("Не удалось добавить реакцию");
      } else if (data) {
        setReactions((prev) =>
          prev.some((r) => r.id === (data as Reaction).id) ? prev : [...prev, data as Reaction],
        );
      }
    }
  };

  const startEdit = (m: Message) => {
    setEditingId(m.id);
    setEditingText(m.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (!trimmed) return;
    const id = editingId;
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: trimmed, edited_at: new Date().toISOString() } : m)),
    );
    cancelEdit();
    const { error } = await supabase
      .from("messages")
      .update({ content: trimmed, edited_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Не удалось сохранить изменения");
  };

  const confirmDelete = async (m: Message) => {
    setMessages((prev) =>
      prev.map((x) =>
        x.id === m.id ? { ...x, deleted_at: new Date().toISOString(), content: "" } : x,
      ),
    );
    setDeletingId(null);
    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString(), content: "" })
      .eq("id", m.id);
    if (error) toast.error("Не удалось удалить");
  };


  // Build grouped rows: date separators + grouped consecutive messages
  type Row =
    | { kind: "day"; key: string; label: string }
    | { kind: "msg"; key: string; msg: Message; showTail: boolean; isFirstInGroup: boolean };

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const date = new Date(m.created_at);
      const prev = i > 0 ? messages[i - 1] : null;
      const next = i < messages.length - 1 ? messages[i + 1] : null;
      const prevDate = prev ? new Date(prev.created_at) : null;
      const nextDate = next ? new Date(next.created_at) : null;

      if (!prevDate || !sameDay(prevDate, date)) {
        out.push({ kind: "day", key: `day-${date.toDateString()}-${i}`, label: formatDayLabel(date) });
      }

      const isFirstInGroup =
        !prev || prev.sender_id !== m.sender_id || (prevDate && !sameDay(prevDate, date));
      // "Tail" = show timestamp & status: last in group OR gap > 5 min to next from same sender
      const sameSenderNext = next && next.sender_id === m.sender_id && nextDate && sameDay(nextDate, date);
      const gapBig = nextDate ? nextDate.getTime() - date.getTime() > 5 * 60 * 1000 : false;
      const showTail = !sameSenderNext || gapBig;

      out.push({ kind: "msg", key: m.id, msg: m, showTail, isFirstInGroup: Boolean(isFirstInGroup) });
    }
    return out;
  }, [messages]);

  const isEmpty = !messages.length;

  return (
    <div className="flex h-screen bg-background">
      <ChatList />
      <div className="flex h-screen flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl">
          <button onClick={() => navigate("/matches")} className="text-foreground" aria-label="Назад">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative">
            {partnerAvatar && (
              <img
                src={partnerAvatar}
                alt={partnerName}
                className="h-9 w-9 rounded-full object-cover"
              />
            )}
            {partnerOnline && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500"
                aria-label="В сети"
              />
            )}
          </div>
          <div className="flex flex-1 flex-col">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              {partnerName}
              {partnerVerified && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Верифицирован" />}
            </span>
            {partnerTyping ? (
              <span className="text-xs text-primary animate-pulse">печатает…</span>
            ) : partnerOnline ? (
              <span className="text-xs text-emerald-500">в сети</span>
            ) : (
              <span className="text-xs text-muted-foreground">не в сети</span>
            )}
          </div>
          {partnerId && (
            <ProfileActionsMenu
              targetUserId={partnerId}
              targetUserName={partnerName}
              onBlocked={() => navigate("/matches")}
              triggerClassName="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            />
          )}
        </header>

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="relative flex-1 overflow-y-auto px-4 py-4"
        >
          {isEmpty && (
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4 pt-10 text-center">
              {partnerAvatar && (
                <img
                  src={partnerAvatar}
                  alt={partnerName}
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-primary/10"
                />
              )}
              <div>
                <h2 className="text-lg font-semibold text-foreground">Вы совпали с {partnerName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Начните разговор — выберите подсказку или напишите своё
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendText(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {rows.map((row) => {
            if (row.kind === "day") {
              return (
                <div key={row.key} className="my-4 flex items-center justify-center">
                  <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                    {row.label}
                  </span>
                </div>
              );
            }
            const msg = row.msg;
            const isMine = msg.sender_id === user?.id;
            const isLastReadMine = isMine && msg.id === lastReadMyId;
            const time = formatTime(new Date(msg.created_at));
            const isDeleted = !!msg.deleted_at;
            const isEditing = editingId === msg.id;
            const msgReactions = reactionsByMessage[msg.id] || [];
            // Aggregate reactions by emoji
            const grouped = msgReactions.reduce<Record<string, { count: number; mine: boolean }>>(
              (acc, r) => {
                const e = (acc[r.emoji] ||= { count: 0, mine: false });
                e.count += 1;
                if (r.user_id === user?.id) e.mine = true;
                return acc;
              },
              {},
            );
            const canEdit = isMine && !isDeleted && msg.content_type === "text" && !msg._optimistic;
            const canDelete = isMine && !isDeleted && !msg._optimistic;
            const showActions = !isDeleted && !msg._optimistic && !isEditing;

            return (
              <div
                key={row.key}
                className={`group flex ${isMine ? "justify-end" : "justify-start"} ${
                  row.isFirstInGroup ? "mt-3" : "mt-0.5"
                }`}
              >
                <div className={`flex max-w-[75%] flex-col ${isMine ? "items-end" : "items-start"} gap-1`}>
                  <div className={`flex items-center gap-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    {isDeleted ? (
                      <div className="rounded-2xl bg-muted/60 px-4 py-2 text-sm italic text-muted-foreground">
                        Сообщение удалено
                      </div>
                    ) : isEditing ? (
                      <div className="flex w-full max-w-md flex-col gap-2 rounded-2xl border border-primary/40 bg-card p-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit();
                            }
                            if (e.key === "Escape") cancelEdit();
                          }}
                          rows={2}
                          className="resize-none text-sm"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                          >
                            Отмена
                          </button>
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="gradient-primary rounded-full px-3 py-1 text-xs text-primary-foreground"
                          >
                            Сохранить
                          </button>
                        </div>
                      </div>
                    ) : msg.content_type === "image" && msg.attachment_url ? (
                      <button
                        type="button"
                        onClick={() => signedUrls[msg.id] && setLightboxUrl(signedUrls[msg.id])}
                        className="overflow-hidden rounded-2xl transition-opacity hover:opacity-90"
                      >
                        <img
                          src={signedUrls[msg.id] || ""}
                          alt="Изображение"
                          className="max-h-72 rounded-2xl object-cover"
                          loading="lazy"
                        />
                      </button>
                    ) : msg.content_type === "gif" && msg.attachment_url ? (
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(msg.attachment_url!)}
                        className="overflow-hidden rounded-2xl transition-opacity hover:opacity-90"
                      >
                        <img
                          src={msg.attachment_url}
                          alt="GIF"
                          className="max-h-64 rounded-2xl object-cover"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <div
                        className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${
                          isMine
                            ? "gradient-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        } ${msg._optimistic ? "opacity-70" : ""} ${
                          msg._failed ? "ring-2 ring-destructive" : ""
                        }`}
                      >
                        {linkify(msg.content).map((part, i) =>
                          part.type === "link" ? (
                            <a
                              key={i}
                              href={part.value}
                              target="_blank"
                              rel="noreferrer noopener"
                              className={`underline underline-offset-2 ${
                                isMine ? "text-primary-foreground" : "text-primary"
                              }`}
                            >
                              {part.value}
                            </a>
                          ) : (
                            <span key={i}>{part.value}</span>
                          ),
                        )}
                      </div>
                    )}

                    {showActions && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="Действия с сообщением"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus:opacity-100 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align={isMine ? "end" : "start"}
                          className="w-auto p-2"
                          side="top"
                        >
                          <div className="flex items-center gap-1">
                            {QUICK_REACTIONS.map((e) => (
                              <button
                                key={e}
                                type="button"
                                onClick={() => toggleReaction(msg.id, e)}
                                className="rounded-full p-1.5 text-lg transition-transform hover:scale-125"
                                aria-label={`Реакция ${e}`}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                          {(canEdit || canDelete) && (
                            <div className="mt-1 flex flex-col border-t border-border pt-1">
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => startEdit(msg)}
                                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-muted"
                                >
                                  <Pencil className="h-4 w-4" /> Изменить
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingId(msg.id)}
                                  className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                                >
                                  <Trash2 className="h-4 w-4" /> Удалить
                                </button>
                              )}
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  {Object.keys(grouped).length > 0 && !isDeleted && (
                    <div className={`flex flex-wrap gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                      {Object.entries(grouped).map(([emoji, info]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                            info.mine
                              ? "border-primary/50 bg-primary/10 text-foreground"
                              : "border-border bg-card text-muted-foreground hover:bg-muted"
                          }`}
                          aria-label={`${emoji} ${info.count}`}
                        >
                          <span>{emoji}</span>
                          <span>{info.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {row.showTail && (
                    <div className="flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                      <span>{time}</span>
                      {msg.edited_at && !isDeleted && <span>· изменено</span>}
                      {isMine &&
                        (msg._failed ? (
                          <span className="text-destructive">не отправлено</span>
                        ) : msg._optimistic ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : msg.read_at || isLastReadMine ? (
                          <CheckCheck className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {partnerTyping && (
            <div className="mt-3 flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                <span className="inline-flex gap-1">
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />

          {showScrollDown && (
            <button
              type="button"
              onClick={scrollToBottom}
              aria-label="К новым сообщениям"
              className="sticky bottom-2 ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card hover:bg-muted"
              style={{ float: "right" }}
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Emoji picker */}
        {showEmoji && (
          <div className="border-t border-border bg-card">
            <EmojiPicker
              onEmojiClick={(e) => {
                setNewMessage((prev) => prev + e.emoji);
              }}
              theme={Theme.AUTO}
              emojiStyle={EmojiStyle.NATIVE}
              width="100%"
              height={320}
              searchPlaceholder="Найти эмодзи..."
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}

        {/* GIF picker */}
        {showGif && (
          <div className="flex max-h-80 flex-col border-t border-border bg-card">
            <div className="flex items-center gap-2 p-2">
              <Input
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                placeholder="Поиск GIF в Tenor..."
                className="flex-1"
              />
              <button
                onClick={() => setShowGif(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {gifLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {gifs.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => sendGif(g)}
                      className="overflow-hidden rounded-lg bg-muted transition-transform active:scale-95"
                    >
                      <img src={g.preview} alt="" className="h-24 w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <form
          onSubmit={sendMessage}
          className="flex items-end gap-2 border-t border-border bg-card px-3 py-2.5"
        >
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => {
              setShowEmoji((v) => !v);
              setShowGif(false);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Эмодзи"
          >
            <Smile className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label="Изображение"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowGif((v) => !v);
              setShowEmoji(false);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="GIF"
          >
            <Sparkles className="h-5 w-5" />
          </button>
          <Textarea
            ref={textareaRef}
            value={newMessage}
            rows={1}
            onChange={(e) => {
              setNewMessage(e.target.value);
              broadcastTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение… (Enter — отправить, Shift+Enter — новая строка)"
            className="min-h-[40px] flex-1 resize-none py-2"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            aria-label="Отправить"
            className="gradient-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
};

export default Chat;
