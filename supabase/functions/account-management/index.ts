// Account management: GDPR export + full account deletion
// action=export → returns full JSON of user's data
// action=delete → wipes user's data and deletes auth user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      // Collect all user data
      const [
        profileRes, photosRes, swipesRes, matchesRes, blocksRes, reportsRes, verifsRes,
      ] = await Promise.all([
        admin.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        admin.from("profile_photos").select("*").eq("user_id", user.id),
        admin.from("swipes").select("*").eq("swiper_id", user.id),
        admin.from("matches").select("*").or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        admin.from("blocks").select("*").eq("blocker_id", user.id),
        admin.from("reports").select("*").eq("reporter_id", user.id),
        admin.from("selfie_verifications").select("id,challenge_gesture,status,reason,created_at").eq("user_id", user.id),
      ]);

      // Fetch messages from user's matches
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

      // Log the deletion
      await admin.from("account_deletions").insert({
        user_id: user.id,
        email: user.email,
        reason: reason ?? null,
      });

      // Delete app data (no FKs to auth.users so we do it manually)
      // 1. Storage: avatars and verification selfies
      try {
        const { data: avatarFiles } = await admin.storage.from("avatars").list(user.id);
        if (avatarFiles?.length) {
          await admin.storage.from("avatars").remove(avatarFiles.map((f) => `${user.id}/${f.name}`));
        }
        const { data: photoFiles } = await admin.storage.from("avatars").list(`${user.id}/photos`);
        if (photoFiles?.length) {
          await admin.storage.from("avatars").remove(photoFiles.map((f) => `${user.id}/photos/${f.name}`));
        }
        const { data: selfies } = await admin.storage.from("verification-selfies").list(user.id);
        if (selfies?.length) {
          await admin.storage.from("verification-selfies").remove(selfies.map((f) => `${user.id}/${f.name}`));
        }
      } catch (err) {
        console.error("Storage cleanup error:", err);
      }

      // 2. DB rows
      await admin.from("messages").delete().eq("sender_id", user.id);
      await admin.from("matches").delete().or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      await admin.from("swipes").delete().or(`swiper_id.eq.${user.id},swiped_id.eq.${user.id}`);
      await admin.from("blocks").delete().or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      await admin.from("reports").delete().or(`reporter_id.eq.${user.id},reported_user_id.eq.${user.id}`);
      await admin.from("profile_photos").delete().eq("user_id", user.id);
      await admin.from("photo_moderation").delete().eq("user_id", user.id);
      await admin.from("selfie_verifications").delete().eq("user_id", user.id);
      await admin.from("user_roles").delete().eq("user_id", user.id);
      await admin.from("profiles").delete().eq("user_id", user.id);

      // 3. Auth user
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
