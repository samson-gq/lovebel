import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight self-hosted analytics client. Events are best-effort — a failed
 * insert is logged but never surfaces as a UI error. All events go to the
 * `analytics_events` table in Lovable Cloud with RLS that permits inserts only
 * for the current user (or NULL for anonymous). Reads are service_role only.
 *
 * Usage:
 *   track("swipe_right", { profile_id, match_score })
 *   trackPageview()
 */

const SESSION_KEY = "lovebel.analytics.sid";

const getSessionId = (): string => {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "unknown";
  }
};

export const track = async (
  eventType: string,
  properties: Record<string, unknown> = {}
): Promise<void> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id ?? null;

    await supabase.from("analytics_events" as any).insert({
      user_id: uid,
      session_id: getSessionId(),
      event_type: eventType,
      properties: properties as any,
      url: typeof window !== "undefined" ? window.location.pathname + window.location.search : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (e) {
    // Analytics must never break UX — swallow errors.
    if (import.meta.env.DEV) console.debug("[analytics] failed", eventType, e);
  }
};

export const trackPageview = () => {
  track("pageview");
};
