// Reactivation push worker.
// Finds users who haven't been seen in >=7 days and haven't received a
// reactivation push in the last 7 days, and sends them a friendly nudge.
// Intended to run on a schedule (daily). Safe to call ad-hoc — throttled by
// `public.reactivation_log`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "@supabase/supabase-js/cors";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC = "BL9aKTAmceLlZAYqHBxgxGBCWfNSZwWpJMtlhIGj7Ultrc3tSk5-qP0rdl1gVouNkqSNuHCJPk3lWgrMEhnSlLo";

const MESSAGES = [
  { title: "Скучаем 💛", body: "Тебя ждут новые анкеты — загляни на минутку." },
  { title: "У тебя новые люди рядом 👀", body: "Свайпни пару анкет — вдруг совпадение уже здесь." },
  { title: "Кто-то мог лайкнуть тебя ❤️", body: "Проверь, кто заглянул в твой профиль." },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!privateKey) {
      return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@lovebel.app",
      VAPID_PUBLIC,
      privateKey,
    );

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Optional overrides from POST body
    let inactiveDays = 7;
    let throttleDays = 7;
    let dryRun = false;
    if (req.method !== "GET") {
      try {
        const body = await req.json();
        if (typeof body?.inactive_days === "number") inactiveDays = body.inactive_days;
        if (typeof body?.throttle_days === "number") throttleDays = body.throttle_days;
        if (body?.dry_run === true) dryRun = true;
      } catch { /* no body */ }
    }

    const inactiveSince = new Date(Date.now() - inactiveDays * 86400_000).toISOString();
    const throttleSince = new Date(Date.now() - throttleDays * 86400_000).toISOString();

    const { data: candidates, error: candErr } = await admin
      .from("profiles")
      .select("id, name, last_seen_at")
      .lt("last_seen_at", inactiveSince)
      .limit(500);
    if (candErr) throw candErr;

    // Filter out users pushed recently
    const { data: recent } = await admin
      .from("reactivation_log")
      .select("user_id")
      .gt("sent_at", throttleSince);
    const skip = new Set((recent ?? []).map((r: { user_id: string }) => r.user_id));
    const targets = (candidates ?? []).filter((c) => !skip.has(c.id));

    let sent = 0;
    let noSubs = 0;
    const staleIds: string[] = [];
    const logInserts: Array<{ user_id: string; kind: string }> = [];

    for (const p of targets) {
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", p.id);
      if (!subs || subs.length === 0) { noSubs++; continue; }

      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      const payload = JSON.stringify({
        title: msg.title,
        body: msg.body,
        url: "/",
        tag: "reactivation",
      });

      let delivered = false;
      if (!dryRun) {
        for (const s of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload,
            );
            delivered = true;
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) staleIds.push(s.id);
            else console.error("push fail", status, err);
          }
        }
      } else {
        delivered = true;
      }
      if (delivered) {
        sent++;
        logInserts.push({ user_id: p.id, kind: "inactive_" + inactiveDays + "d" });
      }
    }

    if (!dryRun && staleIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", staleIds);
    }
    if (!dryRun && logInserts.length > 0) {
      await admin.from("reactivation_log").insert(logInserts);
    }

    return new Response(
      JSON.stringify({
        candidates: targets.length,
        sent,
        no_subscriptions: noSubs,
        stale_removed: staleIds.length,
        dry_run: dryRun,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
