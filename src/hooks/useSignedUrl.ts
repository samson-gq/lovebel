import { useEffect, useState } from "react";
import { toSignedUrl } from "@/lib/signedUrl";

// Hook: given a stored URL, returns a fresh signed URL (or the original if not a storage URL).
// Useful for <img src> and <video src> when the bucket is private.
export function useSignedUrl(url: string | null | undefined, fallback: string | null = null): string | null {
  const [signed, setSigned] = useState<string | null>(fallback);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setSigned(fallback);
      return () => { cancelled = true; };
    }
    toSignedUrl(url).then((s) => {
      if (!cancelled) setSigned(s ?? fallback);
    });
    return () => { cancelled = true; };
  }, [url, fallback]);

  return signed;
}
