const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "google/gemini-3.6-flash";

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

    const body = await req.json();
    const mode: string = body.mode === "icebreakers" ? "icebreakers" : "bio";

    let system: string;
    let userPrompt: string;

    if (mode === "icebreakers") {
      const { partnerName = "", partnerBio = "", partnerInterests = [], myInterests = [] } = body;
      const shared = (Array.isArray(myInterests) ? myInterests : []).filter((i: string) =>
        (Array.isArray(partnerInterests) ? partnerInterests : []).includes(i),
      );
      system =
        "Ты помогаешь придумать первое сообщение в дейтинг-приложении на русском языке. " +
        "Правила: 1 предложение, до 140 символов, обращение на «ты», без пикап-клише и комплиментов внешности, " +
        "обязательно вопрос или зацепка из анкеты собеседника. " +
        "Верни ТОЛЬКО JSON-массив из 3 строк, без пояснений и markdown.";
      userPrompt = [
        partnerName && `Имя собеседника: ${partnerName}`,
        partnerBio && `О себе: ${partnerBio}`,
        Array.isArray(partnerInterests) && partnerInterests.length &&
          `Интересы собеседника: ${partnerInterests.join(", ")}`,
        shared.length && `Общие интересы: ${shared.join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n") || "Данных мало — придумай лёгкие универсальные вопросы.";
    } else {
      const {
        name = "",
        age = null,
        city = "",
        occupation = "",
        education = "",
        interests = [],
        currentBio = "",
        tone = "friendly",
      } = body;

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

      system =
        "Ты помогаешь писать описания «О себе» для дейтинг-приложения на русском языке. " +
        "Правила: от первого лица, 200-320 символов, без клише («люблю путешествия и уют»), " +
        "без эмодзи-спама (максимум 1-2), обязательно один конкретный крючок для начала разговора. " +
        "Верни ТОЛЬКО JSON-массив из 3 строк, без пояснений и markdown.";
      userPrompt = `Тон: ${toneMap[tone] ?? toneMap.friendly}\n\nАнкета:\n${
        facts || "Данных мало — придумай универсальный вариант."
      }`;
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
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
        .filter((l) => l.length > (mode === "icebreakers" ? 10 : 30));
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
