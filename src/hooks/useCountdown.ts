import { useEffect, useState } from "react";

/**
 * Returns milliseconds remaining until `target`. Ticks every second.
 * Returns 0 when expired or when `target` is null.
 */
export function useCountdown(target: string | null): number {
  const compute = () => (target ? Math.max(0, new Date(target).getTime() - Date.now()) : 0);
  const [ms, setMs] = useState(compute);

  useEffect(() => {
    setMs(compute());
    if (!target) return;
    const id = window.setInterval(() => setMs(compute()), 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return ms;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0с";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${sec}с`;
  return `${sec}с`;
}

export function formatCountdownLong(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}
