// Selfie verification with gesture challenge.
// Two modes:
//   - action=challenge → returns a random gesture for the user to perform
//   - action=verify → checks selfie matches gesture AND face matches avatar
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GESTURES = [
  { id: "hand_to_ear", text: "приложите правую руку к правому уху" },
  { id: "thumb_up", text: "покажите большой палец вверх" },
  { id: "peace_sign", text: "покажите знак «мир» (V) двумя пальцами" },
  { id: "ok_sign", text: "покажите знак OK (большой и указательный сложены в кольцо)" },
  { id: "open_palm", text: "поднимите открытую ладонь рядом с лицом" },
  { id: "fist", text: "поднимите кулак рядом с лицом" },
  { id: "three_fingers", text: "покажите три пальца вверх" },
];

const VERIFY_PROMPT = (gesture: string) => `Ты — система верификации личности для дейтинг-приложения.
Проверь СТРОГО три условия по селфи:
1. На фото живой человек (не фото с экрана, не картинка)
2. Человек выполняет жест: "${gesture}"
3. Это то же самое лицо, что и на референсном фото профиля

Верни строго JSON:
{
  "is_real_person": true/false,
  "gesture_matches": true/false,
  "face_matches": true/false,
  "confidence": 0.0-1.0,
  "reason": "краткое объяснение на русском"
}

Все три условия должны быть true для одобрения.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body ?? {};

    // ---- CHALLENGE: return random gesture ----
    if (action === "challenge") {
      const g = GESTURES[Math.floor(Math.random() * GESTURES.length)];
      return new Response(
        JSON.stringify({ gesture_id: g.id, gesture_text: g.text }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- VERIFY ----
    if (action === "verify") {
      const { selfie_url, gesture_id, gesture_text } = body;
      if (!selfie_url || !gesture_id || !gesture_text) {
        return new Response(JSON.stringify({ error: "selfie_url, gesture_id and gesture_text required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get reference avatar
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .single();

      if (!profile?.avatar_url) {
        return new Response(JSON.stringify({ error: "Сначала загрузите аватар в профиль" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Sign URL for private bucket
      const path = selfie_url.includes("/verification-selfies/")
        ? selfie_url.split("/verification-selfies/")[1]
        : selfie_url;
      const { data: signed } = await supabase.storage
        .from("verification-selfies")
        .createSignedUrl(path, 300);
      const selfieAccessibleUrl = signed?.signedUrl ?? selfie_url;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: VERIFY_PROMPT(gesture_text) },
            {
              role: "user",
              content: [
                { type: "text", text: "Селфи (новое):" },
                { type: "image_url", image_url: { url: selfieAccessibleUrl } },
                { type: "text", text: "Референсное фото профиля:" },
                { type: "image_url", image_url: { url: profile.avatar_url } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error("AI gateway error", aiResp.status, errText);
        const status = aiResp.status === 429 ? 429 : aiResp.status === 402 ? 402 : 500;
        const message = status === 429 ? "Слишком много запросов" : status === 402 ? "Недостаточно AI кредитов" : "AI gateway error";
        return new Response(JSON.stringify({ error: message }), {
          status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResp.json();
      const content = aiData.choices?.[0]?.message?.content ?? "{}";
      let parsed: any = {};
      try { parsed = JSON.parse(content); } catch { /* ignore */ }

      const passed = parsed.is_real_person && parsed.gesture_matches && parsed.face_matches;
      const status = passed ? "approved" : "rejected";
      const reason = parsed.reason ?? "Не удалось распознать";

      // Log attempt
      await supabase.from("selfie_verifications").insert({
        user_id: user.id,
        selfie_url,
        challenge_gesture: gesture_text,
        status,
        reason,
        ai_response: aiData,
      });

      // Mark profile verified if passed
      if (passed) {
        await supabase
          .from("profiles")
          .update({ is_verified: true, verified_at: new Date().toISOString() })
          .eq("user_id", user.id);
      }

      return new Response(
        JSON.stringify({ status, reason, details: parsed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-selfie error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
