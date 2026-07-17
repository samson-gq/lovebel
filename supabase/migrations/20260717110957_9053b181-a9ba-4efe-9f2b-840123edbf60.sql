
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS incognito boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.search_profiles_v2(
  exclude_ids uuid[], min_age integer, max_age integer, gender_filter text, city_query text,
  user_lat double precision DEFAULT NULL, user_lng double precision DEFAULT NULL, radius_km integer DEFAULT NULL,
  my_interests text[] DEFAULT NULL, my_age integer DEFAULT NULL, my_children text DEFAULT NULL,
  my_smoking text DEFAULT NULL, my_drinking text DEFAULT NULL, my_city text DEFAULT NULL
)
RETURNS TABLE(id uuid, user_id uuid, name text, bio text, age integer, gender text, avatar_url text,
  interests text[], city text, created_at timestamptz, updated_at timestamptz, is_verified boolean,
  height_cm integer, education text, occupation text, zodiac text, children text, smoking text, drinking text,
  latitude double precision, longitude double precision, distance_km double precision, boost_until timestamptz,
  match_score integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
  WITH base AS (
    SELECT p.*,
      CASE WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
        6371 * acos(least(1, greatest(-1,
          cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lng))
          + sin(radians(user_lat)) * sin(radians(p.latitude))
        )))
      END AS d_km
    FROM public.profiles p
    WHERE p.user_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      AND (exclude_ids IS NULL OR NOT (p.user_id = ANY(exclude_ids)))
      AND NOT EXISTS (SELECT 1 FROM public.swipes s WHERE s.swiper_id = auth.uid() AND s.swiped_id = p.user_id)
      AND btrim(coalesce(p.name, '')) <> ''
      AND (min_age IS NULL OR p.age >= min_age)
      AND (max_age IS NULL OR p.age <= max_age)
      AND (gender_filter IS NULL OR gender_filter = 'all' OR p.gender = gender_filter)
      AND (city_query IS NULL OR city_query = '' OR public.normalize_city(p.city) LIKE '%' || public.normalize_city(city_query) || '%')
      AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.user_id)
      AND NOT EXISTS (SELECT 1 FROM public.blocks b WHERE b.blocker_id = p.user_id AND b.blocked_id = auth.uid())
      AND (
        p.incognito = false
        OR EXISTS (SELECT 1 FROM public.swipes s2 WHERE s2.swiper_id = p.user_id AND s2.swiped_id = auth.uid() AND s2.direction = 'right')
      )
  )
  SELECT b.id, b.user_id, b.name, b.bio, b.age, b.gender, b.avatar_url,
    b.interests, b.city, b.created_at, b.updated_at, b.is_verified,
    b.height_cm, b.education, b.occupation, b.zodiac, b.children, b.smoking, b.drinking,
    b.latitude, b.longitude, b.d_km, b.boost_until,
    (
      CASE WHEN my_interests IS NOT NULL AND b.interests IS NOT NULL AND array_length(my_interests,1) > 0 THEN
        LEAST(30, (SELECT count(*)::int * 6 FROM unnest(my_interests) mi WHERE mi = ANY(b.interests)))
      ELSE 0 END
      + CASE WHEN b.d_km IS NOT NULL AND b.d_km <= 10 THEN 20
             WHEN b.d_km IS NOT NULL AND b.d_km <= 50 THEN 10
             WHEN my_city IS NOT NULL AND my_city <> '' AND public.normalize_city(b.city) = public.normalize_city(my_city) THEN 15
             ELSE 0 END
      + CASE WHEN my_children IS NOT NULL AND b.children = my_children THEN 5 ELSE 0 END
      + CASE WHEN my_smoking IS NOT NULL AND b.smoking = my_smoking THEN 5 ELSE 0 END
      + CASE WHEN my_drinking IS NOT NULL AND b.drinking = my_drinking THEN 5 ELSE 0 END
      + CASE WHEN my_age IS NOT NULL AND b.age IS NOT NULL AND abs(b.age - my_age) <= 3 THEN 10
             WHEN my_age IS NOT NULL AND b.age IS NOT NULL AND abs(b.age - my_age) <= 7 THEN 5
             ELSE 0 END
      + CASE WHEN b.updated_at > now() - interval '24 hours' THEN 10
             WHEN b.updated_at > now() - interval '7 days' THEN 5
             ELSE 0 END
      + CASE WHEN b.boost_until IS NOT NULL AND b.boost_until > now() THEN 25 ELSE 0 END
      + CASE WHEN b.is_verified THEN 5 ELSE 0 END
    )::int AS match_score
  FROM base b
  WHERE (radius_km IS NULL OR user_lat IS NULL OR user_lng IS NULL OR b.latitude IS NULL OR b.longitude IS NULL
         OR b.d_km <= radius_km)
  ORDER BY (b.boost_until IS NOT NULL AND b.boost_until > now()) DESC, match_score DESC, b.d_km NULLS LAST, b.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.daily_picks()
RETURNS TABLE(user_id uuid, name text, age integer, city text, avatar_url text, bio text,
  interests text[], is_verified boolean, match_score integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $$
DECLARE me record;
BEGIN
  SELECT p.interests, p.age, p.children, p.smoking, p.drinking, p.city, p.latitude, p.longitude
    INTO me FROM public.profiles p WHERE p.user_id = auth.uid();

  RETURN QUERY
  WITH candidates AS (
    SELECT * FROM public.search_profiles_v2(
      NULL, 18, 99, 'all', '',
      me.latitude, me.longitude, NULL,
      me.interests, me.age, me.children, me.smoking, me.drinking, me.city
    )
  )
  SELECT c.user_id, c.name, c.age, c.city, c.avatar_url, c.bio, c.interests, c.is_verified, c.match_score
  FROM candidates c
  ORDER BY c.match_score DESC,
           hashtext(c.user_id::text || CURRENT_DATE::text || COALESCE(auth.uid()::text,''))
  LIMIT 5;
END; $$;

GRANT EXECUTE ON FUNCTION public.daily_picks() TO authenticated;
