// Photo moderation via Lovable AI Gateway (Gemini Vision)
// Returns approved/rejected with reason. Updates profile_photos and logs to photo_moderation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Ты — модератор фотографий для дейтинг-приложения. 
Оцени, подходит ли фото для публикации.

Отклонять (rejected):
- Откровенная нагота, эротика, порнография
- Сексуальные сцены или жесты
- Насилие, оружие, кровь
- Наркотики
- Изображения детей одних (без взрослых)
- Ненавистнические символы (нацизм и т.п.)
- Скриншоты переписок, мемы без человека
- Фото явно не человека (логотипы, скриншоты, чёрный экран)
- Очевидно фейк / стоковое фото знаменитости

Одобрять (approved):
- Обычные селфи и портреты
- Фото на природе, в путешествии, с друзьями
- Спортивные фото (даже в купальнике, если не эротично)
- Фото с домашними животными
- Бытовые сцены

Верни строго JSON:
{ "decision": "approved" | "rejected", "reason": "краткое объяснение на русском" }`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { photo_id, photo_url } = body ?? {};
    if (!photo_id || !photo_url || typeof photo_url !== "string") {
      return new Response(JSON.stringify({ error: "photo_id and photo_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: photo } = await supabase
      .from("profile_photos")
      .select("id, user_id, photo_url")
      .eq("id", photo_id)
      .single();

    if (!photo || photo.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Photo not found or not yours" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI Gateway (vision)
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Оцени это фото для публикации в дейтинге." },
              { type: "image_url", image_url: { url: photo_url } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Слишком много запросов, попробуйте позже" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Недостаточно кредитов AI" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content ?? "{}";
    let parsed: { decision?: string; reason?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { decision: "approved", reason: "AI ответ не распознан, авто-одобрено" };
    }

    const decision = parsed.decision === "rejected" ? "rejected" : "approved";
    const reason = parsed.reason ?? null;

    // Update photo status (service role bypasses RLS)
    await supabase
      .from("profile_photos")
      .update({ moderation_status: decision, moderation_reason: reason })
      .eq("id", photo_id);

    // If rejected — delete the photo to keep things clean
    if (decision === "rejected") {
      await supabase.from("profile_photos").delete().eq("id", photo_id);
    }

    // Audit log
    await supabase.from("photo_moderation").insert({
      photo_id,
      user_id: user.id,
      photo_url,
      status: decision,
      reason,
      ai_response: aiData,
    });

    return new Response(
      JSON.stringify({ decision, reason }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("moderate-photo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
