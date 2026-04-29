#!/usr/bin/env node
/**
 * Seed (or verify) the Supabase test user used by authenticated integration
 * tests (see src/lib/searchProfiles.integration.test.ts).
 *
 * Required env vars:
 *   SUPABASE_URL                  Project URL (e.g. https://xxx.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY     Service role key (secret — CI only)
 *   TEST_SUPABASE_EMAIL           Email for the test user
 *   TEST_SUPABASE_PASSWORD        Password for the test user
 *
 * Optional:
 *   TEST_PROFILE_NAME             Defaults to "CI Test User"
 *   TEST_PROFILE_CITY             Defaults to "Москва"
 *   TEST_PROFILE_AGE              Defaults to 28
 *   TEST_PROFILE_GENDER           Defaults to "all"
 *
 * Behavior:
 *   - Creates the user if missing (email_confirm: true so they can sign in).
 *   - If the user already exists, updates the password to match the env var.
 *   - Upserts the matching public.profiles row so RLS-protected RPCs return data.
 *   - Idempotent — safe to run on every CI build.
 *   - Exits 0 on success, non-zero on failure.
 */

import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TEST_SUPABASE_EMAIL,
  TEST_SUPABASE_PASSWORD,
  TEST_PROFILE_NAME = "CI Test User",
  TEST_PROFILE_CITY = "Москва",
  TEST_PROFILE_AGE = "28",
  TEST_PROFILE_GENDER = "all",
} = process.env;

const missing = [
  ["SUPABASE_URL", SUPABASE_URL],
  ["SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY],
  ["TEST_SUPABASE_EMAIL", TEST_SUPABASE_EMAIL],
  ["TEST_SUPABASE_PASSWORD", TEST_SUPABASE_PASSWORD],
]
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error(`✖ Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Find a user by email by paginating through admin.listUsers. */
async function findUserByEmail(email) {
  const target = email.toLowerCase();
  let page = 1;
  // 1000-per-page is the documented max; cap pages so we never loop forever.
  for (let i = 0; i < 50; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 1000) return null;
    page++;
  }
  return null;
}

async function ensureUser() {
  const existing = await findUserByEmail(TEST_SUPABASE_EMAIL);
  if (existing) {
    console.log(`• User exists (${existing.id}). Resetting password & confirming email.`);
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: TEST_SUPABASE_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    return existing.id;
  }

  console.log("• Creating test user…");
  const { data, error } = await admin.auth.admin.createUser({
    email: TEST_SUPABASE_EMAIL,
    password: TEST_SUPABASE_PASSWORD,
    email_confirm: true,
    user_metadata: { name: TEST_PROFILE_NAME },
  });
  if (error) throw error;
  console.log(`• Created user ${data.user.id}.`);
  return data.user.id;
}

async function ensureProfile(userId) {
  const age = Number.parseInt(TEST_PROFILE_AGE, 10);
  if (!Number.isFinite(age)) throw new Error(`Invalid TEST_PROFILE_AGE: ${TEST_PROFILE_AGE}`);

  // handle_new_user() creates the row on signup, but we still want to make sure
  // it has the values our tests depend on (name/city/age/gender).
  const { data: existing, error: selErr } = await admin
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (selErr) throw selErr;

  const payload = {
    name: TEST_PROFILE_NAME,
    city: TEST_PROFILE_CITY,
    age,
    gender: TEST_PROFILE_GENDER,
  };

  if (existing) {
    const { error } = await admin.from("profiles").update(payload).eq("user_id", userId);
    if (error) throw error;
    console.log("• Profile updated.");
  } else {
    const { error } = await admin.from("profiles").insert({ user_id: userId, ...payload });
    if (error) throw error;
    console.log("• Profile inserted.");
  }
}

async function verifyLogin() {
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!anonKey) {
    console.log("• Skipping login verification (SUPABASE_ANON_KEY not set).");
    return;
  }
  const client = createClient(SUPABASE_URL, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: TEST_SUPABASE_EMAIL,
    password: TEST_SUPABASE_PASSWORD,
  });
  if (error) throw new Error(`Login verification failed: ${error.message}`);
  await client.auth.signOut();
  console.log("• Login verified.");
}

(async () => {
  try {
    const userId = await ensureUser();
    await ensureProfile(userId);
    await verifyLogin();
    console.log("✔ Test user is ready.");
  } catch (err) {
    console.error("✖ Seed failed:", err?.message ?? err);
    process.exit(1);
  }
})();
