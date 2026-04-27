-- 1) Hide precise GPS columns from non-owners via column-level grants
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

-- Permissive base SELECT (column grants below restrict lat/lng)
CREATE POLICY "Profiles base readable by authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, user_id, name, bio, age, gender, avatar_url, interests, city, created_at, updated_at)
  ON public.profiles TO authenticated;

-- Owner-only access to coordinates via dedicated function
CREATE OR REPLACE FUNCTION public.get_my_coordinates()
RETURNS TABLE (latitude double precision, longitude double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT latitude, longitude FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_coordinates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_coordinates() TO authenticated;

-- Safe view (no lat/lng)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, user_id, name, bio, age, gender, avatar_url, interests, city, created_at, updated_at
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO authenticated;

-- 2) search_profiles -> safe shape (no lat/lng)
DROP FUNCTION IF EXISTS public.search_profiles(uuid[], int, int, text, text);
CREATE OR REPLACE FUNCTION public.search_profiles(
  exclude_ids uuid[],
  min_age int,
  max_age int,
  gender_filter text,
  city_query text
)
RETURNS TABLE (
  id uuid, user_id uuid, name text, bio text, age int, gender text,
  avatar_url text, interests text[], city text,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.user_id, p.name, p.bio, p.age, p.gender, p.avatar_url,
         p.interests, p.city, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE (exclude_ids IS NULL OR NOT (p.user_id = ANY(exclude_ids)))
    AND p.name <> ''
    AND (min_age IS NULL OR p.age >= min_age)
    AND (max_age IS NULL OR p.age <= max_age)
    AND (gender_filter IS NULL OR gender_filter = 'all' OR p.gender = gender_filter)
    AND (
      city_query IS NULL OR city_query = ''
      OR public.normalize_city(p.city) LIKE '%' || public.normalize_city(city_query) || '%'
    );
$$;
GRANT EXECUTE ON FUNCTION public.search_profiles(uuid[], int, int, text, text) TO authenticated;

-- 3) Count helper for UI
CREATE OR REPLACE FUNCTION public.count_search_profiles(
  exclude_ids uuid[],
  min_age int,
  max_age int,
  gender_filter text,
  city_query text
)
RETURNS int
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::int
  FROM public.profiles p
  WHERE (exclude_ids IS NULL OR NOT (p.user_id = ANY(exclude_ids)))
    AND p.name <> ''
    AND (min_age IS NULL OR p.age >= min_age)
    AND (max_age IS NULL OR p.age <= max_age)
    AND (gender_filter IS NULL OR gender_filter = 'all' OR p.gender = gender_filter)
    AND (
      city_query IS NULL OR city_query = ''
      OR public.normalize_city(p.city) LIKE '%' || public.normalize_city(city_query) || '%'
    );
$$;
GRANT EXECUTE ON FUNCTION public.count_search_profiles(uuid[], int, int, text, text) TO authenticated;

-- 4) Block client-side match insertion (trigger still inserts via SECURITY DEFINER)
DROP POLICY IF EXISTS "Users can insert matches" ON public.matches;