-- 1) Move extensions out of public into a dedicated schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO authenticated, anon, service_role;

-- Drop dependent objects first (we'll recreate)
DROP INDEX IF EXISTS public.idx_profiles_normalized_city_trgm;

ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- Recreate normalize_city referencing extensions where needed (uses only built-ins, so no change required)
-- but re-create normalize_city to reset its search_path to include extensions for future-proofing
CREATE OR REPLACE FUNCTION public.normalize_city(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, extensions, pg_temp
AS $$
  SELECT CASE
    WHEN input IS NULL THEN ''
    ELSE
      regexp_replace(
        translate(
          lower(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(input, '(^|\s)спб($|\s|\.)', '\1санкт-петербург\2', 'gi'),
                  '(^|\s)с\.?-?петербург', '\1санкт-петербург', 'gi'
                ),
                '(^|\s)мск($|\s|\.)', '\1москва\2', 'gi'
              ),
              '(^|\s)нн($|\s|\.)', '\1нижний новгород\2', 'gi'
            )
          ),
          'ё', 'е'
        ),
        '\s+', ' ', 'g'
      )
  END;
$$;

-- Recreate the trigram index using the extensions-qualified operator class
CREATE INDEX IF NOT EXISTS idx_profiles_normalized_city_trgm
  ON public.profiles
  USING gin (public.normalize_city(city) extensions.gin_trgm_ops);

-- 2) Lock down SECURITY DEFINER trigger helper functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_match() FROM PUBLIC, anon, authenticated;

-- 3) Popular cities table (server-managed list)
CREATE TABLE IF NOT EXISTS public.popular_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.popular_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Popular cities readable by authenticated" ON public.popular_cities;
CREATE POLICY "Popular cities readable by authenticated"
  ON public.popular_cities
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies => only service_role can modify (bypasses RLS).

INSERT INTO public.popular_cities (name, display_order) VALUES
  ('Москва', 1),
  ('Санкт-Петербург', 2),
  ('Новосибирск', 10),
  ('Екатеринбург', 11),
  ('Казань', 12),
  ('Нижний Новгород', 13),
  ('Челябинск', 14),
  ('Самара', 15),
  ('Уфа', 16),
  ('Ростов-на-Дону', 17),
  ('Краснодар', 18),
  ('Воронеж', 19),
  ('Пермь', 20),
  ('Волгоград', 21),
  ('Минск', 30),
  ('Киев', 31),
  ('Алматы', 32)
ON CONFLICT (name) DO NOTHING;