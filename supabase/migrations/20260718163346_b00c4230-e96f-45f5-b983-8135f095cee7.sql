
-- 1) Revoke anon EXECUTE on SECURITY DEFINER functions in public schema
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_my_photos() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.daily_picks() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.activate_boost() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.record_profile_view(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.search_profiles(uuid[], integer, integer, text, text, double precision, double precision, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.search_profiles_v2(uuid[], integer, integer, text, text, double precision, double precision, integer, text[], integer, text, text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.count_search_profiles(uuid[], integer, integer, text, text, double precision, double precision, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_photos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_picks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_boost() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_profile_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles(uuid[], integer, integer, text, text, double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles_v2(uuid[], integer, integer, text, text, double precision, double precision, integer, text[], integer, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_search_profiles(uuid[], integer, integer, text, text, double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 2) message_reactions: recreate policies scoped to authenticated + block-aware
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='message_reactions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.message_reactions', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "reactions_select_authenticated_no_block"
ON public.message_reactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.matches mt ON mt.id = m.match_id
    WHERE m.id = message_reactions.message_id
      AND (mt.user1_id = auth.uid() OR mt.user2_id = auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id IN (mt.user1_id, mt.user2_id))
           OR (b.blocked_id = auth.uid() AND b.blocker_id IN (mt.user1_id, mt.user2_id))
      )
  )
);

CREATE POLICY "reactions_insert_authenticated_no_block"
ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.matches mt ON mt.id = m.match_id
    WHERE m.id = message_reactions.message_id
      AND (mt.user1_id = auth.uid() OR mt.user2_id = auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id IN (mt.user1_id, mt.user2_id))
           OR (b.blocked_id = auth.uid() AND b.blocker_id IN (mt.user1_id, mt.user2_id))
      )
  )
);

CREATE POLICY "reactions_delete_own_authenticated"
ON public.message_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 3) messages: restrict sender UPDATE to authenticated + column-level (content/edited_at/deleted_at)
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND cmd='UPDATE' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', p.policyname);
  END LOOP;
END $$;

-- Revoke broad UPDATE, grant only on allowed columns
REVOKE UPDATE ON public.messages FROM authenticated, anon, public;
GRANT UPDATE (content, edited_at, deleted_at, read_at) ON public.messages TO authenticated;

CREATE POLICY "messages_update_own_restricted"
ON public.messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.matches mt WHERE mt.id = messages.match_id AND (mt.user1_id = auth.uid() OR mt.user2_id = auth.uid())
))
WITH CHECK (sender_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.matches mt WHERE mt.id = messages.match_id AND (mt.user1_id = auth.uid() OR mt.user2_id = auth.uid())
));

-- 4) profile_photos: add bidirectional block filter to SELECT policy
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profile_photos' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profile_photos', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "photos_select_own_or_approved_no_block"
ON public.profile_photos FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    moderation_status = 'approved'
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = profile_photos.user_id)
         OR (b.blocker_id = profile_photos.user_id AND b.blocked_id = auth.uid())
    )
  )
);
