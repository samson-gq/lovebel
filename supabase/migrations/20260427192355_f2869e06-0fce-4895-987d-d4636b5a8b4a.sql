CREATE OR REPLACE FUNCTION public.search_profiles(
  exclude_ids uuid[],
  min_age int,
  max_age int,
  gender_filter text,
  city_query text
)
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT p.*
  FROM public.profiles p
  WHERE (exclude_ids IS NULL OR NOT (p.user_id = ANY(exclude_ids)))
    AND p.name <> ''
    AND (min_age IS NULL OR p.age >= min_age)
    AND (max_age IS NULL OR p.age <= max_age)
    AND (gender_filter IS NULL OR gender_filter = 'all' OR p.gender = gender_filter)
    AND (
      city_query IS NULL
      OR city_query = ''
      OR public.normalize_city(p.city) LIKE '%' || public.normalize_city(city_query) || '%'
    );
$$;