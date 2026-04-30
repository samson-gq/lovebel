import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import ProfileActionsMenu from "@/components/ProfileActionsMenu";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId || !user) return;

    // Fetch match partner info
    const fetchPartner = async () => {
      const { data: match } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

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

    // Fetch messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      setMessages(data || []);
    };

    fetchPartner();
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !matchId) return;

    await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    setNewMessage("");
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-xl">
        <button onClick={() => navigate("/matches")} className="text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {partnerAvatar && (
          <img
            src={partnerAvatar}
            alt={partnerName}
            className="h-9 w-9 rounded-full object-cover"
          />
        )}
        <span className="font-semibold text-foreground">{partnerName}</span>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Напишите первое сообщение! 👋
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={`mb-3 flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMine
                    ? "gradient-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="flex items-center gap-2 border-t border-border bg-card px-4 py-3"
      >
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
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
  );
};

export default Chat;
