import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").slice(0, 100);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "24", 10) || 24, 50);
    const apiKey = Deno.env.get("TENOR_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "TENOR_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = q
      ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${apiKey}&client_key=lovebel&limit=${limit}&media_filter=tinygif,gif&contentfilter=high`
      : `https://tenor.googleapis.com/v2/featured?key=${apiKey}&client_key=lovebel&limit=${limit}&media_filter=tinygif,gif&contentfilter=high`;

    const r = await fetch(endpoint);
    if (!r.ok) {
      const text = await r.text();
      return new Response(JSON.stringify({ error: "Tenor error", details: text }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const results = (data.results ?? []).map((it: { id: string; media_formats?: Record<string, { url: string; dims?: number[] }> }) => ({
      id: it.id,
      preview: it.media_formats?.tinygif?.url ?? "",
      url: it.media_formats?.gif?.url ?? it.media_formats?.tinygif?.url ?? "",
    })).filter((g: { url: string }) => g.url);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
