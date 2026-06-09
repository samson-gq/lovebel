import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Require an authenticated caller so the Tenor quota can't be drained by
    // anyone who finds the anon key + project URL.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
