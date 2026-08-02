const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    // Require an authenticated caller — the function is user-facing.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      name = "",
      age = null,
      city = "",
      occupation = "",
      education = "",
      interests = [],
      currentBio = "",
      tone = "friendly",
    } = await req.json();

    const toneMap: Record<string, string> = {
      friendly: "тёплый, дружелюбный",
      witty: "с юмором и лёгкой иронией",
      serious: "спокойный, серьёзный, для тех, кто ищет долгие отношения",
      adventurous: "энергичный, про приключения и активность",
    };

    const facts = [
      name && `Имя: ${name}`,
      age && `Возраст: ${age}`,
      city && `Город: ${city}`,
      occupation && `Работа: ${occupation}`,
      education && `Образование: ${education}`,
      Array.isArray(interests) && interests.length && `Интересы: ${interests.join(", ")}`,
      currentBio && `Текущее описание: ${currentBio}`,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Ты помогаешь писать описания «О себе» для дейтинг-приложения на русском языке. " +
              "Правила: от первого лица, 200-320 символов, без клише («люблю путешествия и уют»), " +
              "без эмодзи-спама (максимум 1-2), обязательно один конкретный крючок для начала разговора. " +
              "Верни ТОЛЬКО JSON-массив из 3 строк, без пояснений и markdown.",
          },
          {
            role: "user",
            content: `Тон: ${toneMap[tone] ?? toneMap.friendly}\n\nАнкета:\n${facts || "Данных мало — придумай универсальный вариант."}`,
          },
        ],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Слишком много запросов, попробуйте позже" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "Закончились кредиты AI" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) throw new Error(`AI gateway error: ${res.status} ${await res.text()}`);

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    let variants: string[] = [];
    try {
      const jsonText = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) variants = parsed.filter((v) => typeof v === "string");
    } catch {
      variants = raw
        .split("\n")
        .map((l) => l.replace(/^\s*[-*\d.)]+\s*/, "").trim())
        .filter((l) => l.length > 30);
    }

    return new Response(JSON.stringify({ variants: variants.slice(0, 3) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-profile-assistant error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
