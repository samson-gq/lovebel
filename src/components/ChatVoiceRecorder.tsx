import { useEffect, useRef, useState } from "react";
import { Mic, Send, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAX_SEC = 60;

interface Props {
  disabled?: boolean;
  uploading?: boolean;
  onRecorded: (blob: Blob, durationSec: number) => void | Promise<void>;
  /** Called when recording starts/stops so the parent can hide the text input. */
  onStateChange?: (recording: boolean) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

/** Hold-free voice recorder: tap mic to start, then send or discard. */
const ChatVoiceRecorder = ({ disabled, uploading, onRecorded, onStateChange }: Props) => {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const discardRef = useRef(false);
  const elapsedRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => onStateChange?.(recording), [recording, onStateChange]);

  const cleanup = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    setLevel(0);
  };

  useEffect(() => cleanup, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      discardRef.current = false;
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const dur = elapsedRef.current;
        cleanup();
        setRecording(false);
        setElapsed(0);
        if (discardRef.current) return;
        if (dur < 1) {
          toast.info("Слишком короткая запись");
          return;
        }
        onRecorded(blob, Math.min(MAX_SEC, dur));
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
      setElapsed(0);
      elapsedRef.current = 0;

      const started = Date.now();
      timerRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - started) / 1000);
        elapsedRef.current = sec;
        setElapsed(sec);
        if (sec >= MAX_SEC) stop();
      }, 200);

      // Simple live level meter
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += (v - 128) ** 2;
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) / 40));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      toast.error("Нет доступа к микрофону");
    }
  };

  const stop = () => {
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    else {
      cleanup();
      setRecording(false);
    }
  };

  const discard = () => {
    discardRef.current = true;
    stop();
  };

  if (!recording) {
    return (
      <button
        type="button"
        onClick={start}
        disabled={disabled || uploading}
        aria-label="Записать голосовое сообщение"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-50"
      >
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
      </button>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-2 rounded-full border border-primary/40 bg-background px-3 py-1.5">
      <button
        type="button"
        onClick={discard}
        aria-label="Отменить запись"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-destructive hover:bg-muted"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" />
      <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">{fmt(elapsed)}</span>
      <div className="flex flex-1 items-center gap-0.5 overflow-hidden" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-primary/70 transition-[height] duration-100"
            style={{ height: `${4 + level * 20 * (0.5 + Math.abs(Math.sin(i + elapsed)) / 2)}px` }}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={stop}
        aria-label="Отправить голосовое сообщение"
        className="gradient-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-foreground"
      >
        <Send className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default ChatVoiceRecorder;
