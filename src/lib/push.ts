import { supabase } from "@/integrations/supabase/client";

export const VAPID_PUBLIC_KEY =
  "BL9aKTAmceLlZAYqHBxgxGBCWfNSZwWpJMtlhIGj7Ultrc3tSk5-qP0rdl1gVouNkqSNuHCJPk3lWgrMEhnSlLo";

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
};

export const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const isPreviewHost = () =>
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

export const canEnablePush = () =>
  isPushSupported() && !isInIframe() && !isPreviewHost();

export const getPushPermission = (): NotificationPermission =>
  isPushSupported() ? Notification.permission : "denied";

export const enablePush = async (userId: string): Promise<boolean> => {
  if (!canEnablePush()) return false;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return false;

  const reg = await navigator.serviceWorker.register("/push-sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("Save subscription failed", error);
    return false;
  }
  return true;
};

export const disablePush = async (): Promise<void> => {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
};
