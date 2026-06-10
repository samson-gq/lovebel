
-- 1. Tighten profiles SELECT: hide blocked users from each other.
DROP POLICY IF EXISTS "Profiles base readable by authenticated" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated except blocked"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR (
    NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = profiles.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = profiles.user_id AND b.blocked_id = auth.uid())
  )
);

-- 2. Move swipe-exclusion server-side so clients don't have to ship thousands of ids.
--    When exclude_ids is NULL we now derive exclusion from swipes for auth.uid().
CREATE OR REPLACE FUNCTION public.search_profiles(
  exclude_ids uuid[],
  min_age integer,
  max_age integer,
  gender_filter text,
  city_query text,
  user_lat double precision DEFAULT NULL,
  user_lng double precision DEFAULT NULL,
  radius_km integer DEFAULT NULL
)
RETURNS TABLE(id uuid, user_id uuid, name text, bio text, age integer, gender text, avatar_url text, interests text[], city text, created_at timestamp with time zone, updated_at timestamp with time zone, is_verified boolean, height_cm integer, education text, occupation text, zodiac text, children text, smoking text, drinking text, latitude double precision, longitude double precision, distance_km double precision, boost_until timestamp with time zone)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    p.id, p.user_id, p.name, p.bio, p.age, p.gender, p.avatar_url,
    p.interests, p.city, p.created_at, p.updated_at, p.is_verified,
    p.height_cm, p.education, p.occupation, p.zodiac, p.children, p.smoking, p.drinking,
    p.latitude, p.longitude,
    CASE
      WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
        6371 * acos(least(1, greatest(-1,
          cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lng))
          + sin(radians(user_lat)) * sin(radians(p.latitude))
        )))
      ELSE NULL
    END AS distance_km,
    p.boost_until
  FROM public.profiles p
  WHERE p.user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND (exclude_ids IS NULL OR NOT (p.user_id = ANY(exclude_ids)))
    AND NOT EXISTS (
      SELECT 1 FROM public.swipes s
      WHERE s.swiper_id = auth.uid() AND s.swiped_id = p.user_id
    )
    AND btrim(coalesce(p.name, '')) <> ''
    AND (min_age IS NULL OR p.age >= min_age)
    AND (max_age IS NULL OR p.age <= max_age)
    AND (gender_filter IS NULL OR gender_filter = 'all' OR p.gender = gender_filter)
    AND (city_query IS NULL OR city_query = '' OR public.normalize_city(p.city) LIKE '%' || public.normalize_city(city_query) || '%')
    AND (
      radius_km IS NULL OR user_lat IS NULL OR user_lng IS NULL OR p.latitude IS NULL OR p.longitude IS NULL OR
      6371 * acos(least(1, greatest(-1,
        cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lng))
        + sin(radians(user_lat)) * sin(radians(p.latitude))
      ))) <= radius_km
    )
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = p.user_id AND b.blocked_id = auth.uid())
  ORDER BY (p.boost_until IS NOT NULL AND p.boost_until > now()) DESC, distance_km NULLS LAST, p.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.count_search_profiles(
  exclude_ids uuid[],
  min_age integer,
  max_age integer,
  gender_filter text,
  city_query text,
  user_lat double precision DEFAULT NULL,
  user_lng double precision DEFAULT NULL,
  radius_km integer DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT count(*)::int
  FROM public.profiles p
  WHERE p.user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND (exclude_ids IS NULL OR NOT (p.user_id = ANY(exclude_ids)))
    AND NOT EXISTS (
      SELECT 1 FROM public.swipes s
      WHERE s.swiper_id = auth.uid() AND s.swiped_id = p.user_id
    )
    AND btrim(coalesce(p.name, '')) <> ''
    AND (min_age IS NULL OR p.age >= min_age)
    AND (max_age IS NULL OR p.age <= max_age)
    AND (gender_filter IS NULL OR gender_filter = 'all' OR p.gender = gender_filter)
    AND (city_query IS NULL OR city_query = '' OR public.normalize_city(p.city) LIKE '%' || public.normalize_city(city_query) || '%')
    AND (
      radius_km IS NULL OR user_lat IS NULL OR user_lng IS NULL OR p.latitude IS NULL OR p.longitude IS NULL OR
      6371 * acos(least(1, greatest(-1,
        cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lng))
        + sin(radians(user_lat)) * sin(radians(p.latitude))
      ))) <= radius_km
    )
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = p.user_id AND b.blocked_id = auth.uid());
$function$;
