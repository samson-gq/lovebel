import { useEffect, useRef, useState } from "react";
import { Play, Pause, Mic } from "lucide-react";

interface Props {
  /** Ready-to-play signed URL, or null while it is being fetched. */
  src: string | null;
  durationSec?: number | null;
  isMine: boolean;
}

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/** Voice note bubble with play/pause and a progress bar. */
const VoiceMessageBubble = ({ src, durationSec, isMine }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(durationSec ?? 0);

  useEffect(() => {
    if (durationSec) setTotal(durationSec);
  }, [durationSec]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !src) return;
    if (playing) el.pause();
    else el.play().catch(() => {});
  };

  const progress = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const accent = isMine ? "bg-primary-foreground" : "bg-primary";
  const track = isMine ? "bg-primary-foreground/30" : "bg-foreground/20";

  return (
    <div
      className={`flex w-56 items-center gap-3 rounded-2xl px-3 py-2.5 ${
        isMine ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? "Пауза" : "Воспроизвести голосовое сообщение"}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isMine ? "bg-primary-foreground/25" : "bg-background"
        } disabled:opacity-50`}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`h-1.5 w-full overflow-hidden rounded-full ${track}`}>
          <div className={`h-full rounded-full ${accent}`} style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] opacity-80">
          <Mic className="h-3 w-3" />
          <span className="font-mono">{fmt(playing || current > 0 ? current : total)}</span>
        </div>
      </div>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrent(0);
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setTotal(d);
          }}
        />
      )}
    </div>
  );
};

export default VoiceMessageBubble;
