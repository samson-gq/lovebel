
-- 1) profiles: hide sensitive columns from other users via column-level GRANT.
-- Own user reads all fields through get_my_profile() (SECURITY DEFINER).
-- Search results come through search_profiles() (SECURITY DEFINER).
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (
  id, user_id, name, bio, age, gender, avatar_url, interests, city,
  created_at, updated_at, is_verified,
  height_cm, education, occupation, zodiac, children, smoking, drinking
) ON public.profiles TO authenticated;

-- 2) account_deletions: explicit INSERT policy for the owning user.
CREATE POLICY "Users insert own deletion record"
  ON public.account_deletions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3) messages: restrict UPDATE to only editable columns; sender_id / match_id become immutable.
REVOKE UPDATE ON public.messages FROM authenticated, anon;
GRANT UPDATE (content, edited_at, deleted_at, read_at) ON public.messages TO authenticated;

-- 4) profile_prompts: mirror profiles block filtering on SELECT.
DROP POLICY IF EXISTS "Prompts readable by authenticated" ON public.profile_prompts;
CREATE POLICY "Prompts readable if not blocked"
  ON public.profile_prompts FOR SELECT TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE b.blocker_id = auth.uid() AND b.blocked_id = profile_prompts.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE b.blocker_id = profile_prompts.user_id AND b.blocked_id = auth.uid()
    )
  );

-- 5) profile_views: hide viewer identity for blocked relationships.
DROP POLICY IF EXISTS "Users view visits to their profile" ON public.profile_views;
CREATE POLICY "Users view visits to their profile"
  ON public.profile_views FOR SELECT TO authenticated
  USING (
    viewed_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE b.blocker_id = auth.uid() AND b.blocked_id = profile_views.viewer_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE b.blocker_id = profile_views.viewer_id AND b.blocked_id = auth.uid()
    )
  );
