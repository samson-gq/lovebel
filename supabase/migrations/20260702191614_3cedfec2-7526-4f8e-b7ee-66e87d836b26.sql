
-- 1) Storage: allow authenticated read on avatars and profile-videos (buckets flip to private separately)
DROP POLICY IF EXISTS "Avatars readable by authenticated" ON storage.objects;
CREATE POLICY "Avatars readable by authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Profile videos readable by authenticated" ON storage.objects;
CREATE POLICY "Profile videos readable by authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-videos');

-- 2) Lock down SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_match() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_match() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_prompt_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_boost() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.activate_boost() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.record_profile_view(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.record_profile_view(uuid) TO authenticated;

-- 3) profile_photos: hide non-approved photos from non-owners + column grants
DROP POLICY IF EXISTS "Users can view all photos" ON public.profile_photos;
CREATE POLICY "Users view own or approved photos"
  ON public.profile_photos FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR moderation_status = 'approved');

REVOKE SELECT ON public.profile_photos FROM anon, authenticated;
GRANT SELECT (id, user_id, photo_url, position, created_at)
  ON public.profile_photos TO authenticated;
GRANT ALL ON public.profile_photos TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_photos()
RETURNS SETOF public.profile_photos
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.profile_photos WHERE user_id = auth.uid() ORDER BY position;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_photos() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_photos() TO authenticated;

-- 4) profiles: column-level grants; sensitive cols only via owner RPC
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, name, bio, age, gender, avatar_url, interests, city,
  created_at, updated_at, is_verified, verified_at,
  height_cm, education, occupation, zodiac, children, smoking, drinking,
  onboarding_completed
) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 5) search_profiles / count_search_profiles: SECURITY DEFINER so column grants
--    don't block reads of latitude/longitude/boost_until inside these functions.
ALTER FUNCTION public.search_profiles(uuid[], integer, integer, text, text, double precision, double precision, integer)
  SECURITY DEFINER;
ALTER FUNCTION public.count_search_profiles(uuid[], integer, integer, text, text, double precision, double precision, integer)
  SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.search_profiles(uuid[], integer, integer, text, text, double precision, double precision, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.search_profiles(uuid[], integer, integer, text, text, double precision, double precision, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.count_search_profiles(uuid[], integer, integer, text, text, double precision, double precision, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.count_search_profiles(uuid[], integer, integer, text, text, double precision, double precision, integer) TO authenticated;
