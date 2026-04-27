CREATE OR REPLACE FUNCTION public.normalize_city(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
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