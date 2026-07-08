import { supabase } from "@/integrations/supabase/client";

// Extract { bucket, path } from any Supabase Storage URL
// (public "…/object/public/<bucket>/<path>" or signed "…/object/sign/<bucket>/<path>?token=…").
export function parseStorageUrl(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

type CacheEntry = { url: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

const TTL_SECONDS = 60 * 60; // 1h
const REFRESH_BEFORE_MS = 5 * 60 * 1000;

export async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const key = `${bucket}::${path}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt - now > REFRESH_BEFORE_MS) return hit.url;
  const pending = inflight.get(key);
  if (pending) return pending;
  const p = (async () => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, TTL_SECONDS);
    if (error || !data?.signedUrl) return null;
    cache.set(key, { url: data.signedUrl, expiresAt: now + TTL_SECONDS * 1000 });
    return data.signedUrl;
  })();
  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}

// Convert any stored storage URL (public or signed) into a fresh signed URL.
// Returns the original string if it isn't a Supabase Storage URL (e.g. "/placeholder.svg" or an external URL).
export async function toSignedUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const parsed = parseStorageUrl(url);
  if (!parsed) return url;
  return getSignedUrl(parsed.bucket, parsed.path);
}
