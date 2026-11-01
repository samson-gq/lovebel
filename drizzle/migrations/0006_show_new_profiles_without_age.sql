DO $$
DECLARE f text; d text;
BEGIN
  FOREACH f IN ARRAY ARRAY['public.search_profiles_v2','public.search_profiles','public.count_search_profiles'] LOOP
    d := pg_get_functiondef(f::regproc);
    d := replace(d, '(min_age IS NULL OR p.age >= min_age)', '(min_age IS NULL OR p.age IS NULL OR p.age >= min_age)');
    d := replace(d, '(max_age IS NULL OR p.age <= max_age)', '(max_age IS NULL OR p.age IS NULL OR p.age <= max_age)');
    EXECUTE d;
  END LOOP;
END $$;