import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { track } from "@/lib/analytics";

const VOICE_PROMPT_OPTIONS = [
  "Расскажу о себе за 30 секунд",
  "Мой идеальный выходной",
  "Что заставит меня улыбнуться",
  "Первое, что я скажу на свидании",
  "Мой самый неожиданный талант",
];

const MAX_SEC = 30;

interface VoiceRow {
  id: string;
  prompt: string;
  audio_url: string;
  duration_sec: number;
}

interface Props {
  userId: string;
  editing: boolean;
}

const VoicePrompt = ({ userId, editing }: Props) => {
  const [row, setRow] = useState<VoiceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<string>(VOICE_PROMPT_OPTIONS[0]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const signedUrl = useSignedUrl(row?.audio_url ?? null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profile_voice_prompts" as any)
        .select("id, prompt, audio_url, duration_sec")
        .eq("user_id", userId)
        .maybeSingle();
      if (active) {
        setRow((data as unknown as VoiceRow) || null);
        if (data) setPrompt((data as unknown as VoiceRow).prompt);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, [userId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        await uploadRecording(blob, Math.min(MAX_SEC, elapsed));
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      setElapsed(0);
      const started = Date.now();
      timerRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - started) / 1000);
        setElapsed(sec);
        if (sec >= MAX_SEC) stopRecording();
      }, 200);
    } catch (e) {
      console.error(e);
      toast.error("Нет доступа к микрофону");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setRecording(false);
  };

  const uploadRecording = async (blob: Blob, durationSec: number) => {
    if (durationSec < 1) {
      toast.error("Слишком короткая запись");
      return;
    }
    setUploading(true);
    try {
      const ext = blob.type.includes("webm") ? "webm" : "wav";
      const path = `${userId}/voice-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("voice-prompts")
        .upload(path, blob, { contentType: blob.type, upsert: true });
      if (upErr) throw upErr;

      // Delete previous storage file
      if (row?.audio_url) {
        const m = row.audio_url.match(/voice-prompts\/(.+)$/);
        if (m) await supabase.storage.from("voice-prompts").remove([m[1]]);
      }

      const storedUrl = `voice-prompts/${path}`;
      const payload = {
        user_id: userId,
        prompt,
        audio_url: storedUrl,
        duration_sec: durationSec,
      };
      const { data, error } = await supabase
        .from("profile_voice_prompts" as any)
        .upsert(payload, { onConflict: "user_id" })
        .select("id, prompt, audio_url, duration_sec")
        .single();
      if (error) throw error;
      setRow(data as unknown as VoiceRow);
      track("voice_recorded", { duration_sec: durationSec });
      toast.success("Голосовое приветствие сохранено");
    } catch (e) {
      console.error(e);
      toast.error("Не удалось сохранить запись");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!row) return;
    const { error } = await supabase
      .from("profile_voice_prompts" as any)
      .delete()
      .eq("id", row.id);
    if (error) {
      toast.error("Не удалось удалить");
      return;
    }
    const m = row.audio_url.match(/voice-prompts\/(.+)$/);
    if (m) await supabase.storage.from("voice-prompts").remove([m[1]]);
    setRow(null);
    toast.success("Удалено");
  };

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-2 flex items-center gap-2">
        <Mic className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Голосовое приветствие</h4>
      </div>

      {row ? (
        <div>
          <p className="text-sm font-medium text-primary">{row.prompt}</p>
          <div className="mt-2 flex items-center gap-2">
            {signedUrl ? (
              <audio controls src={signedUrl} className="h-10 flex-1" preload="metadata" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">{row.duration_sec}с</span>
          </div>
          {editing && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash2 className="mr-1 h-3 w-3" /> Удалить
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={startRecording}
                disabled={recording || uploading}
              >
                <Mic className="mr-1 h-3 w-3" /> Перезаписать
              </Button>
            </div>
          )}
        </div>
      ) : editing ? (
        <div className="space-y-3">
          <Select value={prompt} onValueChange={setPrompt} disabled={recording}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICE_PROMPT_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {recording ? (
            <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-3">
              <span className="flex h-3 w-3 shrink-0 animate-pulse rounded-full bg-red-500" />
              <span className="flex-1 font-mono text-sm">
                {elapsed}с / {MAX_SEC}с
              </span>
              <Button size="sm" onClick={stopRecording} variant="destructive">
                <Square className="mr-1 h-3 w-3" /> Стоп
              </Button>
            </div>
          ) : (
            <Button
              onClick={startRecording}
              disabled={uploading}
              className="gradient-primary w-full text-primary-foreground"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка…
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" /> Записать (до {MAX_SEC}с)
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Голосовое приветствие не записано. Нажмите «Редактировать», чтобы записать.
        </p>
      )}
    </div>
  );
};

export default VoicePrompt;
