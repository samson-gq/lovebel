import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, BadgeCheck, Smile, ImagePlus, Sparkles, Check, CheckCheck, X, Loader2 } from "lucide-react";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import ProfileActionsMenu from "@/components/ProfileActionsMenu";
import ChatList from "@/components/ChatList";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  content_type?: "text" | "image" | "gif" | "sticker";
  attachment_url?: string | null;
  read_at?: string | null;
}

interface TenorGif {
  id: string;
  preview: string;
  url: string;
}

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
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimerRef = useRef<number | null>(null);

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
      setMessages((data as Message[]) || []);
    };

    fetchPartner();
    fetchMessages();

    const channel = supabase
      .channel(`chat:${matchId}`, { config: { presence: { key: user.id } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
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
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, [matchId, user]);

  // Mark partner messages as read
  useEffect(() => {
    if (!user || !matchId) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.read_at).map((m) => m.id);
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  const broadcastTyping = useCallback(() => {
    if (!user || !channelRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
  }, [user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !matchId) return;
    const text = newMessage.trim();
    setNewMessage("");
    const { error } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: user.id,
      content: text,
      content_type: "text",
    });
    if (error) toast.error("Не удалось отправить");
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
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const r = await fetch(
        `https://${projectId}.supabase.co/functions/v1/tenor-search?q=${encodeURIComponent(q)}&limit=24`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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

  const myMessages = messages.filter((m) => m.sender_id === user?.id);
  const lastReadMyId = [...myMessages].reverse().find((m) => !!m.read_at)?.id;

  return (
    <div className="flex h-screen bg-background">
      <ChatList />
      <div className="flex h-screen flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/matches")} className="text-foreground" aria-label="Назад">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {partnerAvatar && (
          <img src={partnerAvatar} alt={partnerName} className="h-9 w-9 rounded-full object-cover" />
        )}
        <div className="flex flex-1 flex-col">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            {partnerName}
            {partnerVerified && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Верифицирован" />}
          </span>
          {partnerTyping && (
            <span className="text-xs text-primary animate-pulse">печатает…</span>
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

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Напишите первое сообщение! 👋</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          const isLastReadMine = isMine && msg.id === lastReadMyId;
          return (
            <div key={msg.id} className={`mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className="flex max-w-[75%] flex-col items-end gap-1">
                {msg.content_type === "image" && msg.attachment_url ? (
                  <img
                    src={signedUrls[msg.id] || ""}
                    alt="Изображение"
                    className="max-h-72 rounded-2xl object-cover"
                    loading="lazy"
                  />
                ) : msg.content_type === "gif" && msg.attachment_url ? (
                  <img
                    src={msg.attachment_url}
                    alt="GIF"
                    className="max-h-64 rounded-2xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm ${
                      isMine ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                )}
                {isMine && (
                  <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    {msg.read_at || isLastReadMine ? (
                      <CheckCheck className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {partnerTyping && (
          <div className="mb-3 flex justify-start">
            <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/60" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
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
        className="flex items-center gap-2 border-t border-border bg-card px-3 py-2.5"
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
        <Input
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            broadcastTyping();
          }}
          placeholder="Сообщение..."
          className="flex-1"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="gradient-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      </div>
    </div>
  );
};

export default Chat;
