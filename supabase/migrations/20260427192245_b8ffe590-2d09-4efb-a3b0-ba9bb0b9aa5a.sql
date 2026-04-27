-- Extensions for fuzzy / accent-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Immutable normalization function for city names
CREATE OR REPLACE FUNCTION public.normalize_city(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN input IS NULL THEN ''
    ELSE
      regexp_replace(
        translate(
          lower(
            -- expand common Russian abbreviations
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

-- GIN trigram index on normalized city for fast ILIKE / similarity
CREATE INDEX IF NOT EXISTS idx_profiles_normalized_city_trgm
  ON public.profiles
  USING gin (public.normalize_city(city) gin_trgm_ops);
