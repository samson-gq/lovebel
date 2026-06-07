// Account management: GDPR export + full account deletion
// action=export → returns full JSON of user's data
// action=delete → wipes user's data and deletes auth user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Recursively list all files under a storage prefix and return full paths.
async function listAllFiles(admin: any, bucket: string, prefix = ""): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [prefix];
  while (stack.length) {
    const cur = stack.pop()!;
    let offset = 0;
    // paginate inside this folder
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(cur, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error || !data || data.length === 0) break;
      for (const item of data) {
        const full = cur ? `${cur}/${item.name}` : item.name;
        // Folders in Supabase Storage have null id and no metadata.
        if (item.id === null || !item.metadata) {
          stack.push(full);
        } else {
          out.push(full);
        }
      }
      if (data.length < 100) break;
      offset += data.length;
    }
  }
  return out;
}

async function wipeBucket(admin: any, bucket: string, prefix: string) {
  try {
    const files = await listAllFiles(admin, bucket, prefix);
    if (files.length) {
      // Remove in chunks of 100 to stay friendly to the API.
      for (let i = 0; i < files.length; i += 100) {
        await admin.storage.from(bucket).remove(files.slice(i, i + 100));
      }
    }
  } catch (err) {
    console.error(`Storage cleanup error for ${bucket}/${prefix}:`, err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
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
    const action = body?.action;

    if (action === "export") {
      const [
        profileRes, photosRes, videosRes, swipesRes, matchesRes,
        blocksRes, reportsRes, verifsRes, promptsRes,
      ] = await Promise.all([
        admin.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        admin.from("profile_photos").select("*").eq("user_id", user.id),
        admin.from("profile_videos").select("*").eq("user_id", user.id),
        admin.from("swipes").select("*").eq("swiper_id", user.id),
        admin.from("matches").select("*").or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        admin.from("blocks").select("*").eq("blocker_id", user.id),
        admin.from("reports").select("*").eq("reporter_id", user.id),
        admin.from("selfie_verifications").select("id,challenge_gesture,status,reason,created_at").eq("user_id", user.id),
        admin.from("profile_prompts").select("*").eq("user_id", user.id),
      ]);

      const matchIds = (matchesRes.data ?? []).map((m: any) => m.id);
      const messagesRes = matchIds.length
        ? await admin.from("messages").select("*").in("match_id", matchIds)
        : { data: [] };

      const exportData = {
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          provider: user.app_metadata?.provider,
        },
        profile: profileRes.data ?? null,
        photos: photosRes.data ?? [],
        videos: videosRes.data ?? [],
        prompts: promptsRes.data ?? [],
        swipes: swipesRes.data ?? [],
        matches: matchesRes.data ?? [],
        messages: messagesRes.data ?? [],
        blocks: blocksRes.data ?? [],
        reports_filed: reportsRes.data ?? [],
        verifications: verifsRes.data ?? [],
      };

      return new Response(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="lovebel-export-${user.id}.json"`,
        },
      });
    }

    if (action === "delete") {
      const { reason } = body ?? {};

      await admin.from("account_deletions").insert({
        user_id: user.id,
        email: user.email,
        reason: reason ?? null,
      });

      // 1. Collect match ids first so we can wipe all messages in those threads.
      const { data: userMatches } = await admin
        .from("matches")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      const matchIds = (userMatches ?? []).map((m: any) => m.id);

      // 2. Storage: recursively wipe everything under the user's prefix
      //    across every bucket that may hold their personal data.
      await Promise.all([
        wipeBucket(admin, "avatars", user.id),
        wipeBucket(admin, "verification-selfies", user.id),
        wipeBucket(admin, "profile-videos", user.id),
        wipeBucket(admin, "chat-images", user.id),
      ]);

      // 3. DB rows. Order matters for FKs.
      if (matchIds.length) {
        // Remove every message in the user's matches (their own + partner's).
        await admin.from("messages").delete().in("match_id", matchIds);
      }
      // Belt-and-suspenders: any orphan messages authored by the user.
      await admin.from("messages").delete().eq("sender_id", user.id);
      await admin.from("matches").delete().or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      await admin.from("swipes").delete().or(`swiper_id.eq.${user.id},swiped_id.eq.${user.id}`);
      await admin.from("blocks").delete().or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      await admin.from("reports").delete().or(`reporter_id.eq.${user.id},reported_user_id.eq.${user.id}`);
      await admin.from("profile_photos").delete().eq("user_id", user.id);
      await admin.from("profile_videos").delete().eq("user_id", user.id);
      await admin.from("profile_prompts").delete().eq("user_id", user.id);
      await admin.from("profile_views").delete().or(`viewer_id.eq.${user.id},viewed_id.eq.${user.id}`);
      await admin.from("push_subscriptions").delete().eq("user_id", user.id);
      await admin.from("photo_moderation").delete().eq("user_id", user.id);
      await admin.from("selfie_verifications").delete().eq("user_id", user.id);
      await admin.from("user_roles").delete().eq("user_id", user.id);
      await admin.from("profiles").delete().eq("user_id", user.id);

      // 4. Auth user
      const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error("auth deleteUser error:", delErr);
        return new Response(JSON.stringify({ error: "Не удалось удалить аккаунт" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("account-management error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
