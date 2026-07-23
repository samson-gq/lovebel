import { useRef, useState } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { track } from "@/lib/analytics";

interface Props {
  audioUrl: string;
  prompt: string;
  durationSec: number;
  profileId?: string;
}

const VoicePromptPlayer = ({ audioUrl, prompt, durationSec, profileId }: Props) => {
  const signed = useSignedUrl(audioUrl);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!signed) return;
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
      track("voice_played", { profile_id: profileId });
    }
  };

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl bg-primary-foreground/15 p-2.5 backdrop-blur-sm">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/30 text-primary-foreground transition-colors hover:bg-primary-foreground/40"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-[11px] font-semibold text-secondary">
          <Mic className="h-3 w-3" /> {prompt}
        </p>
        <p className="text-xs text-primary-foreground/80">Голосовое · {durationSec}с</p>
      </div>
      {signed && (
        <audio
          ref={audioRef}
          src={signed}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      )}
    </div>
  );
};

export default VoicePromptPlayer;
