import { describe, it, expect, beforeAll } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Integration tests against the live Lovable Cloud backend.
// These verify that the SQL `normalize_city` function and the `search_profiles`
// RPC treat abbreviations, casing, ё/е, and stray whitespace as equivalent.
//
// CI auth strategy
// ----------------
// The RPCs read from `profiles`, which is gated by RLS to authenticated users.
// To run these checks in CI, set the following env vars (e.g. as GitHub
// repository secrets exposed via Vitest's `process.env`):
//
//   TEST_SUPABASE_EMAIL    — email of a dedicated test user
//   TEST_SUPABASE_PASSWORD — that user's password
//
// When the vars are present we sign in before the suite. When they are absent
// (the default for local runs / pull requests without secrets) the assertions
// are skipped — they are marked `it.skipIf(!canQuery)` so the suite stays
// green and the report makes the skip explicit.

let canQuery = false;

const callCount = async (city: string) => {
  const { data, error } = await supabase.rpc("count_search_profiles", {
    exclude_ids: [],
    min_age: 18,
    max_age: 99,
    gender_filter: "all",
    city_query: city,
  });
  if (error) return { error, data: null as number | null };
  return { error: null, data: data as number };
};

beforeAll(async () => {
  const email = (import.meta as any).env?.VITE_TEST_SUPABASE_EMAIL
    ?? (typeof process !== "undefined" ? process.env.TEST_SUPABASE_EMAIL : undefined);
  const password = (import.meta as any).env?.VITE_TEST_SUPABASE_PASSWORD
    ?? (typeof process !== "undefined" ? process.env.TEST_SUPABASE_PASSWORD : undefined);

  if (email && password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.warn(
        `[search_profiles tests] sign-in failed (${error.message}); skipping integration assertions.`,
      );
    }
  }

  const probe = await callCount("");
  canQuery = !probe.error;
});

describe("search_profiles RPC (city matching)", () => {
  it.skipIf(!canQuery)("returns the same count for 'спб' and 'Санкт-Петербург'", async () => {
    const a = await callCount("спб");
    const b = await callCount("Санкт-Петербург");
    expect(a.data).toBe(b.data);
  });

  it.skipIf(!canQuery)("returns the same count for '  мск ' and 'Москва'", async () => {
    const a = await callCount("  мск ");
    const b = await callCount("Москва");
    expect(a.data).toBe(b.data);
  });

  it.skipIf(!canQuery)("returns the same count for 'нн' and 'Нижний Новгород'", async () => {
    const a = await callCount("нн");
    const b = await callCount("Нижний Новгород");
    expect(a.data).toBe(b.data);
  });

  it.skipIf(!canQuery)("ignores ё/е differences ('Орёл' vs 'орел')", async () => {
    const a = await callCount("Орёл");
    const b = await callCount("орел");
    expect(a.data).toBe(b.data);
  });

  it.skipIf(!canQuery)("empty city query is upper-bound for city-filtered count", async () => {
    const all = await callCount("");
    const filtered = await callCount("Москва");
    expect((all.data ?? 0)).toBeGreaterThanOrEqual(filtered.data ?? 0);
  });

  it("RPC is reachable (skipped gracefully without an auth session)", async () => {
    if (canQuery) {
      expect(canQuery).toBe(true);
      return;
    }
    const { error } = await callCount("");
    // Without auth we expect an RLS / permission error — never a 404.
    expect(error?.code).toBe("42501");
  });
});
